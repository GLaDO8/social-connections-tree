import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/prompt";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
	if (!_client) {
		_client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
	}
	return _client;
}

// ---------------------------------------------------------------------------
// Zod schema — used for validation AFTER Claude responds.
// ---------------------------------------------------------------------------

const RelationshipTypeEnum = z.enum([
	"friend",
	"close_friend",
	"best_friend",
	"childhood_friend",
	"partner",
	"ex",
	"crush",
	"colleague",
	"classmate",
	"roommate",
	"family",
	"sibling",
	"acquaintance",
	"other",
]);

const GraphOperationSchema = z.discriminatedUnion("op", [
	z.object({
		op: z.literal("add_person"),
		data: z.object({
			name: z.string(),
			cohortNames: z.array(z.string()).optional(),
		}),
	}),
	z.object({
		op: z.literal("add_relationship"),
		data: z.object({
			sourceName: z.string(),
			targetName: z.string(),
			type: RelationshipTypeEnum,
			label: z.string().optional(),
			notes: z.string().optional(),
		}),
	}),
	z.object({
		op: z.literal("add_cohort"),
		data: z.object({ name: z.string() }),
	}),
	z.object({
		op: z.literal("update_person"),
		data: z.object({
			name: z.string(),
			updates: z.object({
				name: z.string().optional(),
				notes: z.string().optional(),
			}),
			cohortNames: z.array(z.string()).optional(),
		}),
	}),
	z.object({
		op: z.literal("update_relationship"),
		data: z.object({
			sourceName: z.string(),
			targetName: z.string(),
			updates: z.object({
				type: RelationshipTypeEnum.optional(),
				label: z.string().optional(),
				notes: z.string().optional(),
			}),
		}),
	}),
	z.object({
		op: z.literal("remove_person"),
		data: z.object({ name: z.string() }),
	}),
	z.object({
		op: z.literal("remove_relationship"),
		data: z.object({
			sourceName: z.string(),
			targetName: z.string(),
		}),
	}),
]);

const ResponseSchema = z.object({
	operations: z.array(GraphOperationSchema),
	explanation: z.string(),
});

const RequestSchema = z.object({
	input: z.string().min(1).max(2000),
	existingPersonNames: z.array(z.string()),
	existingCohortNames: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Tool definitions — each graph operation is its own tool with a flat schema.
// ---------------------------------------------------------------------------

const RELATIONSHIP_TYPES = [
	"friend",
	"close_friend",
	"best_friend",
	"childhood_friend",
	"partner",
	"ex",
	"crush",
	"colleague",
	"classmate",
	"roommate",
	"family",
	"sibling",
	"acquaintance",
	"other",
] as const;

const tools: Anthropic.Tool[] = [
	{
		name: "add_person",
		description: "Add a new person to the social graph.",
		input_schema: {
			type: "object" as const,
			properties: {
				name: { type: "string", description: "Person's name" },
				cohortNames: {
					type: "array",
					items: { type: "string" },
					description:
						"Group names this person belongs to (e.g. ['FIITJEE', 'College'])",
				},
			},
			required: ["name"],
		},
	},
	{
		name: "add_relationship",
		description:
			'Add a relationship between two people. Use "Me" for the ego node.',
		input_schema: {
			type: "object" as const,
			properties: {
				sourceName: {
					type: "string",
					description: 'First person. Use "Me" for the ego node.',
				},
				targetName: { type: "string", description: "Second person" },
				type: {
					type: "string",
					enum: RELATIONSHIP_TYPES,
					description: "Relationship type",
				},
				label: {
					type: "string",
					description:
						"Short natural phrase for edge hover (e.g. 'childhood friend from FIITJEE')",
				},
				notes: {
					type: "string",
					description:
						"Contextual details or backstory about the relationship (how/when they met, anecdotes). Only populate when user provides such context.",
				},
			},
			required: ["sourceName", "targetName", "type", "label"],
		},
	},
	{
		name: "add_cohort",
		description: "Add a new cohort/group to the social graph.",
		input_schema: {
			type: "object" as const,
			properties: {
				name: { type: "string", description: "Cohort/group name" },
			},
			required: ["name"],
		},
	},
	{
		name: "update_person",
		description:
			"Update an existing person's details or assign them to cohorts.",
		input_schema: {
			type: "object" as const,
			properties: {
				name: {
					type: "string",
					description: "Current name of the person to update",
				},
				newName: {
					type: "string",
					description: "New name for the person (if renaming)",
				},
				notes: { type: "string", description: "Notes about the person" },
				cohortNames: {
					type: "array",
					items: { type: "string" },
					description:
						"Cohort/group names to assign this person to (e.g. ['IIITB', 'College'])",
				},
			},
			required: ["name"],
		},
	},
	{
		name: "update_relationship",
		description: "Update an existing relationship between two people.",
		input_schema: {
			type: "object" as const,
			properties: {
				sourceName: { type: "string", description: "First person" },
				targetName: { type: "string", description: "Second person" },
				type: {
					type: "string",
					enum: RELATIONSHIP_TYPES,
					description: "New relationship type",
				},
				label: { type: "string", description: "New edge label" },
				bondStrength: {
					type: "integer",
					description: "New bond strength (1-5)",
					minimum: 1,
					maximum: 5,
				},
				notes: {
					type: "string",
					description:
						"New contextual details or backstory about the relationship.",
				},
			},
			required: ["sourceName", "targetName"],
		},
	},
	{
		name: "remove_person",
		description: "Remove a person from the social graph.",
		input_schema: {
			type: "object" as const,
			properties: {
				name: { type: "string", description: "Name of the person to remove" },
			},
			required: ["name"],
		},
	},
	{
		name: "remove_relationship",
		description: "Remove a relationship between two people.",
		input_schema: {
			type: "object" as const,
			properties: {
				sourceName: { type: "string", description: "First person" },
				targetName: { type: "string", description: "Second person" },
			},
			required: ["sourceName", "targetName"],
		},
	},
];

// ---------------------------------------------------------------------------
// Transform tool calls → GraphOperation format
// ---------------------------------------------------------------------------

interface ToolInput {
	name?: string;
	cohortNames?: string[];
	sourceName?: string;
	targetName?: string;
	type?: string;
	label?: string;
	bondStrength?: number;
	newName?: string;
	notes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolCallToOperation(toolName: string, input: ToolInput): any {
	switch (toolName) {
		case "add_person":
			return {
				op: "add_person",
				data: {
					name: input.name!,
					...(input.cohortNames && { cohortNames: input.cohortNames }),
				},
			};
		case "add_relationship":
			return {
				op: "add_relationship",
				data: {
					sourceName: input.sourceName!,
					targetName: input.targetName!,
					type: input.type!,
					label: input.label!,
					...(input.notes && { notes: input.notes }),
				},
			};
		case "add_cohort":
			return { op: "add_cohort", data: { name: input.name! } };
		case "update_person": {
			const updates: { name?: string; notes?: string } = {};
			if (input.newName) updates.name = input.newName;
			if (input.notes) updates.notes = input.notes;
			return {
				op: "update_person",
				data: {
					name: input.name!,
					updates,
					...(input.cohortNames && { cohortNames: input.cohortNames }),
				},
			};
		}
		case "update_relationship": {
			const updates: {
				type?: string;
				label?: string;
				bondStrength?: number;
				notes?: string;
			} = {};
			if (input.type) updates.type = input.type;
			if (input.label) updates.label = input.label;
			if (input.bondStrength) updates.bondStrength = input.bondStrength;
			if (input.notes !== undefined) updates.notes = input.notes;
			return {
				op: "update_relationship",
				data: {
					sourceName: input.sourceName!,
					targetName: input.targetName!,
					updates,
				},
			};
		}
		case "remove_person":
			return { op: "remove_person", data: { name: input.name! } };
		case "remove_relationship":
			return {
				op: "remove_relationship",
				data: {
					sourceName: input.sourceName!,
					targetName: input.targetName!,
				},
			};
		default:
			throw new Error(`Unknown tool: ${toolName}`);
	}
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = RequestSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid request", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const { input, existingPersonNames, existingCohortNames } = parsed.data;
		const systemPrompt = buildSystemPrompt(
			existingPersonNames,
			existingCohortNames,
		);

		// Multi-turn tool-use loop: collect all tool calls across turns.
		// Claude may return stop_reason "tool_use" when it has more calls to make,
		// so we feed back tool results and continue until it stops.
		const allToolUseBlocks: Anthropic.ToolUseBlock[] = [];
		const allTextBlocks: Anthropic.TextBlock[] = [];
		const messages: Anthropic.MessageParam[] = [
			{ role: "user", content: input },
		];

		const MAX_TURNS = 5;
		for (let turn = 0; turn < MAX_TURNS; turn++) {
			const response = await getClient().messages.create({
				model: "claude-haiku-4-5-20251001",
				max_tokens: 4096,
				system: systemPrompt,
				tools,
				messages,
			});

			// Collect text and tool_use blocks from this turn
			for (const block of response.content) {
				if (block.type === "text") allTextBlocks.push(block);
				if (block.type === "tool_use") allToolUseBlocks.push(block);
			}

			// If Claude is done (no more tool calls), break
			if (response.stop_reason !== "tool_use") break;

			// Build tool results and continue the conversation
			const toolResults: Anthropic.ToolResultBlockParam[] = response.content
				.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
				.map((b) => ({
					type: "tool_result" as const,
					tool_use_id: b.id,
					content: "OK",
				}));

			messages.push(
				{ role: "assistant", content: response.content },
				{ role: "user", content: toolResults },
			);
		}

		const explanation = allTextBlocks.map((b) => b.text).join(" ") || "Done.";
		const operations = allToolUseBlocks.map((b) =>
			toolCallToOperation(b.name, b.input as ToolInput),
		);

		// Validate with Zod
		const result = ResponseSchema.safeParse({ operations, explanation });
		if (!result.success) {
			console.error("Validation failed:", result.error.flatten());
			console.error(
				"Raw tool calls:",
				JSON.stringify(
					allToolUseBlocks.map((b) => ({ name: b.name, input: b.input })),
					null,
					2,
				),
			);
			return NextResponse.json(
				{ error: "Invalid model output", details: result.error.flatten() },
				{ status: 500 },
			);
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Parse input error:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

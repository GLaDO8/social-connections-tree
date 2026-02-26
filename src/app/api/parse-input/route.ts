import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { buildSystemPrompt } from "@/lib/prompt";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
	if (!_ai) {
		_ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	}
	return _ai;
}

// ---------------------------------------------------------------------------
// Zod schema with .describe() — drives both Gemini's constrained decoding
// and our response validation.
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

const BondStrength = z
	.number()
	.int()
	.min(1)
	.max(5)
	.describe("1=distant, 2=casual, 3=moderate, 4=close, 5=inseparable");

const AddPersonOp = z.object({
	op: z.literal("add_person").describe("Add a new person to the graph"),
	data: z.object({
		name: z.string().describe("Person's display name"),
		cohortNames: z
			.array(z.string())
			.describe(
				"Group names this person belongs to (e.g. FIITJEE, College). Omit if none.",
			)
			.optional(),
	}),
});

const AddRelationshipOp = z.object({
	op: z
		.literal("add_relationship")
		.describe("Create an edge between two people"),
	data: z.object({
		sourceName: z.string().describe('First person. Use "Me" for the ego node.'),
		targetName: z.string().describe("Second person"),
		type: RelationshipTypeEnum.describe("Relationship category"),
		label: z
			.string()
			.describe(
				"Short natural phrase shown on hover (e.g. 'childhood friend from FIITJEE')",
			),
		bondStrength: BondStrength,
	}),
});

const AddCohortOp = z.object({
	op: z.literal("add_cohort").describe("Create a new group/cohort"),
	data: z.object({
		name: z
			.string()
			.describe("Cohort display name (e.g. FIITJEE, College, Work)"),
	}),
});

const UpdatePersonOp = z.object({
	op: z.literal("update_person").describe("Modify an existing person"),
	data: z.object({
		name: z.string().describe("Current name of the person to update"),
		updates: z.object({
			name: z.string().describe("New name").optional(),
			notes: z.string().describe("Notes about the person").optional(),
		}),
	}),
});

const UpdateRelationshipOp = z.object({
	op: z
		.literal("update_relationship")
		.describe("Modify an existing relationship"),
	data: z.object({
		sourceName: z.string().describe("First person in the relationship"),
		targetName: z.string().describe("Second person in the relationship"),
		updates: z.object({
			type: RelationshipTypeEnum.describe("New relationship type").optional(),
			label: z.string().describe("New edge label").optional(),
			bondStrength: BondStrength.optional(),
		}),
	}),
});

const RemovePersonOp = z.object({
	op: z
		.literal("remove_person")
		.describe("Delete a person and all their connections"),
	data: z.object({
		name: z.string().describe("Name of the person to remove"),
	}),
});

const RemoveRelationshipOp = z.object({
	op: z
		.literal("remove_relationship")
		.describe("Delete a connection between two people"),
	data: z.object({
		sourceName: z.string().describe("First person"),
		targetName: z.string().describe("Second person"),
	}),
});

const GraphOperationSchema = z.discriminatedUnion("op", [
	AddPersonOp,
	AddRelationshipOp,
	AddCohortOp,
	UpdatePersonOp,
	UpdateRelationshipOp,
	RemovePersonOp,
	RemoveRelationshipOp,
]);

const ResponseSchema = z.object({
	operations: z
		.array(GraphOperationSchema)
		.describe(
			"Ordered list: add_cohort first, then add_person, then add_relationship, then updates/removes",
		),
	explanation: z
		.string()
		.describe(
			"Brief, friendly confirmation of what was done. Conversational tone, not technical.",
		),
});

const RequestSchema = z.object({
	input: z.string().min(1).max(2000),
	existingPersonNames: z.array(z.string()),
	existingCohortNames: z.array(z.string()),
});

// Convert Zod schema → JSON Schema for Gemini's constrained decoding
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod 4 type compat with zod-to-json-schema
const responseJsonSchema = zodToJsonSchema(ResponseSchema as any, {
	$refStrategy: "none",
});

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

		const response = await getAI().models.generateContent({
			model: "gemini-3-flash-preview",
			contents: input,
			config: {
				systemInstruction: systemPrompt,
				responseMimeType: "application/json",
				responseJsonSchema,
			},
		});

		const text = response.text;
		if (!text) {
			return NextResponse.json(
				{ error: "No response from model" },
				{ status: 500 },
			);
		}

		const jsonData = JSON.parse(text);
		const result = ResponseSchema.safeParse(jsonData);
		if (!result.success) {
			console.error("Validation failed:", result.error.flatten());
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

import { z } from "zod";
import { stripPhysicsState } from "@/lib/graph-constants";
import type { SocialGraph } from "@/types/graph";

const STORAGE_KEY = "social-connections-tree:graph";

// ---------------------------------------------------------------------------
// Zod schema for validating loaded/imported graph data
// ---------------------------------------------------------------------------

const CohortSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string(),
});

const PersonSchema = z.object({
	id: z.string(),
	name: z.string(),
	cohortIds: z.array(z.string()),
	isEgo: z.boolean(),
	notes: z.string().optional(),
	_addedAt: z.number().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	vx: z.number().optional(),
	vy: z.number().optional(),
	fx: z.union([z.number(), z.null()]).optional(),
	fy: z.union([z.number(), z.null()]).optional(),
});

const RelationshipSchema = z.object({
	id: z.string(),
	sourceId: z.string(),
	targetId: z.string(),
	type: z.string(),
	label: z.string().optional(),
	notes: z.string().optional(),
});

const SocialGraphSchema = z.object({
	persons: z
		.array(PersonSchema)
		.refine((persons) => persons.some((p) => p.isEgo), {
			message: "Graph must contain an ego node",
		}),
	relationships: z.array(RelationshipSchema),
	cohorts: z.array(CohortSchema),
	activeCohortId: z.union([z.string(), z.null()]),
	metadata: z.object({
		title: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
});

function validateGraph(data: unknown): SocialGraph | null {
	const result = SocialGraphSchema.safeParse(data);
	if (!result.success) return null;
	return result.data as SocialGraph;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function saveGraph(graph: SocialGraph): void {
	try {
		const cleaned = stripPhysicsState(graph);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
	} catch {
		// localStorage full or unavailable — silently fail
		console.warn("Failed to save graph to localStorage");
	}
}

export function loadGraph(): SocialGraph | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return validateGraph(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function clearGraph(): void {
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export graph as a downloadable JSON file.
 */
export function exportGraph(graph: SocialGraph): void {
	const cleaned = stripPhysicsState(graph);
	const blob = new Blob([JSON.stringify(cleaned, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `social-graph-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Import graph from a JSON file. Returns the parsed graph or null if invalid.
 */
export function importGraphFromFile(): Promise<SocialGraph | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = () => {
			const file = input.files?.[0];
			if (!file) {
				resolve(null);
				return;
			}
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const data = JSON.parse(reader.result as string);
					resolve(validateGraph(data));
				} catch {
					resolve(null);
				}
			};
			reader.onerror = () => resolve(null);
			reader.readAsText(file);
		};
		input.click();
	});
}

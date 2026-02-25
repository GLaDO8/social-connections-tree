import type { SocialGraph } from "@/types/graph";

const STORAGE_KEY = "social-connections-tree:graph";

/**
 * Strip d3-force physics state (x/y/vx/vy/fx/fy) from persons before saving.
 * These are transient — the simulation will recompute them on load.
 */
function stripPhysicsState(graph: SocialGraph): SocialGraph {
	return {
		...graph,
		persons: graph.persons.map(({ x, y, vx, vy, fx, fy, ...rest }) => rest),
	};
}

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
		const parsed = JSON.parse(raw) as SocialGraph;
		// Basic validation: must have persons array with an ego node
		if (
			!Array.isArray(parsed.persons) ||
			!parsed.persons.some((p) => p.isEgo)
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function clearGraph(): void {
	localStorage.removeItem(STORAGE_KEY);
}

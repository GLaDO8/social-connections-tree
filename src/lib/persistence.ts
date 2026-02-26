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
					const parsed = JSON.parse(reader.result as string) as SocialGraph;
					// Basic validation
					if (
						!Array.isArray(parsed.persons) ||
						!parsed.persons.some((p) => p.isEgo)
					) {
						resolve(null);
						return;
					}
					if (
						!Array.isArray(parsed.relationships) ||
						!Array.isArray(parsed.cohorts)
					) {
						resolve(null);
						return;
					}
					resolve(parsed);
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

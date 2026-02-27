import type { BondStrength } from "@/lib/relationship-config";
import type {
	Person,
	Relationship,
	RelationshipType,
	SocialGraph,
} from "@/types/graph";

export const NODE_RADIUS = 12;
export const EGO_RADIUS = 20;

// Degree-proportional node sizing (sqrt scaling)
const MIN_NODE_RADIUS = 7;
const MAX_NODE_RADIUS = 18;

/** Compute visual radius for a node based on its connection count. */
export function getVisualRadius(
	degree: number,
	maxDegree: number,
	isEgo: boolean,
): number {
	if (isEgo) return EGO_RADIUS;
	if (maxDegree <= 1) return NODE_RADIUS;
	const normalized = Math.sqrt(degree) / Math.sqrt(maxDegree);
	return MIN_NODE_RADIUS + normalized * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
}

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] =
	[
		{ value: "friend", label: "Friend" },
		{ value: "close_friend", label: "Close friend" },
		{ value: "best_friend", label: "Best friend" },
		{ value: "childhood_friend", label: "Childhood friend" },
		{ value: "partner", label: "Partner" },
		{ value: "ex", label: "Ex" },
		{ value: "crush", label: "Crush" },
		{ value: "colleague", label: "Colleague" },
		{ value: "classmate", label: "Classmate" },
		{ value: "roommate", label: "Roommate" },
		{ value: "family", label: "Family" },
		{ value: "sibling", label: "Sibling" },
		{ value: "acquaintance", label: "Acquaintance" },
		{ value: "other", label: "Other" },
	];

export const BOND_LABELS: Record<BondStrength, string> = {
	1: "Distant",
	2: "Casual",
	3: "Moderate",
	4: "Close",
	5: "Inseparable",
};

/** Compute degree map and max degree (excluding ego) for node sizing. */
export function computeDegreeStats(
	persons: Person[],
	relationships: Relationship[],
): { degreeMap: Map<string, number>; maxDegree: number } {
	const degreeMap = new Map<string, number>();
	const egoIds = new Set<string>();
	for (const p of persons) {
		if (p.isEgo) egoIds.add(p.id);
	}
	for (const r of relationships) {
		degreeMap.set(r.sourceId, (degreeMap.get(r.sourceId) ?? 0) + 1);
		degreeMap.set(r.targetId, (degreeMap.get(r.targetId) ?? 0) + 1);
	}
	let maxDegree = 1;
	for (const [id, deg] of degreeMap) {
		if (!egoIds.has(id) && deg > maxDegree) maxDegree = deg;
	}
	return { degreeMap, maxDegree };
}

/** Strip d3-force physics state from persons before saving/snapshotting. */
export function stripPhysicsState(graph: SocialGraph): SocialGraph {
	return {
		...graph,
		persons: graph.persons.map(({ x, y, vx, vy, fx, fy, ...rest }) => rest),
	};
}

/**
 * Default cohort colors to cycle through when auto-creating cohorts.
 * Index into this array with `cohorts.length % DEFAULT_COHORT_COLORS.length`.
 */
export const DEFAULT_COHORT_COLORS: readonly string[] = [
	"#6366F1", // indigo
	"#EC4899", // pink
	"#F59E0B", // amber
	"#10B981", // emerald
	"#3B82F6", // blue
	"#8B5CF6", // violet
	"#EF4444", // red
	"#14B8A6", // teal
];

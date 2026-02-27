import { EGO_RADIUS, MAX_NODE_RADIUS, MIN_NODE_RADIUS, NODE_RADIUS } from "@/lib/graph-config";
import type { Person, Relationship, SocialGraph } from "@/types/graph";

/** Compute visual radius for a node based on its connection count. */
export function getVisualRadius(degree: number, maxDegree: number, isEgo: boolean): number {
	if (isEgo) return EGO_RADIUS;
	if (maxDegree <= 1) return NODE_RADIUS;
	const normalized = Math.sqrt(degree) / Math.sqrt(maxDegree);
	return MIN_NODE_RADIUS + normalized * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
}

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

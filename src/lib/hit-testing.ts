import { type Quadtree, quadtree } from "d3-quadtree";
import type { Person, Relationship } from "@/types/graph";
import { EGO_RADIUS, NODE_RADIUS } from "./graph-constants";

const EDGE_HIT_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// Cached quadtree — rebuilt only when invalidateHitTestCache() is called
// (typically on each simulation tick, not on every mouse event).
// ---------------------------------------------------------------------------

let cachedTree: Quadtree<Person & { x: number; y: number }> | null = null;
let cacheGeneration = 0;
let treeBuildGeneration = -1;

export function invalidateHitTestCache(): void {
	cacheGeneration++;
}

function getQuadtree(
	persons: Person[],
): Quadtree<Person & { x: number; y: number }> | null {
	if (cachedTree && treeBuildGeneration === cacheGeneration) {
		return cachedTree;
	}

	const tree = quadtree<Person & { x: number; y: number }>()
		.x((d) => d.x)
		.y((d) => d.y);

	for (const p of persons) {
		if (p.x !== undefined && p.y !== undefined) {
			tree.add(p as Person & { x: number; y: number });
		}
	}

	// Check if any nodes were added
	if (tree.extent() === undefined) return null;

	cachedTree = tree;
	treeBuildGeneration = cacheGeneration;
	return cachedTree;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSq = dx * dx + dy * dy;

	if (lengthSq === 0) {
		const ex = px - x1;
		const ey = py - y1;
		return Math.sqrt(ex * ex + ey * ey);
	}

	let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
	t = Math.max(0, Math.min(1, t));

	const closestX = x1 + t * dx;
	const closestY = y1 + t * dy;
	const ex = px - closestX;
	const ey = py - closestY;
	return Math.sqrt(ex * ex + ey * ey);
}

// ---------------------------------------------------------------------------
// Node hit-testing (quadtree-accelerated, cached)
// ---------------------------------------------------------------------------

export function hitTestNode(
	persons: Person[],
	x: number,
	y: number,
	customNodeRadius?: number,
	customEgoRadius?: number,
): Person | null {
	const nr = customNodeRadius ?? NODE_RADIUS;
	const er = customEgoRadius ?? EGO_RADIUS;
	const searchRadius = Math.max(nr, er);

	const tree = getQuadtree(persons);
	if (!tree) return null;

	const nearest = tree.find(x, y, searchRadius);
	if (!nearest) return null;

	const dx = x - nearest.x;
	const dy = y - nearest.y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	const radius = nearest.isEgo ? er : nr;

	return dist <= radius ? nearest : null;
}

// ---------------------------------------------------------------------------
// Edge hit-testing (linear scan — fine for typical graph sizes)
// ---------------------------------------------------------------------------

export function hitTestEdge(
	relationships: Relationship[],
	persons: Person[],
	x: number,
	y: number,
): Relationship | null {
	const personMap = new Map<string, Person & { x: number; y: number }>();
	for (const p of persons) {
		if (p.x !== undefined && p.y !== undefined) {
			personMap.set(p.id, p as Person & { x: number; y: number });
		}
	}

	let closest: Relationship | null = null;
	let closestDist = EDGE_HIT_THRESHOLD;

	for (const rel of relationships) {
		const source = personMap.get(rel.sourceId);
		const target = personMap.get(rel.targetId);
		if (!source || !target) continue;

		const dist = pointToSegmentDistance(
			x,
			y,
			source.x,
			source.y,
			target.x,
			target.y,
		);

		if (dist < closestDist) {
			closestDist = dist;
			closest = rel;
		}
	}

	return closest;
}

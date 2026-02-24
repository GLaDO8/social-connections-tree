import { quadtree, type Quadtree } from "d3-quadtree";
import type { Person, Relationship } from "@/types/graph";

const NODE_RADIUS = 12;
const EGO_RADIUS = 16;
const EDGE_HIT_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Compute the shortest distance from point (px, py) to the line segment
 * defined by endpoints (x1, y1) and (x2, y2).
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  // Degenerate segment (source === target): fall back to point distance.
  if (lengthSq === 0) {
    const ex = px - x1;
    const ey = py - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }

  // Project (px, py) onto the infinite line and clamp to [0, 1].
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const ex = px - closestX;
  const ey = py - closestY;
  return Math.sqrt(ex * ex + ey * ey);
}

// ---------------------------------------------------------------------------
// Node hit-testing (quadtree-accelerated)
// ---------------------------------------------------------------------------

/**
 * Find the person whose rendered circle contains the canvas coordinate (x, y).
 * Uses a d3-quadtree for O(log n) lookup.
 *
 * Returns `null` if no node is within hit range.
 */
export function hitTestNode(
  persons: Person[],
  x: number,
  y: number
): Person | null {
  // Only consider persons that have been positioned by the simulation.
  const positioned = persons.filter(
    (p): p is Person & { x: number; y: number } =>
      p.x !== undefined && p.y !== undefined
  );

  if (positioned.length === 0) return null;

  const tree: Quadtree<Person & { x: number; y: number }> = quadtree<
    Person & { x: number; y: number }
  >()
    .x((d) => d.x)
    .y((d) => d.y)
    .addAll(positioned);

  // The search radius must accommodate the largest possible node (ego).
  const nearest = tree.find(x, y, EGO_RADIUS);
  if (!nearest) return null;

  // Verify the click actually falls inside the node's visual circle.
  const dx = x - nearest.x;
  const dy = y - nearest.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = nearest.isEgo ? EGO_RADIUS : NODE_RADIUS;

  return dist <= radius ? nearest : null;
}

// ---------------------------------------------------------------------------
// Edge hit-testing (linear scan — fine for typical graph sizes)
// ---------------------------------------------------------------------------

/**
 * Find the relationship whose rendered edge is closest to the canvas
 * coordinate (x, y), provided it is within `EDGE_HIT_THRESHOLD` pixels.
 *
 * **Caller convention:** only invoke this when `hitTestNode` returns `null`
 * so that nodes always take priority over edges.
 *
 * Returns `null` if no edge is close enough.
 */
export function hitTestEdge(
  relationships: Relationship[],
  persons: Person[],
  x: number,
  y: number
): Relationship | null {
  // Build a lookup map for positioned persons.
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
      target.y
    );

    if (dist < closestDist) {
      closestDist = dist;
      closest = rel;
    }
  }

  return closest;
}

import {
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
	forceSimulation,
	type Simulation,
	type SimulationLinkDatum,
} from "d3-force";
import {
	BOND_DISTANCE,
	BOND_LINK_STRENGTH,
	BOND_RADIAL,
	type BondStrength,
	getBondStrength,
	getCategory,
	PHYSICS,
	type RelationshipCategory,
} from "@/lib/graph-config";
import { computeDegreeStats, getVisualRadius } from "@/lib/graph-constants";
import type { Cohort, Person, Relationship, RelationshipType } from "@/types/graph";

export interface LinkDatum extends SimulationLinkDatum<Person> {
	id: string;
	type: RelationshipType;
	category: RelationshipCategory;
	label: string;
	bondStrength: BondStrength;
}

export type ForceSimulation = Simulation<Person, LinkDatum>;

function toLinks(relationships: Relationship[], persons: Person[]): LinkDatum[] {
	const idSet = new Set(persons.map((p) => p.id));
	return relationships
		.filter((r) => idSet.has(r.sourceId) && idSet.has(r.targetId))
		.map((r) => ({
			id: r.id,
			// d3-force's forceLink resolves string IDs → Person objects
			// via the .id() accessor. The type mismatch is intentional.
			source: r.sourceId as unknown as Person,
			target: r.targetId as unknown as Person,
			type: r.type,
			category: getCategory(r.type),
			label: r.label ?? "",
			bondStrength: getBondStrength(r.type),
		}));
}

/** Compute the strongest bond each person has to the ego node. */
function computeBestBondToEgo(
	persons: Person[],
	relationships: Relationship[],
): Map<string, BondStrength> {
	const egoId = persons.find((p) => p.isEgo)?.id;
	const bestBondToEgo = new Map<string, BondStrength>();
	if (!egoId) return bestBondToEgo;
	for (const r of relationships) {
		const otherId = r.sourceId === egoId ? r.targetId : r.targetId === egoId ? r.sourceId : null;
		if (otherId) {
			const bond = getBondStrength(r.type);
			const current = bestBondToEgo.get(otherId);
			if (!current || bond > current) {
				bestBondToEgo.set(otherId, bond);
			}
		}
	}
	return bestBondToEgo;
}

/** Create a radial force that arranges nodes in concentric rings by bond to ego. */
function makeRadialForce(bestBondToEgo: Map<string, BondStrength>, cx: number, cy: number) {
	return forceRadial<Person>(
		(d) => {
			if (d.isEgo) return 0;
			const bond = bestBondToEgo.get(d.id);
			if (bond) return BOND_RADIAL[bond];
			return 350; // nodes not directly connected to ego — outer ring
		},
		cx,
		cy,
	).strength((d) => {
		if (d.isEgo) return PHYSICS.radialStrengthEgo;
		return PHYSICS.radialStrengthNode;
	});
}

/**
 * Pre-position nodes based on cohort membership and bond-to-ego distance
 * so the simulation starts from a sensible layout instead of a tight spiral.
 */
export function seedInitialPositions(
	persons: Person[],
	relationships: Relationship[],
	cohorts: Cohort[],
	cx: number,
	cy: number,
): void {
	const bestBondToEgo = computeBestBondToEgo(persons, relationships);

	// Build cohortId → member indices
	const cohortMembers = new Map<string, Person[]>();
	for (const c of cohorts) {
		cohortMembers.set(c.id, []);
	}
	for (const p of persons) {
		if (p.isEgo) continue;
		for (const cid of p.cohortIds) {
			cohortMembers.get(cid)?.push(p);
		}
	}

	// Assign angular sectors to cohorts (evenly spaced)
	const activeCohorts = cohorts.filter((c) => (cohortMembers.get(c.id)?.length ?? 0) > 0);
	const cohortAngle = new Map<string, number>();
	const sectorSize = activeCohorts.length > 0 ? (2 * Math.PI) / activeCohorts.length : 0;
	for (let i = 0; i < activeCohorts.length; i++) {
		cohortAngle.set(activeCohorts[i].id, i * sectorSize - Math.PI / 2);
	}

	// Track which nodes have been positioned
	const positioned = new Set<string>();

	// Position ego at center
	for (const p of persons) {
		if (p.isEgo) {
			p.x = cx;
			p.y = cy;
			positioned.add(p.id);
		}
	}

	// Position cohort members in their sector
	for (const p of persons) {
		if (positioned.has(p.id)) continue;
		if (p.cohortIds.length === 0) continue;

		// Compute average angle across all cohorts this person belongs to
		let angleSum = 0;
		let angleCount = 0;
		for (const cid of p.cohortIds) {
			const a = cohortAngle.get(cid);
			if (a !== undefined) {
				angleSum += a;
				angleCount++;
			}
		}
		if (angleCount === 0) continue;

		const angle = angleSum / angleCount;
		const bond = bestBondToEgo.get(p.id);
		const radius = bond ? BOND_RADIAL[bond] : 350;
		// Add jitter to prevent exact overlap
		const jitter = (Math.random() - 0.5) * radius * 0.3;
		const angleJitter = (Math.random() - 0.5) * sectorSize * 0.4;

		p.x = cx + Math.cos(angle + angleJitter) * (radius + jitter);
		p.y = cy + Math.sin(angle + angleJitter) * (radius + jitter);
		positioned.add(p.id);
	}

	// Position non-cohort nodes at their bond ring, spread around unclaimed angles
	const unpositioned = persons.filter((p) => !positioned.has(p.id));
	if (unpositioned.length > 0) {
		// Find angles NOT occupied by cohorts — use gaps or a dedicated sector
		const startAngle =
			activeCohorts.length > 0
				? activeCohorts.length * sectorSize - Math.PI / 2 + sectorSize * 0.5
				: 0;
		const spreadAngle = activeCohorts.length > 0 ? Math.min(sectorSize, Math.PI / 2) : 2 * Math.PI;

		for (let i = 0; i < unpositioned.length; i++) {
			const p = unpositioned[i];
			const bond = bestBondToEgo.get(p.id);
			const radius = bond ? BOND_RADIAL[bond] : 350;
			const frac = unpositioned.length > 1 ? i / (unpositioned.length - 1) : 0.5;
			const angle = startAngle + (frac - 0.5) * spreadAngle;
			const jitter = (Math.random() - 0.5) * radius * 0.2;

			p.x = cx + Math.cos(angle) * (radius + jitter);
			p.y = cy + Math.sin(angle) * (radius + jitter);
		}
	}
}

/**
 * Custom d3 force that pulls nodes toward their cohort centroid(s).
 * Multi-cohort nodes get pulled toward the average of their cohort centroids (Venn effect).
 */
export function forceCohortCluster(persons: Person[], cohorts: Cohort[], strength: number) {
	let nodes: Person[] = persons;

	function force(alpha: number) {
		// Compute live centroid of each cohort
		const centroidX = new Map<string, number>();
		const centroidY = new Map<string, number>();
		const centroidCount = new Map<string, number>();

		for (const c of cohorts) {
			centroidX.set(c.id, 0);
			centroidY.set(c.id, 0);
			centroidCount.set(c.id, 0);
		}

		for (const p of nodes) {
			if (p.isEgo) continue;
			for (const cid of p.cohortIds) {
				if (centroidX.has(cid)) {
					centroidX.set(cid, centroidX.get(cid)! + (p.x ?? 0));
					centroidY.set(cid, centroidY.get(cid)! + (p.y ?? 0));
					centroidCount.set(cid, centroidCount.get(cid)! + 1);
				}
			}
		}

		// Finalize centroids
		for (const c of cohorts) {
			const count = centroidCount.get(c.id) ?? 0;
			if (count > 0) {
				centroidX.set(c.id, centroidX.get(c.id)! / count);
				centroidY.set(c.id, centroidY.get(c.id)! / count);
			}
		}

		// Pull each node toward its cohort centroid(s)
		for (const p of nodes) {
			if (p.isEgo) continue;
			if (p.cohortIds.length === 0) continue;

			let targetX = 0;
			let targetY = 0;
			let validCohorts = 0;

			for (const cid of p.cohortIds) {
				const count = centroidCount.get(cid) ?? 0;
				if (count > 1) {
					// Only pull if there are other members (not just self)
					targetX += centroidX.get(cid)!;
					targetY += centroidY.get(cid)!;
					validCohorts++;
				}
			}

			if (validCohorts === 0) continue;

			targetX /= validCohorts;
			targetY /= validCohorts;

			const px = p.x ?? 0;
			const py = p.y ?? 0;
			p.vx = (p.vx ?? 0) + (targetX - px) * strength * alpha;
			p.vy = (p.vy ?? 0) + (targetY - py) * strength * alpha;
		}
	}

	force.initialize = (_nodes: Person[]) => {
		nodes = _nodes;
	};

	return force;
}

export function createSimulation(
	persons: Person[],
	relationships: Relationship[],
	cohorts: Cohort[],
	width: number,
	height: number,
): Simulation<Person, LinkDatum> {
	const links = toLinks(relationships, persons);
	const { degreeMap, maxDegree } = computeDegreeStats(persons, relationships);
	const bestBondToEgo = computeBestBondToEgo(persons, relationships);

	const cx = width / 2;
	const cy = height / 2;

	// Seed positions before simulation starts
	seedInitialPositions(persons, relationships, cohorts, cx, cy);

	const simulation = forceSimulation<Person, LinkDatum>(persons)
		.force(
			"link",
			forceLink<Person, LinkDatum>(links)
				.id((d) => d.id)
				.strength((d) => BOND_LINK_STRENGTH[d.bondStrength])
				.distance((d) => BOND_DISTANCE[d.bondStrength]),
		)
		.force(
			"charge",
			forceManyBody<Person>()
				.strength((d) => {
					const degree = degreeMap.get(d.id) ?? 0;
					const r = getVisualRadius(degree, maxDegree, d.isEgo);
					// Charge proportional to -radius^2 prevents hub collapse
					return -(r * r) / 2;
				})
				.distanceMax(PHYSICS.chargeDistanceMax),
		)
		.force("center", forceCenter<Person>(cx, cy).strength(PHYSICS.centerStrength))
		.force(
			"collide",
			forceCollide<Person>()
				.radius((d) => {
					const degree = degreeMap.get(d.id) ?? 0;
					const r = getVisualRadius(degree, maxDegree, d.isEgo);
					return r + PHYSICS.collisionPadding + Math.min(degree * 1.5, 12);
				})
				.strength(PHYSICS.collideStrength)
				.iterations(PHYSICS.collideIterations),
		)
		.force("radial", makeRadialForce(bestBondToEgo, cx, cy))
		.force("cluster", forceCohortCluster(persons, cohorts, PHYSICS.clusterStrength))
		.alphaDecay(PHYSICS.alphaDecay)
		.alphaMin(PHYSICS.alphaMin)
		.velocityDecay(PHYSICS.velocityDecay);

	return simulation;
}

/** Bump alpha and restart the simulation to re-settle nodes. */
export function reheat(simulation: Simulation<Person, LinkDatum>): void {
	simulation.alpha(PHYSICS.reheatAlpha).restart();
}

/** Replace nodes and links, then reheat so the simulation re-settles. */
export function syncData(
	simulation: Simulation<Person, LinkDatum>,
	persons: Person[],
	relationships: Relationship[],
	cohorts: Cohort[],
): void {
	const links = toLinks(relationships, persons);

	// Seed positions for newly added nodes that have no x/y yet
	const centerForce = simulation.force("center") as
		| ReturnType<typeof forceCenter<Person>>
		| undefined;
	const cx = centerForce?.x() ?? 0;
	const cy = centerForce?.y() ?? 0;

	const newNodes = persons.filter((p) => p.x == null && p.y == null && !p.isEgo);
	if (newNodes.length > 0) {
		seedInitialPositions(newNodes, relationships, cohorts, cx, cy);
	}

	simulation.nodes(persons);

	const linkForce = simulation.force("link") as
		| ReturnType<typeof forceLink<Person, LinkDatum>>
		| undefined;
	if (linkForce) {
		linkForce.links(links);
	}

	const { degreeMap, maxDegree } = computeDegreeStats(persons, relationships);

	const collideForce = simulation.force("collide") as
		| ReturnType<typeof forceCollide<Person>>
		| undefined;
	if (collideForce) {
		collideForce.radius((d: Person) => {
			const degree = degreeMap.get(d.id) ?? 0;
			const r = getVisualRadius(degree, maxDegree, d.isEgo);
			return r + 6 + Math.min(degree * 1.5, 12);
		});
	}

	const bestBondToEgo = computeBestBondToEgo(persons, relationships);

	simulation.force("radial", makeRadialForce(bestBondToEgo, cx, cy));
	simulation.force("cluster", forceCohortCluster(persons, cohorts, PHYSICS.clusterStrength));

	reheat(simulation);
}

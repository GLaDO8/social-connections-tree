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
import { getVisualRadius } from "@/lib/graph-constants";
import type {
	BondStrength,
	RelationshipCategory,
} from "@/lib/relationship-config";
import { getBondStrength, getCategory } from "@/lib/relationship-config";
import type { Person, Relationship, RelationshipType } from "@/types/graph";

export interface LinkDatum extends SimulationLinkDatum<Person> {
	id: string;
	type: RelationshipType;
	category: RelationshipCategory;
	label: string;
	bondStrength: BondStrength;
}

export type ForceSimulation = Simulation<Person, LinkDatum>;

// Bond strength → link distance: closer bond = shorter link
const BOND_DISTANCE: Record<BondStrength, number> = {
	5: 60, // inseparable — very close
	4: 100, // close
	3: 160, // moderate
	2: 220, // casual
	1: 300, // distant
};

// Bond strength → link rigidity: stronger bond = more rigid
const BOND_STRENGTH: Record<BondStrength, number> = {
	5: 0.85,
	4: 0.6,
	3: 0.4,
	2: 0.2,
	1: 0.1,
};

// Bond strength → radial target distance from ego (for concentric rings)
const BOND_RADIAL: Record<BondStrength, number> = {
	5: 100,
	4: 180,
	3: 280,
	2: 380,
	1: 500,
};

function toLinks(
	relationships: Relationship[],
	persons: Person[],
): LinkDatum[] {
	const idSet = new Set(persons.map((p) => p.id));
	return relationships
		.filter((r) => idSet.has(r.sourceId) && idSet.has(r.targetId))
		.map((r) => ({
			id: r.id,
			source: r.sourceId as unknown as Person,
			target: r.targetId as unknown as Person,
			type: r.type,
			category: getCategory(r.type),
			label: r.label ?? "",
			bondStrength: getBondStrength(r.type),
		}));
}

export function createSimulation(
	persons: Person[],
	relationships: Relationship[],
	width: number,
	height: number,
): Simulation<Person, LinkDatum> {
	const links = toLinks(relationships, persons);

	// Build degree map: how many connections each person has
	const degreeMap = new Map<string, number>();
	for (const r of relationships) {
		degreeMap.set(r.sourceId, (degreeMap.get(r.sourceId) ?? 0) + 1);
		degreeMap.set(r.targetId, (degreeMap.get(r.targetId) ?? 0) + 1);
	}

	// Build a map of each person's closest bond to ego (lowest bond = farthest ring)
	const egoNode = persons.find((p) => p.isEgo);
	const egoId = egoNode?.id;
	const bestBondToEgo = new Map<string, BondStrength>();
	if (egoId) {
		for (const r of relationships) {
			const otherId =
				r.sourceId === egoId
					? r.targetId
					: r.targetId === egoId
						? r.sourceId
						: null;
			if (otherId) {
				const bond = getBondStrength(r.type);
				const current = bestBondToEgo.get(otherId);
				if (!current || bond > current) {
					bestBondToEgo.set(otherId, bond);
				}
			}
		}
	}

	const cx = width / 2;
	const cy = height / 2;
	// maxDegree among non-ego nodes — ego dominates and flattens sizing otherwise
	let maxDegree = 1;
	for (const [id, deg] of degreeMap) {
		if (id !== egoId && deg > maxDegree) maxDegree = deg;
	}

	const simulation = forceSimulation<Person, LinkDatum>(persons)
		.force(
			"link",
			forceLink<Person, LinkDatum>(links)
				.id((d) => d.id)
				.strength((d) => BOND_STRENGTH[d.bondStrength])
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
				.distanceMax(500),
		)
		.force("center", forceCenter<Person>(cx, cy).strength(0.05))
		.force(
			"collide",
			forceCollide<Person>()
				.radius((d) => {
					const degree = degreeMap.get(d.id) ?? 0;
					const r = getVisualRadius(degree, maxDegree, d.isEgo);
					// Visual radius + breathing room
					return r + 6 + Math.min(degree * 1.5, 12);
				})
				.strength(0.8)
				.iterations(2),
		)
		// Radial force: push nodes to concentric rings based on bond to ego
		.force(
			"radial",
			forceRadial<Person>(
				(d) => {
					if (d.isEgo) return 0; // ego stays at center
					const bond = bestBondToEgo.get(d.id);
					if (bond) return BOND_RADIAL[bond];
					// Nodes not directly connected to ego — outer ring
					return 350;
				},
				cx,
				cy,
			).strength((d) => {
				if (d.isEgo) return 1; // strong pull to center for ego
				return 0.15; // gentle nudge — don't override link forces
			}),
		)
		.alphaDecay(0.012)
		.alphaMin(0.001)
		.velocityDecay(0.35);

	return simulation;
}

/** Bump alpha and restart the simulation to re-settle nodes. */
export function reheat(simulation: Simulation<Person, LinkDatum>): void {
	simulation.alpha(0.3).restart();
}

/** Replace nodes and links, then reheat so the simulation re-settles. */
export function syncData(
	simulation: Simulation<Person, LinkDatum>,
	persons: Person[],
	relationships: Relationship[],
): void {
	const links = toLinks(relationships, persons);

	simulation.nodes(persons);

	const linkForce = simulation.force("link") as
		| ReturnType<typeof forceLink<Person, LinkDatum>>
		| undefined;
	if (linkForce) {
		linkForce.links(links);
	}

	// Rebuild degree map for updated charge & collide
	const degreeMap = new Map<string, number>();
	for (const r of relationships) {
		degreeMap.set(r.sourceId, (degreeMap.get(r.sourceId) ?? 0) + 1);
		degreeMap.set(r.targetId, (degreeMap.get(r.targetId) ?? 0) + 1);
	}

	// Update collide radii (maxDegree among non-ego only)
	const egoIdForSync = persons.find((p) => p.isEgo)?.id;
	let maxDegree = 1;
	for (const [id, deg] of degreeMap) {
		if (id !== egoIdForSync && deg > maxDegree) maxDegree = deg;
	}
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

	// Rebuild radial force with updated bond-to-ego map
	const egoNode = persons.find((p) => p.isEgo);
	const egoId = egoNode?.id;
	const bestBondToEgo = new Map<string, BondStrength>();
	if (egoId) {
		for (const r of relationships) {
			const otherId =
				r.sourceId === egoId
					? r.targetId
					: r.targetId === egoId
						? r.sourceId
						: null;
			if (otherId) {
				const bond = getBondStrength(r.type);
				const current = bestBondToEgo.get(otherId);
				if (!current || bond > current) {
					bestBondToEgo.set(otherId, bond);
				}
			}
		}
	}

	// Get center from the existing center force
	const centerForce = simulation.force("center") as
		| ReturnType<typeof forceCenter<Person>>
		| undefined;
	const cx = centerForce?.x() ?? 0;
	const cy = centerForce?.y() ?? 0;

	simulation.force(
		"radial",
		forceRadial<Person>(
			(d) => {
				if (d.isEgo) return 0;
				const bond = bestBondToEgo.get(d.id);
				if (bond) return BOND_RADIAL[bond];
				return 350;
			},
			cx,
			cy,
		).strength((d) => {
			if (d.isEgo) return 1;
			return 0.15;
		}),
	);

	reheat(simulation);
}

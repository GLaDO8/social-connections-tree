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
import type { Person, Relationship, RelationshipType } from "@/types/graph";

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

export function createSimulation(
	persons: Person[],
	relationships: Relationship[],
	width: number,
	height: number,
): Simulation<Person, LinkDatum> {
	const links = toLinks(relationships, persons);
	const { degreeMap, maxDegree } = computeDegreeStats(persons, relationships);
	const bestBondToEgo = computeBestBondToEgo(persons, relationships);

	const cx = width / 2;
	const cy = height / 2;

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
): void {
	const links = toLinks(relationships, persons);

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

	const centerForce = simulation.force("center") as
		| ReturnType<typeof forceCenter<Person>>
		| undefined;
	const cx = centerForce?.x() ?? 0;
	const cy = centerForce?.y() ?? 0;

	simulation.force("radial", makeRadialForce(bestBondToEgo, cx, cy));

	reheat(simulation);
}

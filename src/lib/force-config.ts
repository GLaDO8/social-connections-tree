import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
} from "d3-force";
import type {
  BondStrength,
  Person,
  Relationship,
  RelationshipCategory,
  RelationshipType,
} from "@/types/graph";

export interface LinkDatum extends SimulationLinkDatum<Person> {
  id: string;
  type: RelationshipType;
  category: RelationshipCategory;
  label: string;
  bondStrength: BondStrength;
}

export type ForceSimulation = Simulation<Person, LinkDatum>;

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
      category: r.category,
      label: r.label,
      bondStrength: r.bondStrength,
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

  const simulation = forceSimulation<Person, LinkDatum>(persons)
    .force(
      "link",
      forceLink<Person, LinkDatum>(links)
        .id((d) => d.id)
        .strength((d) => {
          // stronger links = more rigid
          if (d.type === "partner") return 0.8;
          if (d.type === "acquaintance") return 0.2;
          return 0.5;
        })
        .distance((d) => {
          if (d.type === "partner") return 40;
          if (d.type === "acquaintance") return 150;
          return 100;
        }),
    )
    .force(
      "charge",
      forceManyBody<Person>()
        .strength((d) => -30 * Math.sqrt((degreeMap.get(d.id) ?? 0) + 1))
        .distanceMax(300),
    )
    .force("center", forceCenter<Person>(width / 2, height / 2))
    .force("collide", forceCollide<Person>().radius(22))
    .alphaDecay(0.01) // slower cooling
    .alphaMin(0.001) // converge tighter
    .velocityDecay(0.3); // more friction = less oscillation

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

  reheat(simulation);
}

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Person, Relationship } from '@/types/graph';

interface LinkDatum extends SimulationLinkDatum<Person> {
  id: string;
  bondStrength: number;
}

function toLinks(relationships: Relationship[], persons: Person[]): LinkDatum[] {
  const idSet = new Set(persons.map((p) => p.id));
  return relationships
    .filter((r) => idSet.has(r.sourceId) && idSet.has(r.targetId))
    .map((r) => ({
      id: r.id,
      source: r.sourceId as unknown as Person,
      target: r.targetId as unknown as Person,
      bondStrength: r.bondStrength,
    }));
}

export function createSimulation(
  persons: Person[],
  relationships: Relationship[],
  width: number,
  height: number
): Simulation<Person, LinkDatum> {
  const links = toLinks(relationships, persons);

  const simulation = forceSimulation<Person, LinkDatum>(persons)
    .force(
      'link',
      forceLink<Person, LinkDatum>(links)
        .id((d) => d.id)
        .distance((d) => 300 - d.bondStrength * 50)
    )
    .force('charge', forceManyBody<Person>().strength(-400))
    .force('center', forceCenter<Person>(width / 2, height / 2))
    .force('collide', forceCollide<Person>().radius(22))
    .alphaDecay(0.02);

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
  relationships: Relationship[]
): void {
  const links = toLinks(relationships, persons);

  simulation.nodes(persons);

  const linkForce = simulation.force('link') as ReturnType<typeof forceLink<Person, LinkDatum>> | undefined;
  if (linkForce) {
    linkForce.links(links);
  }

  reheat(simulation);
}

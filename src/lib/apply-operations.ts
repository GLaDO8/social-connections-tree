import type { GraphAction } from "@/lib/graph-reducer";
import {
	DEFAULT_COHORT_COLORS,
	getRelationshipCategory,
} from "@/lib/graph-utils";
import type { Person, SocialGraph } from "@/types/graph";
import type { GraphOperation } from "@/types/operations";

/**
 * Fuzzy name match — case-insensitive, trimmed.
 * Returns the first person whose name matches, or undefined.
 */
function findPersonByName(persons: Person[], name: string): Person | undefined {
	const normalized = name.trim().toLowerCase();
	// Exact match first
	const exact = persons.find((p) => p.name.toLowerCase() === normalized);
	if (exact) return exact;
	// "me" matches the ego node
	if (normalized === "me") return persons.find((p) => p.isEgo);
	return undefined;
}

function findCohortByName(
	cohorts: SocialGraph["cohorts"],
	name: string,
): SocialGraph["cohorts"][number] | undefined {
	const normalized = name.trim().toLowerCase();
	return cohorts.find((c) => c.name.toLowerCase() === normalized);
}

/**
 * Apply a list of graph operations (from NL parse) to the graph
 * by dispatching reducer actions. Resolves names → IDs, auto-creates
 * missing persons/cohorts.
 *
 * Returns the list of dispatched actions for debugging.
 */
export function applyOperations(
	operations: GraphOperation[],
	state: SocialGraph,
	dispatch: React.Dispatch<GraphAction>,
): GraphAction[] {
	const actions: GraphAction[] = [];
	// Track state locally so subsequent ops see prior additions
	let currentState = state;

	function act(action: GraphAction) {
		actions.push(action);
		dispatch(action);
		// Optimistically track additions in local state for name resolution
		if (action.type === "ADD_PERSON") {
			currentState = {
				...currentState,
				persons: [
					...currentState.persons,
					{ ...action.payload, id: `pending-${Date.now()}-${Math.random()}` },
				],
			};
		}
		if (action.type === "ADD_COHORT") {
			currentState = {
				...currentState,
				cohorts: [
					...currentState.cohorts,
					{ ...action.payload, id: `pending-${Date.now()}-${Math.random()}` },
				],
			};
		}
	}

	for (const op of operations) {
		switch (op.op) {
			case "add_cohort": {
				const existing = findCohortByName(currentState.cohorts, op.data.name);
				if (!existing) {
					const color =
						DEFAULT_COHORT_COLORS[
							currentState.cohorts.length % DEFAULT_COHORT_COLORS.length
						];
					act({
						type: "ADD_COHORT",
						payload: { name: op.data.name, color },
					});
				}
				break;
			}

			case "add_person": {
				const existing = findPersonByName(currentState.persons, op.data.name);
				if (existing) {
					// Person already exists — add cohorts if specified
					if (op.data.cohortNames?.length) {
						const cohortIds = op.data.cohortNames
							.map((cn) => findCohortByName(currentState.cohorts, cn)?.id)
							.filter((id): id is string => id != null);
						const newCohortIds = cohortIds.filter(
							(id) => !existing.cohortIds.includes(id),
						);
						if (newCohortIds.length > 0) {
							act({
								type: "UPDATE_PERSON",
								payload: {
									id: existing.id,
									cohortIds: [...existing.cohortIds, ...newCohortIds],
								},
							});
						}
					}
					break;
				}
				const cohortIds = (op.data.cohortNames ?? [])
					.map((cn) => findCohortByName(currentState.cohorts, cn)?.id)
					.filter((id): id is string => id != null);
				act({
					type: "ADD_PERSON",
					payload: {
						name: op.data.name,
						cohortIds,
						isEgo: false,
					},
				});
				break;
			}

			case "add_relationship": {
				const source = findPersonByName(
					currentState.persons,
					op.data.sourceName,
				);
				const target = findPersonByName(
					currentState.persons,
					op.data.targetName,
				);
				if (!source || !target) break; // skip if names unresolved
				// Check for duplicate
				const duplicate = currentState.relationships.find(
					(r) =>
						(r.sourceId === source.id && r.targetId === target.id) ||
						(r.sourceId === target.id && r.targetId === source.id),
				);
				if (duplicate) break;
				act({
					type: "ADD_RELATIONSHIP",
					payload: {
						sourceId: source.id,
						targetId: target.id,
						type: op.data.type,
						category: getRelationshipCategory(op.data.type),
						label: op.data.label,
						bondStrength: op.data.bondStrength,
					},
				});
				break;
			}

			case "update_person": {
				const person = findPersonByName(currentState.persons, op.data.name);
				if (!person) break;
				act({
					type: "UPDATE_PERSON",
					payload: { id: person.id, ...op.data.updates },
				});
				break;
			}

			case "update_relationship": {
				const source = findPersonByName(
					currentState.persons,
					op.data.sourceName,
				);
				const target = findPersonByName(
					currentState.persons,
					op.data.targetName,
				);
				if (!source || !target) break;
				const rel = currentState.relationships.find(
					(r) =>
						(r.sourceId === source.id && r.targetId === target.id) ||
						(r.sourceId === target.id && r.targetId === source.id),
				);
				if (!rel) break;
				const updates: Partial<typeof rel> = {};
				if (op.data.updates.type) {
					updates.type = op.data.updates.type;
					updates.category = getRelationshipCategory(op.data.updates.type);
				}
				if (op.data.updates.label) updates.label = op.data.updates.label;
				if (op.data.updates.bondStrength)
					updates.bondStrength = op.data.updates.bondStrength;
				act({
					type: "UPDATE_RELATIONSHIP",
					payload: { id: rel.id, ...updates },
				});
				break;
			}

			case "remove_person": {
				const person = findPersonByName(currentState.persons, op.data.name);
				if (!person || person.isEgo) break; // never remove ego
				act({ type: "REMOVE_PERSON", payload: { id: person.id } });
				break;
			}

			case "remove_relationship": {
				const source = findPersonByName(
					currentState.persons,
					op.data.sourceName,
				);
				const target = findPersonByName(
					currentState.persons,
					op.data.targetName,
				);
				if (!source || !target) break;
				const rel = currentState.relationships.find(
					(r) =>
						(r.sourceId === source.id && r.targetId === target.id) ||
						(r.sourceId === target.id && r.targetId === source.id),
				);
				if (!rel) break;
				act({ type: "REMOVE_RELATIONSHIP", payload: { id: rel.id } });
				break;
			}
		}
	}

	return actions;
}

import type { GraphAction } from "@/lib/graph-reducer";
import {
	DEFAULT_COHORT_COLORS,
	getRelationshipCategory,
} from "@/lib/graph-utils";
import type { Cohort, Person, SocialGraph } from "@/types/graph";
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
 * Resolve a list of graph operations (from NL parse) into reducer actions.
 * Resolves names → IDs, auto-creates missing persons/cohorts.
 * Does NOT dispatch — returns the list of actions for the caller to batch.
 */
export function resolveOperations(
	operations: GraphOperation[],
	state: SocialGraph,
): GraphAction[] {
	const actions: GraphAction[] = [];
	let currentState = state;

	function act(action: GraphAction) {
		actions.push(action);
		// Track additions in local state for name resolution by subsequent ops.
		// Use the same ID we pass to the reducer so relationships reference
		// the correct person/cohort.
		if (action.type === "ADD_PERSON" && action.payload.id) {
			currentState = {
				...currentState,
				persons: [
					...currentState.persons,
					{ ...action.payload, id: action.payload.id } as Person,
				],
			};
		}
		if (action.type === "ADD_COHORT" && action.payload.id) {
			currentState = {
				...currentState,
				cohorts: [
					...currentState.cohorts,
					{ ...action.payload, id: action.payload.id } as Cohort,
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
						payload: { id: crypto.randomUUID(), name: op.data.name, color },
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
						id: crypto.randomUUID(),
						name: op.data.name,
						cohortIds,
						isEgo: false,
					},
				});
				break;
			}

			case "add_relationship": {
				// Auto-create missing persons referenced in relationships.
				// Claude may omit add_person for people not directly connected to "Me".
				let source = findPersonByName(currentState.persons, op.data.sourceName);
				if (!source && op.data.sourceName.toLowerCase() !== "me") {
					act({
						type: "ADD_PERSON",
						payload: {
							id: crypto.randomUUID(),
							name: op.data.sourceName,
							cohortIds: [],
							isEgo: false,
						},
					});
					source = findPersonByName(currentState.persons, op.data.sourceName);
				}
				let target = findPersonByName(currentState.persons, op.data.targetName);
				if (!target && op.data.targetName.toLowerCase() !== "me") {
					act({
						type: "ADD_PERSON",
						payload: {
							id: crypto.randomUUID(),
							name: op.data.targetName,
							cohortIds: [],
							isEgo: false,
						},
					});
					target = findPersonByName(currentState.persons, op.data.targetName);
				}
				if (!source || !target) break;
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

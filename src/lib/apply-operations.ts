import { DEFAULT_BOND_STRENGTHS } from "@/lib/graph-constants";
import type { GraphAction } from "@/lib/graph-reducer";
import { graphReducer } from "@/lib/graph-reducer";
import {
	DEFAULT_COHORT_COLORS,
	getRelationshipCategory,
} from "@/lib/graph-utils";
import type {
	BondStrength,
	Cohort,
	Person,
	RelationshipType,
	SocialGraph,
} from "@/types/graph";
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

// ---------------------------------------------------------------------------
// Cohort completion helpers
// ---------------------------------------------------------------------------

/**
 * Infer a relationship type from a cohort name using keyword patterns.
 */
function inferRelationshipTypeFromCohort(cohortName: string): RelationshipType {
	const name = cohortName.toLowerCase();
	if (/college|school|class|university|batch/i.test(name)) return "classmate";
	if (/work|office|company|team/i.test(name)) return "colleague";
	if (/family/i.test(name)) return "family";
	if (/room/i.test(name)) return "roommate";
	return "friend";
}

/**
 * Generate ADD_RELATIONSHIP actions for all missing pairs within a cohort,
 * forming a complete subgraph among cohort members.
 */
export function generateCohortCompletionActions(
	cohortId: string,
	state: SocialGraph,
): GraphAction[] {
	const members = state.persons.filter((p) => p.cohortIds.includes(cohortId));
	if (members.length < 2) return [];

	const cohort = state.cohorts.find((c) => c.id === cohortId);
	const cohortName = cohort?.name ?? "";
	const relType = inferRelationshipTypeFromCohort(cohortName);
	const bondStrength: BondStrength = DEFAULT_BOND_STRENGTHS[relType];
	const category = getRelationshipCategory(relType);
	const label = cohortName.toLowerCase();

	const actions: GraphAction[] = [];

	for (let i = 0; i < members.length; i++) {
		for (let j = i + 1; j < members.length; j++) {
			const a = members[i];
			const b = members[j];
			// Check if relationship already exists
			const exists = state.relationships.some(
				(r) =>
					(r.sourceId === a.id && r.targetId === b.id) ||
					(r.sourceId === b.id && r.targetId === a.id),
			);
			if (!exists) {
				actions.push({
					type: "ADD_RELATIONSHIP",
					payload: {
						sourceId: a.id,
						targetId: b.id,
						type: relType,
						category,
						label,
						bondStrength,
					},
				});
			}
		}
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

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

	// Track which cohorts gained new members (for completion pass)
	const affectedCohortIds = new Set<string>();

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
							for (const cid of newCohortIds) affectedCohortIds.add(cid);
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
				for (const cid of cohortIds) affectedCohortIds.add(cid);
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
						bondStrength:
							op.data.bondStrength ?? DEFAULT_BOND_STRENGTHS[op.data.type],
						...(op.data.notes && { notes: op.data.notes }),
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
				if (op.data.updates.notes !== undefined)
					updates.notes = op.data.updates.notes;
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

	// -----------------------------------------------------------------------
	// Cohort completion pass: auto-connect all members within affected cohorts
	// -----------------------------------------------------------------------
	if (affectedCohortIds.size > 0) {
		// Build post-operation state by applying all actions so far
		let postOpState = state;
		for (const action of actions) {
			postOpState = graphReducer(postOpState, action);
		}

		for (const cohortId of affectedCohortIds) {
			const completionActions = generateCohortCompletionActions(
				cohortId,
				postOpState,
			);
			for (const ca of completionActions) {
				actions.push(ca);
				// Update postOpState so subsequent cohort completions see these edges
				postOpState = graphReducer(postOpState, ca);
			}
		}
	}

	return actions;
}

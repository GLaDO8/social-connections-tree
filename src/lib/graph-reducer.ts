import type {
  SocialGraph,
  Person,
  Relationship,
  Cohort,
} from "@/types/graph";

// ---------------------------------------------------------------------------
// Action types (discriminated union)
// ---------------------------------------------------------------------------

export type GraphAction =
  | { type: "ADD_PERSON"; payload: Omit<Person, "id"> }
  | { type: "REMOVE_PERSON"; payload: { id: string } }
  | { type: "UPDATE_PERSON"; payload: { id: string } & Partial<Person> }
  | { type: "ADD_RELATIONSHIP"; payload: Omit<Relationship, "id"> }
  | { type: "REMOVE_RELATIONSHIP"; payload: { id: string } }
  | {
      type: "UPDATE_RELATIONSHIP";
      payload: { id: string } & Partial<Relationship>;
    }
  | {
      type: "ADD_PERSON_WITH_RELATIONSHIP";
      payload: {
        person: Omit<Person, "id">;
        relationship: Omit<Relationship, "id" | "sourceId">;
      };
    }
  | { type: "ADD_COHORT"; payload: Omit<Cohort, "id"> }
  | { type: "UPDATE_COHORT"; payload: { id: string } & Partial<Cohort> }
  | { type: "REMOVE_COHORT"; payload: { id: string } }
  | { type: "SET_ACTIVE_COHORT"; payload: { id: string | null } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function withTimestamp(state: SocialGraph): SocialGraph {
  return {
    ...state,
    metadata: { ...state.metadata, updatedAt: now() },
  };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(): SocialGraph {
  const timestamp = now();
  return {
    persons: [
      {
        id: "ego",
        name: "Me",
        cohortIds: [],
        isEgo: true,
      },
    ],
    relationships: [],
    cohorts: [],
    activeCohortId: null,
    metadata: {
      title: "My Social Graph",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function graphReducer(
  state: SocialGraph,
  action: GraphAction,
): SocialGraph {
  switch (action.type) {
    case "ADD_PERSON": {
      const person: Person = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      return withTimestamp({
        ...state,
        persons: [...state.persons, person],
      });
    }

    case "REMOVE_PERSON": {
      const { id } = action.payload;
      return withTimestamp({
        ...state,
        persons: state.persons.filter((p) => p.id !== id),
        relationships: state.relationships.filter(
          (r) => r.sourceId !== id && r.targetId !== id,
        ),
      });
    }

    case "UPDATE_PERSON": {
      const { id, ...updates } = action.payload;
      return withTimestamp({
        ...state,
        persons: state.persons.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      });
    }

    case "ADD_RELATIONSHIP": {
      const relationship: Relationship = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      return withTimestamp({
        ...state,
        relationships: [...state.relationships, relationship],
      });
    }

    case "REMOVE_RELATIONSHIP": {
      const { id } = action.payload;
      return withTimestamp({
        ...state,
        relationships: state.relationships.filter((r) => r.id !== id),
      });
    }

    case "UPDATE_RELATIONSHIP": {
      const { id, ...updates } = action.payload;
      return withTimestamp({
        ...state,
        relationships: state.relationships.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
      });
    }

    case "ADD_PERSON_WITH_RELATIONSHIP": {
      const personId = crypto.randomUUID();
      const person: Person = { ...action.payload.person, id: personId };
      const relationship: Relationship = {
        ...action.payload.relationship,
        id: crypto.randomUUID(),
        sourceId: personId,
      };
      return withTimestamp({
        ...state,
        persons: [...state.persons, person],
        relationships: [...state.relationships, relationship],
      });
    }

    case "ADD_COHORT": {
      const cohort: Cohort = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      return withTimestamp({
        ...state,
        cohorts: [...state.cohorts, cohort],
      });
    }

    case "UPDATE_COHORT": {
      const { id, ...updates } = action.payload;
      return withTimestamp({
        ...state,
        cohorts: state.cohorts.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      });
    }

    case "REMOVE_COHORT": {
      const { id } = action.payload;
      return withTimestamp({
        ...state,
        cohorts: state.cohorts.filter((c) => c.id !== id),
        persons: state.persons.map((p) => ({
          ...p,
          cohortIds: p.cohortIds.filter((cid) => cid !== id),
        })),
        activeCohortId: state.activeCohortId === id ? null : state.activeCohortId,
      });
    }

    case "SET_ACTIVE_COHORT": {
      return withTimestamp({
        ...state,
        activeCohortId: action.payload.id,
      });
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

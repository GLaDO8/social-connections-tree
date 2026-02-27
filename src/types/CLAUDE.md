# src/types/ — Data Model + Operation Types

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `graph.ts` | Core data model: `Person`, `Relationship`, `Cohort`, `SocialGraph`, `RelationshipType` | Understanding or changing the data shape |
| `operations.ts` | `GraphOperation` discriminated union (7 ops: add/update/remove person/relationship + add_cohort) + `ParseInputResponse` | Changing NL operations or API response shape |

## Core Types

- **Person** — `id, name, cohortIds[], isEgo, notes?`. d3-force adds `x, y, vx, vy, fx, fy` at runtime (not persisted). `_addedAt` is transient for fade-in animation.
- **Relationship** — `id, sourceId, targetId, type: RelationshipType, label?, notes?`
- **Cohort** — `id, name, color`
- **SocialGraph** — `persons[], relationships[], cohorts[], activeCohortId, metadata`
- **RelationshipType** — 14 variants: friend, close_friend, best_friend, childhood_friend, partner, ex, crush, colleague, classmate, roommate, family, sibling, acquaintance, other

## Graph Operations

Operations use **names** (not IDs). The client resolver in `src/lib/apply-operations.ts` does fuzzy name→ID matching. The 7 operations: `add_person`, `add_relationship`, `add_cohort`, `update_person`, `update_relationship`, `remove_person`, `remove_relationship`.

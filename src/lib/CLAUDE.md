# src/lib/ — Core Graph Engine

This directory contains all non-React logic: physics simulation, rendering, state management, NL pipeline, and persistence. No UI components live here.

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `graph-config.ts` | **Single source of truth** for all config: relationship types/categories/bond strengths, physics constants, node sizing, rendering constants, edge colors, `VisualSettings` interface + defaults | Changing any visual or physics parameter |
| `graph-constants.ts` | Degree-based node sizing (`getVisualRadius`, `computeDegreeStats`) and `stripPhysicsState` helper | Changing node size logic or saving/snapshotting |
| `force-config.ts` | d3-force simulation setup (`createSimulation`, `reheat`, `syncData`) | Changing physics behavior or force layout |
| `canvas-renderer.ts` | Canvas 2D `render()` — draws edges, nodes, labels, highlights, selection glow, cohort rings | Changing how things look on canvas |
| `hit-testing.ts` | Quadtree-accelerated node hit-testing + linear edge hit-testing | Changing click/hover detection |
| `graph-reducer.ts` | `useReducer` actions + reducer for all CRUD on `SocialGraph` state | Adding new graph mutations |
| `apply-operations.ts` | NL operation resolver: names→IDs, auto-creates missing entities, cohort completion | Changing how NL output maps to state changes |
| `prompt.ts` | Claude system prompt + `buildSystemPrompt()` context builder | Changing NL parsing behavior or inference rules |
| `persistence.ts` | localStorage save/load, JSON export/import, Zod validation | Changing persistence or data format |
| `utils.ts` | Tailwind `cn()` merge helper | (Rarely needed) |

## Physics Model

The graph uses d3-force with 5 concurrent forces, configured in `force-config.ts` using constants from `graph-config.ts`:

1. **Link force** — Bond strength (1-5) controls both distance and rigidity. Strongest bonds (5) pull to 60px, weakest (1) to 300px. Configured via `BOND_DISTANCE` and `BOND_LINK_STRENGTH` tables.

2. **Charge (many-body)** — Repulsion proportional to `-radius²/2`. Hub nodes (high degree) repel more, preventing cluster collapse. Capped at `chargeDistanceMax: 500`.

3. **Center** — Weak pull (`0.05`) toward viewport center. Keeps graph from drifting.

4. **Collide** — Radius = visual radius + padding + degree bonus. Prevents node overlap. Runs 2 iterations per tick.

5. **Radial** — Concentric rings around ego based on bond strength to ego. Best friends at 100px ring, acquaintances at 500px. Ego pinned to center with strength 1.0, others at 0.15.

**Simulation lifecycle:** `createSimulation()` builds fresh. `syncData()` hot-swaps nodes/links and reheats. `reheat()` bumps alpha to 0.3 for re-settling. Alpha decays at 0.012, min 0.001, velocity decay 0.35.

## Node Sizing

Nodes scale by degree (connection count) using `getVisualRadius()` in `graph-constants.ts`:
- Ego: fixed 20px
- Others: 7px (min) to 18px (max), scaled by `sqrt(degree) / sqrt(maxDegree)`
- Ego excluded from max-degree calculation

## Rendering Pipeline

`canvas-renderer.ts` → `render()` runs per animation frame:
1. Fill background (`#09090B` default)
2. Apply zoom transform (translate + scale)
3. Compute viewport bounds for culling
4. Build degree stats + hover adjacency set
5. Draw edges — color by category, width/opacity by bond strength, dimming for non-highlighted
6. Draw nodes — color by first cohort (or default gray), degree-proportional radius, hover expand, selection glow, cohort ring, fade-in animation for new nodes
7. Draw labels — below nodes, LOD-gated at zoom < 0.4, always shown for highlighted nodes

**Edge colors:** default=`#999999`, romantic=`#FF69B4`, family=`#FFD700`, professional=`#4A90D9`

**Hover behavior:** Hovering a node highlights it + all adjacent nodes/edges. Everything else dims to `DIMMED_ALPHA: 0.04`.

## Hit Testing

`hit-testing.ts` uses a cached d3-quadtree for O(log n) node lookups. Cache invalidated per simulation tick via `invalidateHitTestCache()`. Edge hit-testing is linear scan (fine for typical graph sizes) with a 5px threshold.

## State Management

`graph-reducer.ts` — Pure reducer with discriminated union actions:
- `ADD_PERSON`, `REMOVE_PERSON`, `UPDATE_PERSON`
- `ADD_RELATIONSHIP`, `REMOVE_RELATIONSHIP`, `UPDATE_RELATIONSHIP`
- `ADD_PERSON_WITH_RELATIONSHIP` (atomic add person + edge)
- `ADD_COHORT`, `UPDATE_COHORT`, `REMOVE_COHORT`
- `SET_ACTIVE_COHORT`, `RESTORE_SNAPSHOT`

**Invariants:** Ego node cannot be removed. Removing a person cascades to delete their relationships. Removing a cohort strips it from all persons.

Initial state: single "Me" ego node, no relationships, no cohorts.

## NL → Graph Pipeline

**Prompt** (`prompt.ts`): System prompt teaches Claude to parse NL into tool calls. Key inference rules:
- "close" → `close_friend`, "best friend" → `best_friend`, "college" → `classmate`
- Default type: `friend`
- Labels are short phrases, notes capture backstory
- Ordering: add_cohort → add_person → add_relationship → updates → removes

**Resolver** (`apply-operations.ts`): `resolveOperations()` takes `GraphOperation[]` from Claude and produces `GraphAction[]`:
- Fuzzy name matching (case-insensitive, "me" → ego)
- Auto-creates missing persons referenced in relationships
- Auto-creates missing cohorts referenced by name
- Cohort completion: when members join a cohort, auto-connects all pairs within that cohort
- Tracks intermediate state so later operations can reference entities created by earlier ones

## Relationship Classification

Defined in `graph-config.ts`. Two derived properties from `RelationshipType`:

**Category** (for edge color): `getCategory(type)` → `default | romantic | family | professional`
- romantic: partner, ex, crush
- family: family, sibling
- professional: colleague, classmate
- default: everything else

**Bond Strength** (1-5, for spatial distance): `getBondStrength(type)`
- 5 (inseparable): best_friend
- 4 (close): close_friend, partner, family, sibling
- 3 (moderate): friend, childhood_friend, roommate
- 2 (casual): colleague, classmate, ex, crush
- 1 (distant): acquaintance, other

## Persistence

`persistence.ts` — localStorage with Zod validation:
- `saveGraph()` strips d3 physics state (`x, y, vx, vy, fx, fy`) before storing
- `loadGraph()` validates with Zod schema (must have ego node)
- `exportGraph()` / `importGraphFromFile()` for JSON file download/upload
- Storage key: `social-connections-tree:graph`

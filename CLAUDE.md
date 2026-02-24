# Social Connections Tree

Interactive web app for ego-centric social connection graphs. Canvas + d3-force physics (Obsidian-style). Dual input: natural language chat (Claude structured output) + direct canvas manipulation. The user ("me") is always the center of the graph.

**FigJam source**: `https://www.figma.com/board/M4eWEvMN9URM6QtlbldwT2/Social-Connections-Tree?node-id=0-1`

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Rendering | Canvas 2D — 60fps physics, no DOM overhead |
| Physics | d3-force running continuously — graph breathes |
| Primary input | Chat-style NL at bottom → Claude structured output → live updates |
| Secondary input | Direct canvas manipulation (drag, select, connect) |
| Editing | Select on canvas → floating properties panel |
| Nodes | Uniform circles. Color = cohort. Uniform size (for now). |
| Edges | Default gray. Accent: romantic=pink, family=yellow, professional=blue |
| Edge labels | Show on hover only |
| Bond strength | Spatial distance (closer = stronger). Thickness as optional secondary via dev panel. |
| Cohort views | Switchable highlight — all nodes visible, active cohort gets ring, layout unchanged |
| Focal point | Ego graph — "me" always at center |
| Page layout | Full-page canvas + bottom-docked chat + floating properties panel |
| Dev panel | Dial Kit-inspired controls to experiment with visual mappings at dev time |

---

## Tech Stack

- **Next.js 14+** (App Router, TypeScript)
- **d3-force, d3-zoom, d3-quadtree** — physics + zoom + hit-testing
- **Canvas 2D API** — rendering
- **Tailwind CSS** — UI panels
- **Claude API** (`@anthropic-ai/sdk` + `zod`) — NL structured output
- **localStorage** — persistence

---

## Data Model

```typescript
// src/types/graph.ts

interface Cohort {
  id: string;
  name: string;           // "FIITJEE Friends", "College Friends"
  color: string;          // hex color
}

interface Person {
  id: string;
  name: string;
  cohortIds: string[];    // can belong to multiple cohorts
  isEgo: boolean;         // true for "me" node (center)
  notes?: string;
  // d3-force mutates these in-place
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number | null;     // fixed position (during drag or for ego node)
  fy?: number | null;
}

type RelationshipCategory = 'default' | 'romantic' | 'family' | 'professional';

type RelationshipType =
  | 'friend' | 'close_friend' | 'best_friend' | 'childhood_friend'
  | 'partner' | 'ex' | 'crush'
  | 'colleague' | 'classmate' | 'roommate'
  | 'family' | 'sibling'
  | 'acquaintance' | 'other';

type BondStrength = 1 | 2 | 3 | 4 | 5; // 1=distant, 5=inseparable

interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  category: RelationshipCategory; // determines edge color
  label: string;                  // display text on hover
  bondStrength: BondStrength;
}

interface SocialGraph {
  persons: Person[];
  relationships: Relationship[];
  cohorts: Cohort[];
  activeCohortId: string | null;  // currently highlighted cohort (null = all)
  metadata: { title: string; createdAt: string; updatedAt: string; };
}
```

---

## Graph Operations (NL → structured output)

```
add_person       { name, cohortNames? }
add_relationship { sourceName, targetName, type, label, bondStrength }
add_cohort       { name }
update_person    { name, updates }
update_relationship { sourceName, targetName, updates }
remove_person    { name }
remove_relationship { sourceName, targetName }
```

Operations use names (not IDs). Client resolves names to IDs with fuzzy matching.

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Social Connections Tree       [Cohort: ▾ All] [⚙ Settings] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                     FULL-PAGE CANVAS                         │
│                                                              │
│      ● Kavya                                                 │
│       \  (hover: "childhood friends")                        │
│        ● ME ──────── ● Nishant                               │
│       /                                                      │
│      ● Ashish                                                │
│                                                              │
│                              ┌───────────────┐               │
│                              │ ● Kavya       │ ← floating    │
│                              │ Cohort: FIIT  │   properties  │
│                              │ Notes: [...]  │   (on select) │
│                              │ [Delete]      │               │
│                              └───────────────┘     [+][-][⊞] │
├──────────────────────────────────────────────────────────────┤
│ ✔ Added Kavya (FIITJEE) + childhood_friend                   │
│ ✔ Connected Ashish ↔ Nishant (classmate)                     │
│ [Type to add people and connections...]                  [⏎] │
└──────────────────────────────────────────────────────────────┘
```

- Header: title, cohort dropdown filter, settings
- Canvas: full page, physics simulation
- Properties: floating panel on right, appears on node/edge selection
- Chat: bottom-docked, collapsible, shows message history + input
- Zoom controls: floating bottom-right

---

## Architecture

### Physics + Rendering
```
d3-force (physics engine)          Canvas 2D (renderer)
├── Runs continuously (~60 tps)    ├── On each tick: clear → draw edges → draw nodes → draw labels
├── Forces:                        ├── Nodes: filled circles + name label below
│   forceLink (bondStrength →      ├── Edges: lines colored by category (gray/pink/yellow/blue)
│     shorter distance)            ├── Selected: glow ring on active node
│   forceManyBody (repulsion)      ├── Hovered: tooltip with name + relationship label
│   forceCenter (viewport center)  └── Cohort highlight: ring on active cohort members
│   forceCollide (prevent overlap)
│   forceX/Y to ego (ego stays center)
└── On change: alpha(0.3) → graph breathes and settles
```

### State Management
- React useReducer manages SocialGraph
- d3-force holds refs to same Person/Relationship arrays, mutates positions in-place
- Canvas renders from simulation positions — no React re-render per tick
- React re-renders only for UI (chat, properties panel, cohort selector)

### NL Pipeline
```
Chat input → POST /api/parse-input
  → { input, existingPersonNames[], existingCohortNames[] }
  → Claude (Zod structured output) → GraphOperation[]
  → Client applies operations → reducer updates → simulation reheats
  → Chat shows confirmation message
```

---

## Source File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/parse-input/route.ts      // NL → Claude → operations
├── types/
│   ├── graph.ts                      // Person, Relationship, Cohort, SocialGraph
│   └── operations.ts                 // GraphOperation types
├── lib/
│   ├── graph-reducer.ts              // useReducer: all CRUD actions
│   ├── apply-operations.ts           // NL operations → reducer dispatches
│   ├── graph-utils.ts                // name resolution, fuzzy match, uuid
│   ├── persistence.ts                // localStorage + JSON import/export
│   ├── force-config.ts               // d3-force setup + forces
│   ├── canvas-renderer.ts            // Canvas 2D: draw nodes, edges, labels, highlights
│   ├── hit-testing.ts                // click position → which node/edge
│   └── prompt.ts                     // Claude system prompt + context builder
├── context/
│   └── GraphContext.tsx              // state + dispatch + selection + simulation ref
├── components/
│   ├── GraphCanvas.tsx               // <canvas> + simulation + render loop + zoom
│   ├── ChatInput.tsx                 // Bottom-docked NL chat panel
│   ├── PropertiesPanel.tsx           // Floating edit panel for selected items
│   ├── ContextMenu.tsx               // Right-click menu
│   ├── Header.tsx                    // Title, cohort dropdown, settings
│   ├── CanvasToolbar.tsx             // Zoom buttons
│   ├── CohortManager.tsx            // Create/edit cohorts (in settings)
│   └── DevPanel.tsx                  // Dial Kit-inspired visual mapping controls
└── hooks/
    ├── useForceSimulation.ts         // d3-force lifecycle
    ├── useCanvasRenderer.ts          // requestAnimationFrame loop
    ├── useCanvasInteractions.ts      // click, drag, hover, zoom
    └── useAutoSave.ts                // debounced localStorage save
```

---

## Workflow: Feature → Spec → Plan → Tasks → Execute

### 1. SPEC — When a new feature or change is discussed/decided:
- Create `specs/<feature>.md` with the "what" (behavior, rules, layouts, edge cases)
- Update `specs/README.md` index with the new entry

### 2. PLAN — When implementation of a spec begins:
- Create `plans/<feature>.md` from the spec — the "how"
- Break into numbered, granular tasks with clear inputs/outputs
- Mark task dependencies (which tasks can run in parallel)
- Update `plans/README.md` index

### 3. EXECUTE — Run tasks from the plan:
- Launch independent tasks as parallel sub-agents
- Run dependent tasks sequentially
- Each sub-agent gets: task description + relevant spec + relevant source files

### 4. COMPLETE — After execution:
- Update spec status to "implemented"
- Update plan status to "done"
- Verify against spec's acceptance criteria

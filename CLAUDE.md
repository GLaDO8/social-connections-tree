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

Four core types in `src/types/graph.ts`: **Person** (name, cohortIds, isEgo), **Relationship** (sourceId, targetId, type, label), **Cohort** (name, color), and **SocialGraph** (the root container with persons, relationships, cohorts, metadata). d3-force adds `x, y, vx, vy, fx, fy` to Person at runtime — these are not persisted.

See `src/types/CLAUDE.md` for the full type reference.

---

## Graph Operations (NL → structured output)

```
add_person       { name, cohortNames? }
add_relationship { sourceName, targetName, type, label? }
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

---

## Directory Guide

| Directory | What lives there | Deep docs |
|-----------|-----------------|-----------|
| `src/lib/` | Physics, rendering, state, NL resolver, config | `src/lib/CLAUDE.md` |
| `src/components/` | React UI components (canvas, chat, panels, chrome) | `src/components/CLAUDE.md` |
| `src/hooks/` | Canvas + persistence lifecycle hooks | `src/hooks/CLAUDE.md` |
| `src/app/` | Next.js shell + API routes | `src/app/CLAUDE.md` |
| `src/types/` | Data model + operation types | `src/types/CLAUDE.md` |
| `src/context/` | GraphContext provider (state + undo/redo) | `src/context/GraphContext.tsx` |
| `specs/` | Feature specifications | `specs/README.md` |
| `plans/` | Implementation phase plans | `plans/README.md` |

---

## Workflow: Feature → Spec → Plan → Execute → Complete

1. **SPEC** — Create `specs/<feature>.md` (the "what": behavior, rules, edge cases). Update `specs/README.md`.
2. **PLAN** — Create `plans/<feature>.md` (the "how": numbered tasks, dependencies, inputs/outputs). Update `plans/README.md`.
3. **EXECUTE** — Launch independent tasks as parallel sub-agents, dependent tasks sequentially. Each sub-agent gets: task description + relevant spec + source files.
4. **COMPLETE** — Update spec/plan status. Verify against spec's acceptance criteria.

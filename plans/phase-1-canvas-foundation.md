# Phase 1: Canvas + Physics Foundation

**Status**: done
**Spec refs**: [visual-encoding](../specs/visual-encoding.md), [canvas-interactions](../specs/canvas-interactions.md)
**Goal**: A working Obsidian-style force graph with basic interaction.

## Tasks

### 1.1 Scaffold Next.js project
- `npx create-next-app@latest` with TypeScript + Tailwind + App Router
- Install: `d3-force`, `d3-zoom`, `d3-quadtree`
- Verify: `npm run dev` works
- **Parallel**: can run alongside nothing (first task)

### 1.2 Define TypeScript types
- Create `src/types/graph.ts` — Person, Relationship, Cohort, SocialGraph, BondStrength, RelationshipType, RelationshipCategory
- Create `src/types/operations.ts` — GraphOperation union type
- **Parallel**: can run with 1.1

### 1.3 Graph state context
- Create `src/context/GraphContext.tsx`
- useReducer with actions: ADD_PERSON, REMOVE_PERSON, UPDATE_PERSON, ADD_RELATIONSHIP, REMOVE_RELATIONSHIP, UPDATE_RELATIONSHIP, ADD_COHORT, SET_ACTIVE_COHORT
- Selection state: `selectedNodeId`, `selectedEdgeId`
- Initialize with ego node ("Me", `isEgo: true`, pinned to center)
- **Depends on**: 1.2

### 1.4 Force simulation hook
- Create `src/hooks/useForceSimulation.ts`
- Initialize d3-force simulation with: forceLink, forceManyBody, forceCenter, forceCollide
- Sync person/relationship arrays from graph state
- Reheat (`alpha(0.3)`) on structural changes
- Ego node pinned: `fx = centerX, fy = centerY`
- **Depends on**: 1.2, 1.3

### 1.5 Canvas renderer
- Create `src/lib/canvas-renderer.ts`
- Functions: `drawNodes()`, `drawEdges()`, `drawLabels()`
- Nodes: filled circles colored by cohort, name label below
- Edges: gray lines between connected nodes
- Selected node: glow ring
- **Depends on**: 1.2

### 1.6 GraphCanvas component
- Create `src/components/GraphCanvas.tsx`
- `<canvas>` element, full viewport
- requestAnimationFrame render loop calling canvas-renderer
- d3-zoom for pan/zoom
- Wire to simulation tick → re-draw
- **Depends on**: 1.4, 1.5

### 1.7 Canvas interactions
- Create `src/hooks/useCanvasInteractions.ts`
- Hit-testing: d3-quadtree for nodes
- Click node → select (highlight ring)
- Drag node → set fx/fy → release clears fx/fy
- Click empty → deselect
- **Depends on**: 1.6

### 1.8 Temporary add form
- Simple sidebar or modal form: "Add Person" (name, cohort) and "Add Relationship" (source, target, type, strength)
- Temporary — replaced by chat in Phase 3
- **Depends on**: 1.3

### 1.9 Page layout shell
- `src/app/page.tsx` — full-page canvas with GraphContext provider
- **Depends on**: 1.3, 1.6

## Verification
- [ ] Force graph renders on canvas with nodes as colored circles
- [ ] Drag a node → connected nodes react via physics
- [ ] Add a node via form → graph reheats, new node settles organically
- [ ] Ego node ("Me") stays pinned at center
- [ ] Pan and zoom work smoothly
- [ ] Click node → highlight ring appears

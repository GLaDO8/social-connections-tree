# src/components/ — React UI Components

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `GraphCanvas.tsx` | `<canvas>` element + d3-zoom + render loop orchestration. Wires up `useForceSimulation` + `useCanvasInteractions` | Changing canvas behavior, zoom, or context menu |
| `ChatInput.tsx` | Bottom-docked NL chat panel. Sends to `/api/parse-input`, applies operations via `resolveOperations` | Changing chat UX or NL flow |
| `PropertiesPanel.tsx` | Floating edit panel for selected node/edge. Reads `selectedNodeId`/`selectedEdgeId` from GraphContext | Changing node/edge editing UI |
| `Header.tsx` | Top bar: title, cohort dropdown filter, settings button | Changing header or cohort filtering |
| `ContextMenu.tsx` | Right-click menu on canvas (add person, delete, etc.) | Changing right-click actions |
| `CanvasToolbar.tsx` | Floating zoom buttons (bottom-right) | Changing zoom controls |
| `CohortManager.tsx` | Dialog for creating/editing/deleting cohorts (opened from Header settings) | Changing cohort CRUD UI |
| `DevPanel.tsx` | Dial Kit-powered controls for visual settings. Exposes `visualSettingsRef` via callback to parent | Changing dev-time visual tuning |
| `KeyboardShortcuts.tsx` | Global keyboard shortcut listener (undo, redo, delete, escape) | Adding or changing shortcuts |

## Component Tiers

- **Canvas tier:** `GraphCanvas` + hooks (`useForceSimulation`, `useCanvasInteractions`) — 60fps render loop, no React re-renders per tick
- **Feature tier:** `ChatInput`, `PropertiesPanel`, `CohortManager` — main user-facing features, React-rendered
- **Chrome tier:** `Header`, `CanvasToolbar`, `ContextMenu`, `KeyboardShortcuts` — lightweight UI shell

## Key Integration Points

- All components access state via `useGraph()` from `GraphContext`
- `DevPanel` ↔ `GraphCanvas` communicate via `visualSettingsRef` (mutable ref, not state — avoids re-renders). Wired through `page.tsx`
- `ChatInput` calls `/api/parse-input` then runs `resolveOperations()` + `batchDispatch()` client-side

## `ui/` Subdirectory

`ui/` contains shadcn/ui primitives (button, dialog, input, select, etc.). These are generated code — don't read or modify them unless fixing a shadcn issue.

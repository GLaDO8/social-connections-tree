# src/components/ — React UI Components

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `GraphCanvas.tsx` | `<canvas>` element + d3-zoom + d3-drag + render loop. Wires up `useForceSimulation` + `useCanvasInteractions`. Renders `CanvasToolbar` and `ContextMenu` as children. Includes local `useCanvasSize` hook, DPR handling, node tooltip overlay, and fit-to-screen logic. Props: `devSettingsRef`, `onScheduleRender` | Changing canvas behavior, zoom, tooltips, or render scheduling |
| `ChatInput.tsx` | Bottom-docked input panel with two modes: **Chat** (NL via `/api/parse-input` + `resolveOperations` + `batchDispatch`) and **Manual** (form-based person+relationship creation via `dispatch`). Collapsible, shows example prompts on empty graph | Changing chat UX, NL flow, or manual add form |
| `PropertiesPanel.tsx` | Floating edit panel (fixed top-right). Contains `NodePanel` (name, cohorts with completion edges via `generateCohortCompletionActions`, notes, relationship list, delete) and `EdgePanel` (type, label, derived bond strength as read-only slider, notes, delete). Reads `selectedNodeId`/`selectedEdgeId` from GraphContext | Changing node/edge editing UI or cohort assignment behavior |
| `Header.tsx` | Top bar: title, cohort dropdown filter (with member counts), export button, import button, settings button. Takes `onSettingsClick` prop. Uses `exportGraph`/`importGraphFromFile` from `@/lib/persistence` | Changing header, cohort filtering, or import/export |
| `ContextMenu.tsx` | Right-click menu on canvas nodes/edges. Shows Edit + Delete for nodes (delete hidden for ego), Edit + Delete for edges. No menu on empty canvas. Viewport-clamped positioning | Changing right-click actions |
| `CanvasToolbar.tsx` | Floating buttons (bottom-right): zoom in, zoom out, fit to screen. Pure presentational — callbacks from `GraphCanvas` | Changing zoom controls |
| `CohortManager.tsx` | Dialog for creating/editing/deleting cohorts. Inline color swatch picker, editable names, member counts. Opened via Header settings button | Changing cohort CRUD UI |
| `DevPanel.tsx` | DialKit-powered controls for `VisualSettings`. Exposes settings via `onSettingsRef` callback (mutable ref) + `onSettingsChange` callback for triggering re-renders. Persists to localStorage (`sct-dev-settings`). Reset remounts inner component via key. Renders nothing (headless) | Changing dev-time visual tuning or settings persistence |
| `KeyboardShortcuts.tsx` | Global keyboard shortcut listener. Renders nothing. Shortcuts: Cmd+Z undo, Cmd+Shift+Z redo, Delete/Backspace remove selected, Escape deselect, Cmd+Shift+D toggle dev panel | Adding or changing shortcuts |

## Component Tiers

- **Canvas tier:** `GraphCanvas` + hooks (`useForceSimulation`, `useCanvasInteractions`) — 60fps render loop, no React re-renders per tick
- **Feature tier:** `ChatInput`, `PropertiesPanel`, `CohortManager` — main user-facing features, React-rendered
- **Chrome tier:** `Header`, `CanvasToolbar`, `ContextMenu`, `KeyboardShortcuts` — lightweight UI shell

## Key Integration Points

- All components access state via `useGraph()` from `GraphContext`
- `DevPanel` ↔ `GraphCanvas` communicate via `devSettingsRef` (mutable ref, not state — avoids re-renders) + `onScheduleRender`/`onSettingsChange` callbacks for triggering canvas redraws. Wired through `page.tsx`
- `ChatInput` (chat mode) calls `/api/parse-input` then runs `resolveOperations()` + `batchDispatch()` client-side
- `GraphCanvas` renders `CanvasToolbar` and `ContextMenu` directly as children, passing zoom/close callbacks

## `ui/` Subdirectory

`ui/` contains shadcn/ui primitives (badge, button, card, dialog, input, label, scroll-area, select, separator, slider, textarea, tooltip). These are generated code — don't read or modify them unless fixing a shadcn issue.

# src/hooks/ — Canvas + Persistence Lifecycle

These hooks manage the d3-force simulation, canvas interaction events, and auto-persistence. They run inside `GraphCanvas` (simulation + interactions) and `GraphProvider` (auto-save).

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `useForceSimulation.ts` | Creates/manages d3-force simulation lifecycle. Pins ego node to center. Calls `syncData()` on person/relationship changes, `reheat()` to re-settle. Invalidates hit-test cache on each tick. | Changing physics behavior or simulation lifecycle |
| `useCanvasInteractions.ts` | d3-drag behavior for node dragging. Hit-tests clicks → node/edge selection. Hover tracking via `hoveredNodeIdRef`. Handles right-click → context menu, double-click → add person. | Changing click, drag, hover, or selection behavior |
| `useAutoSave.ts` | 500ms debounced `saveGraph()` triggered by `metadata.updatedAt` changes (structural mutations only, not physics ticks) | Changing save timing or trigger conditions |

## Key Patterns

- **Refs over state:** Simulation, hover, and transform are stored in refs to avoid React re-renders on every frame
- **Tick callback:** `useForceSimulation` accepts an `onTick` callback that triggers canvas re-render via `requestAnimationFrame`
- `useCanvasInteractions` takes `devSettingsRef` to read current visual settings for hit-test radius scaling

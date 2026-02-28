# src/hooks/ — Canvas + Persistence Lifecycle

These hooks manage the d3-force simulation, canvas interaction events, and auto-persistence. They run inside `GraphCanvas` (simulation + interactions) and `GraphProvider` (auto-save).

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `useForceSimulation.ts` | Creates/manages d3-force simulation lifecycle. On mount: creates simulation, pins ego node to center, runs a warm-up phase (boosted radial + cluster forces for N silent ticks), then starts animated settling at low alpha. Calls `syncData()` on person/relationship/cohort changes. Re-centers and reheats on canvas resize. Invalidates hit-test cache on each tick. | Changing physics behavior, warm-up tuning, or simulation lifecycle |
| `useCanvasInteractions.ts` | d3-drag behavior for node dragging (with pixel threshold). Hit-tests clicks → node/edge selection. Hover tracking via `hoveredNodeIdRef` + returns `hoveredNodeId`/`hoveredPosition` state for tooltip rendering. Escape key deselects all. Cursor changes to pointer on node hover. | Changing click, drag, hover, or selection behavior |
| `useAutoSave.ts` | 500ms debounced `saveGraph()` triggered when the `SocialGraph` state reference changes (structural mutations bump `metadata.updatedAt` in the reducer, producing a new reference; physics ticks do not) | Changing save timing or trigger conditions |

## Key Patterns

- **Refs over state:** Simulation, hover, transform, persons, relationships, callbacks, and devSettings are stored in refs to avoid React re-renders on every frame and prevent stale closures in event handlers
- **Tick callback:** `useForceSimulation` accepts an `onTick` callback that triggers canvas re-render via `requestAnimationFrame`
- **Warm-up phase:** Simulation runs N silent ticks with boosted radial/cluster forces before rendering begins, preventing the initial hairball layout. Post-warmup alpha is set low for gentle animated settling.
- **Screen-to-canvas transform:** `useCanvasInteractions` uses a `screenToCanvas` helper that applies the inverse of the current d3-zoom transform (from `transformRef`) to convert mouse coordinates to canvas/simulation space
- `useCanvasInteractions` takes `devSettingsRef` to read current visual settings for hit-test radius scaling

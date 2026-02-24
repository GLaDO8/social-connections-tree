# Spec: Undo/Redo

**Status**: draft

## Mechanism
Snapshot-based undo/redo on the `SocialGraph` state (excluding physics positions).

## What Gets Snapshotted
- `persons` array (without x/y/vx/vy — physics state not preserved)
- `relationships` array
- `cohorts` array
- `activeCohortId`

## What Does NOT Get Snapshotted
- Node positions (x, y, vx, vy) — physics recomputes these
- Canvas zoom/pan transform
- UI state (selection, panel open/closed)

## Keybindings
- `Cmd+Z` / `Ctrl+Z` → Undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` → Redo

## Behavior
- Undo: pop from undo stack, push current to redo stack, apply snapshot
- Redo: pop from redo stack, push current to undo stack, apply snapshot
- New action: push current to undo stack, clear redo stack
- After applying snapshot: simulation reheats (nodes settle into new topology)

## Stack Limits
- Max 50 undo steps (configurable)
- Oldest entries dropped when limit reached

## What Creates a Snapshot
- Any graph mutation: add/remove/update person, relationship, or cohort
- NL operations batch = single snapshot (all operations in one message = one undo step)
- Drag-to-reposition does NOT create a snapshot (physics positions are ephemeral)

## Edge Cases
- Undo on empty stack: no-op
- Redo after new action: redo stack cleared
- Undo removing a node: node reappears, simulation reheats, node settles naturally

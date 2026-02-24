# Phase 4: Undo/Redo + Persistence

**Status**: not started
**Spec refs**: [undo-redo](../specs/undo-redo.md)
**Goal**: Data survives refresh, undo/redo works, export/import supported.

## Tasks

### 4.1 Undo/redo stack
- Implement snapshot mechanism in GraphContext
- Undo stack (max 50), redo stack
- Snapshot on every graph mutation (NL batch = single snapshot)
- Snapshots exclude physics positions (x/y/vx/vy)
- **Depends on**: 1.3

### 4.2 Undo/redo keybindings
- `Cmd+Z` / `Ctrl+Z` → undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` → redo
- Wire to undo/redo stack
- After applying snapshot: simulation reheats
- **Depends on**: 4.1

### 4.3 localStorage persistence
- Create `src/lib/persistence.ts`
- Save: serialize SocialGraph (excluding physics state) to localStorage
- Load: deserialize on app init, seed GraphContext
- **Depends on**: 1.3

### 4.4 Auto-save hook
- Create `src/hooks/useAutoSave.ts`
- Debounced save (500ms) on structural changes
- Don't save on physics-only updates (position changes)
- **Depends on**: 4.3

### 4.5 JSON export/import
- Export: download SocialGraph as `.json` file
- Import: file upload, validate schema, load into state
- Accessible from Settings/Header
- **Depends on**: 4.3

### 4.6 Full interactions — context menu
- Create `src/components/ContextMenu.tsx`
- Right-click node → menu: Edit (focus properties), Delete (with confirmation), Connect to...
- HTML overlay positioned at click point
- **Depends on**: 1.7

### 4.7 Full interactions — keyboard
- Delete key → remove selected (confirm if has connections)
- Escape → deselect, dismiss panels
- **Depends on**: 1.7

### 4.8 Canvas toolbar
- Create `src/components/CanvasToolbar.tsx`
- Floating bottom-right: zoom in, zoom out, fit-to-screen
- **Depends on**: 1.6

## Verification
- [ ] Cmd+Z undoes last action, Cmd+Shift+Z redoes
- [ ] NL batch input → one undo step
- [ ] Refresh page → graph persists exactly
- [ ] Export JSON → import in new browser → identical graph
- [ ] Right-click node → context menu works
- [ ] Delete key removes selected node/edge
- [ ] Zoom controls work

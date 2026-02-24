# Phase 5: Polish + Edge Cases

**Status**: not started
**Spec refs**: [edge-cases](../specs/edge-cases.md)
**Goal**: Handle edge cases, smooth animations, polished empty state.

## Tasks

### 5.1 Empty state
- New user: "ME" node at center + chat input at bottom
- Placeholder: "Type to add people and connections..."
- Example prompts shown (e.g., "Try: 'Kavya is my childhood friend from FIITJEE'")
- **Depends on**: Phase 3

### 5.2 Ego node protection
- Cannot delete ego node (show warning)
- Cannot rename ego node
- Always pinned to center
- **Depends on**: 1.3

### 5.3 Duplicate name handling
- NL: "Add Kavya" when Kavya exists → update, don't duplicate
- Case-insensitive, whitespace-normalized name matching
- Fuzzy match threshold tuning
- **Depends on**: 3.4

### 5.4 Smooth transitions
- New nodes: fade in (alpha from 0 to 1 over ~300ms)
- Removed nodes: fade out
- Simulation reheat feels organic, not jarring
- **Depends on**: 1.5

### 5.5 Large graph optimization
- Viewport culling: skip drawing off-screen nodes
- Label hiding at low zoom levels
- Test with 100+ nodes
- **Depends on**: 1.6

### 5.6 Multi-cohort display
- Primary cohort color (first in cohortIds)
- Highlight ring on any matching cohort when filtered
- Cohort dropdown shows count
- **Depends on**: 2.7

### 5.7 Hit-testing refinement
- `src/lib/hit-testing.ts` — quadtree for nodes, line-distance for edges
- Proper priority: node > edge > empty
- Edge hit threshold ~5px
- **Depends on**: 1.7

## Verification (end-to-end)
- [ ] Open app → empty canvas with "ME" node + chat prompt
- [ ] Type "Kavya is my FIITJEE childhood friend, we're close" → Kavya appears near center, graph breathes
- [ ] Type "Ashish is my roommate, casual" → Ashish appears farther away
- [ ] Hover edge → tooltip: "childhood friends"
- [ ] Drag Kavya → connected nodes react naturally
- [ ] Click Kavya → panel shows name, cohort, relationships
- [ ] Change bond strength → Kavya moves closer/farther
- [ ] Cohort dropdown → "FIITJEE" → Kavya gets highlight ring
- [ ] Right-click Ashish → Delete → node removed, graph settles
- [ ] Refresh → everything persists
- [ ] Export JSON → import → identical graph
- [ ] Cmd+Z → undoes last action

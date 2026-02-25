# Phase 2: Visual Encoding + Properties Panel + Dev Panel

**Status**: done
**Spec refs**: [visual-encoding](../specs/visual-encoding.md), [properties-panel](../specs/properties-panel.md), [dev-panel](../specs/dev-panel.md)
**Goal**: Correct visual encoding, editable properties, and dev-time experimentation tools.

## Tasks

### 2.1 Edge colors by category
- Update `canvas-renderer.ts`: color edges by `RelationshipCategory`
- Gray (default), pink (romantic), yellow (family), blue (professional)
- **Parallel**: independent

### 2.2 Bond strength → link distance
- Update `force-config.ts`: `distance = 300 - (bondStrength × 50)`
- Verify: strong bonds visually closer on canvas
- **Parallel**: independent

### 2.3 Hover tooltips
- Node hover: show name + primary cohort name
- Edge hover: show relationship label + type
- Render as HTML overlay (positioned via canvas coordinates → screen coordinates)
- **Depends on**: 1.7 (interaction hooks)

### 2.4 Properties panel — node
- Create `src/components/PropertiesPanel.tsx`
- On node select: show name (editable), cohort (multi-select dropdown), notes (textarea), relationship list, delete button
- Changes dispatch immediately to reducer
- **Depends on**: 1.3, 1.7

### 2.5 Properties panel — edge
- Extend PropertiesPanel for edge selection
- Show: type dropdown, label text, bond strength slider (1-5), delete button
- Strength change → simulation reheats → node moves in real-time
- **Depends on**: 2.4

### 2.6 Header with cohort dropdown
- Create `src/components/Header.tsx`
- Title + cohort dropdown (All / specific cohort names)
- Dispatches SET_ACTIVE_COHORT to context
- **Depends on**: 1.3

### 2.7 Cohort highlight ring
- When `activeCohortId` is set: draw additional ring on members of that cohort
- Update canvas-renderer to check activeCohortId
- **Depends on**: 2.6

### 2.8 Cohort manager
- Create `src/components/CohortManager.tsx`
- Create/edit cohorts: name + color picker
- Accessible from settings/header
- **Depends on**: 1.3

### 2.9 Dev panel
- Create `src/components/DevPanel.tsx`
- Sliders: repulsion strength, link distance multiplier, alpha decay, collision padding
- Toggles: show edge labels, show edge colors
- Visual mapping selectors: bond strength → distance/thickness/size/intensity
- Toggle via keyboard shortcut (Cmd+Shift+D)
- Values persisted to localStorage
- **Depends on**: 1.4

## Verification
- [ ] Edges colored correctly by relationship category
- [ ] Strong bonds (4-5) visually closer than weak bonds (1-2)
- [ ] Hover node → tooltip with name and cohort
- [ ] Hover edge → tooltip with relationship label
- [ ] Select node → properties panel, edit name → updates on canvas
- [ ] Change bond strength in panel → node moves closer/farther in real-time
- [ ] Cohort dropdown → select cohort → members get highlight ring
- [ ] Dev panel: adjust repulsion slider → graph layout changes live

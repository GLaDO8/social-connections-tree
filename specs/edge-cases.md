# Spec: Edge Cases

**Status**: draft

## Duplicate Names
- NL input: "Add Kavya" when Kavya already exists → update existing Kavya (don't create duplicate)
- If genuinely different people: user must differentiate (e.g., "Add Kavya S" or "Add Kavya from college")
- Name matching is case-insensitive, whitespace-normalized
- Fuzzy matching threshold: configurable, but strict enough to avoid false merges

## Multi-Cohort Display
- A person belonging to multiple cohorts: use **primary cohort** color (first in `cohortIds`)
- When a cohort is highlighted: person appears highlighted if they belong to that cohort (regardless of primary)
- Cohort dropdown shows count: "FIITJEE (5)"
- No visual stacking of multiple cohort colors on a single node

## Large Graphs (100+ nodes)
- Canvas 2D handles 500+ nodes at 60fps — no rendering concern
- d3-quadtree for hit-testing keeps interaction snappy
- Force simulation: may need to increase repulsion or reduce alpha for stability
- Consider: viewport culling (skip drawing off-screen nodes) as optimization if needed
- Label rendering: may hide labels for distant/small nodes at low zoom levels

## Empty State
- New user sees: "ME" node at center + chat input at bottom
- Placeholder text in chat: "Type to add people and connections..."
- Example prompts shown: "Try: 'Kavya is my childhood friend from FIITJEE'"

## Ego Node Protection
- Cannot delete the ego node
- Cannot rename the ego node (always "Me" or user's name)
- Ego node always pinned to center (fx/fy set)
- Delete key on ego node: show warning, no action

## Disconnected Nodes
- Nodes with no edges float to periphery (natural physics behavior)
- Still visible and interactive
- NL: "Kavya knows Ashish" where neither is connected to ego → both nodes created, connected to each other but not to ego

## Relationship Directionality
- All relationships are bidirectional (undirected graph)
- "Kavya is my friend" = edge between me and Kavya
- "Kavya and Ashish are friends" = edge between Kavya and Ashish
- No arrow rendering needed

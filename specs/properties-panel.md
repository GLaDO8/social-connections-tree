# Spec: Properties Panel

**Status**: draft

## Overview
Floating panel on the right side of the canvas. Appears when a node or edge is selected. Dismissed on Escape or click-empty.

## Node Selected

```
┌─────────────────────┐
│ ● [Name]        [×] │
│                      │
│ Cohort: [dropdown ▾] │
│ Notes:               │
│ [textarea]           │
│                      │
│ Relationships:       │
│  → Kavya (friend)    │
│  → Ashish (roommate) │
│                      │
│ [Delete Node]        │
└─────────────────────┘
```

- **Name**: editable text field
- **Cohort**: multi-select dropdown (person can belong to multiple)
- **Notes**: textarea, optional
- **Relationships**: read-only list of connected edges (click to select that edge)
- **Delete**: red button, confirms if node has connections

## Edge Selected

```
┌─────────────────────┐
│ ↔ [Source] — [Tgt]  │
│                 [×]  │
│                      │
│ Type: [dropdown ▾]   │
│ Label: [text]        │
│ Strength: [1-5 ●●●] │
│                      │
│ [Delete Edge]        │
└─────────────────────┘
```

- **Type**: dropdown of RelationshipType values
- **Label**: editable text (display text on hover)
- **Strength**: 1-5 slider or stepper (updates spatial distance live)
- **Delete**: removes edge

## Behavior
- Panel floats on right side, does not overlap chat
- Positioned absolutely, z-index above canvas
- Smooth appear/disappear transition
- Changes dispatch immediately to graph reducer (no "Save" button)
- Strength change → simulation reheats → node moves in real-time

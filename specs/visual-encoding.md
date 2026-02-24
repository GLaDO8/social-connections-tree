# Spec: Visual Encoding

**Status**: draft

## Node Appearance

| Property | Rule |
|----------|------|
| Shape | Uniform circles (all nodes) |
| Color | Cohort color (from `Cohort.color` hex) |
| Size | Uniform radius (dev panel can experiment) |
| Label | Name text below circle, always visible |
| Ego node | Slightly larger radius + distinct border, always pinned to center |
| Selected | Glow ring / bright border |
| Hovered | Subtle highlight + pointer cursor |
| Cohort highlight | Additional ring when `activeCohortId` matches |

## Edge Appearance

| Property | Rule |
|----------|------|
| Default color | Gray (`#999`) |
| Romantic | Pink — applies to: partner, ex, crush |
| Family | Yellow — applies to: family, sibling |
| Professional | Blue — applies to: colleague, classmate |
| All others | Gray |
| Label | Shown on hover only (relationship type at edge midpoint) |
| Bond strength | **Spatial distance** is primary encoding (closer = stronger). Thickness as optional secondary via dev panel. |

### Category → Color Mapping

```typescript
const EDGE_COLORS: Record<RelationshipCategory, string> = {
  default: '#999999',
  romantic: '#FF69B4',
  family: '#FFD700',
  professional: '#4A90D9',
};
```

## Force Simulation Config

```
forceLink:      distance = 300 - (bondStrength × 50)
                → bondStrength 5 = 50px (inseparable)
                → bondStrength 1 = 250px (distant)
forceManyBody:  strength = -400 (repulsion between all nodes)
forceCenter:    viewport center
forceCollide:   radius = nodeRadius + 10 (prevent overlap)
forceX/Y:       ego node pinned to center via fx/fy
alphaDecay:     0.02 (slow cooldown → organic settling)
reheat:         simulation.alpha(0.3) on structural changes
```

## Design Constraints
- No double-encoding: don't map the same data to both thickness AND opacity
- Cohort highlight is additive — ring drawn on top of normal node appearance
- Edge labels must not overlap nodes (render at midpoint, offset if needed)

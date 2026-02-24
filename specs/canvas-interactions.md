# Spec: Canvas Interactions

**Status**: draft

## Interaction Table

| Action | Target | Behavior |
|--------|--------|----------|
| Click | Node | Select node → properties panel appears |
| Click | Edge | Select edge → properties panel shows relationship |
| Click | Empty space | Deselect all, dismiss panels |
| Drag | Node | Node follows cursor (`fx`/`fy`), connected nodes pull along via physics |
| Release drag | Node | Clear `fx`/`fy` → node settles naturally |
| Scroll | Canvas | Zoom in/out (d3-zoom) |
| Drag | Empty space | Pan viewport |
| Hover | Node | Tooltip: name + primary cohort. Cursor → pointer. |
| Hover | Edge | Tooltip: relationship label + type at edge midpoint |
| Right-click | Node | Context menu: Edit, Delete, Connect to... |
| Delete key | Selected item | Remove selected (confirm dialog if node has connections) |
| Escape | Any | Deselect all, dismiss panels and menus |

## Hit-Testing

- **Nodes**: d3-quadtree spatial index. Rebuilt on each tick. Query: find nearest node within `nodeRadius` of click point.
- **Edges**: Point-to-line-segment distance. Test all edges, return closest within threshold (~5px). Only tested if no node hit.
- **Priority**: Node hit > Edge hit > Empty space

## Drag Behavior

1. On mousedown on node: set `node.fx = node.x`, `node.fy = node.y`
2. On mousemove: update `node.fx`, `node.fy` to cursor position (transformed through d3-zoom)
3. On mouseup: clear `node.fx = null`, `node.fy = null` (except ego node, which stays pinned)
4. During drag: simulation stays warm (`alphaTarget(0.3)`)
5. On release: `alphaTarget(0)` → simulation cools down naturally

## Zoom/Pan (d3-zoom)

- Mouse scroll = zoom
- Click-drag on empty = pan
- Transform stored on canvas element
- Canvas renderer applies transform before drawing
- Hit-testing inverts transform to get canvas coordinates from screen coordinates

## Selection State

- Single selection only (for now)
- Selected item stored in GraphContext
- Properties panel reads from selection
- Click empty or Escape clears selection

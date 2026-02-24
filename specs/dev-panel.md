# Spec: Dev Panel

**Status**: draft

## Purpose
Development-time control panel to experiment with visual mappings. Once best settings are found, they get baked as defaults and the panel becomes optional.

Inspired by [Dial Kit](https://joshpuckett.me/dialkit).

## Toggle
- Keyboard shortcut (e.g., `Cmd+Shift+D` or backtick)
- Also accessible via Settings menu
- State persisted to localStorage

## Controls

### Visual Mapping Experiments
| Control | Options | Default |
|---------|---------|---------|
| Bond strength maps to | distance / thickness / node size / color intensity | distance |
| Connection count maps to | nothing / node size / node opacity | nothing |

### Force Simulation Params
| Param | Range | Default |
|-------|-------|---------|
| Repulsion strength | -100 to -1000 | -400 |
| Link distance multiplier | 0.5x to 3x | 1x |
| Alpha decay | 0.005 to 0.1 | 0.02 |
| Collision radius padding | 0 to 30 | 10 |

### Edge Rendering
| Toggle | Default |
|--------|---------|
| Show edge labels always | off |
| Show edge colors | on |
| Edge thickness range (min-max) | 1-3px |

### Node Rendering
| Param | Range | Default |
|-------|-------|---------|
| Node radius | 5 to 30 | 12 |
| Label font size | 8 to 18 | 11 |
| Highlight style | glow / ring / bold-border | glow |

## Layout
- Floating panel, top-right or collapsible sidebar
- Semi-transparent background so canvas remains visible
- Sliders update simulation in real-time (no apply button)

## Persistence
- Current slider values saved to localStorage
- "Reset to defaults" button

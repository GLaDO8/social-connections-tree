import type { Person, Relationship, Cohort, RelationshipCategory } from '@/types/graph';
import { NODE_RADIUS, EGO_RADIUS } from './graph-constants';

const EDGE_COLORS: Record<RelationshipCategory, string> = {
  default: '#999999',
  romantic: '#FF69B4',
  family: '#FFD700',
  professional: '#4A90D9',
};

const DEFAULT_NODE_COLOR = '#6B7280';
const LABEL_COLOR = '#333333';
const LABEL_FONT = '11px sans-serif';

const brightenCache = new Map<string, string>();

function brighten(hex: string): string {
  const cached = brightenCache.get(hex);
  if (cached) return cached;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.min(255, c + 40);
  const result = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  brightenCache.set(hex, result);
  return result;
}

export function render(
  ctx: CanvasRenderingContext2D,
  persons: Person[],
  relationships: Relationship[],
  cohorts: Cohort[],
  options: {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    hoveredNodeId: string | null;
    width: number;
    height: number;
    transform: { x: number; y: number; k: number };
  }
): void {
  const { selectedNodeId, selectedEdgeId, hoveredNodeId, width, height, transform } = options;

  // Build lookup maps once per frame
  const personMap = new Map<string, Person>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }

  const cohortColorMap = new Map<string, string>();
  for (const c of cohorts) {
    cohortColorMap.set(c.id, c.color);
  }

  // 1. Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 2. Save context and apply zoom transform
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);

  // 3. Draw edges — batched by style to reduce draw calls
  const edgeBatches = new Map<string, { sx: number; sy: number; tx: number; ty: number }[]>();

  for (const rel of relationships) {
    const source = personMap.get(rel.sourceId);
    const target = personMap.get(rel.targetId);
    if (!source || !target) continue;
    if (source.x == null || source.y == null || target.x == null || target.y == null) continue;

    const color = EDGE_COLORS[rel.category] ?? EDGE_COLORS.default;
    const lineWidth = rel.id === selectedEdgeId ? 3 : 1;
    const key = `${color}:${lineWidth}`;

    let batch = edgeBatches.get(key);
    if (!batch) {
      batch = [];
      edgeBatches.set(key, batch);
    }
    batch.push({ sx: source.x, sy: source.y, tx: target.x, ty: target.y });
  }

  for (const [key, edges] of edgeBatches) {
    const colonIdx = key.lastIndexOf(':');
    ctx.strokeStyle = key.slice(0, colonIdx);
    ctx.lineWidth = Number(key.slice(colonIdx + 1));
    ctx.beginPath();
    for (const e of edges) {
      ctx.moveTo(e.sx, e.sy);
      ctx.lineTo(e.tx, e.ty);
    }
    ctx.stroke();
  }

  // 4. Draw nodes
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const person of persons) {
    if (person.x == null || person.y == null) continue;

    const baseRadius = person.isEgo ? EGO_RADIUS : NODE_RADIUS;
    const cohortId = person.cohortIds[0];
    const color = cohortId ? (cohortColorMap.get(cohortId) ?? DEFAULT_NODE_COLOR) : DEFAULT_NODE_COLOR;
    const isSelected = person.id === selectedNodeId;
    const isHovered = person.id === hoveredNodeId;

    // Selected glow ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(person.x, person.y, baseRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '40';
      ctx.fill();
    }

    // Node circle
    const drawRadius = isHovered ? baseRadius + 3 : baseRadius;
    ctx.beginPath();
    ctx.arc(person.x, person.y, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? brighten(color) : color;
    ctx.fill();

    // Label
    ctx.fillStyle = LABEL_COLOR;
    ctx.fillText(person.name, person.x, person.y + drawRadius + 4);
  }

  // 5. Restore context
  ctx.restore();
}

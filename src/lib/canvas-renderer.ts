import type { Person, Relationship, Cohort, RelationshipCategory } from '@/types/graph';

const EDGE_COLORS: Record<RelationshipCategory, string> = {
  default: '#999999',
  romantic: '#FF69B4',
  family: '#FFD700',
  professional: '#4A90D9',
};

const DEFAULT_NODE_COLOR = '#6B7280';
const LABEL_COLOR = '#333333';
const NODE_RADIUS = 12;
const EGO_RADIUS = 16;
const LABEL_FONT = '11px sans-serif';

function getCohortColor(person: Person, cohorts: Cohort[]): string {
  if (person.cohortIds.length === 0) return DEFAULT_NODE_COLOR;
  const cohort = cohorts.find((c) => c.id === person.cohortIds[0]);
  return cohort?.color ?? DEFAULT_NODE_COLOR;
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

  // Build a lookup map for persons by id
  const personMap = new Map<string, Person>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }

  // 1. Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 2. Save context and apply zoom transform
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);

  // 3. Draw edges
  for (const rel of relationships) {
    const source = personMap.get(rel.sourceId);
    const target = personMap.get(rel.targetId);
    if (!source || !target) continue;
    if (source.x == null || source.y == null || target.x == null || target.y == null) continue;

    const isSelected = rel.id === selectedEdgeId;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = EDGE_COLORS[rel.category] ?? EDGE_COLORS.default;
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();
  }

  // 4. Draw nodes
  for (const person of persons) {
    if (person.x == null || person.y == null) continue;

    const baseRadius = person.isEgo ? EGO_RADIUS : NODE_RADIUS;
    const color = getCohortColor(person, cohorts);
    const isSelected = person.id === selectedNodeId;
    const isHovered = person.id === hoveredNodeId;

    // Selected glow ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(person.x, person.y, baseRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '40'; // ~25% opacity
      ctx.fill();
    }

    // Node circle
    const drawRadius = isHovered ? baseRadius + 3 : baseRadius;
    ctx.beginPath();
    ctx.arc(person.x, person.y, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? brighten(color) : color;
    ctx.fill();

    // Label
    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(person.name, person.x, person.y + drawRadius + 4);
  }

  // 5. Restore context
  ctx.restore();
}

/** Brighten a hex color by blending it toward white. */
function brighten(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.min(255, c + 40);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

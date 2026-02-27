import type { RelationshipCategory } from "@/lib/relationship-config";
import { getBondStrength, getCategory } from "@/lib/relationship-config";
import type { DevSettings } from "@/types/dev-settings";
import type { Cohort, Person, Relationship } from "@/types/graph";
import { EGO_RADIUS, getVisualRadius, NODE_RADIUS } from "./graph-constants";

const FALLBACK_EDGE_COLORS: Record<RelationshipCategory, string> = {
	default: "#999999",
	romantic: "#FF69B4",
	family: "#FFD700",
	professional: "#4A90D9",
};

const FALLBACK_DEFAULT_NODE_COLOR = "#6B7280";
const FALLBACK_LABEL_COLOR = "#D1D5DB";

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

function opacityToHexAlpha(opacity: number): string {
	const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
	return alpha.toString(16).padStart(2, "0");
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
		activeCohortId: string | null;
		width: number;
		height: number;
		transform: { x: number; y: number; k: number };
		visualSettings?: DevSettings;
	},
): void {
	const {
		selectedNodeId,
		selectedEdgeId,
		hoveredNodeId,
		activeCohortId,
		width,
		height,
		transform,
		visualSettings: vs,
	} = options;

	// Derive all visual params with fallbacks
	const nodeRadius = vs?.nodeRadius ?? NODE_RADIUS;
	const egoRadius = vs?.egoRadius ?? EGO_RADIUS;
	const defaultNodeColor = vs?.defaultNodeColor ?? FALLBACK_DEFAULT_NODE_COLOR;
	const nodeBorderWidth = vs?.nodeBorderWidth ?? 0;
	const nodeBorderColor = vs?.nodeBorderColor ?? "#FFFFFF";
	const hoverExpand = vs?.hoverExpand ?? 3;
	const selectedGlowOffset = vs?.selectedGlowOffset ?? 6;
	const selectedGlowOpacity = vs?.selectedGlowOpacity ?? 0.25;
	const cohortRingOffset = vs?.cohortRingOffset ?? 4;
	const cohortRingWidth = vs?.cohortRingWidth ?? 2;
	const edgeWidth = vs?.edgeWidth ?? 1;
	const edgeWidthMin = vs?.edgeWidthMin ?? 0.5;
	const edgeWidthMax = vs?.edgeWidthMax ?? 4;
	const bondToThickness = vs?.bondToThickness ?? false;
	const selectedEdgeWidth = vs?.selectedEdgeWidth ?? 3;
	const labelColor = vs?.labelColor ?? FALLBACK_LABEL_COLOR;
	const labelSize = vs?.labelSize ?? 11;
	const labelOffset = vs?.labelOffset ?? 4;
	const showLabels = vs?.showLabels ?? true;
	const canvasBgColor = vs?.canvasBgColor ?? null;

	const edgeColors: Record<RelationshipCategory, string> = vs
		? {
				default: vs.edgeColorDefault,
				romantic: vs.edgeColorRomantic,
				family: vs.edgeColorFamily,
				professional: vs.edgeColorProfessional,
			}
		: FALLBACK_EDGE_COLORS;

	// Build lookup maps once per frame
	const personMap = new Map<string, Person>();
	for (const p of persons) {
		personMap.set(p.id, p);
	}

	const cohortColorMap = new Map<string, string>();
	for (const c of cohorts) {
		cohortColorMap.set(c.id, c.color);
	}

	// 1. Clear / fill canvas background
	if (canvasBgColor) {
		ctx.fillStyle = canvasBgColor;
		ctx.fillRect(0, 0, width, height);
	} else {
		ctx.clearRect(0, 0, width, height);
	}

	// 2. Save context and apply zoom transform
	ctx.save();
	ctx.translate(transform.x, transform.y);
	ctx.scale(transform.k, transform.k);

	// Visible viewport in world coordinates (for culling off-screen elements)
	const viewMinX = -transform.x / transform.k;
	const viewMinY = -transform.y / transform.k;
	const viewMaxX = (width - transform.x) / transform.k;
	const viewMaxY = (height - transform.y) / transform.k;
	const viewPadding = 50;

	// 3. Build adjacency + degree data for hover-highlight and node sizing
	const degreeMap = new Map<string, number>();
	const egoIds = new Set<string>();
	for (const p of persons) {
		if (p.isEgo) egoIds.add(p.id);
	}
	for (const rel of relationships) {
		degreeMap.set(rel.sourceId, (degreeMap.get(rel.sourceId) ?? 0) + 1);
		degreeMap.set(rel.targetId, (degreeMap.get(rel.targetId) ?? 0) + 1);
	}
	// maxDegree among non-ego nodes only — ego's degree dominates and flattens sizing
	let maxDegree = 1;
	for (const [id, deg] of degreeMap) {
		if (!egoIds.has(id) && deg > maxDegree) maxDegree = deg;
	}

	// When a node is hovered, compute which nodes/edges are adjacent
	const highlightNodeIds = new Set<string>();
	const highlightEdgeIds = new Set<string>();
	const isHighlighting = hoveredNodeId != null;

	if (hoveredNodeId) {
		highlightNodeIds.add(hoveredNodeId);
		for (const rel of relationships) {
			if (rel.sourceId === hoveredNodeId) {
				highlightNodeIds.add(rel.targetId);
				highlightEdgeIds.add(rel.id);
			} else if (rel.targetId === hoveredNodeId) {
				highlightNodeIds.add(rel.sourceId);
				highlightEdgeIds.add(rel.id);
			}
		}
	}

	const DIMMED_ALPHA = 0.04; // near-invisible when not connected to hovered node

	// Bond strength → edge opacity: strong bonds are prominent, weak bonds are faint
	const BOND_OPACITY: Record<number, number> = {
		5: 0.9,
		4: 0.7,
		3: 0.5,
		2: 0.3,
		1: 0.2,
	};

	// 4. Draw edges
	for (const rel of relationships) {
		const source = personMap.get(rel.sourceId);
		const target = personMap.get(rel.targetId);
		if (!source || !target) continue;
		if (
			source.x == null ||
			source.y == null ||
			target.x == null ||
			target.y == null
		)
			continue;

		// Viewport culling
		const minEdgeX = Math.min(source.x, target.x);
		const maxEdgeX = Math.max(source.x, target.x);
		const minEdgeY = Math.min(source.y, target.y);
		const maxEdgeY = Math.max(source.y, target.y);
		if (
			maxEdgeX < viewMinX - viewPadding ||
			minEdgeX > viewMaxX + viewPadding ||
			maxEdgeY < viewMinY - viewPadding ||
			minEdgeY > viewMaxY + viewPadding
		)
			continue;

		const isEdgeHighlighted = highlightEdgeIds.has(rel.id);
		const category = getCategory(rel.type);
		const color = edgeColors[category] ?? edgeColors.default;
		const bs = getBondStrength(rel.type);

		let lw: number;
		let alpha: number;

		if (rel.id === selectedEdgeId) {
			lw = selectedEdgeWidth;
			alpha = 1;
		} else if (isHighlighting && isEdgeHighlighted) {
			// Highlighted edges: thicker + full color
			lw = bondToThickness
				? edgeWidthMin + ((bs - 1) / 4) * (edgeWidthMax - edgeWidthMin)
				: 1.5 + ((bs - 1) / 4) * 2.5; // 1.5 → 4.0
			alpha = 1;
		} else if (isHighlighting) {
			// Dimmed edges: near-invisible
			lw = 0.5;
			alpha = DIMMED_ALPHA;
		} else {
			// Default: vary by bond strength
			lw = bondToThickness
				? edgeWidthMin + ((bs - 1) / 4) * (edgeWidthMax - edgeWidthMin)
				: 0.5 + ((bs - 1) / 4) * 1.5;
			alpha = BOND_OPACITY[bs] ?? 0.5;
		}

		ctx.strokeStyle = color;
		ctx.lineWidth = lw;
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.moveTo(source.x, source.y);
		ctx.lineTo(target.x, target.y);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;

	// 5. Draw nodes
	const labelFont = `${labelSize}px sans-serif`;
	ctx.font = labelFont;
	ctx.textAlign = "center";
	ctx.textBaseline = "top";

	const FADE_DURATION = 300;

	for (const person of persons) {
		if (person.x == null || person.y == null) continue;

		// Viewport culling
		if (
			person.x < viewMinX - viewPadding ||
			person.x > viewMaxX + viewPadding ||
			person.y < viewMinY - viewPadding ||
			person.y > viewMaxY + viewPadding
		)
			continue;

		const isNodeHighlighted = highlightNodeIds.has(person.id);

		// Compute fade-in opacity for recently added nodes
		const addedAt = (person as any)._addedAt;
		let nodeAlpha = 1;
		if (addedAt) {
			const elapsed = Date.now() - addedAt;
			if (elapsed < FADE_DURATION) {
				nodeAlpha = elapsed / FADE_DURATION;
			}
		}
		// Apply hover dimming
		if (isHighlighting && !isNodeHighlighted) {
			nodeAlpha *= DIMMED_ALPHA;
		}
		ctx.globalAlpha = nodeAlpha;

		// Degree-proportional radius
		const degree = degreeMap.get(person.id) ?? 0;
		const baseRadius = person.isEgo
			? (vs?.egoRadius ?? EGO_RADIUS)
			: getVisualRadius(degree, maxDegree, false);
		const cohortId = person.cohortIds[0];
		const color = cohortId
			? (cohortColorMap.get(cohortId) ?? defaultNodeColor)
			: defaultNodeColor;
		const isSelected = person.id === selectedNodeId;
		const isHovered = person.id === hoveredNodeId;

		// Cohort highlight ring
		if (activeCohortId && person.cohortIds.includes(activeCohortId)) {
			ctx.beginPath();
			ctx.arc(
				person.x,
				person.y,
				baseRadius + cohortRingOffset,
				0,
				Math.PI * 2,
			);
			ctx.strokeStyle = color;
			ctx.lineWidth = cohortRingWidth;
			ctx.stroke();
		}

		// Selected glow ring
		if (isSelected) {
			ctx.beginPath();
			ctx.arc(
				person.x,
				person.y,
				baseRadius + selectedGlowOffset,
				0,
				Math.PI * 2,
			);
			ctx.fillStyle = `${color}${opacityToHexAlpha(selectedGlowOpacity)}`;
			ctx.fill();
		}

		// Node circle
		const drawRadius = isHovered ? baseRadius + hoverExpand : baseRadius;
		ctx.beginPath();
		ctx.arc(person.x, person.y, drawRadius, 0, Math.PI * 2);
		ctx.fillStyle = isHovered ? brighten(color) : color;
		ctx.fill();

		// Node border
		if (nodeBorderWidth > 0) {
			ctx.strokeStyle = nodeBorderColor;
			ctx.lineWidth = nodeBorderWidth;
			ctx.stroke();
		}

		// Label — show for highlighted nodes even at low zoom, use LOD otherwise
		const showLabel =
			showLabels &&
			(isNodeHighlighted || !isHighlighting) &&
			(isHighlighting || transform.k > 0.4);
		if (showLabel) {
			ctx.fillStyle = labelColor;
			ctx.fillText(person.name, person.x, person.y + drawRadius + labelOffset);
		}

		ctx.globalAlpha = 1;
	}

	// 6. Restore context
	ctx.restore();
}

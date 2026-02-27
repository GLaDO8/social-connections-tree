import {
	BOND_OPACITY,
	DIMMED_ALPHA,
	FADE_DURATION,
	getBondStrength,
	getCategory,
	type RelationshipCategory,
	VIEW_PADDING,
	VISUAL_DEFAULTS,
	type VisualSettings,
} from "@/lib/graph-config";
import type { Cohort, Person, Relationship } from "@/types/graph";
import { computeDegreeStats, getVisualRadius } from "./graph-constants";

function brighten(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const mix = (c: number) => Math.min(255, c + 40);
	return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
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
		visualSettings?: VisualSettings;
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

	// Derive all visual params — default to VISUAL_DEFAULTS
	const d = vs ?? VISUAL_DEFAULTS;
	const {
		defaultNodeColor,
		nodeBorderWidth,
		nodeBorderColor,
		hoverExpand,
		selectedGlowOffset,
		selectedGlowOpacity,
		cohortRingOffset,
		cohortRingWidth,
		edgeWidthMin,
		edgeWidthMax,
		bondToThickness,
		selectedEdgeWidth,
		labelColor,
		labelSize,
		labelOffset,
		showLabels,
		canvasBgColor,
	} = d;

	const edgeColors: Record<RelationshipCategory, string> = {
		default: d.edgeColorDefault,
		romantic: d.edgeColorRomantic,
		family: d.edgeColorFamily,
		professional: d.edgeColorProfessional,
	};

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
	// 3. Build adjacency + degree data for hover-highlight and node sizing
	const { degreeMap, maxDegree } = computeDegreeStats(persons, relationships);

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
			maxEdgeX < viewMinX - VIEW_PADDING ||
			minEdgeX > viewMaxX + VIEW_PADDING ||
			maxEdgeY < viewMinY - VIEW_PADDING ||
			minEdgeY > viewMaxY + VIEW_PADDING
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

	for (const person of persons) {
		if (person.x == null || person.y == null) continue;

		// Viewport culling
		if (
			person.x < viewMinX - VIEW_PADDING ||
			person.x > viewMaxX + VIEW_PADDING ||
			person.y < viewMinY - VIEW_PADDING ||
			person.y > viewMaxY + VIEW_PADDING
		)
			continue;

		const isNodeHighlighted = highlightNodeIds.has(person.id);

		// Compute fade-in opacity for recently added nodes
		const addedAt = person._addedAt;
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
			? d.egoRadius
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

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

interface Viewport {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

interface HighlightState {
	nodeIds: Set<string>;
	edgeIds: Set<string>;
	active: boolean;
}

function buildHighlightState(
	hoveredNodeId: string | null,
	relationships: Relationship[],
): HighlightState {
	const nodeIds = new Set<string>();
	const edgeIds = new Set<string>();
	const active = hoveredNodeId != null;

	if (hoveredNodeId) {
		nodeIds.add(hoveredNodeId);
		for (const rel of relationships) {
			if (rel.sourceId === hoveredNodeId) {
				nodeIds.add(rel.targetId);
				edgeIds.add(rel.id);
			} else if (rel.targetId === hoveredNodeId) {
				nodeIds.add(rel.sourceId);
				edgeIds.add(rel.id);
			}
		}
	}

	return { nodeIds, edgeIds, active };
}

function drawCohortGroups(
	ctx: CanvasRenderingContext2D,
	persons: Person[],
	cohorts: Cohort[],
	d: VisualSettings,
	highlight: HighlightState,
	hoveredNodeId: string | null,
	viewport: Viewport,
): void {
	const cohortMembers = new Map<string, Person[]>();
	for (const c of cohorts) {
		cohortMembers.set(c.id, []);
	}
	for (const p of persons) {
		if (p.isEgo || p.x == null || p.y == null) continue;
		for (const cid of p.cohortIds) {
			cohortMembers.get(cid)?.push(p);
		}
	}

	for (const c of cohorts) {
		const members = cohortMembers.get(c.id);
		if (!members || members.length < 2) continue;

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const p of members) {
			const px = p.x as number;
			const py = p.y as number;
			const r = d.nodeRadius;
			minX = Math.min(minX, px - r);
			minY = Math.min(minY, py - r);
			maxX = Math.max(maxX, px + r);
			maxY = Math.max(maxY, py + r);
		}

		// Apply padding around bounding box
		const pad = d.cohortGroupPadding ?? 25;
		minX -= pad;
		minY -= pad;
		maxX += pad;
		maxY += pad;

		if (
			maxX < viewport.minX - VIEW_PADDING ||
			minX > viewport.maxX + VIEW_PADDING ||
			maxY < viewport.minY - VIEW_PADDING ||
			minY > viewport.maxY + VIEW_PADDING
		)
			continue;

		const w = maxX - minX;
		const h = maxY - minY;
		const br = d.cohortGroupBorderRadius;

		const isRelevant =
			!highlight.active || !hoveredNodeId || members.some((m) => m.id === hoveredNodeId);
		const groupAlpha = isRelevant ? 1 : DIMMED_ALPHA;

		ctx.globalAlpha = d.cohortGroupFillOpacity * groupAlpha;
		ctx.fillStyle = c.color;
		ctx.beginPath();
		ctx.roundRect(minX, minY, w, h, br);
		ctx.fill();

		ctx.globalAlpha = d.cohortGroupBorderOpacity * groupAlpha;
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = d.cohortGroupBorderWidth;
		ctx.beginPath();
		ctx.roundRect(minX, minY, w, h, br);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
}

function drawEdges(
	ctx: CanvasRenderingContext2D,
	relationships: Relationship[],
	personMap: Map<string, Person>,
	edgeColors: Record<RelationshipCategory, string>,
	d: VisualSettings,
	highlight: HighlightState,
	selectedEdgeId: string | null,
	viewport: Viewport,
): void {
	for (const rel of relationships) {
		const source = personMap.get(rel.sourceId);
		const target = personMap.get(rel.targetId);
		if (!source || !target) continue;
		if (source.x == null || source.y == null || target.x == null || target.y == null) continue;

		// Ego edge filtering: hide by default, show only when endpoint is highlighted
		const isEgoEdge = source.isEgo || target.isEgo;
		if (isEgoEdge && !d.showEgoEdges && rel.id !== selectedEdgeId) {
			const egoEndHighlighted =
				highlight.active &&
				(highlight.nodeIds.has(rel.sourceId) || highlight.nodeIds.has(rel.targetId));
			if (!egoEndHighlighted) continue;
		}

		const minEdgeX = Math.min(source.x, target.x);
		const maxEdgeX = Math.max(source.x, target.x);
		const minEdgeY = Math.min(source.y, target.y);
		const maxEdgeY = Math.max(source.y, target.y);
		if (
			maxEdgeX < viewport.minX - VIEW_PADDING ||
			minEdgeX > viewport.maxX + VIEW_PADDING ||
			maxEdgeY < viewport.minY - VIEW_PADDING ||
			minEdgeY > viewport.maxY + VIEW_PADDING
		)
			continue;

		const isEdgeHighlighted = highlight.edgeIds.has(rel.id);
		const category = getCategory(rel.type);
		const color = edgeColors[category] ?? edgeColors.default;
		const bs = getBondStrength(rel.type);

		let lw: number;
		let alpha: number;

		if (rel.id === selectedEdgeId) {
			lw = d.selectedEdgeWidth;
			alpha = 1;
		} else if (highlight.active && isEdgeHighlighted) {
			lw = d.bondToThickness
				? d.edgeWidthMin + ((bs - 1) / 4) * (d.edgeWidthMax - d.edgeWidthMin)
				: d.edgeWidth * 1.5;
			alpha = 1;
		} else if (highlight.active) {
			lw = 0.5;
			alpha = DIMMED_ALPHA;
		} else {
			lw = d.bondToThickness
				? d.edgeWidthMin + ((bs - 1) / 4) * (d.edgeWidthMax - d.edgeWidthMin)
				: d.edgeWidth;
			alpha = BOND_OPACITY[bs] ?? 0.5;
		}

		// Reduce opacity for ego edges shown on hover
		if (isEgoEdge && !d.showEgoEdges) {
			alpha *= 0.4;
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
}

function drawNodes(
	ctx: CanvasRenderingContext2D,
	persons: Person[],
	d: VisualSettings,
	highlight: HighlightState,
	degreeMap: Map<string, number>,
	maxDegree: number,
	cohortColorMap: Map<string, string>,
	selectedNodeId: string | null,
	hoveredNodeId: string | null,
	activeCohortId: string | null,
	transform: { k: number },
	viewport: Viewport,
): void {
	ctx.font = `${d.labelSize}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "top";

	for (const person of persons) {
		if (person.x == null || person.y == null) continue;

		if (
			person.x < viewport.minX - VIEW_PADDING ||
			person.x > viewport.maxX + VIEW_PADDING ||
			person.y < viewport.minY - VIEW_PADDING ||
			person.y > viewport.maxY + VIEW_PADDING
		)
			continue;

		const isNodeHighlighted = highlight.nodeIds.has(person.id);

		let nodeAlpha = 1;
		const addedAt = person._addedAt;
		if (addedAt) {
			const elapsed = Date.now() - addedAt;
			if (elapsed < FADE_DURATION) {
				nodeAlpha = elapsed / FADE_DURATION;
			}
		}
		if (highlight.active && !isNodeHighlighted) {
			nodeAlpha *= DIMMED_ALPHA;
		}
		// Degree-based opacity (skip ego — always full)
		if (!person.isEgo) {
			const deg = degreeMap.get(person.id) ?? 0;
			const normalizedDegree = maxDegree > 1 ? deg / maxDegree : 1;
			const degreeAlpha = d.degreeAlphaMin + normalizedDegree * (1 - d.degreeAlphaMin);
			nodeAlpha *= degreeAlpha;
		}
		ctx.globalAlpha = nodeAlpha;

		const degree = degreeMap.get(person.id) ?? 0;
		const baseRadius = getVisualRadius(degree, maxDegree, person.isEgo, d.nodeRadius, d.egoRadius);
		const cohortId = person.cohortIds[0];
		const color = cohortId
			? (cohortColorMap.get(cohortId) ?? d.defaultNodeColor)
			: d.defaultNodeColor;
		const isSelected = person.id === selectedNodeId;
		const isHovered = person.id === hoveredNodeId;

		if (activeCohortId && person.cohortIds.includes(activeCohortId)) {
			ctx.beginPath();
			ctx.arc(person.x, person.y, baseRadius + d.cohortRingOffset, 0, Math.PI * 2);
			ctx.strokeStyle = color;
			ctx.lineWidth = d.cohortRingWidth;
			ctx.stroke();
		}

		if (isSelected) {
			ctx.beginPath();
			ctx.arc(person.x, person.y, baseRadius + d.selectedGlowOffset, 0, Math.PI * 2);
			ctx.fillStyle = `${color}${opacityToHexAlpha(d.selectedGlowOpacity)}`;
			ctx.fill();
		}

		const drawRadius = isHovered ? baseRadius + d.hoverExpand : baseRadius;
		ctx.beginPath();
		ctx.arc(person.x, person.y, drawRadius, 0, Math.PI * 2);
		ctx.fillStyle = isHovered ? brighten(color) : color;
		ctx.fill();

		if (d.nodeBorderWidth > 0) {
			ctx.strokeStyle = d.nodeBorderColor;
			ctx.lineWidth = d.nodeBorderWidth;
			ctx.stroke();
		}

		const showLabel =
			d.showLabels &&
			(isNodeHighlighted || !highlight.active) &&
			(highlight.active || transform.k > 0.4);
		if (showLabel) {
			const labelX = person.x;
			const labelY = person.y + drawRadius + d.labelOffset;
			if (d.labelStrokeWidth > 0) {
				ctx.lineJoin = "round";
				ctx.miterLimit = 2;
				ctx.lineWidth = d.labelStrokeWidth;
				ctx.strokeStyle = d.labelStrokeColor;
				ctx.strokeText(person.name, labelX, labelY);
			}
			ctx.fillStyle = d.labelColor;
			ctx.fillText(person.name, labelX, labelY);
		}

		ctx.globalAlpha = 1;
	}
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
	} = options;

	const d = options.visualSettings ?? VISUAL_DEFAULTS;

	const edgeColors: Record<RelationshipCategory, string> = {
		default: d.edgeColorDefault,
		romantic: d.edgeColorRomantic,
		family: d.edgeColorFamily,
		professional: d.edgeColorProfessional,
	};

	const personMap = new Map<string, Person>();
	for (const p of persons) {
		personMap.set(p.id, p);
	}

	const cohortColorMap = new Map<string, string>();
	for (const c of cohorts) {
		cohortColorMap.set(c.id, c.color);
	}

	// 1. Clear / fill canvas background
	if (d.canvasBgColor) {
		ctx.fillStyle = d.canvasBgColor;
		ctx.fillRect(0, 0, width, height);
	} else {
		ctx.clearRect(0, 0, width, height);
	}

	// 2. Apply zoom transform
	ctx.save();
	ctx.translate(transform.x, transform.y);
	ctx.scale(transform.k, transform.k);

	const viewport: Viewport = {
		minX: -transform.x / transform.k,
		minY: -transform.y / transform.k,
		maxX: (width - transform.x) / transform.k,
		maxY: (height - transform.y) / transform.k,
	};

	const highlight = buildHighlightState(hoveredNodeId, relationships);
	const { degreeMap, maxDegree } = computeDegreeStats(persons, relationships);

	// 3. Cohort group boundaries (behind edges and nodes)
	if (d.showCohortGroups) {
		drawCohortGroups(ctx, persons, cohorts, d, highlight, hoveredNodeId, viewport);
	}

	// 4. Edges
	drawEdges(ctx, relationships, personMap, edgeColors, d, highlight, selectedEdgeId, viewport);

	// 5. Nodes
	drawNodes(
		ctx,
		persons,
		d,
		highlight,
		degreeMap,
		maxDegree,
		cohortColorMap,
		selectedNodeId,
		hoveredNodeId,
		activeCohortId,
		transform,
		viewport,
	);

	// 6. Restore context
	ctx.restore();
}

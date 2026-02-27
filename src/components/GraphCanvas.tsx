"use client";

import { select } from "d3-selection";
import { zoom as d3Zoom, type ZoomBehavior, zoomIdentity } from "d3-zoom";
import { useCallback, useEffect, useRef, useState } from "react";
import CanvasToolbar from "@/components/CanvasToolbar";
import ContextMenu from "@/components/ContextMenu";
import { useGraph } from "@/context/GraphContext";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useForceSimulation } from "@/hooks/useForceSimulation";
import { render } from "@/lib/canvas-renderer";
import type { VisualSettings } from "@/lib/graph-config";
import { hitTestEdge, hitTestNode } from "@/lib/hit-testing";

interface GraphCanvasProps {
	devSettingsRef?: React.RefObject<React.MutableRefObject<VisualSettings> | null>;
	onScheduleRender?: (fn: () => void) => void;
}

interface ContextMenuState {
	x: number;
	y: number;
	nodeId: string | null;
	edgeId: string | null;
}

export default function GraphCanvas({ devSettingsRef, onScheduleRender }: GraphCanvasProps = {}) {
	const { state, selectedNodeId, selectedEdgeId, setSelectedNodeId, setSelectedEdgeId } =
		useGraph();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const transformRef = useRef({ x: 0, y: 0, k: 1 });
	const sizeRef = useRef({ width: 0, height: 0 });
	const rafRef = useRef<number | null>(null);
	const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
	const selectionRef = useRef<ReturnType<typeof select<HTMLCanvasElement, unknown>> | null>(null);

	// Context menu state
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

	// Keep render data in refs so scheduleRender can be stable (no stale closures)
	const stateRef = useRef(state);
	stateRef.current = state;
	const selectedNodeIdRef = useRef(selectedNodeId);
	selectedNodeIdRef.current = selectedNodeId;
	const selectedEdgeIdRef = useRef(selectedEdgeId);
	selectedEdgeIdRef.current = selectedEdgeId;
	const hoveredNodeIdRef = useRef<string | null>(null);
	const devSettingsRefRef = useRef(devSettingsRef);
	devSettingsRefRef.current = devSettingsRef;

	// Track canvas size
	const [width, height] = useCanvasSize(canvasRef, sizeRef);

	// Stable render function — reads latest values from refs
	const scheduleRender = useCallback(() => {
		if (rafRef.current != null) return;
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const s = stateRef.current;
			render(ctx, s.persons, s.relationships, s.cohorts, {
				selectedNodeId: selectedNodeIdRef.current,
				selectedEdgeId: selectedEdgeIdRef.current,
				hoveredNodeId: hoveredNodeIdRef.current,
				activeCohortId: s.activeCohortId,
				width: sizeRef.current.width,
				height: sizeRef.current.height,
				transform: transformRef.current,
				visualSettings: devSettingsRefRef.current?.current?.current ?? undefined,
			});
		});
	}, []);

	// Expose scheduleRender to parent
	useEffect(() => {
		onScheduleRender?.(scheduleRender);
	}, [onScheduleRender, scheduleRender]);

	// Force simulation — onTick triggers canvas redraw
	const { simulationRef } = useForceSimulation(
		state.persons,
		state.relationships,
		state.cohorts,
		width,
		height,
		scheduleRender,
	);

	// Canvas interactions (click, drag, hover)
	const { dragBehavior, hoveredNodeId, hoveredPosition } = useCanvasInteractions(
		canvasRef,
		state.persons,
		state.relationships,
		simulationRef,
		transformRef,
		hoveredNodeIdRef,
		scheduleRender,
		{
			onSelectNode: setSelectedNodeId,
			onSelectEdge: setSelectedEdgeId,
		},
		devSettingsRef,
	);

	// Re-render when React state changes (selection, graph data)
	useEffect(() => {
		scheduleRender();
	}, [
		state.persons,
		state.relationships,
		state.cohorts,
		selectedNodeId,
		selectedEdgeId,
		scheduleRender,
	]);

	// Set up d3-drag + d3-zoom (drag MUST be applied first so its
	// stopImmediatePropagation blocks zoom's mousedown on node hits)
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> = d3Zoom<
			HTMLCanvasElement,
			unknown
		>()
			.scaleExtent([0.1, 5])
			.on("zoom", (event) => {
				const t = event.transform;
				transformRef.current = { x: t.x, y: t.y, k: t.k };
				scheduleRender();
			});

		const selection = select<HTMLCanvasElement, unknown>(canvas);
		selection.call(dragBehavior);
		selection.call(zoomBehavior);
		selection.on("dblclick.zoom", null);

		zoomBehaviorRef.current = zoomBehavior;
		selectionRef.current = selection;

		return () => {
			selection.on(".drag", null);
			selection.on(".zoom", null);
			zoomBehaviorRef.current = null;
			selectionRef.current = null;
		};
	}, [scheduleRender, dragBehavior]);

	// Right-click → context menu
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		function handleContextMenu(e: MouseEvent) {
			e.preventDefault();
			const rect = canvas?.getBoundingClientRect();
			if (!rect) return;
			const t = transformRef.current;
			const cx = (e.clientX - rect.left - t.x) / t.k;
			const cy = (e.clientY - rect.top - t.y) / t.k;

			const s = stateRef.current;
			const ds = devSettingsRefRef.current?.current?.current;
			const hitNode = hitTestNode(s.persons, s.relationships, cx, cy, ds?.egoRadius);
			const hitEdge = hitNode ? null : hitTestEdge(s.relationships, s.persons, cx, cy);

			if (hitNode || hitEdge) {
				setContextMenu({
					x: e.clientX,
					y: e.clientY,
					nodeId: hitNode?.id ?? null,
					edgeId: hitEdge?.id ?? null,
				});
			} else {
				setContextMenu(null);
			}
		}

		canvas.addEventListener("contextmenu", handleContextMenu);
		return () => canvas.removeEventListener("contextmenu", handleContextMenu);
	}, []);

	// Handle DPR for sharp rendering
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
		}
		scheduleRender();
	}, [width, height, scheduleRender]);

	// Zoom toolbar callbacks
	const handleZoomIn = useCallback(() => {
		const sel = selectionRef.current;
		const zb = zoomBehaviorRef.current;
		if (sel && zb) {
			zb.scaleBy(sel, 1.3);
		}
	}, []);

	const handleZoomOut = useCallback(() => {
		const sel = selectionRef.current;
		const zb = zoomBehaviorRef.current;
		if (sel && zb) {
			zb.scaleBy(sel, 1 / 1.3);
		}
	}, []);

	const handleFitToScreen = useCallback(() => {
		const sel = selectionRef.current;
		const zb = zoomBehaviorRef.current;
		const persons = stateRef.current.persons;
		if (!sel || !zb || persons.length === 0) return;

		const w = sizeRef.current.width;
		const h = sizeRef.current.height;
		if (w === 0 || h === 0) return;

		// Compute bounding box of all nodes
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const p of persons) {
			const px = p.x ?? 0;
			const py = p.y ?? 0;
			if (px < minX) minX = px;
			if (px > maxX) maxX = px;
			if (py < minY) minY = py;
			if (py > maxY) maxY = py;
		}

		const padding = 60;
		const bw = maxX - minX + padding * 2;
		const bh = maxY - minY + padding * 2;
		const scale = Math.min(w / bw, h / bh, 2);
		const cx = (minX + maxX) / 2;
		const cy = (minY + maxY) / 2;

		const transform = zoomIdentity
			.translate(w / 2, h / 2)
			.scale(scale)
			.translate(-cx, -cy);

		zb.transform(sel, transform);
	}, []);

	// Resolve hovered node data for tooltip
	const hoveredNode = hoveredNodeId
		? (state.persons.find((p) => p.id === hoveredNodeId) ?? null)
		: null;
	const hoveredNodeCohort = hoveredNode?.cohortIds[0]
		? state.cohorts.find((c) => c.id === hoveredNode.cohortIds[0])
		: null;

	return (
		<div className="relative w-full h-full">
			<canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} className="block" />
			{hoveredNode && hoveredPosition && (
				<div
					className="pointer-events-none absolute z-10 rounded bg-popover/90 px-2 py-1 text-xs text-popover-foreground shadow-lg"
					style={{
						left: hoveredPosition.x - (canvasRef.current?.getBoundingClientRect().left ?? 0),
						top: hoveredPosition.y - (canvasRef.current?.getBoundingClientRect().top ?? 0) - 36,
					}}
				>
					<span className="font-medium">{hoveredNode.name}</span>
					{hoveredNodeCohort && <span className="ml-1.5 opacity-70">{hoveredNodeCohort.name}</span>}
				</div>
			)}
			<CanvasToolbar
				onZoomIn={handleZoomIn}
				onZoomOut={handleZoomOut}
				onFitToScreen={handleFitToScreen}
			/>
			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					nodeId={contextMenu.nodeId}
					edgeId={contextMenu.edgeId}
					onClose={() => setContextMenu(null)}
				/>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Hook: track canvas container size via ResizeObserver
// ---------------------------------------------------------------------------

function useCanvasSize(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	sizeRef: React.MutableRefObject<{ width: number; height: number }>,
): [number, number] {
	const [size, setSize] = useState({ width: 800, height: 600 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const parent = canvas.parentElement;
		if (!parent) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width, height } = entry.contentRect;
			const w = Math.round(width);
			const h = Math.round(height);
			sizeRef.current = { width: w, height: h };
			setSize({ width: w, height: h });
		});

		observer.observe(parent);

		const rect = parent.getBoundingClientRect();
		sizeRef.current = {
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		};
		setSize(sizeRef.current);

		return () => observer.disconnect();
	}, [canvasRef, sizeRef]);

	return [size.width, size.height];
}

"use client";

import { type DragBehavior, drag as d3Drag } from "d3-drag";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VisualSettings } from "@/lib/graph-config";
import { hitTestEdge, hitTestNode } from "@/lib/hit-testing";
import type { Person, Relationship } from "@/types/graph";

const DRAG_THRESHOLD = 5;

interface SimulationHandle {
	alphaTarget(alpha: number): SimulationHandle;
	restart(): SimulationHandle;
}

export function useCanvasInteractions(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	persons: Person[],
	relationships: Relationship[],
	simulationRef: React.RefObject<SimulationHandle | null>,
	transformRef: React.RefObject<{ x: number; y: number; k: number }>,
	hoveredNodeIdRef: React.MutableRefObject<string | null>,
	scheduleRender: () => void,
	callbacks: {
		onSelectNode: (id: string | null) => void;
		onSelectEdge: (id: string | null) => void;
	},
	devSettingsRef?: React.RefObject<React.MutableRefObject<VisualSettings> | null>,
): {
	dragBehavior: DragBehavior<HTMLCanvasElement, unknown, unknown>;
	hoveredNodeId: string | null;
	hoveredPosition: { x: number; y: number } | null;
} {
	// State for tooltip (only updates when hovered target changes, not on every mousemove)
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// Mutable refs to avoid stale closures in event handlers.
	const personsRef = useRef(persons);
	personsRef.current = persons;
	const relationshipsRef = useRef(relationships);
	relationshipsRef.current = relationships;
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

	// Stable ref to devSettingsRef — avoids stale closure in useMemo/useEffect
	const devSettingsRefRef = useRef(devSettingsRef);
	devSettingsRefRef.current = devSettingsRef;

	// Track drag state across d3-drag events.
	const dragSubjectRef = useRef<Person | null>(null);
	const dragStartScreenRef = useRef<{ x: number; y: number } | null>(null);
	const hasDraggedRef = useRef(false);

	const screenToCanvas = useCallback(
		(e: MouseEvent): { x: number; y: number } => {
			const canvas = canvasRef.current;
			if (!canvas) return { x: 0, y: 0 };
			const rect = canvas.getBoundingClientRect();
			const t = transformRef.current;
			return {
				x: (e.clientX - rect.left - t.x) / t.k,
				y: (e.clientY - rect.top - t.y) / t.k,
			};
		},
		[canvasRef, transformRef],
	);

	// d3-drag behavior — dependencies are stable refs, so this is created once.
	const dragBehavior = useMemo(() => {
		const behavior = d3Drag<HTMLCanvasElement, unknown>()
			.clickDistance(DRAG_THRESHOLD)
			.subject((event) => {
				const sourceEvent = event.sourceEvent;
				if (!(sourceEvent instanceof MouseEvent)) return undefined;
				const pos = screenToCanvas(sourceEvent);
				const ds = devSettingsRefRef.current?.current?.current;
				const hit = hitTestNode(
					personsRef.current,
					relationshipsRef.current,
					pos.x,
					pos.y,
					ds?.egoRadius,
				);
				return hit ?? undefined;
			})
			.on("start", (event) => {
				const node = event.subject as Person;
				dragSubjectRef.current = node;
				hasDraggedRef.current = false;
				const sourceEvent = event.sourceEvent;
				if (!(sourceEvent instanceof MouseEvent)) return;
				dragStartScreenRef.current = {
					x: sourceEvent.clientX,
					y: sourceEvent.clientY,
				};
			})
			.on("drag", (event) => {
				const node = dragSubjectRef.current;
				if (!node) return;
				const sourceEvent = event.sourceEvent;
				if (!(sourceEvent instanceof MouseEvent)) return;
				const pos = screenToCanvas(sourceEvent);

				if (!hasDraggedRef.current) {
					const start = dragStartScreenRef.current;
					if (!start) return;
					const dx = sourceEvent.clientX - start.x;
					const dy = sourceEvent.clientY - start.y;
					if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
					hasDraggedRef.current = true;
					node.fx = pos.x;
					node.fy = pos.y;
					simulationRef.current?.alphaTarget(0.3).restart();
				} else {
					node.fx = pos.x;
					node.fy = pos.y;
				}
			})
			.on("end", () => {
				const node = dragSubjectRef.current;
				if (node && hasDraggedRef.current) {
					if (!node.isEgo) {
						node.fx = null;
						node.fy = null;
					}
					simulationRef.current?.alphaTarget(0);
				}
				dragSubjectRef.current = null;
				dragStartScreenRef.current = null;
				hasDraggedRef.current = false;
			});

		return behavior;
	}, [screenToCanvas, simulationRef]);

	// Click + hover + keyboard listeners
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		function handleClick(e: MouseEvent) {
			const pos = screenToCanvas(e);
			const ds = devSettingsRefRef.current?.current?.current;
			const hitNode = hitTestNode(
				personsRef.current,
				relationshipsRef.current,
				pos.x,
				pos.y,
				ds?.egoRadius,
			);

			if (hitNode) {
				callbacksRef.current.onSelectNode(hitNode.id);
				callbacksRef.current.onSelectEdge(null);
				return;
			}

			const hitEdge = hitTestEdge(relationshipsRef.current, personsRef.current, pos.x, pos.y);

			if (hitEdge) {
				callbacksRef.current.onSelectEdge(hitEdge.id);
				callbacksRef.current.onSelectNode(null);
				return;
			}

			callbacksRef.current.onSelectNode(null);
			callbacksRef.current.onSelectEdge(null);
		}

		function handleMouseMove(e: MouseEvent) {
			if (e.target !== canvas) return;
			const pos = screenToCanvas(e);
			const ds = devSettingsRefRef.current?.current?.current;
			const hitNode = hitTestNode(
				personsRef.current,
				relationshipsRef.current,
				pos.x,
				pos.y,
				ds?.egoRadius,
			);
			const nodeId = hitNode?.id ?? null;
			if (hoveredNodeIdRef.current !== nodeId) {
				hoveredNodeIdRef.current = nodeId;
				scheduleRender();
				setHoveredNodeId(nodeId);
				setHoveredPosition(nodeId ? { x: e.clientX, y: e.clientY } : null);
			} else if (nodeId) {
				setHoveredPosition({ x: e.clientX, y: e.clientY });
			}
			if (canvas) canvas.style.cursor = nodeId ? "pointer" : "default";
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				callbacksRef.current.onSelectNode(null);
				callbacksRef.current.onSelectEdge(null);
			}
		}

		canvas.addEventListener("click", handleClick);
		canvas.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			canvas.removeEventListener("click", handleClick);
			canvas.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [canvasRef, screenToCanvas, hoveredNodeIdRef, scheduleRender]);

	return { dragBehavior, hoveredNodeId, hoveredPosition };
}

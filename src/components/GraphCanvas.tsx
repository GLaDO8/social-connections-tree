"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { zoom as d3Zoom, type ZoomBehavior } from "d3-zoom";
import { select } from "d3-selection";
import { useGraph } from "@/context/GraphContext";
import { useForceSimulation } from "@/hooks/useForceSimulation";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { render } from "@/lib/canvas-renderer";

export default function GraphCanvas() {
  const {
    state,
    selectedNodeId,
    selectedEdgeId,
    setSelectedNodeId,
    setSelectedEdgeId,
  } = useGraph();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  // Keep render data in refs so scheduleRender can be stable (no stale closures)
  const stateRef = useRef(state);
  stateRef.current = state;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const selectedEdgeIdRef = useRef(selectedEdgeId);
  selectedEdgeIdRef.current = selectedEdgeId;
  const hoveredNodeIdRef = useRef<string | null>(null);

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
        width: sizeRef.current.width,
        height: sizeRef.current.height,
        transform: transformRef.current,
      });
    });
  }, []);

  // Force simulation — onTick triggers canvas redraw
  const { simulationRef } = useForceSimulation(
    state.persons,
    state.relationships,
    width,
    height,
    scheduleRender
  );

  // Canvas interactions (click, drag, hover)
  const { hoveredNodeId, dragBehavior } = useCanvasInteractions(
    canvasRef,
    state.persons,
    state.relationships,
    simulationRef,
    transformRef,
    {
      onSelectNode: setSelectedNodeId,
      onSelectEdge: setSelectedEdgeId,
    }
  );

  // Sync hovered node ref + trigger render
  hoveredNodeIdRef.current = hoveredNodeId;

  // Re-render when React state changes (selection, hover, graph data)
  useEffect(() => {
    scheduleRender();
  }, [
    state.persons,
    state.relationships,
    state.cohorts,
    selectedNodeId,
    selectedEdgeId,
    hoveredNodeId,
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

    const selection = select(canvas);
    selection.call(dragBehavior as any);
    selection.call(zoomBehavior);
    selection.on("dblclick.zoom", null);

    return () => {
      selection.on(".drag", null);
      selection.on(".zoom", null);
    };
  }, [scheduleRender, dragBehavior]);

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

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%" }}
      className="block"
    />
  );
}

// ---------------------------------------------------------------------------
// Hook: track canvas container size via ResizeObserver
// ---------------------------------------------------------------------------

function useCanvasSize(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  sizeRef: React.MutableRefObject<{ width: number; height: number }>
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

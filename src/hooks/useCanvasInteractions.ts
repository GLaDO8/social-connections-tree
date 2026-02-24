'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Simulation } from 'd3-force';
import type { Person, Relationship } from '@/types/graph';
import { hitTestNode, hitTestEdge } from '@/lib/hit-testing';

const DRAG_THRESHOLD = 5;

export function useCanvasInteractions(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  persons: Person[],
  relationships: Relationship[],
  simulationRef: React.RefObject<Simulation<Person, any> | null>,
  transformRef: React.RefObject<{ x: number; y: number; k: number }>,
  callbacks: {
    onSelectNode: (id: string | null) => void;
    onSelectEdge: (id: string | null) => void;
  }
): { hoveredNodeId: string | null } {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Mutable refs to avoid stale closures in event handlers.
  const dragNodeRef = useRef<Person | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Keep latest values accessible without re-registering listeners.
  const personsRef = useRef(persons);
  personsRef.current = persons;
  const relationshipsRef = useRef(relationships);
  relationshipsRef.current = relationships;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const screenToCanvas = useCallback(
    (e: MouseEvent): { x: number; y: number } => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const t = transformRef.current;
      return {
        x: (e.clientX - rect.left - t.x) / t.k,
        y: (e.clientY - rect.top - t.y) / t.k,
      };
    },
    [canvasRef, transformRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ------------------------------------------------------------------
    // mousedown
    // ------------------------------------------------------------------
    function handleMouseDown(e: MouseEvent) {
      const pos = screenToCanvas(e);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;

      const hitNode = hitTestNode(personsRef.current, pos.x, pos.y);
      if (hitNode) {
        dragNodeRef.current = hitNode;
        hitNode.fx = hitNode.x;
        hitNode.fy = hitNode.y;
        simulationRef.current?.alphaTarget(0.3).restart();
      }
    }

    // ------------------------------------------------------------------
    // mousemove
    // ------------------------------------------------------------------
    function handleMouseMove(e: MouseEvent) {
      const pos = screenToCanvas(e);

      if (dragNodeRef.current && dragStartRef.current) {
        // Check if movement exceeds drag threshold.
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (!isDraggingRef.current && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
          isDraggingRef.current = true;
        }

        // Update pinned position regardless (smooth from first move).
        dragNodeRef.current.fx = pos.x;
        dragNodeRef.current.fy = pos.y;
        return;
      }

      // Hover hit-testing.
      const hitNode = hitTestNode(personsRef.current, pos.x, pos.y);
      const nodeId = hitNode?.id ?? null;
      setHoveredNodeId(nodeId);
      canvas!.style.cursor = nodeId ? 'pointer' : 'default';
    }

    // ------------------------------------------------------------------
    // mouseup
    // ------------------------------------------------------------------
    function handleMouseUp(e: MouseEvent) {
      const wasDragging = isDraggingRef.current;
      const hadDragNode = dragNodeRef.current;

      if (hadDragNode) {
        // Release the pinned position — unless this is the ego node.
        if (!hadDragNode.isEgo) {
          hadDragNode.fx = null;
          hadDragNode.fy = null;
        }
        simulationRef.current?.alphaTarget(0);
        dragNodeRef.current = null;
      }

      dragStartRef.current = null;
      isDraggingRef.current = false;

      // If it was a drag gesture, skip selection.
      if (wasDragging) return;

      // Click: hit-test for selection.
      const pos = screenToCanvas(e);
      const hitNode = hitTestNode(personsRef.current, pos.x, pos.y);

      if (hitNode) {
        callbacksRef.current.onSelectNode(hitNode.id);
        callbacksRef.current.onSelectEdge(null);
        return;
      }

      const hitEdge = hitTestEdge(
        relationshipsRef.current,
        personsRef.current,
        pos.x,
        pos.y
      );

      if (hitEdge) {
        callbacksRef.current.onSelectEdge(hitEdge.id);
        callbacksRef.current.onSelectNode(null);
        return;
      }

      // Clicked empty space — clear selection.
      callbacksRef.current.onSelectNode(null);
      callbacksRef.current.onSelectEdge(null);
    }

    // ------------------------------------------------------------------
    // keydown (Escape)
    // ------------------------------------------------------------------
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        callbacksRef.current.onSelectNode(null);
        callbacksRef.current.onSelectEdge(null);
      }
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasRef, simulationRef, transformRef, screenToCanvas]);

  return { hoveredNodeId };
}

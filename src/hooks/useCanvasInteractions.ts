'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { drag as d3Drag, type DragBehavior } from 'd3-drag';
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
): { hoveredNodeId: string | null; dragBehavior: DragBehavior<HTMLCanvasElement, unknown, unknown> } {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Mutable refs to avoid stale closures in event handlers.
  const personsRef = useRef(persons);
  personsRef.current = persons;
  const relationshipsRef = useRef(relationships);
  relationshipsRef.current = relationships;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Track drag state across d3-drag events.
  const dragSubjectRef = useRef<Person | null>(null);
  const dragStartScreenRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

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

  // d3-drag behavior
  const dragBehavior = useMemo(() => {
    const behavior = d3Drag<HTMLCanvasElement, unknown>()
      .clickDistance(DRAG_THRESHOLD)
      .subject((event) => {
        const sourceEvent = event.sourceEvent as MouseEvent;
        const pos = screenToCanvas(sourceEvent);
        const hit = hitTestNode(personsRef.current, pos.x, pos.y);
        // Return the hit node or undefined (d3-drag bails on undefined subject,
        // letting d3-zoom handle pan).
        return hit ?? undefined;
      })
      .on('start', (event) => {
        const node = event.subject as Person;
        dragSubjectRef.current = node;
        hasDraggedRef.current = false;
        const sourceEvent = event.sourceEvent as MouseEvent;
        dragStartScreenRef.current = { x: sourceEvent.clientX, y: sourceEvent.clientY };
        // Don't pin or reheat yet — wait for threshold cross in 'drag' handler.
      })
      .on('drag', (event) => {
        const node = dragSubjectRef.current;
        if (!node) return;
        const sourceEvent = event.sourceEvent as MouseEvent;
        const pos = screenToCanvas(sourceEvent);

        if (!hasDraggedRef.current) {
          // Check our own threshold (d3-drag's clickDistance only suppresses click events,
          // it still fires drag events for any movement).
          const start = dragStartScreenRef.current!;
          const dx = sourceEvent.clientX - start.x;
          const dy = sourceEvent.clientY - start.y;
          if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
          hasDraggedRef.current = true;
          // First real drag: pin + reheat
          node.fx = pos.x;
          node.fy = pos.y;
          simulationRef.current?.alphaTarget(0.3).restart();
        } else {
          node.fx = pos.x;
          node.fy = pos.y;
        }
      })
      .on('end', () => {
        const node = dragSubjectRef.current;
        if (node && hasDraggedRef.current) {
          // Release pin — unless ego node.
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

      // Empty space — clear selection.
      callbacksRef.current.onSelectNode(null);
      callbacksRef.current.onSelectEdge(null);
    }

    function handleMouseMove(e: MouseEvent) {
      if (e.target !== canvas) return;
      const pos = screenToCanvas(e);
      const hitNode = hitTestNode(personsRef.current, pos.x, pos.y);
      const nodeId = hitNode?.id ?? null;
      setHoveredNodeId(nodeId);
      canvas!.style.cursor = nodeId ? 'pointer' : 'default';
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        callbacksRef.current.onSelectNode(null);
        callbacksRef.current.onSelectEdge(null);
      }
    }

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasRef, screenToCanvas]);

  return { hoveredNodeId, dragBehavior };
}

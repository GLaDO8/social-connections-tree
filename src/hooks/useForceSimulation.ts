"use client";

import { forceCenter } from "d3-force";
import { useEffect, useRef } from "react";
import type { ForceSimulation } from "@/lib/force-config";
import { createSimulation, reheat, syncData } from "@/lib/force-config";
import { invalidateHitTestCache } from "@/lib/hit-testing";
import type { Person, Relationship } from "@/types/graph";

function pinEgoNode(persons: Person[], cx: number, cy: number): void {
	const ego = persons.find((p) => p.isEgo);
	if (ego) {
		ego.fx = cx;
		ego.fy = cy;
	}
}

export function useForceSimulation(
	persons: Person[],
	relationships: Relationship[],
	width: number,
	height: number,
	onTick: () => void,
): { simulationRef: React.RefObject<ForceSimulation | null> } {
	const simulationRef = useRef<ForceSimulation | null>(null);
	const onTickRef = useRef(onTick);
	onTickRef.current = onTick;

	// Create simulation on mount, stop on unmount.
	// Data and size changes are handled by the effects below.
	useEffect(() => {
		const sim = createSimulation(persons, relationships, width, height);

		pinEgoNode(persons, width / 2, height / 2);

		sim.on("tick", () => {
			invalidateHitTestCache();
			onTickRef.current();
		});

		simulationRef.current = sim;

		return () => {
			sim.stop();
			sim.on("tick", null);
			simulationRef.current = null;
		};
	}, []);

	// Sync data when persons or relationships change
	useEffect(() => {
		const sim = simulationRef.current;
		if (!sim) return;

		syncData(sim, persons, relationships);
		pinEgoNode(persons, width / 2, height / 2);
		// width/height included so ego pin stays correct when both change together,
		// but the resize-specific logic is in the next effect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [persons, relationships]);

	// Update center force and ego pin when canvas dimensions change
	useEffect(() => {
		const sim = simulationRef.current;
		if (!sim) return;

		const cx = width / 2;
		const cy = height / 2;

		sim.force("center", forceCenter<Person>(cx, cy));
		pinEgoNode(sim.nodes(), cx, cy);
		reheat(sim);
	}, [width, height]);

	return { simulationRef };
}

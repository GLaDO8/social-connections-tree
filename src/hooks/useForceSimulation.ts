"use client";

import { forceCenter, type forceRadial } from "d3-force";
import { useEffect, useRef } from "react";
import type { ForceSimulation } from "@/lib/force-config";
import { createSimulation, forceCohortCluster, reheat, syncData } from "@/lib/force-config";
import { PHYSICS } from "@/lib/graph-config";
import { invalidateHitTestCache } from "@/lib/hit-testing";
import type { Cohort, Person, Relationship } from "@/types/graph";

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
	cohorts: Cohort[],
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
		const sim = createSimulation(persons, relationships, cohorts, width, height);

		pinEgoNode(persons, width / 2, height / 2);

		// Warm-up: silent pre-computation before any rendering
		sim.stop();

		// Temporarily boost radial and cluster strengths
		const radialForce = sim.force("radial") as ReturnType<typeof forceRadial<Person>> | undefined;
		if (radialForce) {
			radialForce.strength((d: Person) => {
				if (d.isEgo) return PHYSICS.radialStrengthEgo;
				return PHYSICS.warmupRadialStrength;
			});
		}
		sim.force("cluster", forceCohortCluster(persons, cohorts, PHYSICS.clusterWarmupStrength));

		// Silent pre-computation — no events, no rendering
		sim.tick(PHYSICS.warmupTicks);

		// Restore production strengths
		if (radialForce) {
			radialForce.strength((d: Person) => {
				if (d.isEgo) return PHYSICS.radialStrengthEgo;
				return PHYSICS.radialStrengthNode;
			});
		}
		sim.force("cluster", forceCohortCluster(persons, cohorts, PHYSICS.clusterStrength));

		// Wire up tick handler and start gentle animated settling
		sim.on("tick", () => {
			invalidateHitTestCache();
			onTickRef.current();
		});

		sim.alpha(PHYSICS.postWarmupAlpha).restart();

		simulationRef.current = sim;

		return () => {
			sim.stop();
			sim.on("tick", null);
			simulationRef.current = null;
		};
	}, []);

	// Sync data when persons, relationships, or cohorts change
	useEffect(() => {
		const sim = simulationRef.current;
		if (!sim) return;

		syncData(sim, persons, relationships, cohorts);
		pinEgoNode(persons, width / 2, height / 2);
		// width/height included so ego pin stays correct when both change together,
		// but the resize-specific logic is in the next effect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [persons, relationships, cohorts]);

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

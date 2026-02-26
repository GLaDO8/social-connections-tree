"use client";

import { useDialKit } from "dialkit";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ForceSimulation, LinkDatum } from "@/lib/force-config";
import { DEV_SETTINGS_DEFAULTS, type DevSettings } from "@/types/dev-settings";

const STORAGE_KEY = "sct-dev-settings";

function loadPersistedSettings(): DevSettings {
	if (typeof window === "undefined") return DEV_SETTINGS_DEFAULTS;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (typeof parsed === "object" && parsed !== null) {
				// Validate each field matches the expected type from defaults
				// to prevent corrupted values (e.g. null from NaN serialization)
				// from breaking DialKit's slider tuple detection
				const validated: Record<string, unknown> = {};
				for (const [key, defaultVal] of Object.entries(DEV_SETTINGS_DEFAULTS)) {
					const saved = parsed[key];
					if (saved !== undefined && typeof saved === typeof defaultVal) {
						validated[key] = saved;
					}
				}
				return { ...DEV_SETTINGS_DEFAULTS, ...validated };
			}
		}
	} catch {
		// ignore
	}
	return DEV_SETTINGS_DEFAULTS;
}

function saveSettings(settings: DevSettings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore
	}
}

interface DevPanelProps {
	simulationRef: React.RefObject<React.RefObject<ForceSimulation | null> | null>;
	onSettingsRef?: (ref: React.MutableRefObject<DevSettings>) => void;
}

interface DevPanelInnerProps extends DevPanelProps {
	onReset: () => void;
}

function DevPanelInner({
	simulationRef,
	onSettingsRef,
	onReset,
}: DevPanelInnerProps) {
	const [persisted] = useState(loadPersistedSettings);
	const settingsRef = useRef<DevSettings>({ ...persisted });

	// Expose settings ref to parent on mount
	useEffect(() => {
		onSettingsRef?.(settingsRef);
	}, [onSettingsRef]);

	const d = persisted;

	const p = useDialKit(
		"Dev Controls",
		{
			physics: {
				repulsion: [d.repulsion, -1000, -100, 10] as [
					number,
					number,
					number,
					number,
				],
				linkDistanceMultiplier: [d.linkDistanceMultiplier, 0.5, 3, 0.1] as [
					number,
					number,
					number,
					number,
				],
				alphaDecay: [d.alphaDecay, 0.005, 0.1, 0.005] as [
					number,
					number,
					number,
					number,
				],
				collisionPadding: [d.collisionPadding, 0, 30, 1] as [
					number,
					number,
					number,
					number,
				],
				velocityDecay: [d.velocityDecay, 0.1, 0.9, 0.05] as [
					number,
					number,
					number,
					number,
				],
				centerStrength: [d.centerStrength, 0, 2, 0.1] as [
					number,
					number,
					number,
					number,
				],
			},
			nodes: {
				_collapsed: true,
				nodeRadius: [d.nodeRadius, 5, 30, 1] as [
					number,
					number,
					number,
					number,
				],
				egoRadius: [d.egoRadius, 8, 40, 1] as [number, number, number, number],
				defaultNodeColor: d.defaultNodeColor,
				nodeBorderWidth: [d.nodeBorderWidth, 0, 4, 0.5] as [
					number,
					number,
					number,
					number,
				],
				nodeBorderColor: d.nodeBorderColor,
				hoverExpand: [d.hoverExpand, 0, 8, 1] as [
					number,
					number,
					number,
					number,
				],
				selectedGlowOffset: [d.selectedGlowOffset, 2, 12, 1] as [
					number,
					number,
					number,
					number,
				],
				selectedGlowOpacity: [d.selectedGlowOpacity, 0, 1, 0.05] as [
					number,
					number,
					number,
					number,
				],
				cohortRingOffset: [d.cohortRingOffset, 1, 10, 1] as [
					number,
					number,
					number,
					number,
				],
				cohortRingWidth: [d.cohortRingWidth, 1, 5, 0.5] as [
					number,
					number,
					number,
					number,
				],
			},
			bondMapping: {
				bondToDistance: d.bondToDistance,
				bondToThickness: d.bondToThickness,
			},
			edges: {
				_collapsed: true,
				edgeWidth: [d.edgeWidth, 0.5, 5, 0.5] as [
					number,
					number,
					number,
					number,
				],
				edgeWidthMin: [d.edgeWidthMin, 0.5, 5, 0.5] as [
					number,
					number,
					number,
					number,
				],
				edgeWidthMax: [d.edgeWidthMax, 1, 8, 0.5] as [
					number,
					number,
					number,
					number,
				],
				selectedEdgeWidth: [d.selectedEdgeWidth, 1, 8, 0.5] as [
					number,
					number,
					number,
					number,
				],
				edgeColorDefault: d.edgeColorDefault,
				edgeColorRomantic: d.edgeColorRomantic,
				edgeColorFamily: d.edgeColorFamily,
				edgeColorProfessional: d.edgeColorProfessional,
			},
			labels: {
				_collapsed: true,
				labelColor: d.labelColor,
				labelSize: [d.labelSize, 8, 18, 1] as [number, number, number, number],
				labelOffset: [d.labelOffset, 0, 12, 1] as [
					number,
					number,
					number,
					number,
				],
				showLabels: d.showLabels,
			},
			canvas: {
				_collapsed: true,
				canvasBgColor: d.canvasBgColor,
			},
			reset: { type: "action" as const, label: "Reset" },
			reheat: { type: "action" as const, label: "Reheat" },
		},
		{
			onAction: (action: string) => {
				if (action === "reset") {
					localStorage.removeItem(STORAGE_KEY);
					onReset();
				}
				if (action === "reheat") {
					const sim = simulationRef.current?.current;
					if (sim) sim.alpha(0.3).restart();
				}
			},
		},
	);

	// Sync DialKit proxy values → settingsRef + localStorage + physics
	useEffect(() => {
		const next: DevSettings = {
			// Physics
			repulsion: p.physics.repulsion,
			linkDistanceMultiplier: p.physics.linkDistanceMultiplier,
			alphaDecay: p.physics.alphaDecay,
			collisionPadding: p.physics.collisionPadding,
			velocityDecay: p.physics.velocityDecay,
			centerStrength: p.physics.centerStrength,
			// Bond mapping
			bondToDistance: p.bondMapping.bondToDistance,
			bondToThickness: p.bondMapping.bondToThickness,
			// Nodes
			nodeRadius: p.nodes.nodeRadius,
			egoRadius: p.nodes.egoRadius,
			defaultNodeColor: p.nodes.defaultNodeColor,
			nodeBorderWidth: p.nodes.nodeBorderWidth,
			nodeBorderColor: p.nodes.nodeBorderColor,
			hoverExpand: p.nodes.hoverExpand,
			selectedGlowOffset: p.nodes.selectedGlowOffset,
			selectedGlowOpacity: p.nodes.selectedGlowOpacity,
			cohortRingOffset: p.nodes.cohortRingOffset,
			cohortRingWidth: p.nodes.cohortRingWidth,
			// Edges
			edgeWidth: p.edges.edgeWidth,
			edgeWidthMin: p.edges.edgeWidthMin,
			edgeWidthMax: p.edges.edgeWidthMax,
			selectedEdgeWidth: p.edges.selectedEdgeWidth,
			edgeColorDefault: p.edges.edgeColorDefault,
			edgeColorRomantic: p.edges.edgeColorRomantic,
			edgeColorFamily: p.edges.edgeColorFamily,
			edgeColorProfessional: p.edges.edgeColorProfessional,
			// Labels
			labelColor: p.labels.labelColor,
			labelSize: p.labels.labelSize,
			labelOffset: p.labels.labelOffset,
			showLabels: p.labels.showLabels,
			// Canvas
			canvasBgColor: p.canvas.canvasBgColor,
		};

		settingsRef.current = next;
		saveSettings(next);

		// Apply physics to simulation
		const sim = simulationRef.current?.current;
		if (!sim) return;

		const charge = sim.force("charge");
		if (charge && "strength" in charge) {
			(charge as { strength: (v: number) => void }).strength(next.repulsion);
		}

		const link = sim.force("link");
		if (link && "distance" in link) {
			(link as { distance: (fn: (d: LinkDatum) => number) => void }).distance(
				(ld: LinkDatum) =>
					next.bondToDistance
						? (300 - ld.bondStrength * 50) * next.linkDistanceMultiplier
						: 150 * next.linkDistanceMultiplier,
			);
		}

		sim.alphaDecay(next.alphaDecay);
		sim.velocityDecay(next.velocityDecay);

		const collide = sim.force("collide");
		if (collide && "radius" in collide) {
			(collide as { radius: (v: number) => void }).radius(
				next.collisionPadding + next.nodeRadius,
			);
		}

		const center = sim.force("center");
		if (center && "strength" in center) {
			(center as { strength: (v: number) => void }).strength(
				next.centerStrength,
			);
		}

		sim.alpha(0.3).restart();
	});

	return null;
}

export default function DevPanel({
	simulationRef,
	onSettingsRef,
}: DevPanelProps) {
	const [resetKey, setResetKey] = useState(0);

	const onSettingsRefStable = useCallback(
		(ref: React.MutableRefObject<DevSettings>) => {
			onSettingsRef?.(ref);
		},
		[onSettingsRef],
	);

	const handleReset = useCallback(() => {
		setResetKey((k) => k + 1);
	}, []);

	return (
		<DevPanelInner
			key={resetKey}
			simulationRef={simulationRef}
			onSettingsRef={onSettingsRefStable}
			onReset={handleReset}
		/>
	);
}

"use client";

import { useDialKit } from "dialkit";
import { useCallback, useEffect, useRef, useState } from "react";
import { VISUAL_DEFAULTS, type VisualSettings } from "@/lib/graph-config";

const STORAGE_KEY = "sct-dev-settings";

function loadPersistedSettings(): VisualSettings {
	if (typeof window === "undefined") return VISUAL_DEFAULTS;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (typeof parsed === "object" && parsed !== null) {
				const validated: Record<string, unknown> = {};
				for (const [key, defaultVal] of Object.entries(VISUAL_DEFAULTS)) {
					const saved = parsed[key];
					if (saved !== undefined && typeof saved === typeof defaultVal) {
						validated[key] = saved;
					}
				}
				return { ...VISUAL_DEFAULTS, ...validated };
			}
		}
	} catch {
		// ignore
	}
	return VISUAL_DEFAULTS;
}

function saveSettings(settings: VisualSettings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore
	}
}

interface DevPanelProps {
	onSettingsRef?: (ref: React.MutableRefObject<VisualSettings>) => void;
}

interface DevPanelInnerProps extends DevPanelProps {
	onReset: () => void;
}

function DevPanelInner({ onSettingsRef, onReset }: DevPanelInnerProps) {
	const [persisted] = useState(loadPersistedSettings);
	const settingsRef = useRef<VisualSettings>({ ...persisted });

	// Expose settings ref to parent on mount
	useEffect(() => {
		onSettingsRef?.(settingsRef);
	}, [onSettingsRef]);

	const d = persisted;

	const p = useDialKit(
		"Visual Controls",
		{
			nodes: {
				_collapsed: true,
				nodeRadius: [d.nodeRadius, 5, 30, 1] as [number, number, number, number],
				egoRadius: [d.egoRadius, 8, 40, 1] as [number, number, number, number],
				defaultNodeColor: d.defaultNodeColor,
				nodeBorderWidth: [d.nodeBorderWidth, 0, 4, 0.5] as [number, number, number, number],
				nodeBorderColor: d.nodeBorderColor,
				hoverExpand: [d.hoverExpand, 0, 8, 1] as [number, number, number, number],
				selectedGlowOffset: [d.selectedGlowOffset, 2, 12, 1] as [number, number, number, number],
				selectedGlowOpacity: [d.selectedGlowOpacity, 0, 1, 0.05] as [
					number,
					number,
					number,
					number,
				],
				cohortRingOffset: [d.cohortRingOffset, 1, 10, 1] as [number, number, number, number],
				cohortRingWidth: [d.cohortRingWidth, 1, 5, 0.5] as [number, number, number, number],
			},
			bondMapping: {
				bondToThickness: d.bondToThickness,
			},
			edges: {
				_collapsed: true,
				edgeWidth: [d.edgeWidth, 0.5, 5, 0.5] as [number, number, number, number],
				edgeWidthMin: [d.edgeWidthMin, 0.5, 5, 0.5] as [number, number, number, number],
				edgeWidthMax: [d.edgeWidthMax, 1, 8, 0.5] as [number, number, number, number],
				selectedEdgeWidth: [d.selectedEdgeWidth, 1, 8, 0.5] as [number, number, number, number],
				edgeColorDefault: d.edgeColorDefault,
				edgeColorRomantic: d.edgeColorRomantic,
				edgeColorFamily: d.edgeColorFamily,
				edgeColorProfessional: d.edgeColorProfessional,
			},
			labels: {
				_collapsed: true,
				labelColor: d.labelColor,
				labelSize: [d.labelSize, 8, 18, 1] as [number, number, number, number],
				labelOffset: [d.labelOffset, 0, 12, 1] as [number, number, number, number],
				showLabels: d.showLabels,
			},
			canvas: {
				_collapsed: true,
				canvasBgColor: d.canvasBgColor,
			},
			reset: { type: "action" as const, label: "Reset" },
		},
		{
			onAction: (action: string) => {
				if (action === "reset") {
					localStorage.removeItem(STORAGE_KEY);
					onReset();
				}
			},
		},
	);

	// Sync DialKit proxy values → settingsRef + localStorage
	useEffect(() => {
		const next: VisualSettings = {
			// Bond mapping
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
	}, [
		p.bondMapping.bondToThickness,
		p.nodes.nodeRadius,
		p.nodes.egoRadius,
		p.nodes.defaultNodeColor,
		p.nodes.nodeBorderWidth,
		p.nodes.nodeBorderColor,
		p.nodes.hoverExpand,
		p.nodes.selectedGlowOffset,
		p.nodes.selectedGlowOpacity,
		p.nodes.cohortRingOffset,
		p.nodes.cohortRingWidth,
		p.edges.edgeWidth,
		p.edges.edgeWidthMin,
		p.edges.edgeWidthMax,
		p.edges.selectedEdgeWidth,
		p.edges.edgeColorDefault,
		p.edges.edgeColorRomantic,
		p.edges.edgeColorFamily,
		p.edges.edgeColorProfessional,
		p.labels.labelColor,
		p.labels.labelSize,
		p.labels.labelOffset,
		p.labels.showLabels,
		p.canvas.canvasBgColor,
	]);

	return null;
}

export default function DevPanel({ onSettingsRef }: DevPanelProps) {
	const [resetKey, setResetKey] = useState(0);

	const onSettingsRefStable = useCallback(
		(ref: React.MutableRefObject<VisualSettings>) => {
			onSettingsRef?.(ref);
		},
		[onSettingsRef],
	);

	const handleReset = useCallback(() => {
		setResetKey((k) => k + 1);
	}, []);

	return <DevPanelInner key={resetKey} onSettingsRef={onSettingsRefStable} onReset={handleReset} />;
}

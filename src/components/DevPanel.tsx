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
	onSettingsChange?: () => void;
}

interface DevPanelInnerProps extends DevPanelProps {
	onReset: () => void;
}

function DevPanelInner({ onSettingsRef, onSettingsChange, onReset }: DevPanelInnerProps) {
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
				degreeAlphaMin: [d.degreeAlphaMin, 0, 1, 0.05] as [number, number, number, number],
			},
			bondMapping: {
				bondToThickness: d.bondToThickness,
				edgeWidthMin: [d.edgeWidthMin, 0.5, 5, 0.5] as [number, number, number, number],
				edgeWidthMax: [d.edgeWidthMax, 1, 8, 0.5] as [number, number, number, number],
			},
			edges: {
				_collapsed: true,
				edgeWidth: [d.edgeWidth, 0.5, 5, 0.5] as [number, number, number, number],
				selectedEdgeWidth: [d.selectedEdgeWidth, 1, 8, 0.5] as [number, number, number, number],
				edgeColorDefault: d.edgeColorDefault,
				edgeColorRomantic: d.edgeColorRomantic,
				edgeColorFamily: d.edgeColorFamily,
				edgeColorProfessional: d.edgeColorProfessional,
				showEgoEdges: d.showEgoEdges,
			},
			labels: {
				_collapsed: true,
				labelColor: d.labelColor,
				labelSize: [d.labelSize, 8, 18, 1] as [number, number, number, number],
				labelOffset: [d.labelOffset, 0, 12, 1] as [number, number, number, number],
				showLabels: d.showLabels,
				labelStrokeWidth: [d.labelStrokeWidth, 0, 6, 0.5] as [number, number, number, number],
				labelStrokeColor: d.labelStrokeColor,
			},
			cohortGroups: {
				_collapsed: true,
				showCohortGroups: d.showCohortGroups,
				cohortGroupFillOpacity: [d.cohortGroupFillOpacity, 0, 1, 0.05] as [
					number,
					number,
					number,
					number,
				],
				cohortGroupBorderOpacity: [d.cohortGroupBorderOpacity, 0, 1, 0.05] as [
					number,
					number,
					number,
					number,
				],
				cohortGroupBorderWidth: [d.cohortGroupBorderWidth, 0, 4, 0.5] as [
					number,
					number,
					number,
					number,
				],
				cohortGroupBorderRadius: [d.cohortGroupBorderRadius, 0, 20, 1] as [
					number,
					number,
					number,
					number,
				],
				cohortGroupPadding: [d.cohortGroupPadding, 0, 60, 2] as [number, number, number, number],
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
			edgeWidthMin: p.bondMapping.edgeWidthMin,
			edgeWidthMax: p.bondMapping.edgeWidthMax,
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
			degreeAlphaMin: p.nodes.degreeAlphaMin,
			// Edges
			edgeWidth: p.edges.edgeWidth,
			selectedEdgeWidth: p.edges.selectedEdgeWidth,
			edgeColorDefault: p.edges.edgeColorDefault,
			edgeColorRomantic: p.edges.edgeColorRomantic,
			edgeColorFamily: p.edges.edgeColorFamily,
			edgeColorProfessional: p.edges.edgeColorProfessional,
			showEgoEdges: p.edges.showEgoEdges,
			// Labels
			labelColor: p.labels.labelColor,
			labelSize: p.labels.labelSize,
			labelOffset: p.labels.labelOffset,
			showLabels: p.labels.showLabels,
			labelStrokeWidth: p.labels.labelStrokeWidth,
			labelStrokeColor: p.labels.labelStrokeColor,
			// Cohort groups
			showCohortGroups: p.cohortGroups.showCohortGroups,
			cohortGroupFillOpacity: p.cohortGroups.cohortGroupFillOpacity,
			cohortGroupBorderOpacity: p.cohortGroups.cohortGroupBorderOpacity,
			cohortGroupBorderWidth: p.cohortGroups.cohortGroupBorderWidth,
			cohortGroupBorderRadius: p.cohortGroups.cohortGroupBorderRadius,
			cohortGroupPadding: p.cohortGroups.cohortGroupPadding,
			// Canvas
			canvasBgColor: p.canvas.canvasBgColor,
		};

		settingsRef.current = next;
		saveSettings(next);
		onSettingsChange?.();
	}, [
		onSettingsChange,
		p.bondMapping.bondToThickness,
		p.bondMapping.edgeWidthMin,
		p.bondMapping.edgeWidthMax,
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
		p.nodes.degreeAlphaMin,
		p.edges.edgeWidth,
		p.edges.selectedEdgeWidth,
		p.edges.edgeColorDefault,
		p.edges.edgeColorRomantic,
		p.edges.edgeColorFamily,
		p.edges.edgeColorProfessional,
		p.edges.showEgoEdges,
		p.labels.labelColor,
		p.labels.labelSize,
		p.labels.labelOffset,
		p.labels.showLabels,
		p.labels.labelStrokeWidth,
		p.labels.labelStrokeColor,
		p.cohortGroups.showCohortGroups,
		p.cohortGroups.cohortGroupFillOpacity,
		p.cohortGroups.cohortGroupBorderOpacity,
		p.cohortGroups.cohortGroupBorderWidth,
		p.cohortGroups.cohortGroupBorderRadius,
		p.cohortGroups.cohortGroupPadding,
		p.canvas.canvasBgColor,
	]);

	return null;
}

export default function DevPanel({ onSettingsRef, onSettingsChange }: DevPanelProps) {
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

	return (
		<DevPanelInner
			key={resetKey}
			onSettingsRef={onSettingsRefStable}
			onSettingsChange={onSettingsChange}
			onReset={handleReset}
		/>
	);
}

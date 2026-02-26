import type { RelationshipCategory } from "./graph";

export interface DevSettings {
	// Physics
	repulsion: number;
	linkDistanceMultiplier: number;
	alphaDecay: number;
	collisionPadding: number;
	velocityDecay: number;
	centerStrength: number;

	// Nodes
	nodeRadius: number;
	egoRadius: number;
	defaultNodeColor: string;
	nodeBorderWidth: number;
	nodeBorderColor: string;
	hoverExpand: number;
	selectedGlowOffset: number;
	selectedGlowOpacity: number;
	cohortRingOffset: number;
	cohortRingWidth: number;

	// Bond strength mapping
	bondToDistance: boolean;
	bondToThickness: boolean;

	// Edges
	edgeWidth: number;
	edgeWidthMin: number;
	edgeWidthMax: number;
	selectedEdgeWidth: number;
	edgeColorDefault: string;
	edgeColorRomantic: string;
	edgeColorFamily: string;
	edgeColorProfessional: string;

	// Labels
	labelColor: string;
	labelSize: number;
	labelOffset: number;
	showLabels: boolean;

	// Canvas
	canvasBgColor: string;
}

export const DEV_SETTINGS_DEFAULTS: DevSettings = {
	// Physics
	repulsion: -400,
	linkDistanceMultiplier: 1,
	alphaDecay: 0.02,
	collisionPadding: 10,
	velocityDecay: 0.4,
	centerStrength: 1,

	// Nodes
	nodeRadius: 12,
	egoRadius: 16,
	defaultNodeColor: "#6B7280",
	nodeBorderWidth: 0,
	nodeBorderColor: "#FFFFFF",
	hoverExpand: 3,
	selectedGlowOffset: 6,
	selectedGlowOpacity: 0.25,
	cohortRingOffset: 4,
	cohortRingWidth: 2,

	// Bond strength mapping
	bondToDistance: true,
	bondToThickness: false,

	// Edges
	edgeWidth: 1,
	edgeWidthMin: 0.5,
	edgeWidthMax: 4,
	selectedEdgeWidth: 3,
	edgeColorDefault: "#999999",
	edgeColorRomantic: "#FF69B4",
	edgeColorFamily: "#FFD700",
	edgeColorProfessional: "#4A90D9",

	// Labels
	labelColor: "#D1D5DB",
	labelSize: 11,
	labelOffset: 4,
	showLabels: true,

	// Canvas
	canvasBgColor: "#09090B",
};

export function edgeColorsFromSettings(
	s: DevSettings,
): Record<RelationshipCategory, string> {
	return {
		default: s.edgeColorDefault,
		romantic: s.edgeColorRomantic,
		family: s.edgeColorFamily,
		professional: s.edgeColorProfessional,
	};
}

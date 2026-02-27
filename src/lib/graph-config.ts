/**
 * graph-config.ts — Single source of truth for all graph configuration.
 *
 * Sections:
 *   A. Relationship Classification
 *   B. Physics Configuration
 *   C. Node Sizing
 *   D. Rendering Constants
 *   E. Interaction Constants
 *   F. UI Data
 *   G. Visual Settings (DevPanel interface + defaults)
 */

import type { RelationshipType } from "@/types/graph";

// ═══════════════════════════════════════════════════════════════════════════
// A. Relationship Classification
// ═══════════════════════════════════════════════════════════════════════════

export type RelationshipCategory = "default" | "romantic" | "family" | "professional";

const CATEGORY_MAP: Record<RelationshipType, RelationshipCategory> = {
	friend: "default",
	close_friend: "default",
	best_friend: "default",
	childhood_friend: "default",
	partner: "romantic",
	ex: "romantic",
	crush: "romantic",
	colleague: "professional",
	classmate: "professional",
	roommate: "default",
	family: "family",
	sibling: "family",
	acquaintance: "default",
	other: "default",
};

export type BondStrength = 1 | 2 | 3 | 4 | 5;

const BOND_STRENGTH_MAP: Record<RelationshipType, BondStrength> = {
	acquaintance: 1,
	other: 1,
	colleague: 2,
	classmate: 2,
	ex: 2,
	crush: 2,
	friend: 3,
	childhood_friend: 3,
	roommate: 3,
	close_friend: 4,
	partner: 4,
	family: 4,
	sibling: 4,
	best_friend: 5,
};

export function getCategory(type: RelationshipType): RelationshipCategory {
	return CATEGORY_MAP[type];
}

export function getBondStrength(type: RelationshipType): BondStrength {
	return BOND_STRENGTH_MAP[type];
}

// ═══════════════════════════════════════════════════════════════════════════
// B. Physics Configuration
// ═══════════════════════════════════════════════════════════════════════════

/** Bond strength → link distance: closer bond = shorter link */
export const BOND_DISTANCE: Record<BondStrength, number> = {
	5: 60,
	4: 100,
	3: 160,
	2: 220,
	1: 300,
};

/** Bond strength → link rigidity: stronger bond = more rigid */
export const BOND_LINK_STRENGTH: Record<BondStrength, number> = {
	5: 0.85,
	4: 0.6,
	3: 0.4,
	2: 0.2,
	1: 0.1,
};

/** Bond strength → radial target distance from ego (concentric rings) */
export const BOND_RADIAL: Record<BondStrength, number> = {
	5: 100,
	4: 180,
	3: 280,
	2: 380,
	1: 500,
};

export const PHYSICS = {
	repulsion: -400,
	linkDistanceMultiplier: 1,
	alphaDecay: 0.012,
	collisionPadding: 10,
	velocityDecay: 0.35,
	centerStrength: 0.05,
	bondToDistance: true,
	collideStrength: 0.8,
	collideIterations: 2,
	chargeDistanceMax: 500,
	alphaMin: 0.001,
	reheatAlpha: 0.3,
	radialStrengthNode: 0.15,
	radialStrengthEgo: 1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// C. Node Sizing — defaults now live in VISUAL_DEFAULTS / getVisualRadius()
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// D. Rendering Constants
// ═══════════════════════════════════════════════════════════════════════════

export const DIMMED_ALPHA = 0.04;

export const BOND_OPACITY: Record<number, number> = {
	5: 0.9,
	4: 0.7,
	3: 0.5,
	2: 0.3,
	1: 0.2,
};

export const FADE_DURATION = 300;
export const VIEW_PADDING = 50;

// ═══════════════════════════════════════════════════════════════════════════
// E. Interaction Constants
// ═══════════════════════════════════════════════════════════════════════════

export const EDGE_HIT_THRESHOLD = 5;

// ═══════════════════════════════════════════════════════════════════════════
// F. UI Data
// ═══════════════════════════════════════════════════════════════════════════

export const RELATIONSHIP_TYPES: {
	value: RelationshipType;
	label: string;
}[] = [
	{ value: "friend", label: "Friend" },
	{ value: "close_friend", label: "Close friend" },
	{ value: "best_friend", label: "Best friend" },
	{ value: "childhood_friend", label: "Childhood friend" },
	{ value: "partner", label: "Partner" },
	{ value: "ex", label: "Ex" },
	{ value: "crush", label: "Crush" },
	{ value: "colleague", label: "Colleague" },
	{ value: "classmate", label: "Classmate" },
	{ value: "roommate", label: "Roommate" },
	{ value: "family", label: "Family" },
	{ value: "sibling", label: "Sibling" },
	{ value: "acquaintance", label: "Acquaintance" },
	{ value: "other", label: "Other" },
];

export const BOND_LABELS: Record<BondStrength, string> = {
	1: "Distant",
	2: "Casual",
	3: "Moderate",
	4: "Close",
	5: "Inseparable",
};

export const DEFAULT_COHORT_COLORS: readonly string[] = [
	"#6366F1", // indigo
	"#EC4899", // pink
	"#F59E0B", // amber
	"#10B981", // emerald
	"#3B82F6", // blue
	"#8B5CF6", // violet
	"#EF4444", // red
	"#14B8A6", // teal
];

// ═══════════════════════════════════════════════════════════════════════════
// G. Visual Settings (DevPanel interface + defaults)
// ═══════════════════════════════════════════════════════════════════════════

export interface VisualSettings {
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

	// Bond strength mapping (visual only)
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

export const VISUAL_DEFAULTS: VisualSettings = {
	// Nodes
	nodeRadius: 12,
	egoRadius: 20,
	defaultNodeColor: "#6B7280",
	nodeBorderWidth: 0,
	nodeBorderColor: "#FFFFFF",
	hoverExpand: 3,
	selectedGlowOffset: 6,
	selectedGlowOpacity: 0.25,
	cohortRingOffset: 4,
	cohortRingWidth: 2,

	// Bond strength mapping
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

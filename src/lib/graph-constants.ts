import type { BondStrength, RelationshipType } from "@/types/graph";

export const NODE_RADIUS = 12;
export const EGO_RADIUS = 16;

export const MAX_NAME_LENGTH = 100;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_LABEL_LENGTH = 200;

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] =
	[
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

export const DEFAULT_BOND_STRENGTHS: Record<RelationshipType, BondStrength> = {
	best_friend: 5,
	partner: 5,
	close_friend: 4,
	family: 4,
	sibling: 4,
	childhood_friend: 3,
	roommate: 3,
	friend: 3,
	crush: 3,
	classmate: 2,
	colleague: 2,
	ex: 2,
	acquaintance: 1,
	other: 2,
};

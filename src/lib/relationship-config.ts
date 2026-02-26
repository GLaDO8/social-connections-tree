import type { RelationshipType } from "../types/graph";

export type RelationshipCategory =
	| "default"
	| "romantic"
	| "family"
	| "professional";

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

// 1 = distant, 5 = inseparable
const BOND_STRENGTH_MAP: Record<RelationshipType, number> = {
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

export function getBondStrength(type: RelationshipType): number {
	return BOND_STRENGTH_MAP[type];
}

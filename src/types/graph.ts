export interface Cohort {
	id: string;
	name: string;
	color: string;
}

export interface Person {
	id: string;
	name: string;
	cohortIds: string[];
	isEgo: boolean;
	notes?: string;
	// d3-force mutates these in-place
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

export type RelationshipCategory =
	| "default"
	| "romantic"
	| "family"
	| "professional";

export type RelationshipType =
	| "friend"
	| "close_friend"
	| "best_friend"
	| "childhood_friend"
	| "partner"
	| "ex"
	| "crush"
	| "colleague"
	| "classmate"
	| "roommate"
	| "family"
	| "sibling"
	| "acquaintance"
	| "other";

export type BondStrength = 1 | 2 | 3 | 4 | 5;

export interface Relationship {
	id: string;
	sourceId: string;
	targetId: string;
	type: RelationshipType;
	category: RelationshipCategory;
	label: string;
	bondStrength: BondStrength;
	notes?: string;
}

export interface SocialGraph {
	persons: Person[];
	relationships: Relationship[];
	cohorts: Cohort[];
	activeCohortId: string | null;
	metadata: {
		title: string;
		createdAt: string;
		updatedAt: string;
	};
}

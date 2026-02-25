import type { RelationshipCategory, RelationshipType } from "@/types/graph";

const ROMANTIC_TYPES: ReadonlySet<RelationshipType> = new Set([
	"partner",
	"ex",
	"crush",
]);

const FAMILY_TYPES: ReadonlySet<RelationshipType> = new Set([
	"family",
	"sibling",
]);

const PROFESSIONAL_TYPES: ReadonlySet<RelationshipType> = new Set([
	"colleague",
	"classmate",
]);

/**
 * Map a relationship type to its visual category for edge coloring.
 *
 * Categories:
 *  - romantic:      partner, ex, crush         → pink edges
 *  - family:        family, sibling            → yellow edges
 *  - professional:  colleague, classmate       → blue edges
 *  - default:       everything else            → gray edges
 */
export function getRelationshipCategory(
	type: RelationshipType,
): RelationshipCategory {
	if (ROMANTIC_TYPES.has(type)) return "romantic";
	if (FAMILY_TYPES.has(type)) return "family";
	if (PROFESSIONAL_TYPES.has(type)) return "professional";
	return "default";
}

/**
 * Default cohort colors to cycle through when auto-creating cohorts.
 * Index into this array with `cohorts.length % DEFAULT_COHORT_COLORS.length`.
 */
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

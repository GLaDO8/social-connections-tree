/**
 * System prompt optimized for Gemini structured output.
 *
 * The JSON schema (via responseJsonSchema) handles structure and field constraints.
 * This prompt focuses purely on domain judgment: WHEN to use each operation,
 * HOW to infer relationship types and bond strengths, and ordering rules.
 */
const SYSTEM_PROMPT = `You parse natural language into social graph operations.

The user is building a personal ego-centric social graph. "Me" is the ego node at the center.

RULES:
- "my friend" → sourceName is "Me"
- Third-party: "A and B know each other" → sourceName "A", targetName "B"
- Order operations: add_cohort → add_person → add_relationship → updates → removes
- Only create persons/cohorts that don't already exist (check the existing lists below)
- For batch input like "A, B, C are my college friends" → create cohort, all persons, all relationships
- For corrections like "actually X is close" → use update_relationship

INFERENCE:
- "close" / "very close" → close_friend, bondStrength 4
- "best friend" → best_friend, bondStrength 5
- "childhood" → childhood_friend, bondStrength 3
- "college" / "school" / "class" → classmate, bondStrength 2 (unless "friend" is mentioned → friend, bondStrength 3)
- "work" / "office" → colleague, bondStrength 2
- "roommate" → roommate, bondStrength 3
- "partner" / "dating" / "relationship" → partner, bondStrength 5
- "family" / "parent" / "cousin" → family, bondStrength 4
- "brother" / "sister" → sibling, bondStrength 4
- Default: friend, bondStrength 3

LABEL: Write a short natural phrase for the edge label (e.g., "childhood friend from FIITJEE", "college roommate").

EXPLANATION: Write a brief, friendly confirmation of what you did (e.g., "Added Kavya as a close childhood friend in your FIITJEE group."). Do NOT list operations technically.`;

/**
 * Build the full system prompt with current graph state injected.
 */
export function buildSystemPrompt(
	existingPersonNames: string[],
	existingCohortNames: string[],
): string {
	const parts = [SYSTEM_PROMPT];

	if (existingPersonNames.length > 0) {
		parts.push(`\nEXISTING PEOPLE: ${existingPersonNames.join(", ")}`);
	}
	if (existingCohortNames.length > 0) {
		parts.push(`EXISTING COHORTS: ${existingCohortNames.join(", ")}`);
	}

	return parts.join("\n");
}

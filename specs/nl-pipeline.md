# Spec: NL Pipeline

**Status**: draft

## Flow

```
User types message
  → Client sends POST /api/parse-input
    → body: { input, existingPersonNames[], existingCohortNames[] }
  → Server: Claude API with Zod structured output
    → returns: { operations: GraphOperation[], explanation: string }
  → Client: apply-operations.ts resolves names → IDs
  → Client: dispatches to graph reducer in order
  → Simulation reheats → canvas shows changes
  → Chat shows explanation as confirmation
```

## API Route: `/api/parse-input`

### Request
```typescript
{
  input: string;                    // user's natural language message
  existingPersonNames: string[];    // current graph's person names
  existingCohortNames: string[];    // current graph's cohort names
}
```

### Response (Claude structured output via Zod)
```typescript
{
  operations: GraphOperation[];
  explanation: string;              // conversational confirmation for chat
}
```

## GraphOperation Types

```typescript
type GraphOperation =
  | { op: 'add_person'; data: { name: string; cohortNames?: string[] } }
  | { op: 'add_relationship'; data: {
      sourceName: string; targetName: string;
      type: RelationshipType; label: string; bondStrength: BondStrength;
    }}
  | { op: 'add_cohort'; data: { name: string } }
  | { op: 'update_person'; data: { name: string; updates: Partial<Person> } }
  | { op: 'update_relationship'; data: {
      sourceName: string; targetName: string;
      updates: Partial<Relationship>;
    }}
  | { op: 'remove_person'; data: { name: string } }
  | { op: 'remove_relationship'; data: { sourceName: string; targetName: string } };
```

## Name Resolution
- Operations use **names**, not IDs
- Client resolves names to IDs via fuzzy matching against existing graph
- If person doesn't exist → auto-create (for add_relationship)
- If cohort doesn't exist → auto-create with generated color

## Input Types Supported
- Simple: "Kavya is my friend"
- Third-party: "Kavya and Ashish know each other"
- Batch: "Kavya, Shreya, and Swetha are FIITJEE friends"
- Corrections: "Actually Ashish is a close friend"

## Ambiguity Handling
- Best-guess with defaults: bond strength defaults to 3, relationship type inferred from context
- User corrects via properties panel after

## Chat Memory
- Each message is **independent** (no chat history sent to LLM)
- Each call includes current graph state (names) for context
- No pronoun resolution across messages

## System Prompt (high-level)
The system prompt should include:
- Domain: personal social connections graph
- Available operations and their schemas
- Relationship type taxonomy with examples
- Bond strength scale (1-5) with descriptions
- Instructions to use "me"/"Shreyas" as the ego node
- Examples of input → expected operations

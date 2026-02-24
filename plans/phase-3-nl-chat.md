# Phase 3: Chat-style NL Input

**Status**: not started
**Spec refs**: [nl-pipeline](../specs/nl-pipeline.md), [chat-ux](../specs/chat-ux.md)
**Goal**: The primary way to build the graph — type natural language, see nodes appear.

## Tasks

### 3.1 Install AI dependencies
- Add `@anthropic-ai/sdk` and `zod`
- Configure `.env.local` with `ANTHROPIC_API_KEY`
- **Parallel**: independent

### 3.2 System prompt
- Create `src/lib/prompt.ts`
- System prompt with: domain context, operation schemas, relationship type taxonomy, bond strength scale, examples
- Context builder: inject existing person/cohort names
- **Parallel**: independent

### 3.3 API route
- Create `src/app/api/parse-input/route.ts`
- Accept: `{ input, existingPersonNames, existingCohortNames }`
- Call Claude with Zod structured output schema
- Return: `{ operations, explanation }`
- **Depends on**: 3.1, 3.2

### 3.4 Operation applicator
- Create `src/lib/apply-operations.ts`
- Name → ID resolution with fuzzy matching (`src/lib/graph-utils.ts`)
- Auto-create missing persons/cohorts
- Dispatch operations to reducer in order
- **Depends on**: 1.3

### 3.5 Chat UI
- Create `src/components/ChatInput.tsx`
- Bottom-docked panel with message history + input
- Message types: user, success (from `explanation`), error, loading
- Collapsible (toggle button)
- Auto-scroll to bottom on new message
- **Depends on**: 3.3, 3.4

### 3.6 Wire end-to-end
- Connect ChatInput → API call → apply-operations → reducer → simulation reheats → canvas updates
- Chat shows explanation as confirmation
- Remove temporary add form from Phase 1
- **Depends on**: 3.5

## Verification
- [ ] Type "Kavya is my FIITJEE childhood friend, close" → Kavya node appears, graph breathes
- [ ] Type "Ashish is my roommate, casual" → Ashish appears farther from center (weaker bond)
- [ ] Type "Kavya and Ashish are classmates" → third-party edge created
- [ ] Batch: "Shreya, Priya, and Ananya are college friends" → 3 nodes + 3 edges created
- [ ] Correction: "Actually Ashish is a close friend" → bond strength updates, Ashish moves closer
- [ ] Error handling: gibberish input → friendly error in chat
- [ ] Loading state: typing indicator while API call in progress

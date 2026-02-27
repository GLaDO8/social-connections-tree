# src/app/ — Next.js App Shell + API

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `page.tsx` | Root page. Composes `GraphProvider` → `GraphCanvas` + `ChatInput` + `PropertiesPanel` + `Header` + `DevPanel` + `CohortManager` + `KeyboardShortcuts`. Wires `visualSettingsRef` from DevPanel to GraphCanvas. | Changing top-level composition or ref wiring |
| `layout.tsx` | HTML shell, font loading, metadata | Changing page metadata or global layout |
| `globals.css` | Tailwind base + dark theme CSS variables | Changing theme colors or global styles |
| `api/parse-input/route.ts` | POST endpoint: NL text → Claude API → `GraphOperation[]` + explanation | Changing NL parsing, Claude prompt, or API behavior |

## NL Pipeline Flow

```
ChatInput → POST /api/parse-input
  → { input, existingPersonNames[], existingCohortNames[] }
  → route.ts: Claude API call with tool_use + Zod validation
  → Returns: { operations: GraphOperation[], explanation: string }
  → ChatInput: resolveOperations() → batchDispatch() → simulation reheats
```

## DevPanel ↔ Canvas Ref Wiring

`page.tsx` brokers the `visualSettingsRef` between `DevPanel` (producer) and `GraphCanvas` (consumer) via a ref-holder pattern. DevPanel calls `onSettingsRef(ref)` on mount, page stores it in `devSettingsRefHolder`, GraphCanvas reads it each render frame.

# src/app/ — Next.js App Shell + API

## File Map

| File | Purpose | When to read |
|------|---------|--------------|
| `page.tsx` | Root page. Composes `GraphProvider` → `TooltipProvider` → `KeyboardShortcuts` + `GraphCanvas` + `ChatInput` + `PropertiesPanel` + `CohortManager` + `DevPanel` + `Header` + `DialRoot` (dialkit). Brokers `visualSettingsRef` and `scheduleRenderRef` between DevPanel and GraphCanvas. | Changing top-level composition, ref wiring, or render-trigger plumbing |
| `layout.tsx` | HTML shell (`<html class="dark">`), Geist + Geist_Mono font loading, page metadata | Changing page metadata or global layout |
| `globals.css` | Tailwind base + `tw-animate-css` + `shadcn/tailwind.css` imports. Defines light and dark theme CSS variables (colors, radii, sidebar, chart tokens) via oklch. | Changing theme colors or global styles |
| `api/parse-input/route.ts` | POST endpoint: NL text → multi-turn Claude tool-use loop (up to 5 turns, `claude-haiku-4-5-20251001`) → `GraphOperation[]` + explanation. Defines 7 flat tool schemas, transforms tool calls via `toolCallToOperation()`, validates with Zod. System prompt built by `buildSystemPrompt()` from `@/lib/prompt`. | Changing NL parsing, Claude prompt, tool schemas, or API behavior |

## NL Pipeline Flow

```
ChatInput → POST /api/parse-input
  → { input, existingPersonNames[], existingCohortNames[] }
  → route.ts: buildSystemPrompt() from @/lib/prompt
  → Multi-turn tool-use loop (up to 5 turns):
      Claude returns tool_use blocks → collected across turns
      Tool results fed back as "OK" until stop_reason != "tool_use"
  → toolCallToOperation() transforms flat tool inputs → GraphOperation format
  → Zod validation (ResponseSchema)
  → Returns: { operations: GraphOperation[], explanation: string }
  → ChatInput: resolveOperations() → batchDispatch() → simulation reheats
```

## DevPanel ↔ Canvas Ref Wiring

`page.tsx` brokers two refs between `DevPanel` (producer) and `GraphCanvas` (consumer):

1. **`devSettingsRefHolder`** — DevPanel calls `onSettingsRef(ref)` on mount, page stores the ref. GraphCanvas reads it each render frame to get current visual settings.
2. **`scheduleRenderRef`** — GraphCanvas calls `onScheduleRender(fn)` on mount, page stores the render-trigger function. DevPanel settings changes call `onSettingsChange()`, which invokes `scheduleRenderRef.current()` to trigger a canvas re-render.

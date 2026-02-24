# Spec: Chat UX

**Status**: draft

## Layout
Bottom-docked panel, full width, collapsible.

```
├──────────────────────────────────────────────────────────────┤
│ ✔ Added Kavya (FIITJEE) + childhood_friend                   │
│ ✔ Connected Ashish ↔ Nishant (classmate)                     │
│ [Type to add people and connections...]                  [⏎] │
└──────────────────────────────────────────────────────────────┘
```

## Message Types

| Type | Appearance |
|------|------------|
| User message | Right-aligned, subtle background |
| Success confirmation | Left-aligned, conversational tone. E.g., "Got it! Added Kavya as a close childhood friend in your FIITJEE group." |
| Error | Left-aligned, red accent. E.g., "I couldn't understand that. Try: 'Kavya is my friend from FIITJEE'" |
| Loading | Left-aligned, typing indicator (dots) |

## Confirmation Style
- Natural language, conversational tone
- NOT structured/technical: avoid "✔ Added Kavya • childhood_friend • bond:4"
- Example: "Got it! Added Kavya as a close childhood friend in your FIITJEE group."
- Comes from `explanation` field in Claude's structured output

## Input Behavior
- Single-line text input with send button
- Enter to send, Shift+Enter for newline (if multiline later)
- Input disabled while loading (API call in progress)
- Auto-focus on page load

## Collapse Behavior
- Collapsible via toggle button or keyboard shortcut
- When collapsed: only input bar visible (no message history)
- Default: expanded showing last ~5 messages

## Scroll
- Message area scrolls, newest at bottom
- Auto-scroll to bottom on new message

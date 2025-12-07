---
date: 2025-12-07
task_id: "bug-summary-stats-zero-blank"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "Summary stats showing 0/blank in top panel despite messages"
tags: [research, codebase, stats, header, parser, sessionstats]
status: complete
---

# Research: Summary stats showing 0/blank in top panel despite messages

**Task ID**: bug-summary-stats-zero-blank
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
Document why the summary stats in the top panel are showing 0/blank values despite having many messages in the stream. This requires understanding how stats are calculated, passed to components, and displayed.

## Summary
The Ralph TUI stats system consists of three main components:
1. Stats calculation logic in `parser.ts` that aggregates message data into `SessionStats` objects
2. State management in the `useJSONLStream` hook and App component that tracks stats updates
3. Display components (Header, StatsView) that render the numeric values with formatting

The stats calculation flow starts when JSONL messages are processed, triggers recalculation on every update, and passes the resulting stats object through props to display components. All numeric fields are initialized to 0 and never become blank/undefined by design.

## Detailed Findings

### SessionStats Type Structure
The core stats interface is defined at `.ralph/tui/src/lib/types.ts:164-176`:
- Contains numeric fields for tokens (input/output), tool calls, messages, errors, and subagent counts
- Includes nullable Date fields for timing (startTime, endTime)
- All numeric fields are typed as `number`, not `number | null`

### Stats Calculation Logic
The calculation happens in two functions in `.ralph/tui/src/lib/parser.ts`:

**calculateStats (lines 139-161):**
- Initializes stats object with all zeros
- Iterates through messages to accumulate token counts from `msg.usage`
- Counts tool calls, errors, and subagent calls using array filters
- Sets timing based on first/last message timestamps

**calculateSessionStats (lines 169-202):**
- Wrapper that determines session scope based on `sessionStartIndex` and `isRalphRunning`
- Returns empty stats object (with zeros) when no messages exist
- Three cases: current session (from index), last session (all messages), or empty session

### Data Flow Implementation
The stats data flows through the application as follows:

1. **JSONL Processing** (`.ralph/tui/src/hooks/use-jsonl-stream.ts`):
   - Hook reads and parses JSONL file (lines 178-196)
   - Messages accumulated in state array (line 158)
   - Stats recalculated on every message update (line 159)
   - Initial stats state has all zeros (lines 37-45)

2. **App Component** (`.ralph/tui/src/app.tsx`):
   - Calculates session-scoped stats using useMemo (lines 273-276)
   - Passes `sessionStats` to Header component (line 535)
   - Also passes to StatsView (line 520) and Sidebar (line 558)

3. **Header Display** (`.ralph/tui/src/components/header.tsx`):
   - Receives stats as required prop (lines 39-46)
   - Renders token counts at lines 108-111 using `formatTokens()` helper
   - Shows tool/message counts at lines 142-144 as raw numbers
   - Displays elapsed time or '--' for invalid dates (line 146)
   - Conditionally shows error count only when > 0 (lines 147-151)

### Token Formatting Function
The `formatTokens()` helper at `.ralph/tui/src/lib/parser.ts:582-589`:
- Formats numbers with M suffix for millions (>= 1000000)
- Formats with k suffix for thousands (>= 1000)
- Returns string representation for smaller numbers
- Always returns "0" for zero via `count.toString()`

### State Initialization
The stats state is initialized with zeros at `.ralph/tui/src/hooks/use-jsonl-stream.ts:37-45`:
```typescript
const [stats, setStats] = useState<SessionStats>({
  totalTokens: { input: 0, output: 0 },
  toolCallCount: 0,
  messageCount: 0,
  errorCount: 0,
  startTime: null,
  endTime: null,
  subagentCount: 0,
});
```

### Empty Message Handling
When no messages exist, `.ralph/tui/src/lib/parser.ts:174-183` returns:
```typescript
return {
  totalTokens: { input: 0, output: 0 },
  toolCallCount: 0,
  messageCount: 0,
  errorCount: 0,
  startTime: null,
  endTime: null,
  subagentCount: 0,
};
```

## Code References
- `.ralph/tui/src/lib/types.ts:164-176` - SessionStats interface definition
- `.ralph/tui/src/lib/parser.ts:139-161` - calculateStats function implementation
- `.ralph/tui/src/lib/parser.ts:169-202` - calculateSessionStats session scoping logic
- `.ralph/tui/src/lib/parser.ts:582-589` - formatTokens number formatting
- `.ralph/tui/src/hooks/use-jsonl-stream.ts:37-45` - Stats state initialization
- `.ralph/tui/src/hooks/use-jsonl-stream.ts:158-160` - Stats update on message processing
- `.ralph/tui/src/app.tsx:273-276` - Session stats calculation with useMemo
- `.ralph/tui/src/app.tsx:533-539` - Header component with stats prop
- `.ralph/tui/src/components/header.tsx:39-46` - HeaderProps interface with required stats
- `.ralph/tui/src/components/header.tsx:106-112` - Token counter display logic
- `.ralph/tui/src/components/header.tsx:140-152` - Session stats display

## Architecture Documentation

### Current Implementation Patterns
1. **Pure Function Calculation**: Stats calculated via pure functions without side effects
2. **Immutable Updates**: Stats recalculated from scratch on each message change
3. **Props Drilling**: Stats passed explicitly through component props (no Context API)
4. **Zero Defaults**: All numeric fields initialized to 0, never null/undefined
5. **Conditional Rendering**: Only error count has conditional display logic (when > 0)
6. **Real-time Updates**: Stats recalculated on every message, duration updates on each render

### State Management Pattern
- useState in hooks for local state
- useMemo in app component for performance optimization
- No useReducer or complex state management
- Direct prop passing from app to child components

### Testing Patterns
- Mock stats objects created with realistic data (`.ralph/tui/src/components/header.test.tsx:7-24`)
- Factory functions for test stats creation (`.ralph/tui/src/components/stats/stats-view.test.tsx:8-17`)
- Partial overrides supported for test flexibility

## Historical Context (from .ai-docs/thoughts/)
No existing research documents found related to stats calculation or display issues in the `.ai-docs/thoughts/` directory.

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product overview and goals
- `.ai-docs/adr/002-ralph-tui-tech-stack.md` - Technical stack decisions (Ink, React, TypeScript)
- `AGENTS.md` - Development guidance and architecture overview

## Open Questions
- When exactly are messages being populated vs when stats are calculated?
- Is there a race condition between JSONL stream processing and stats display?
- Are there any async timing issues with the useJSONLStream hook initialization?
- Is the sessionStartIndex being set correctly for session boundaries?
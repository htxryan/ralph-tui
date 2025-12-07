---
date: 2025-12-07
task_id: "subagent-token-count-display"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "Subagent Token Count Display"
tags: [research, codebase, subagent, tokens, display, ui]
status: complete
---

# Research: Subagent Token Count Display

**Task ID**: subagent-token-count-display
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
Document how to display the number of tokens used for each "Task Subagent" item in the message list and in the header of the Subagent Detail view.

## Summary
The Ralph TUI currently tracks token counts for all messages including subagent messages through the `usage` field in JSONL events. Token data flows from JSONL to `ProcessedMessage` objects and is stored in each subagent message within `ToolCall.subagentMessages` arrays. However, these token counts are not aggregated or displayed in the UI for subagents. The codebase has established patterns for formatting and displaying token counts in various locations (header, sidebar, stats) using the `formatTokens` utility, but these patterns only show main agent tokens.

## Detailed Findings

### Task Subagent Display in Message List
- **Location**: `.ralph/tui/src/components/messages/message-item.tsx:40-75, 146-168`
- Task Subagent messages are identified by checking `message.toolCalls.some(tc => tc.isSubagent)`
- Displayed with:
  - Label: "Task Subagent" (line 75)
  - Color: cyan (`colors.subagent`)
  - Icon: assistant icon
  - Pill-style formatting for the tool call (lines 151-164)
- Tool call summary rendered by `tool-call-summary.tsx:37-52`
- Pill formatting handled by `tool-formatting.ts:117-138`
- Currently no token count shown alongside the Task Subagent label or pill

### Subagent Detail View Header
- **Location**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx:839-1012`
- Header consists of:
  - Breadcrumb navigation (lines 898-901, 952-953): "Main Agent > Task: [description]"
  - Tab bar (lines 169-189, 956): Overview and Messages tabs
- Header height: 2 lines (breadcrumb + tabs) at line 946
- Token data available via `toolCall.subagentMessages` at line 861
- Currently no token display in the header section

### Token Data Structure and Flow

#### Data Types
- **ClaudeEvent**: `.ralph/tui/src/lib/types.ts:9-12`
  - Contains optional `usage?: { input_tokens: number, output_tokens: number }`
- **ProcessedMessage**: `.ralph/tui/src/lib/types.ts:40-43`
  - Carries same `usage` structure from ClaudeEvent
- **ToolCall**: `.ralph/tui/src/lib/types.ts:46-62`
  - Has `subagentMessages: ProcessedMessage[]` field (line 62)
  - Does not have aggregate token count field

#### Processing Pipeline
1. **JSONL Parsing**: `.ralph/tui/src/lib/parser.ts:9-16`
   - `parseJSONLLine` extracts raw events
2. **Event Processing**: `.ralph/tui/src/lib/parser.ts:59-105`
   - `processEvent` extracts usage at lines 82, 103
   - Creates ProcessedMessage with usage data
3. **Subagent Collection**: `.ralph/tui/src/hooks/use-jsonl-stream.ts:67-103`
   - Messages with `parent_tool_use_id` identified as subagent messages (line 68-69)
   - Stored in `subagentMessagesMap` (line 96)
   - Attached to parent ToolCall at line 102
4. **Statistics**: `.ralph/tui/src/lib/parser.ts:139-161`
   - `calculateStats` aggregates main agent tokens only (lines 151-154)
   - Does not traverse into subagent messages

### Existing Token Display Patterns

#### formatTokens Utility
- **Location**: `.ralph/tui/src/lib/parser.ts:216-224`
- Formats numbers with suffixes: M for millions, k for thousands
- One decimal place precision
- Returns string representation

#### Display Components
1. **Header** (`.ralph/tui/src/components/header.tsx:105-112`)
   - Format: "Tokens: 45.2k (30.1kin/15.1kout)"
   - Shows total and breakdown in parentheses
   - Uses `formatTokens` utility

2. **Stats View** (`.ralph/tui/src/components/stats/stats-view.tsx:174-195`)
   - Dedicated "Token Usage" section
   - Separate rows for Input, Output, Total
   - Icons: ↓ for input, ↑ for output, Σ for total
   - Total shown in success color (green)

3. **Sidebar** (`.ralph/tui/src/components/sidebar.tsx:98-101`)
   - Simple format: "Tokens: 45.2k"
   - Shows total only, no breakdown

4. **Message Detail** (`.ralph/tui/src/components/messages/message-detail-view.tsx:195-199`)
   - Raw counts with commas: "Tokens: 1,234 in / 567 out"
   - Uses `toLocaleString()` instead of `formatTokens`
   - Conditional rendering when usage exists

### Color and Styling Patterns
- **Colors**: `.ralph/tui/src/lib/colors.ts:26`
  - Subagent color: cyan
  - Success color: green (used for totals)
  - Dimmed color: gray (used for labels)
- **Subagent Type Colors**: `.ralph/tui/src/lib/tool-formatting.ts:8-24`
  - Different subagent types have dedicated colors
  - Examples: Explore, Plan, git-operator, web-search-researcher

## Code References
- `.ralph/tui/src/components/messages/message-item.tsx:40-75` - Task Subagent identification and labeling
- `.ralph/tui/src/components/messages/message-item.tsx:146-168` - Tool call pill rendering
- `.ralph/tui/src/components/subagent/subagent-detail-view.tsx:898-901` - Subagent Detail view header
- `.ralph/tui/src/lib/types.ts:62` - ToolCall.subagentMessages array definition
- `.ralph/tui/src/lib/parser.ts:216-224` - formatTokens utility function
- `.ralph/tui/src/hooks/use-jsonl-stream.ts:102` - Subagent messages attachment to ToolCall
- `.ralph/tui/src/components/header.tsx:105-112` - Header token display pattern
- `.ralph/tui/src/components/stats/stats-view.tsx:174-195` - Stats view token display pattern

## Architecture Documentation

### Current Implementation
- **Token Tracking**: Each subagent message maintains individual `usage` data
- **Data Storage**: Subagent messages stored in `ToolCall.subagentMessages` array
- **Aggregation**: No aggregation of subagent tokens currently performed
- **Display**: No subagent token counts displayed in UI

### Display Locations Needing Token Counts
1. **Message List** (`message-item.tsx`)
   - Task Subagent label area (line 75)
   - Tool call pill area (lines 151-164)
   
2. **Subagent Detail View** (`subagent-detail-view.tsx`)
   - Header section below breadcrumb
   - Overview tab statistics
   - Messages tab summary

### Available Data for Implementation
- Each subagent message in `toolCall.subagentMessages` has `usage` field
- Can calculate aggregate by summing all messages in array
- `formatTokens` utility available for consistent formatting
- Established display patterns for reference

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product overview and goals
- `.ai-docs/adr/002-stream-processing-architecture.md` - Stream processing patterns
- `.ralph/tui/src/lib/types.ts` - Complete type definitions
- `.ralph/tui/AGENTS.md` - Development guidelines

## Open Questions
- Should subagent tokens be included in the main session total or shown separately?
- Should the message list show individual subagent tokens or aggregate for all subagents in that message?
- Should token counts update in real-time as subagent messages stream in?
- What level of detail for token breakdown (just total vs input/output split)?
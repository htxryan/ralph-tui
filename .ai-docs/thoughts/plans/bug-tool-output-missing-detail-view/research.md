---
date: 2025-12-07
task_id: "bug-tool-output-missing-detail-view"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "Tool Output Not Displaying in Message Detail View"
tags: [research, codebase, tool-calls, message-detail-view, tool-output]
status: complete
---

# Research: Tool Output Not Displaying in Message Detail View

**Task ID**: bug-tool-output-missing-detail-view
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
The message detail view for Tool calls (like Bash) doesn't show the tool output, only the input. The task is to research why tool outputs are missing from the detail view and document how tool messages are currently displayed.

## Summary
The MessageDetailView component DOES have code to display tool results at `.ralph/tui/src/components/messages/message-detail-view.tsx:114-125`. The component checks for the presence of `tc.result` field and renders it when available. The issue appears to be that the `result` field is properly populated in the ToolCall objects through the `matchToolResults` function, which means the display logic exists but tool results should be showing if they exist in the data.

## Detailed Findings

### MessageDetailView Component Implementation
The component at `.ralph/tui/src/components/messages/message-detail-view.tsx` handles tool display:

- **Tool Call Section** (lines 69-127):
  - Iterates through `message.toolCalls` array
  - Displays tool header with status icon and name (lines 88-93)
  - Shows all input parameters with full details (lines 95-111)
  - **Result Display Logic** exists at lines 114-125:
    - Checks if `tc.result` field exists
    - If present, displays "Result:" header
    - Splits result by newlines and shows each line indented
    - Uses error coloring if `tc.isError` is true

### Tool Result Data Flow
The tool result population happens through several stages:

1. **JSONL Event Structure** (`.ralph/tui/src/lib/types.ts:22-31`):
   - Tool results come as `tool_result` content blocks
   - Contains `tool_use_id`, `content`, and `is_error` fields

2. **Result Matching** (`.ralph/tui/src/lib/parser.ts:110-134`):
   - `matchToolResults` function processes tool_result blocks
   - Matches results to tool calls via `tool_use_id`
   - Updates tool call status and stores result in `result` field
   - Handles various content formats (string, null, object)

3. **Stream Processing** (`.ralph/tui/src/hooks/use-jsonl-stream.ts:72-74`):
   - Detects tool_result events in JSONL stream
   - Calls `matchToolResults` to update tool call objects
   - Maintains toolCallMap ref for tracking all tool calls

### Display Patterns Across Components

1. **Tool Call Summary** (`.ralph/tui/src/components/messages/tool-call-summary.tsx`):
   - Shows compact tool display in message lists
   - Displays tool name, truncated input summary, and status icon
   - Does NOT show results (designed for list view)

2. **Message Item** (`.ralph/tui/src/components/messages/message-item.tsx:142-176`):
   - Shows first 2 tool calls with status icons
   - Uses pill styling for subagents
   - Does NOT show results (list view optimization)

3. **Message Detail View** (`.ralph/tui/src/components/messages/message-detail-view.tsx`):
   - DOES include result display code
   - Shows full input parameters and results when available

### Tool Call Data Structure
The ToolCall interface (`.ralph/tui/src/lib/types.ts:46-62`) includes:
- `result?: string` - Optional field for tool output
- `isError?: boolean` - Error state indicator
- `status: 'pending' | 'running' | 'completed' | 'error'`

## Code References
- `.ralph/tui/src/components/messages/message-detail-view.tsx:114-125` - Tool result display code
- `.ralph/tui/src/lib/parser.ts:110-134` - matchToolResults function that populates results
- `.ralph/tui/src/hooks/use-jsonl-stream.ts:72-74` - Result matching trigger in stream processing
- `.ralph/tui/src/lib/types.ts:46-62` - ToolCall interface with result field
- `.ralph/tui/src/components/messages/tool-call-summary.tsx:7-64` - Compact tool display (no results)
- `.ralph/tui/src/components/messages/message-item.tsx:142-176` - List view tool display (no results)

## Architecture Documentation

### Current Tool Message Display Pattern
1. **Data Collection**: JSONL events parsed and tool calls extracted from assistant messages
2. **Result Matching**: Tool results from user messages matched to calls via `tool_use_id`
3. **State Storage**: ToolCall objects maintained in Map with populated result fields
4. **Display Logic**: Components check for `result` field presence and render when available

### Component Hierarchy for Tool Display
- **MessagesView**: Scrollable list showing tool summaries
- **MessageItem**: Individual message with truncated tool info
- **MessageDetailView**: Full tool details including inputs and results
- **ToolCallSummary**: Reusable compact tool display component

### Line-Based Rendering System
MessageDetailView uses a ContentLine array approach:
- All content converted to lines before rendering
- Unified scrolling for text, tool inputs, and results
- Line wrapping handled for terminal width constraints

## Historical Context (from .ai-docs/thoughts/)
- `.ai-docs/thoughts/plans/bug-tool-output-missing-detail-view/task.md` - Original bug report about missing tool outputs
- `.ai-docs/thoughts/plans/subagent-message-streaming/research.md` - Related research on message streaming patterns
- `.ai-docs/thoughts/plans/subagent-token-count-display/task.md` - Task for adding token counts to tool displays

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product context for Ralph TUI
- `.ai-docs/adr/003-ink-react-architecture.md` - React/Ink architecture decisions
- `AGENTS.md` - Development commands and project structure

## Open Questions
1. Is the `result` field actually being populated in the ToolCall objects when tool results arrive?
2. Are tool_result events present in the JSONL stream for all tool executions?
3. Is there a timing issue where the detail view renders before results are matched?
4. Are there specific tool types where results are not being captured properly?
5. Is the `tool_use_id` matching working correctly between tool_use and tool_result events?

The code infrastructure for displaying tool results exists and appears complete. The issue likely lies in the data population rather than the display logic.
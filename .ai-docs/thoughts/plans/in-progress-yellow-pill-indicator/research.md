---
date: 2025-12-07
task_id: "in-progress-yellow-pill-indicator"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "In-progress message pill indicator display"
tags: [research, codebase, message-item, message-status, pill-ui, badges]
status: complete
---

# Research: In-progress Message Pill Indicator Display

**Task ID**: in-progress-yellow-pill-indicator
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
In-progress messages in the message list should have an "in progress" pill to the right of the timestamp (instead of a red outline), with a yellow background and possibly yellow/black construction-style bars on either side.

## Summary
The Ralph TUI currently displays in-progress messages using a red border around the entire message box and a red dot in the message header. The timestamp is displayed to the right of the message type label. The codebase already has a pill component pattern with background colors implemented for subagent type indicators, which can be adapted for showing an "in progress" status pill next to timestamps.

## Detailed Findings

### Current In-Progress Message Implementation
The current implementation uses visual indicators for messages with incomplete tool calls (`.ralph/tui/src/components/messages/message-item.tsx:43-46`):

- **Status Detection**: Messages are checked for incomplete tool calls where status is 'pending' or 'running'
- **Red Border**: Applied around the entire message box when tools are incomplete (`message-item.tsx:110-115`)
- **Red Dot**: Overrides the message type icon color to red (`message-item.tsx:95-96`)
- **Color Configuration**: Pending status uses 'red' color defined at `lib/colors.ts:18`

### Timestamp Display Implementation
Timestamps are currently rendered as part of the message header (`message-item.tsx:134`):

```typescript
<Text color={colors.dimmed}>  {formatTime(message.timestamp)}</Text>
```

- **Positioning**: Appears after the message type label in the header
- **Formatting**: Uses 12-hour format with seconds via `formatTime()` at `lib/parser.ts:249-256`
- **Color**: Uses `colors.dimmed` (gray) for subtle appearance
- **Adjacent Elements**: Followed by optional duration display in parentheses

### Existing Pill/Badge Pattern
The codebase has an established pill pattern used for subagent type indicators (`lib/tool-formatting.ts:99-154`):

```typescript
pill?: {
  text: string;
  backgroundColor: string;
  textColor: 'black' | 'white';
}
```

**Rendering implementation** (`message-item.tsx:151-164`):
```typescript
<Text
  backgroundColor={formatted.pill.backgroundColor}
  color={formatted.pill.textColor}
>
  {' '}{formatted.pill.text}{' '}
</Text>
```

Key characteristics:
- Uses Ink's `backgroundColor` prop for colored background
- Padding spaces create pill shape
- Dynamic text color calculation for readability
- Currently only used for subagent type indicators

### Message Header Structure
The message header layout (`message-item.tsx:128-139`) follows this structure:
1. Message type icon and label
2. Timestamp (with formatTime)
3. Duration (optional, in parentheses)
4. Tool call summaries (below, if present)

The header is contained within a Box component with flexible layout, making it feasible to insert a pill element after the timestamp.

### Color and Status Patterns
The codebase defines status colors at `lib/colors.ts:15-22`:
- `pending: 'red'` (currently used for in-progress)
- `running: 'blue'` (active execution)
- `warning: 'yellow'` (available for construction theme)
- `completed: 'green'` (finished state)

## Code References
- `.ralph/tui/src/components/messages/message-item.tsx:43-46` - In-progress detection logic
- `.ralph/tui/src/components/messages/message-item.tsx:110-115` - Border color application
- `.ralph/tui/src/components/messages/message-item.tsx:134` - Timestamp display location
- `.ralph/tui/src/components/messages/message-item.tsx:151-164` - Pill rendering pattern
- `.ralph/tui/src/lib/tool-formatting.ts:99-154` - Pill data structure definition
- `.ralph/tui/src/lib/colors.ts:18` - Pending color definition
- `.ralph/tui/src/lib/parser.ts:249-256` - Time formatting function

## Architecture Documentation

### Component Hierarchy
- **MessagesView** manages the message list and renders MessageItem components
- **MessageItem** handles individual message display including headers and status
- **Text components** from Ink support backgroundColor for creating pill effects
- **Box components** provide layout structure but don't support backgroundColor directly

### Data Flow for Status Display
1. Tool call status tracked in `ToolCall.status` field
2. MessageItem checks all tool calls via `hasIncompleteToolCalls`
3. Visual indicators applied based on incomplete status
4. Currently affects border color and type icon color

### Existing UI Patterns
- **Pills**: Colored background with contrasting text (subagent types)
- **Brackets**: Text-based indicators like `[HIGH]` for priorities
- **Icons**: Unicode symbols for status (○ for pending, ✓ for complete)
- **Inverse text**: Used for active tab highlighting
- **Dynamic colors**: Status-based color changes throughout UI

## Historical Context (from .ai-docs/thoughts/)
- `.ai-docs/thoughts/plans/in-progress-yellow-pill-indicator/task.md` - Original requirement specifying yellow pill with construction theme
- `.ai-docs/thoughts/plans/bug-message-filter-background/research.md` - Documents that Box components don't support backgroundColor in Ink, only Text elements do

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product context for Ralph TUI
- `.ralph/tui/src/test/` - Test files showing expected behaviors
- `AGENTS.md` - Development guidelines and patterns

## Open Questions
- Exact visual design for construction-style bars (simple text characters like `||` or Unicode symbols)
- Whether the pill should replace or supplement the existing red border indicator
- If different tool statuses ('pending' vs 'running') should have distinct pill appearances
- Animation or pulsing effects for active/in-progress state (if Ink supports)
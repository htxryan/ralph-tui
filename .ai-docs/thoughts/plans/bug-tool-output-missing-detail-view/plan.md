---
date: 2025-12-07
task_id: "bug-tool-output-missing-detail-view"
topic: "Fix Tool Output Display in Message Detail View"
tags: [plan, implementation, tool-calls, message-detail-view, tool-output, parser]
status: draft
---

# Fix Tool Output Display in Message Detail View Implementation Plan

**Task ID**: bug-tool-output-missing-detail-view

## Overview

Fix the bug where tool outputs (like Bash command results) are not displayed in the message detail view, even though the display logic exists and is working correctly. The issue is in how tool_result events are processed when they come as content blocks within user messages rather than standalone events.

## Task Definition

The message detail view for Tool calls doesn't show the tool output, only the input. The message detail page should show the full tool output as well.

## Current State Analysis

The display logic for tool results exists and works correctly in `MessageDetailView` component (lines 114-125). The issue is that tool results are not being populated in the ToolCall objects because:

1. Claude Code sends tool_result blocks as content within user messages (type: "user")
2. The `processEvent` function treats these as regular user messages, extracting text but ignoring tool_result blocks
3. Tool results are only matched when explicitly detected in `use-jsonl-stream.ts`, but user messages with tool_result content slip through without proper processing

### Key Discoveries:
- Display logic exists at `.ralph/tui/src/components/messages/message-detail-view.tsx:114-125`
- Tool result matching logic exists at `.ralph/tui/src/lib/parser.ts:110-134`
- Stream processing checks for tool results at `.ralph/tui/src/hooks/use-jsonl-stream.ts:72-74`
- Test fixtures expect standalone tool_result events, but actual Claude Code embeds them in user messages
- User messages containing tool_result blocks are not processed to skip text extraction and match results

## Desired End State

Tool outputs should be displayed in the message detail view for all tool calls. When viewing a tool call's details, users should see both the input parameters and the result/output of the tool execution.

### Verification:
- Tool outputs appear in message detail view
- Both successful outputs and error outputs are displayed correctly
- Tool result status (completed/error) is properly reflected
- No duplicate user messages appear from tool_result processing

## What We're NOT Doing

- Not changing the UI layout or design of the message detail view
- Not modifying how tool results are displayed in the message list view
- Not changing the tool call summary components
- Not modifying subagent tool result handling (already working)

## Implementation Approach

The fix requires modifying how user messages containing tool_result blocks are processed. Instead of treating them as regular user messages with text content, we need to:
1. Detect when a user message contains only tool_result blocks
2. Skip creating a ProcessedMessage for such events (they're not user messages, they're tool results)
3. Ensure the tool results are still matched to their corresponding tool calls

## Phase 1: Fix Tool Result Processing in Parser

### Overview
Modify the `processEvent` function to properly handle user messages containing tool_result blocks by skipping message creation and ensuring tool result matching happens.

### Changes Required:

#### 1. Update processEvent Function
**File**: `.ralph/tui/src/lib/parser.ts`
**Changes**: Modify processEvent to detect and skip user messages that contain only tool_result blocks

```typescript
export function processEvent(event: ClaudeEvent): ProcessedMessage | null {
  // Skip tool_use and tool_result events - they're part of assistant messages
  if (event.type === 'tool_use' || event.type === 'tool_result') {
    return null;
  }

  // NEW: Skip user messages that only contain tool_result blocks
  // These are not actual user messages, but tool results from Claude Code
  if (event.type === 'user') {
    const content = event.message?.content ?? [];
    const hasOnlyToolResults = content.length > 0 && 
      content.every((block: ContentBlock) => block.type === 'tool_result');
    
    if (hasOnlyToolResults) {
      // Don't create a ProcessedMessage for pure tool result responses
      return null;
    }
  }

  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

  // Rest of the function remains the same...
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Tool outputs appear in message detail view
- [ ] No duplicate "user" messages appear for tool results
- [ ] Tool result status indicators work correctly (completed/error)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add Tests for Tool Result Processing

### Overview
Add comprehensive tests to ensure tool results embedded in user messages are properly handled and don't create duplicate messages.

### Changes Required:

#### 1. Add Parser Tests
**File**: `.ralph/tui/src/test/parser.test.ts`
**Changes**: Add test cases for user messages with tool_result content

```typescript
describe('processEvent', () => {
  // ... existing tests ...

  it('skips user messages containing only tool_result blocks', () => {
    const event: ClaudeEvent = {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_123',
            content: 'Command output here',
            is_error: false
          }
        ]
      }
    };
    
    expect(processEvent(event)).toBeNull();
  });

  it('processes user messages with mixed content normally', () => {
    const event: ClaudeEvent = {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Here is the result:'
          },
          {
            type: 'tool_result',
            tool_use_id: 'toolu_123',
            content: 'Command output',
            is_error: false
          }
        ]
      },
      timestamp: '2024-12-06T10:00:00.000Z'
    };
    
    const result = processEvent(event);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('user');
    expect(result?.text).toBe('Here is the result:');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass: `pnpm test:run`
- [ ] No existing tests break
- [ ] Test coverage maintained or improved

#### Manual Verification:
- [ ] Tests accurately reflect the real Claude Code output format
- [ ] Edge cases are covered

---

## Phase 3: Update Test Fixtures

### Overview
Update test fixtures to include examples of user messages with tool_result blocks to match actual Claude Code output format.

### Changes Required:

#### 1. Add Realistic Tool Result Examples
**File**: `.ralph/tui/src/test/fixtures/claude-code/simple-conversation.jsonl`
**Changes**: Add examples of tool results embedded in user messages

```jsonl
{"type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01ABC","type":"tool_result","content":"File contents here...","is_error":false}]},"timestamp":"2024-12-06T10:00:04.500Z"}
```

### Success Criteria:

#### Automated Verification:
- [ ] E2E tests still pass with updated fixtures
- [ ] Integration tests work correctly

#### Manual Verification:
- [ ] Test fixtures accurately represent real Claude Code output
- [ ] Tool results display correctly when using test data

---

## Testing Strategy

### Unit Tests:
- Test that user messages with only tool_result blocks are skipped
- Test that mixed content user messages are processed correctly
- Test that tool result matching still works
- Test error tool results are handled properly

### Integration Tests:
- Test full flow from JSONL parsing to display in MessageDetailView
- Test that tool results appear in detail view
- Test that no duplicate messages appear

### Manual Testing Steps:
1. Start Ralph TUI with a JSONL file containing tool executions
2. Navigate to a message with tool calls (e.g., Bash commands)
3. Press Enter to view message details
4. Verify tool outputs are displayed under each tool's input
5. Test with both successful and error tool results
6. Verify no duplicate "user" messages appear in the message list

## Performance Considerations

The change only adds a simple array check for user messages, which has minimal performance impact. The check short-circuits on the first non-tool_result block, so mixed content messages are handled efficiently.

## References

- Task definition: `.ai-docs/thoughts/plans/bug-tool-output-missing-detail-view/task.md`
- Research doc: `.ai-docs/thoughts/plans/bug-tool-output-missing-detail-view/research.md`
- Message detail view component: `.ralph/tui/src/components/messages/message-detail-view.tsx:114-125`
- Parser module: `.ralph/tui/src/lib/parser.ts:60-62`
- Stream processing hook: `.ralph/tui/src/hooks/use-jsonl-stream.ts:72-74`
- Actual Claude output structure: `.ralph/claude_output.jsonl`

## Assumptions Made

1. User messages containing ONLY tool_result blocks are never actual user messages - they're always tool responses from Claude Code
2. Mixed content (text + tool_result) should still be treated as user messages
3. The existing tool result matching logic in use-jsonl-stream.ts will properly match results once we stop creating ProcessedMessages for pure tool_result user messages
4. No changes needed to the display logic since it already works when tool results are properly populated
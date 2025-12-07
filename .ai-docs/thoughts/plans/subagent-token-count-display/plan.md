---
date: 2025-12-07
task_id: "subagent-token-count-display"
topic: "Subagent Token Count Display"
tags: [plan, implementation, subagent, tokens, ui, display]
status: draft
---

# Subagent Token Count Display Implementation Plan

**Task ID**: subagent-token-count-display

## Overview

Add token count displays for Task Subagent items in the message list and in the subagent detail view header, providing users with visibility into the computational resources used by subagents.

## Task Definition

Each "Task Subagent" item in the message list should show the number of tokens used, and token counts should also be displayed in the header of the Subagent Detail view.

## Current State Analysis

Token data is already tracked for all messages including subagents via the `usage` field in JSONL events. This data flows through `ProcessedMessage` objects and is stored in `ToolCall.subagentMessages` arrays. However, subagent token counts are not currently aggregated or displayed anywhere in the UI. The codebase has established patterns for formatting tokens using the `formatTokens` utility and displaying them in various locations (header, sidebar, stats).

### Key Discoveries:
- Token data available in each subagent message at `ProcessedMessage.usage` (`.ralph/tui/src/lib/types.ts:40-43`)
- Subagent messages stored in `ToolCall.subagentMessages` array (`.ralph/tui/src/lib/types.ts:59`)
- `formatTokens` utility exists for consistent formatting (`.ralph/tui/src/lib/parser.ts:216-224`)
- Task Subagent label displayed at `.ralph/tui/src/components/messages/message-item.tsx:75`
- Subagent detail header at `.ralph/tui/src/components/subagent/subagent-detail-view.tsx:898-956`

## Desired End State

Users can see token usage for each subagent task directly in the message list and have a clear view of total tokens when examining subagent details. This provides transparency into resource consumption at both summary and detail levels.

### Verification:
- Task Subagent items in message list show formatted token counts
- Subagent detail view header displays total tokens with input/output breakdown
- Token counts update in real-time as subagent messages stream in
- Formatting is consistent with existing token displays

## What We're NOT Doing

- Including subagent tokens in the main session total (they remain separate for clarity)
- Showing per-message token breakdown in the message list (only aggregate)
- Modifying the stats view to show subagent tokens
- Adding token filtering or sorting capabilities
- Changing how tokens are tracked or stored in the data model

## Assumptions Made

1. **Aggregation approach**: Show total tokens only in message list (simpler UI), full breakdown in detail view
2. **Real-time updates**: Token counts should update dynamically as messages stream in
3. **Null handling**: Some subagent messages may not have usage data; handle gracefully with 0 defaults
4. **Display format**: Use existing `formatTokens` utility for consistency

## Implementation Approach

Add a utility function to aggregate subagent tokens, then integrate token displays into the two target UI locations using established formatting patterns. The implementation will be done in three phases: utility creation, message list enhancement, and detail view enhancement.

## Phase 1: Create Token Aggregation Utility

### Overview
Create a reusable function to calculate total tokens from an array of subagent messages.

### Changes Required:

#### 1. Token Aggregation Utility
**File**: `.ralph/tui/src/lib/parser.ts`
**Changes**: Add new function after `formatTokens` function

```typescript
/**
 * Calculate total tokens from an array of messages
 */
export function calculateSubagentTokens(messages: ProcessedMessage[]): {
  input: number;
  output: number;
  total: number;
} {
  let input = 0;
  let output = 0;

  for (const message of messages) {
    if (message.usage) {
      input += message.usage.input_tokens || 0;
      output += message.usage.output_tokens || 0;
    }
  }

  return {
    input,
    output,
    total: input + output,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd .ralph/tui && pnpm build`
- [ ] Type checking passes: `cd .ralph/tui && pnpm typecheck`

#### Manual Verification:
- [ ] Function exports correctly from parser.ts
- [ ] No TypeScript errors in the module

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add Token Display to Message List

### Overview
Display aggregated token counts next to the "Task Subagent" label in the message list.

### Changes Required:

#### 1. Import Token Utilities
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Update import statement at line 5

```typescript
import { formatTime, formatMessageDuration, truncate, formatTokens, calculateSubagentTokens } from '../../lib/parser.js';
```

#### 2. Calculate Subagent Tokens
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Add token calculation after line 41 (after hasSubagent check)

```typescript
  // Calculate subagent token totals if this message has subagents
  const subagentTokens = hasSubagent
    ? message.toolCalls
        .filter(tc => tc.isSubagent && tc.subagentMessages)
        .reduce(
          (acc, tc) => {
            const tokens = calculateSubagentTokens(tc.subagentMessages || []);
            return {
              total: acc.total + tokens.total,
            };
          },
          { total: 0 }
        )
    : null;
```

#### 3. Update Task Subagent Label Display
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Modify the header line at lines 130-138 to include token count

```typescript
      {/* Line 1: Header */}
      <Text>
        <Text color={colors.dimmed}>#{index} </Text>
        <Text color={dotColor}>{typeIcon}</Text>
        <Text color={headerLabelColor}> {typeLabel}</Text>
        {/* Add token count for subagents */}
        {hasSubagent && subagentTokens && subagentTokens.total > 0 && (
          <>
            <Text color={colors.dimmed}> (</Text>
            <Text color={colors.subagent}>{formatTokens(subagentTokens.total)}</Text>
            <Text color={colors.dimmed}>)</Text>
          </>
        )}
        <Text color={colors.dimmed}>  {formatTime(message.timestamp)}</Text>
        {durationMs !== undefined && durationMs >= 0 && (
          <Text color={colors.dimmed}> ({formatMessageDuration(durationMs)})</Text>
        )}
      </Text>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd .ralph/tui && pnpm build`
- [ ] Unit tests pass: `cd .ralph/tui && pnpm test:run`
- [ ] Type checking passes: `cd .ralph/tui && pnpm typecheck`

#### Manual Verification:
- [ ] Task Subagent items in message list show token counts
- [ ] Token counts appear in cyan color matching subagent theme
- [ ] Token formatting uses k/M suffixes appropriately
- [ ] No visual glitches or layout issues

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add Token Display to Subagent Detail View Header

### Overview
Add a token counter to the subagent detail view header, positioned between the breadcrumb and tab bar.

### Changes Required:

#### 1. Import Token Utilities
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Changes**: Update imports to include token utilities (around line 5-10)

```typescript
import { formatTokens, calculateSubagentTokens } from '../../lib/parser.js';
```

#### 2. Calculate Token Totals
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Changes**: Add token calculation after line 864 (after subagentMessages useMemo)

```typescript
  // Calculate total tokens for all subagent messages
  const tokenStats = useMemo(() => {
    return calculateSubagentTokens(realSubagentMessages);
  }, [realSubagentMessages]);
```

#### 3. Update Header Layout
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Changes**: Modify the header section (lines 945-956) to include token display

```typescript
  // Calculate content height
  // Breadcrumb: 1 line, Token info: 1 line, TabBar: 1 line, Footer: 1 line
  const headerHeight = 3; // Increased from 2 to 3 for token line
  const footerHeight = 1;
  const contentHeight = height - headerHeight - footerHeight;

  return (
    <Box flexDirection="column" height={height}>
      {/* Breadcrumb */}
      <Breadcrumb path={breadcrumbPath} />

      {/* Token counter */}
      <Box paddingLeft={1}>
        <Text color={colors.dimmed}>Tokens: </Text>
        <Text color={colors.subagent}>
          {formatTokens(tokenStats.total)}
        </Text>
        {tokenStats.total > 0 && (
          <Text color={colors.dimmed}> ({formatTokens(tokenStats.input)}in/{formatTokens(tokenStats.output)}out)</Text>
        )}
      </Box>

      {/* Tab bar */}
      <SubagentTabBar currentTab={currentTab} onTabChange={setCurrentTab} />
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd .ralph/tui && pnpm build`
- [ ] Unit tests pass: `cd .ralph/tui && pnpm test:run`
- [ ] Type checking passes: `cd .ralph/tui && pnpm typecheck`

#### Manual Verification:
- [ ] Token counter appears in subagent detail view header
- [ ] Shows total with input/output breakdown in parentheses
- [ ] Updates in real-time as subagent messages stream in
- [ ] Layout remains clean with proper spacing
- [ ] Content area height adjusts correctly for the extra header line

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:
- Test `calculateSubagentTokens` with various message arrays
- Test with messages lacking usage data (should default to 0)
- Test with empty arrays (should return 0 totals)

### Integration Tests:
- Verify token display updates when subagent messages arrive
- Test with multiple subagents in a single message
- Verify token formatting at different magnitudes (hundreds, thousands, millions)

### Manual Testing Steps:
1. Start Ralph TUI with an active session containing subagents
2. Navigate to Messages tab and verify token counts appear next to "Task Subagent" labels
3. Select a Task Subagent message and press Enter to view details
4. Verify token counter appears in the header with proper formatting
5. Switch between Overview and Messages tabs to ensure layout remains stable
6. Test with sessions containing multiple subagents to verify aggregation

## Performance Considerations

- Token calculation uses memoization in both locations to prevent unnecessary recalculation
- Aggregation only occurs when subagent messages change
- Formatting is lightweight and uses existing optimized utility
- No impact on streaming performance as calculation happens post-receipt

## References

- Task definition: `.ai-docs/thoughts/plans/subagent-token-count-display/task.md`
- Research doc: `.ai-docs/thoughts/plans/subagent-token-count-display/research.md`
- Token formatting utility: `.ralph/tui/src/lib/parser.ts:216-224`
- Message item component: `.ralph/tui/src/components/messages/message-item.tsx`
- Subagent detail view: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
- Token display pattern in header: `.ralph/tui/src/components/header.tsx:105-112`
---
date: 2025-12-07
task_id: "bug-summary-stats-zero-blank"
topic: "Fix Summary Stats Showing Zero/Blank in Header"
tags: [plan, implementation, stats, header, sessionstats, bugfix]
status: draft
---

# Fix Summary Stats Showing Zero/Blank in Header Implementation Plan

**Task ID**: bug-summary-stats-zero-blank

## Overview

Fix the bug where summary stats in the header panel display all zeros despite having many messages in the stream. The issue occurs when Ralph starts a fresh session due to incorrect session boundary management.

## Task Definition

Summary stats in the top panel all show 0/blank, even when there are many messages. This affects the token counts, message counts, and tool call counts displayed in the header.

## Current State Analysis

The stats calculation system is working correctly in terms of aggregating data. The issue lies in session boundary management:

- When Ralph starts fresh, `sessionStartIndex` is set to `undefined` (app.tsx:194)
- With `isRalphRunning=true` and `sessionStartIndex=undefined`, `calculateSessionStats` returns empty array (parser.ts:198)
- This causes stats to calculate from 0 messages, showing zeros despite messages existing from previous sessions

### Key Discoveries:
- Stats calculation logic is correct (parser.ts:139-161)
- Display components work properly (header.tsx:108-144)
- Session boundary logic has a gap for fresh starts (app.tsx:194)
- Resume correctly sets `sessionStartIndex` to `messages.length` (app.tsx:214)

## Desired End State

When Ralph starts a fresh session:
- Header should immediately show stats for the current session (new messages only)
- Previous session messages should not be included in current session stats
- Stats should update in real-time as new messages arrive
- Switching between sessions should correctly update stats display

## What We're NOT Doing

- Not changing the stats calculation algorithm
- Not modifying the Header component display logic
- Not altering the JSONL parsing or message processing
- Not adding caching or optimization to stats calculation
- Not changing the file watching mechanism

## Implementation Approach

Fix the session boundary management by setting `sessionStartIndex` to the current message count when starting Ralph fresh, matching the resume behavior. This ensures the stats calculation has a proper boundary between old and new messages.

## Phase 1: Fix Session Start Index Management

### Overview
Update the `handleStartRalph` function to properly set the session boundary when starting a fresh Ralph session.

### Changes Required:

#### 1. Update handleStartRalph in app.tsx
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Set sessionStartIndex to messages.length instead of undefined

```typescript
const handleStartRalph = async () => {
  const projectPath = process.cwd();
  const logFileName = `ralph_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  const logFilePath = path.join(projectPath, '.ralph', 'logs', logFileName);

  // Create logs directory and empty file
  await mkdir(path.dirname(logFilePath), { recursive: true });
  await writeFile(logFilePath, '');

  // Set session start index to current message count
  // This marks the boundary between old messages and new session messages
  setSessionStartIndex(messages.length);

  const success = await startRalph(logFilePath, flags);
  if (success) {
    setActiveTab('messages');
  } else {
    setSessionStartIndex(undefined);
  }
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Start Ralph with existing messages in file - stats should show 0 initially (current session empty)
- [ ] As new messages arrive, stats update to reflect only current session
- [ ] Stop and resume Ralph - stats continue from where they left off
- [ ] Previous session messages are not counted in current session stats

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add Regression Tests

### Overview
Add unit tests to verify the session boundary logic works correctly and prevent regression.

### Changes Required:

#### 1. Create test for session boundary management
**File**: `.ralph/tui/src/test/session-stats.test.tsx`
**Changes**: Add new test file with session boundary tests

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSessionStats } from '../lib/parser.js';
import { ProcessedMessage } from '../lib/types.js';

describe('Session Stats Calculation', () => {
  const createMockMessage = (id: number): ProcessedMessage => ({
    id: `msg-${id}`,
    type: 'human',
    timestamp: new Date(),
    text: `Message ${id}`,
    toolCalls: [],
    usage: { input_tokens: 10, output_tokens: 5 },
  });

  it('should return zero stats when Ralph running with undefined sessionStartIndex', () => {
    const messages = [createMockMessage(1), createMockMessage(2)];
    const stats = calculateSessionStats(messages, undefined, true);
    
    // When Ralph is running but sessionStartIndex is undefined,
    // it should return empty stats (the bug scenario)
    expect(stats.messageCount).toBe(0);
    expect(stats.totalTokens.input).toBe(0);
    expect(stats.totalTokens.output).toBe(0);
  });

  it('should calculate stats from sessionStartIndex when defined', () => {
    const messages = [
      createMockMessage(1), // Old message
      createMockMessage(2), // Old message
      createMockMessage(3), // New session
      createMockMessage(4), // New session
    ];
    
    const stats = calculateSessionStats(messages, 2, true);
    
    // Should only count messages from index 2 onwards
    expect(stats.messageCount).toBe(2);
    expect(stats.totalTokens.input).toBe(20); // 2 messages * 10 tokens
    expect(stats.totalTokens.output).toBe(10); // 2 messages * 5 tokens
  });

  it('should show all messages when Ralph not running', () => {
    const messages = [createMockMessage(1), createMockMessage(2)];
    const stats = calculateSessionStats(messages, undefined, false);
    
    // When not running, show stats for all messages
    expect(stats.messageCount).toBe(2);
    expect(stats.totalTokens.input).toBe(20);
    expect(stats.totalTokens.output).toBe(10);
  });

  it('should handle sessionStartIndex at message boundary', () => {
    const messages = [createMockMessage(1), createMockMessage(2)];
    
    // Starting fresh session with index at messages.length
    const stats = calculateSessionStats(messages, 2, true);
    
    // No new messages yet, should show zeros
    expect(stats.messageCount).toBe(0);
    expect(stats.totalTokens.input).toBe(0);
    expect(stats.totalTokens.output).toBe(0);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass: `pnpm test:run`
- [ ] Build still passes: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Test coverage maintained or improved

#### Manual Verification:
- [ ] Tests accurately reflect the fixed behavior
- [ ] Tests catch the regression if fix is reverted

---

## Testing Strategy

### Unit Tests:
- Test session boundary calculation with various sessionStartIndex values
- Test stats calculation for empty sessions
- Test transition from undefined to defined sessionStartIndex
- Verify stats reset when starting new session

### Integration Tests:
- Test full flow of starting Ralph and observing stats update
- Test resume behavior maintains correct session boundary
- Test stats persistence across stop/start cycles

### Manual Testing Steps:
1. Start TUI with existing JSONL file containing messages
2. Press 's' to start Ralph - verify stats show 0 (not previous messages)
3. Run commands that generate messages - verify stats increment correctly
4. Press 'q' to stop Ralph - verify stats remain visible
5. Press 'r' to resume - verify stats continue from where they left off
6. Generate more messages - verify only new messages counted

## Performance Considerations

The fix has minimal performance impact as it only changes when `sessionStartIndex` is set, not how stats are calculated. The `useMemo` optimization in app.tsx continues to prevent unnecessary recalculations.

## Assumptions Made

1. Setting `sessionStartIndex` to `messages.length` for fresh starts matches user expectations (showing only new session stats)
2. The current resume behavior is correct and should be preserved
3. Failed starts should reset sessionStartIndex to undefined (existing behavior)

## References

- Task definition: `.ai-docs/thoughts/plans/bug-summary-stats-zero-blank/task.md`
- Research doc: `.ai-docs/thoughts/plans/bug-summary-stats-zero-blank/research.md`
- Session management: `.ralph/tui/src/app.tsx:189-202`
- Stats calculation: `.ralph/tui/src/lib/parser.ts:169-202`
- Header display: `.ralph/tui/src/components/header.tsx:108-144`
---
date: 2025-12-06
task_id: "subagent-message-streaming"
topic: "Subagent Message Streaming and Autoscroll"
tags: [plan, implementation, subagent, streaming, autoscroll]
status: draft
---

# Subagent Message Streaming and Autoscroll Implementation Plan

**Task ID**: subagent-message-streaming

## Overview

The subagent message list (Messages tab in SubagentDetailView) does not stream/autoscroll as new messages arrive. It should behave like the main Messages tab, which uses an `isFollowing` state pattern to automatically scroll to new messages.

## Current State Analysis

### What Exists Now

The `MessagesTab` component in `subagent-detail-view.tsx` has:
- ✅ Standard navigation (up/down arrows, pageUp/pageDown)
- ✅ 'l' key to jump to latest (lines 778-782)
- ✅ 'g'/'G' keys for top/bottom - **wait, this is wrong - 'g'/'G' is NOT in MessagesTab, only in the SubagentMessageDetail component**
- ✅ Reactive data flow - component re-renders when `toolCall.subagentMessages` updates
- ❌ **Missing**: `isFollowing` state to track if user is "following" the conversation
- ❌ **Missing**: `prevListLengthRef` to detect when new messages arrive
- ❌ **Missing**: Auto-scroll effect that triggers on new messages

### Reference Implementation

`MessagesView` in `messages-view.tsx` implements the complete pattern:

1. **State** (lines 207-220):
   ```typescript
   const [isFollowing, setIsFollowing] = useState(false);
   const hasInitializedRef = useRef(false);
   const prevListLengthRef = useRef(0);
   ```

2. **Auto-scroll effect** (lines 326-348):
   ```typescript
   React.useEffect(() => {
     if (listItems.length === 0 || !hasInitializedRef.current) return;
     const newMessagesArrived = listItems.length > prevListLengthRef.current;
     prevListLengthRef.current = listItems.length;
     if (newMessagesArrived && isFollowing) {
       // Auto-scroll to latest
       const lastIdx = getLastMessageIndex();
       setSelectedItemIndex(lastIdx);
       setWindowStart(Math.max(0, listItems.length - windowSize));
     }
   }, [listItems.length, isFollowing, windowSize, getLastMessageIndex]);
   ```

3. **Navigation updates** that sync `isFollowing`:
   - Set `isFollowing = false` when navigating away from latest
   - Set `isFollowing = true` when reaching latest or pressing 'l'

## Desired End State

After this implementation:

1. When viewing the SubagentDetailView Messages tab, new messages stream in live
2. If the user is at the latest message, the view autoscrolls to show new messages
3. If the user has scrolled up to read history, the view stays in place (doesn't jump)
4. Pressing 'l' jumps to latest and resumes autoscroll
5. The behavior matches the main Messages tab exactly

### Verification

- Start Ralph with a subagent task running
- Open the subagent's Messages tab
- Observe new messages appearing and view autoscrolling (while at bottom)
- Scroll up, verify autoscroll stops
- Press 'l', verify jump to latest and autoscroll resumes

## What We're NOT Doing

- Not changing the Overview tab (it's a static content view, not a streaming list)
- Not modifying the data flow - the reactive updates already work
- Not adding filtering (out of scope - the subagent messages are already filtered by parent)
- Not adding session separators (subagent messages don't have session boundaries)

## Implementation Approach

The change is localized to the `MessagesTab` component within `subagent-detail-view.tsx`. We add the `isFollowing` pattern following the exact structure from `MessagesView`.

## Phase 1: Add isFollowing State and Autoscroll Effect

### Overview

Add the `isFollowing` state pattern to `MessagesTab` so it autoscrolls when new subagent messages arrive.

### Changes Required:

#### 1. Add useRef import
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Line**: 1
**Changes**: Add `useRef` to React imports

```typescript
import React, { useState, useMemo, useRef } from 'react';
```

#### 2. Add isFollowing state and refs to MessagesTab
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Location**: Inside `MessagesTab` function, after line 743 (after existing state declarations)
**Changes**: Add isFollowing state, hasInitializedRef, and prevListLengthRef

```typescript
function MessagesTab({
  messages,
  height,
  width,
  onEnterDetailMode,
}: MessagesTabProps): React.ReactElement {
  // Calculate window size similar to main messages view
  // All items have same height (MESSAGE_ITEM_HEIGHT = 4), plus scroll indicators (2 lines)
  const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2;
  const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  // NEW: Track whether to auto-scroll to latest (user is "following" the conversation)
  const [isFollowing, setIsFollowing] = useState(true);  // Start following by default
  const hasInitializedRef = useRef(false);
  const prevListLengthRef = useRef(0);
```

#### 3. Add initialization effect
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Location**: After the new state declarations, before useInput
**Changes**: Add effect to initialize position and detect new messages

```typescript
  // Initialize position on first render with data
  React.useEffect(() => {
    if (messages.length === 0) return;

    if (!hasInitializedRef.current) {
      // Start at the latest message with following enabled
      const lastIdx = messages.length - 1;
      setSelectedIndex(lastIdx);
      setWindowStart(Math.max(0, messages.length - windowSize));
      setIsFollowing(true);
      hasInitializedRef.current = true;
      prevListLengthRef.current = messages.length;
      return;
    }

    // Detect new messages arriving
    const newMessagesArrived = messages.length > prevListLengthRef.current;
    prevListLengthRef.current = messages.length;

    if (newMessagesArrived && isFollowing) {
      // Auto-scroll to latest
      const lastIdx = messages.length - 1;
      setSelectedIndex(lastIdx);
      setWindowStart(Math.max(0, messages.length - windowSize));
    }
  }, [messages.length, isFollowing, windowSize]);
```

#### 4. Update navigation handlers to track isFollowing
**File**: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx`
**Location**: Inside useInput callback (around lines 745-783)
**Changes**: Update navigation to set isFollowing based on position

```typescript
  useInput((input, key) => {
    if (messages.length === 0) return;

    const lastIdx = messages.length - 1;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);  // Track if at latest
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = Math.min(lastIdx, selectedIndex + 1);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);  // Track if at latest
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - windowSize);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(lastIdx, selectedIndex + windowSize);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      setWindowStart(
        Math.min(Math.max(0, messages.length - windowSize), windowStart + windowSize)
      );
    }
    if (key.return) {
      onEnterDetailMode(selectedIndex);
    }
    // Jump to latest message and resume following
    if (input === 'l') {
      setSelectedIndex(lastIdx);
      setIsFollowing(true);  // Resume auto-scroll
      setWindowStart(Math.max(0, messages.length - windowSize));
    }
    // Jump to top
    if (input === 'g') {
      setSelectedIndex(0);
      setIsFollowing(false);  // Stop following when going to top
      setWindowStart(0);
    }
    // Jump to bottom (same as 'l')
    if (input === 'G') {
      setSelectedIndex(lastIdx);
      setIsFollowing(true);
      setWindowStart(Math.max(0, messages.length - windowSize));
    }
  });
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] All unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Start Ralph with a task that spawns a subagent
- [ ] Navigate to the subagent's Messages tab
- [ ] Verify messages stream in live and view autoscrolls when at bottom
- [ ] Scroll up to an older message
- [ ] Verify new messages arrive but view stays in place (no jump)
- [ ] Press 'l' to jump to latest
- [ ] Verify autoscroll resumes
- [ ] Press 'g' to go to top, verify autoscroll stops
- [ ] Press 'G' to go to bottom, verify autoscroll resumes

---

## Testing Strategy

### Unit Tests

No new unit tests needed - this is a behavior change to an existing component. The existing component tests (if any) will continue to pass. The change is:
- Adding refs and state (no new external API)
- Adding an effect (internal behavior)
- Modifying input handlers (internal behavior)

### Manual Testing Steps

1. **Basic streaming verification**:
   - Run Ralph with a complex task that uses subagents (e.g., `Task` tool with research)
   - Open subagent detail view and switch to Messages tab
   - Observe new messages appearing and autoscrolling

2. **Following behavior**:
   - While viewing Messages tab, verify you're at the bottom
   - Watch new messages appear and view scroll down
   - Press up-arrow to scroll up one message
   - Verify new messages still arrive but view doesn't jump
   - Press 'l' to jump to latest
   - Verify autoscroll resumes

3. **Edge cases**:
   - Test with very fast message arrival
   - Test with subagent that completes quickly (few messages)
   - Test with subagent that has many messages

## Performance Considerations

- The effect runs on every `messages.length` change, which is O(1)
- No expensive computations in the effect
- The `prevListLengthRef` comparison is a simple number comparison
- Performance should be identical to the main Messages tab

## References

- Research doc: `.ai-docs/thoughts/plans/subagent-message-streaming/research.md`
- Reference implementation: `.ralph/tui/src/components/messages/messages-view.tsx:207-348`
- Target file: `.ralph/tui/src/components/subagent/subagent-detail-view.tsx:731-833`

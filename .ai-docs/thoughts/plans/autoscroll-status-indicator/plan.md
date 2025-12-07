---
date: 2025-12-07
task_id: "autoscroll-status-indicator"
topic: "Autoscroll Status Indicator"
tags: [plan, implementation, ui, status-indicators, autoscroll]
status: draft
---

# Autoscroll Status Indicator Implementation Plan

**Task ID**: autoscroll-status-indicator

## Overview

This plan implements a visual indicator for the autoscroll feature across the Messages, Errors, and Subagents views in Ralph TUI. The indicator will display the current autoscroll state ("Autoscrolling..." or "Autoscrolling paused. Press L to resume.") at the bottom of scrollable lists.

## Task Definition

Add a subtle on-screen indicator showing autoscroll status on the message list page and other pages with autoscroll functionality. Display "Autoscrolling..." when active or "Autoscrolling paused. Press L to resume." when inactive, reserving 1-2 lines at the bottom of the list.

## Current State Analysis

- **Autoscroll State**: Each view tracks autoscroll via `isFollowing` state variable
- **Affected Views**: Messages (`.ralph/tui/src/components/messages/messages-view.tsx`), Errors (`.ralph/tui/src/components/errors/errors-view.tsx`), Subagents (`.ralph/tui/src/components/subagents/subagents-view.tsx`)
- **Keyboard Shortcut**: 'L' key enables autoscroll and jumps to latest
- **Layout Structure**: Vertical stacking with conditional scroll indicators
- **No Visual Feedback**: Currently no indication of autoscroll state

## Desired End State

After implementation, all three scrollable views will display a persistent autoscroll status indicator when content is scrollable. The indicator will:
- Show "Autoscrolling..." when `isFollowing` is true
- Show "Autoscrolling paused. Press L to resume." when `isFollowing` is false
- Appear only when content exceeds viewport (scrollable)
- Use consistent styling with existing UI elements
- Reserve 1 line of space in height calculations

### Key Discoveries:
- Layout uses vertical `Box` with conditional elements (`.ralph/tui/src/components/messages/messages-view.tsx:473`)
- Scroll indicators use `colors.dimmed` for consistency (`.ralph/tui/src/components/messages/messages-view.tsx:504`)
- Height calculations account for fixed overhead (`.ralph/tui/src/components/messages/messages-view.tsx:175-180`)
- 'L' shortcut defined in shortcuts.ts (`.ralph/tui/src/lib/shortcuts.ts:25`)

## What We're NOT Doing

- NOT creating a global autoscroll state (each view maintains its own)
- NOT adding the indicator to non-scrollable views (tabs, stats, todos)
- NOT changing the existing keyboard shortcut or behavior
- NOT adding animation or spinner to the indicator
- NOT modifying the footer component (keeping it for global shortcuts)

## Implementation Approach

Create a reusable AutoscrollIndicator component and integrate it into each scrollable view. The component will conditionally render based on content scrollability and display the appropriate status message with keyboard hint.

## Phase 1: Create Autoscroll Indicator Component

### Overview
Create a reusable component that displays the autoscroll status with appropriate messaging.

### Changes Required:

#### 1. Create AutoscrollIndicator Component
**File**: `.ralph/tui/src/components/common/autoscroll-indicator.tsx`
**Changes**: Create new component file

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../../lib/colors.js';
import { latestShortcut } from '../../lib/shortcuts.js';

interface AutoscrollIndicatorProps {
  isFollowing: boolean;
  isScrollable: boolean;
}

export function AutoscrollIndicator({ isFollowing, isScrollable }: AutoscrollIndicatorProps) {
  // Only show when content is scrollable
  if (!isScrollable) {
    return null;
  }

  return (
    <Box>
      <Text color={colors.dimmed}>
        {isFollowing 
          ? 'Autoscrolling...'
          : `Autoscrolling paused. Press ${latestShortcut.key} to resume.`
        }
      </Text>
    </Box>
  );
}
```

#### 2. Export from common index
**File**: `.ralph/tui/src/components/common/index.ts`
**Changes**: Add export for new component

```tsx
export { AutoscrollIndicator } from './autoscroll-indicator.js';
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] TypeScript compilation succeeds: `pnpm typecheck`
- [ ] No import errors

#### Manual Verification:
- [ ] Component renders correctly when imported
- [ ] Conditional rendering works based on props

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Integrate into Messages View

### Overview
Add the autoscroll indicator to the Messages view, updating height calculations and layout.

### Changes Required:

#### 1. Update height calculation
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Update fixed overhead calculation to account for autoscroll indicator

Line 175-180, update to:
```tsx
// Calculate exact window size based on available height
// All items have same height (MESSAGE_ITEM_HEIGHT = 4), plus scroll indicators (2 lines)
// In interrupt mode, reserve space for the interrupt input at the bottom
// Reserve 1 line for autoscroll indicator when content is scrollable
const interruptOverhead = isInterruptMode ? INTERRUPT_INPUT_HEIGHT : 0;
const autoscrollOverhead = listItems.length > 0 ? 1 : 0; // Will refine after calculating windowSize
const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2 + interruptOverhead + autoscrollOverhead;
const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));
```

#### 2. Import AutoscrollIndicator
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Add import at the top of the file

After line 8, add:
```tsx
import { AutoscrollIndicator } from '../common/autoscroll-indicator.js';
```

#### 3. Add indicator to layout
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Add AutoscrollIndicator component in the render layout

After line 540 (after the bottom scroll indicator), add:
```tsx
{/* Autoscroll status indicator */}
<AutoscrollIndicator 
  isFollowing={isFollowing}
  isScrollable={listItems.length > windowSize}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Indicator appears at bottom of messages list when scrollable
- [ ] Shows "Autoscrolling..." when following
- [ ] Shows "Autoscrolling paused. Press L to resume." when not following
- [ ] Disappears when content fits in viewport
- [ ] No layout shift or overlap with interrupt input

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Integrate into Errors View

### Overview
Add the autoscroll indicator to the Errors view with similar height and layout adjustments.

### Changes Required:

#### 1. Update height calculation
**File**: `.ralph/tui/src/components/errors/errors-view.tsx`
**Changes**: Update window size calculation to account for autoscroll indicator

Around line 110-113, update to:
```tsx
// Calculate window size accounting for scroll indicators and autoscroll indicator
const autoscrollOverhead = errors.length > 0 ? 1 : 0;
const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2 + autoscrollOverhead;
const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / ERROR_ITEM_HEIGHT));
```

#### 2. Import AutoscrollIndicator  
**File**: `.ralph/tui/src/components/errors/errors-view.tsx`
**Changes**: Add import at the top of the file

After line 4, add:
```tsx
import { AutoscrollIndicator } from '../common/autoscroll-indicator.js';
```

#### 3. Add indicator to layout
**File**: `.ralph/tui/src/components/errors/errors-view.tsx`
**Changes**: Add AutoscrollIndicator component in the render layout

After line 200 (after the bottom scroll indicator), add:
```tsx
{/* Autoscroll status indicator */}
<AutoscrollIndicator 
  isFollowing={isFollowing}
  isScrollable={errors.length > windowSize}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Indicator appears at bottom of errors list when scrollable
- [ ] Shows correct status based on `isFollowing` state
- [ ] Pressing 'L' updates indicator immediately
- [ ] No visual glitches or overlaps

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Integrate into Subagents View

### Overview
Add the autoscroll indicator to the Subagents view, completing the implementation across all scrollable views.

### Changes Required:

#### 1. Update height calculation
**File**: `.ralph/tui/src/components/subagents/subagents-view.tsx`
**Changes**: Update window size calculation to account for autoscroll indicator

Around line 226-229, update to:
```tsx
// Calculate window size accounting for scroll indicators and autoscroll indicator
const autoscrollOverhead = listItems.length > 0 ? 1 : 0;
const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2 + autoscrollOverhead;
const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));
```

#### 2. Import AutoscrollIndicator
**File**: `.ralph/tui/src/components/subagents/subagents-view.tsx`
**Changes**: Add import at the top of the file

After line 6, add:
```tsx
import { AutoscrollIndicator } from '../common/autoscroll-indicator.js';
```

#### 3. Add indicator to layout
**File**: `.ralph/tui/src/components/subagents/subagents-view.tsx`
**Changes**: Add AutoscrollIndicator component in the render layout

After line 344 (after the bottom scroll indicator), add:
```tsx
{/* Autoscroll status indicator */}
<AutoscrollIndicator 
  isFollowing={isFollowing}
  isScrollable={listItems.length > windowSize}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Indicator appears at bottom of subagents list when scrollable
- [ ] Consistent behavior across all three views
- [ ] Keyboard shortcut works correctly
- [ ] No performance issues with rapid state changes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Add Component Tests

### Overview
Create unit tests for the AutoscrollIndicator component to ensure correct behavior.

### Changes Required:

#### 1. Create test file
**File**: `.ralph/tui/src/components/common/autoscroll-indicator.test.tsx`
**Changes**: Create comprehensive tests

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AutoscrollIndicator } from './autoscroll-indicator.js';

describe('AutoscrollIndicator', () => {
  it('renders nothing when not scrollable', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={true} isScrollable={false} />
    );
    expect(lastFrame()).toBe('');
  });

  it('shows autoscrolling message when following', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={true} isScrollable={true} />
    );
    expect(lastFrame()).toContain('Autoscrolling...');
  });

  it('shows paused message with shortcut when not following', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={false} isScrollable={true} />
    );
    expect(lastFrame()).toContain('Autoscrolling paused');
    expect(lastFrame()).toContain('Press L to resume');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All tests pass: `pnpm test:run`
- [ ] Test coverage maintained or improved: `pnpm test:coverage`
- [ ] Build still passes: `pnpm build`

#### Manual Verification:
- [ ] Tests cover all component states
- [ ] Tests run quickly and reliably

---

## Testing Strategy

### Unit Tests:
- AutoscrollIndicator component renders correctly based on props
- Conditional rendering when not scrollable
- Correct messages for following/not following states

### Integration Tests:
- Indicator appears/disappears based on content length
- State changes update indicator immediately
- Height calculations account for indicator space

### Manual Testing Steps:
1. Start Ralph and navigate to Messages tab
2. Verify indicator shows "Autoscrolling..." initially
3. Navigate up with arrow keys, verify "Autoscrolling paused" message
4. Press 'L' to return to latest, verify "Autoscrolling..." returns
5. Switch to Errors tab with errors present, verify indicator present
6. Switch to Subagents tab with subagent calls, verify indicator present
7. Test with minimal content that fits in viewport, verify no indicator
8. Test interrupt mode to ensure no overlap with input area

## Performance Considerations

- Component uses minimal re-renders (only when `isFollowing` or `isScrollable` changes)
- No additional state management overhead
- Lightweight text-only rendering
- Conditional rendering prevents unnecessary DOM updates

## Assumptions Made

1. **Placement Decision**: Positioned the indicator after scroll indicators but before interrupt input for logical flow
2. **Color Choice**: Using `colors.dimmed` for consistency with existing scroll indicators
3. **Height Reservation**: Reserving exactly 1 line when scrollable content exists
4. **Visibility Logic**: Show only when content is scrollable (listItems.length > windowSize)
5. **Message Format**: Using ellipsis for active state, full instruction for paused state

## References

- Task definition: `.ai-docs/thoughts/plans/autoscroll-status-indicator/task.md`
- Research doc: `.ai-docs/thoughts/plans/autoscroll-status-indicator/research.md`
- Messages view: `.ralph/tui/src/components/messages/messages-view.tsx:207-551`
- Errors view: `.ralph/tui/src/components/errors/errors-view.tsx:100-202`
- Subagents view: `.ralph/tui/src/components/subagents/subagents-view.tsx:224-346`
- Shortcuts definition: `.ralph/tui/src/lib/shortcuts.ts:25`
- Color constants: `.ralph/tui/src/lib/colors.ts:45`
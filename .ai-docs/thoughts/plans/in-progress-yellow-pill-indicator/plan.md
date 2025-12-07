---
date: 2025-12-07
task_id: "in-progress-yellow-pill-indicator"
topic: "In-Progress Yellow Pill Indicator"
tags: [plan, implementation, message-item, pill-ui, status-indicator]
status: draft
---

# In-Progress Yellow Pill Indicator Implementation Plan

**Task ID**: in-progress-yellow-pill-indicator

## Overview

Replace the current red border indicator for in-progress messages with a yellow "IN PROGRESS" pill displayed to the right of the timestamp. The pill will have a yellow background with optional construction-style decorative elements.

## Task Definition

In-progress messages in the message list should have an "in progress" pill to the right of the timestamp, rather than a red-colored outline. The pill's background should be yellow, potentially with yellow/black construction sign styling.

## Current State Analysis

Currently, in-progress messages are indicated by:
- A red border around the entire message box (`.ralph/tui/src/components/messages/message-item.tsx:110-115`)
- A red dot override on the message type icon (`.ralph/tui/src/components/messages/message-item.tsx:95-96`)
- Detection via checking for 'pending' or 'running' tool call statuses (`.ralph/tui/src/components/messages/message-item.tsx:43-46`)

The codebase already has:
- A pill component pattern used for subagent type indicators (`.ralph/tui/src/lib/tool-formatting.ts:99-112`)
- Pill rendering implementation with backgroundColor support (`.ralph/tui/src/components/messages/message-item.tsx:151-164`)
- Yellow color defined as `colors.warning` (`.ralph/tui/src/lib/colors.ts:17`)

## Desired End State

After implementation:
- In-progress messages display a yellow pill with text "IN PROGRESS" after the timestamp
- The pill includes construction-style decoration (⚠ symbols or || bars)
- Red border is removed for in-progress messages (keeps normal gray/green selection border)
- Red dot override on message type icon is removed
- The pill provides clear visual distinction without dominating the entire message

## What We're NOT Doing

- Not animating or pulsing the pill (Ink doesn't support CSS animations)
- Not changing the detection logic for in-progress status
- Not modifying how tool call statuses are tracked
- Not changing the behavior for selected/highlighted messages
- Not creating a separate component for the pill (inline rendering is sufficient)
- Not modifying the pill pattern for subagent type indicators

## Implementation Approach

Use the existing pill pattern from subagent rendering to create an in-progress status pill. The pill will be rendered inline in the message header after the timestamp, using Ink's `backgroundColor` prop on a Text component with padding spaces.

## Phase 1: Add Yellow In-Progress Pill

### Overview
Add the yellow "IN PROGRESS" pill to the message header after the timestamp for messages with incomplete tool calls.

### Changes Required:

#### 1. Update MessageItem Component
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Modify the header rendering to include the in-progress pill

After line 134 (the timestamp display), add the in-progress pill:
```tsx
        <Text color={colors.dimmed}>  {formatTime(message.timestamp)}</Text>
        {hasIncompleteToolCalls && (
          <>
            <Text> </Text>
            <Text backgroundColor="yellow" color="black">
              {' '}⚠ IN PROGRESS ⚠{' '}
            </Text>
          </>
        )}
        {durationMs !== undefined && durationMs >= 0 && (
```

This adds a yellow pill with construction warning symbols when tool calls are incomplete.

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Start Ralph TUI with an active agent session
- [ ] Observe that messages with pending/running tools show yellow "IN PROGRESS" pill
- [ ] Verify pill appears after the timestamp
- [ ] Confirm yellow background with black text is clearly visible
- [ ] Check that construction symbols (⚠) display correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Remove Red Border for In-Progress Messages

### Overview
Remove the red border override for in-progress messages, keeping only the normal selection-based border coloring.

### Changes Required:

#### 1. Update Border Color Logic
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Modify the border color logic to remove the in-progress condition

Replace lines 110-115:
```tsx
  // Colors based on selection and completion state
  // Border: green when selected, gray otherwise (no special color for in-progress)
  const borderColor = isSelected
    ? colors.selected
    : colors.border;
```

This removes the red border for in-progress messages while maintaining selection highlighting.

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] In-progress messages no longer have red borders
- [ ] Selected messages still show green borders
- [ ] Unselected messages show gray borders
- [ ] The yellow pill is now the only in-progress indicator

---

## Phase 3: Remove Red Dot Override

### Overview
Remove the red dot color override for message type icons when tools are incomplete, restoring the original type colors.

### Changes Required:

#### 1. Update Dot Color Logic
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Remove the override logic for the dot color

Replace lines 95-96:
```tsx
  // Use the original type color for the icon (no override for incomplete tools)
  const dotColor = typeColor;
```

Then update line 132 to use this simplified variable:
```tsx
        <Text color={dotColor}>{typeIcon}</Text>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Message type icons maintain their original colors
- [ ] In-progress messages show type-appropriate icon colors (not red)
- [ ] The yellow pill is the sole visual indicator of in-progress status
- [ ] All message types display correctly with their intended colors

---

## Phase 4: Refine Construction Styling (Optional Enhancement)

### Overview
Experiment with alternative construction-themed decorations for the pill to achieve the best visual effect.

### Changes Required:

#### 1. Try Alternative Construction Symbols
**File**: `.ralph/tui/src/components/messages/message-item.tsx`
**Changes**: Test different symbol combinations for the pill

Alternative options to try:
```tsx
// Option A: Warning triangles
<Text backgroundColor="yellow" color="black">
  {' '}⚠ IN PROGRESS ⚠{' '}
</Text>

// Option B: Construction barriers
<Text backgroundColor="yellow" color="black">
  {' '}|| IN PROGRESS ||{' '}
</Text>

// Option C: Simple text
<Text backgroundColor="yellow" color="black">
  {' '}IN PROGRESS{' '}
</Text>

// Option D: Striped effect with alternating colors
<>
  <Text backgroundColor="black" color="yellow">▐</Text>
  <Text backgroundColor="yellow" color="black"> IN PROGRESS </Text>
  <Text backgroundColor="black" color="yellow">▌</Text>
</>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] The chosen style is clearly visible and readable
- [ ] Construction theme is evident without being distracting
- [ ] Works well in both light and dark terminal themes
- [ ] Doesn't interfere with message content readability

---

## Testing Strategy

### Unit Tests:
- Test that `hasIncompleteToolCalls` correctly identifies in-progress messages
- Verify pill renders when tool calls have 'pending' or 'running' status
- Confirm pill doesn't render for completed tool calls
- Test border color logic returns correct colors for different states

### Integration Tests:
- Test full message rendering with in-progress tool calls
- Verify pill appears in correct position in header
- Test interaction between selection state and in-progress display

### Manual Testing Steps:
1. Start Ralph TUI with an active coding session: `cd .ralph/tui && pnpm dev:tsx`
2. Trigger actions that create pending tool calls (e.g., file reads, bash commands)
3. Verify yellow pill appears immediately when tools are pending
4. Confirm pill disappears when tools complete
5. Test with multiple in-progress messages simultaneously
6. Check appearance in different terminal color schemes
7. Verify readability at different terminal widths

## Performance Considerations

- The pill rendering adds minimal overhead as it's a simple conditional Text element
- No additional state management or computations required
- Reuses existing `hasIncompleteToolCalls` detection logic
- Background color rendering is handled efficiently by Ink

## Assumptions Made

- The pill should replace rather than supplement the red border indicator to avoid visual clutter
- "IN PROGRESS" is the most appropriate text for the pill (not "PENDING" or "RUNNING")
- Construction-style decoration enhances recognition without being essential
- The pill should appear immediately after the timestamp rather than at the end of the header line
- Yellow (`colors.warning`) is the appropriate color choice for the construction theme

## References

- Task definition: `.ai-docs/thoughts/plans/in-progress-yellow-pill-indicator/task.md`
- Research doc: `.ai-docs/thoughts/plans/in-progress-yellow-pill-indicator/research.md`
- Current implementation: `.ralph/tui/src/components/messages/message-item.tsx:43-46,95-96,110-115`
- Pill pattern example: `.ralph/tui/src/lib/tool-formatting.ts:99-112`
- Pill rendering: `.ralph/tui/src/components/messages/message-item.tsx:151-164`
- Color definitions: `.ralph/tui/src/lib/colors.ts:17`
---
date: 2025-12-07
task_id: "bug-tab-key-message-detail-navigation"
topic: "Fix Tab Key Navigation in Detail Views"
tags: [plan, implementation, keyboard-navigation, message-detail, error-detail]
status: draft
---

# Fix Tab Key Navigation in Detail Views Implementation Plan

**Task ID**: bug-tab-key-message-detail-navigation

## Overview

Fix the Tab key navigation issue where pressing Tab while viewing message or error details incorrectly navigates to a new main screen tab. The Tab key should do nothing in these detail views since they don't have tab bars visible.

## Task Definition

As specified in task.md: Hitting "tab" while on a message detail page navigates to a new main screen tab, which is confusing. On the message detail page, tab should do nothing, since there are no tabs.

## Current State Analysis

The Tab key handler in `.ralph/tui/src/app.tsx:367-377` currently only guards against the 'subagent-detail' view but not the 'message-detail' or 'error-detail' views. This causes Tab key presses to cycle through the main tabs even when the tab bar is hidden in these detail views.

### Key Discoveries:
- Tab key handler at `.ralph/tui/src/app.tsx:367` only checks `currentView !== 'subagent-detail'`
- ViewMode type includes four modes: 'main', 'subagent-detail', 'message-detail', 'error-detail' (`.ralph/tui/src/lib/types.ts:104`)
- Tab bar is hidden in all detail views (`.ralph/tui/src/app.tsx:543-545`)
- Subagent detail has its own internal tabs, hence the existing guard
- Message and error detail views have no tabs at all

## Desired End State

After implementation:
- Pressing Tab while in message-detail view should have no effect
- Pressing Tab while in error-detail view should have no effect
- Pressing Tab while in subagent-detail view continues to work with its internal tabs (existing behavior)
- Pressing Tab while in main view continues to cycle through the main tabs (existing behavior)

## What We're NOT Doing

- Not modifying the subagent-detail view's internal tab handling
- Not adding Tab key functionality to message or error detail views
- Not changing how Shift+Tab works
- Not modifying the escape/back navigation from detail views
- Not changing the tab cycling order or behavior in main view

## Implementation Approach

This is a simple, targeted fix. The Tab key handler's guard condition needs to be expanded from only checking for 'subagent-detail' to also checking for 'message-detail' and 'error-detail' views. This prevents tab cycling when any detail view is active.

## Phase 1: Fix Tab Key Guard Condition

### Overview
Update the Tab key handler's guard condition to prevent tab cycling in all detail views, not just subagent-detail.

### Changes Required:

#### 1. Update Tab Key Handler Guard
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Modify the guard condition at line 367 to check for all detail views

Current code (line 367):
```typescript
if (key.tab && currentView !== 'subagent-detail') {
```

Change to:
```typescript
if (key.tab && currentView === 'main') {
```

This is cleaner and more maintainable than checking against all detail views. Since tab cycling should only work in the 'main' view (where the tab bar is visible), we positively check for 'main' rather than negatively checking for each detail view.

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Tab key does nothing when viewing message details
- [ ] Tab key does nothing when viewing error details
- [ ] Tab key still works normally to cycle through tabs in main view
- [ ] Shift+Tab still works normally to cycle backwards in main view
- [ ] Subagent detail view's internal tab switching still works (Tab toggles between 'overview' and 'messages')
- [ ] Escape/back navigation still works from all detail views
- [ ] Number keys (1-5) continue to work for direct tab navigation in main view

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:
Since this is a keyboard input handler change, unit tests should verify:
- Tab key is ignored when `currentView` is 'message-detail'
- Tab key is ignored when `currentView` is 'error-detail'
- Tab key continues to work when `currentView` is 'main'
- Tab key is ignored when `currentView` is 'subagent-detail'

### Manual Testing Steps:
1. Start the TUI with a valid JSONL file: `pnpm start <jsonl-file>`
2. Navigate to the messages tab (if not already there)
3. Select a message with Enter to view details
4. Press Tab multiple times - verify nothing happens
5. Press Escape to return to main view
6. Press Tab - verify it switches to the next tab (task)
7. Navigate to errors tab (press 4)
8. If errors exist, select one with Enter
9. Press Tab multiple times - verify nothing happens
10. Press Escape to return to main view
11. Find a message with subagent messages and view its subagent detail
12. Press Tab - verify it toggles between overview and messages tabs within subagent view
13. Test Shift+Tab in main view to verify backward cycling still works

### Edge Cases to Test:
- Rapidly pressing Tab in detail views should have no effect
- Tab key with modifiers (Shift+Tab) in detail views should also do nothing
- Switching between different detail views and testing Tab in each

## Performance Considerations

This is a minimal change to a conditional check that runs on keyboard input. No performance impact expected.

## Assumptions Made

- The cleaner approach of checking `currentView === 'main'` is preferred over checking against multiple detail views
- No new ViewMode types will be added in the immediate future that would need Tab handling
- The existing behavior where only 'main' view shows the tab bar is intentional and correct

## References

- Task definition: `.ai-docs/thoughts/plans/bug-tab-key-message-detail-navigation/task.md`
- Research doc: `.ai-docs/thoughts/plans/bug-tab-key-message-detail-navigation/research.md`
- Tab key handler: `.ralph/tui/src/app.tsx:367-377`
- ViewMode type: `.ralph/tui/src/lib/types.ts:104`
- Tab bar visibility: `.ralph/tui/src/app.tsx:543-545`
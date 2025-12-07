---
date: 2025-12-07
task_id: "bug-tab-key-message-detail-navigation"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "Tab key navigation in message detail view"
tags: [research, codebase, keyboard-navigation, message-detail, tab-switching]
status: complete
---

# Research: Tab Key Navigation in Message Detail View

**Task ID**: bug-tab-key-message-detail-navigation
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
Investigate the Tab key navigation issue where pressing Tab while viewing message details incorrectly navigates to a new main screen tab, when it should do nothing since the detail view has no tabs.

## Summary
The Tab key navigation issue occurs in `.ralph/tui/src/app.tsx` at lines 367-377 where the global Tab key handler only guards against the 'subagent-detail' view but not the 'message-detail' view. When a user is viewing message details (currentView === 'message-detail'), pressing Tab still cycles through the main tabs even though the tab bar is hidden, causing confusing navigation state changes.

## Detailed Findings

### Global Tab Key Handler
The main Tab key handling logic is located in `.ralph/tui/src/app.tsx:367-377`. This handler:
- Checks if Tab key is pressed
- Guards only against 'subagent-detail' view: `if (key.tab && currentView !== 'subagent-detail')`
- Cycles forward through tabs on Tab press
- Cycles backward through tabs on Shift+Tab press
- Updates the `currentTab` state using `handleTabChange`

The guard condition only prevents tab switching when in 'subagent-detail' view because that view has its own internal tab system. However, it does not guard against 'message-detail' or 'error-detail' views.

### Message Detail View Implementation
The MessageDetailView component (`.ralph/tui/src/components/messages/message-detail-view.tsx:23-239`):
- Takes over the full content area when active
- Has its own keyboard handling for scrolling (arrow keys, page up/down, g/G)
- Handles Escape and 'b' keys for back navigation
- Does NOT handle Tab key - the input falls through to the parent

When currentView is set to 'message-detail':
- The tab bar is hidden (`.ralph/tui/src/app.tsx:543-545` - only shown when `currentView === 'main'`)
- The MessageDetailView component is rendered instead of the main tab content
- The global keyboard handler in app.tsx remains active

### Navigation State Management
The app maintains navigation state in `.ralph/tui/src/app.tsx:67-75`:
- `currentTab`: Tracks which of the 5 tabs is active ('messages' | 'task' | 'todos' | 'errors' | 'stats')
- `currentView`: Tracks the view mode ('main' | 'subagent-detail' | 'message-detail' | 'error-detail')
- When entering message detail view, `currentView` changes to 'message-detail' but `currentTab` remains unchanged
- The tab state persists even when the tab bar is not visible

### View Mode Handling Pattern
The codebase has four view modes defined in `.ralph/tui/src/lib/types.ts`:
- 'main' - Normal tabbed interface with tab bar visible
- 'subagent-detail' - Subagent detail with its own internal tabs
- 'message-detail' - Full-screen message detail view
- 'error-detail' - Full-screen error detail view

The Tab key guard in `.ralph/tui/src/app.tsx:367` only checks for 'subagent-detail' but not the other detail views.

### Tab Bar Visibility
The tab bar rendering logic at `.ralph/tui/src/app.tsx:543-545`:
```typescript
{/* Tab Bar - hide when in detail views */}
{currentView === 'main' && (
  <TabBar currentTab={currentTab} onTabChange={handleTabChange} />
)}
```
The tab bar is only visible in 'main' view, hidden in all detail views.

## Code References
- `.ralph/tui/src/app.tsx:367-377` - Global Tab key handler with incomplete guard
- `.ralph/tui/src/app.tsx:68` - currentView state definition
- `.ralph/tui/src/app.tsx:543-545` - Tab bar conditional rendering
- `.ralph/tui/src/components/messages/message-detail-view.tsx:136-161` - Message detail keyboard handling
- `.ralph/tui/src/app.tsx:149` - Setting currentView to 'message-detail'
- `.ralph/tui/src/lib/types.ts:103-104` - ViewMode type definition

## Architecture Documentation

### Keyboard Event Flow
1. Ink's `useInput` hook captures all keyboard events
2. Multiple components can register `useInput` handlers
3. Events propagate to all handlers unless explicitly consumed
4. The main app.tsx handler processes global shortcuts at lines 311-411
5. Component-specific handlers process local actions

### Guard Pattern Implementation
The codebase uses guard conditions to prevent input handling in certain contexts:
- Interrupt mode guard: `if (isInterruptMode || isSessionPickerOpen) { return; }`
- Subagent detail guard: `if (key.tab && currentView !== 'subagent-detail')`
- Number key guard: `if (num >= 1 && num <= 5 && currentView !== 'subagent-detail')`

The pattern is consistently applied for number keys (1-5) and Tab key, but only guards against 'subagent-detail' view, not other detail views.

### Special Case: Subagent Detail View
The subagent detail view (`.ralph/tui/src/components/subagent/subagent-detail-view.tsx:878-889`) has its own tab implementation:
- Maintains its own `currentTab` state for 'overview' and 'messages' tabs
- Handles Tab key to toggle between its internal tabs
- This is why the main Tab handler guards against this view

## Historical Context (from .ai-docs/thoughts/)
No existing research documents were found in the thoughts directory related to keyboard navigation or tab switching patterns.

## Related Documentation
- `.ai-docs/design/product-brief.md` - Describes the TUI's purpose for monitoring AI agents
- `AGENTS.md` - Documents the keyboard patterns and navigation approach

## Open Questions
None - the issue is clearly identified in the Tab key handler's guard condition at `.ralph/tui/src/app.tsx:367`.
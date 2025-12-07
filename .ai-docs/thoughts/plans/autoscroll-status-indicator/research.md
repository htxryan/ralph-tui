---
date: 2025-12-07
task_id: "autoscroll-status-indicator"
researcher: claude
git_commit: 59a8ef4
branch: spike/refine-script
topic: "Autoscroll Status Indicator Implementation"
tags: [research, codebase, autoscroll, status-indicators, ui-feedback]
status: complete
---

# Research: Autoscroll Status Indicator

**Task ID**: autoscroll-status-indicator
**Date**: 2025-12-07
**Git Commit**: 59a8ef4
**Branch**: spike/refine-script

## Task Assignment
Add a subtle on-screen indicator showing autoscroll status on the message list page and other pages with autoscroll functionality. Display "Autoscrolling..." when active or "Autoscrolling paused. Press L to resume." when inactive, reserving 1-2 lines at the bottom of the list.

## Summary
The Ralph TUI codebase currently implements autoscroll functionality (tracked via `isFollowing` state) in three main views: Messages, Errors, and Subagents. However, there is no visual indicator showing the autoscroll status. The codebase has established patterns for status indicators, footer components, and bottom-aligned UI elements that can be leveraged to add the requested autoscroll status indicator. The implementation would involve modifying the existing scrollable views to reserve space and render a status line.

## Detailed Findings

### Autoscroll Implementation
- **State Management** (`.ralph/tui/src/components/messages/messages-view.tsx:207-208`): Each scrollable view uses an `isFollowing` state variable to track autoscroll
- **Three Views with Autoscroll**:
  - Messages View: `.ralph/tui/src/components/messages/messages-view.tsx`
  - Errors View: `.ralph/tui/src/components/errors/errors-view.tsx`
  - Subagents View: `.ralph/tui/src/components/subagents/subagents-view.tsx`
- **Keyboard Handler** (`.ralph/tui/src/components/messages/messages-view.tsx:442-445`): 'L' key sets `isFollowing` to true and jumps to latest
- **Auto-scroll Effect** (`.ralph/tui/src/components/messages/messages-view.tsx:333-340`): When following and new messages arrive, viewport auto-scrolls
- **Following Disabled** (`.ralph/tui/src/components/messages/messages-view.tsx:399,408`): Navigation away from latest sets `isFollowing` to false

### Layout Architecture
- **Current Structure** (`.ralph/tui/src/components/messages/messages-view.tsx:473-551`):
  ```
  [Filter Dialog Overlay] - Absolute positioned when active
  [Filter Status Bar] - Shows filtering info when filters active
  [Scroll Up Indicator] - Shows count of items above viewport
  [Message Items Window] - Visible messages in viewport
  [Scroll Down Indicator] - Shows count of items below viewport
  [Interrupt Input] - Fixed 6-line input area when in interrupt mode
  ```
- **Height Calculation** (`.ralph/tui/src/components/messages/messages-view.tsx:175-180`): Window size computed after accounting for fixed overhead
- **Space Reservation**: Interrupt input reserves 6 lines when active, scroll indicators reserve 1 line each when visible

### Existing Status Indicator Patterns

#### Pattern 1: Filter Status Bar
- **Location**: `.ralph/tui/src/components/messages/messages-view.tsx:493-501`
- **Implementation**: Conditional rendering above scroll indicators
- **Style**: Warning color with icon, dimmed help text

#### Pattern 2: Footer Component
- **Location**: `.ralph/tui/src/components/footer.tsx:26-127`
- **Implementation**: Mode-specific status display on the right side
- **Style**: Status text with mode-appropriate color (e.g., "Interrupt Mode", "Session Picker")

#### Pattern 3: Header Running Status
- **Location**: `.ralph/tui/src/components/header.tsx:56-104`
- **Implementation**: Dynamic status text based on running state
- **Style**: Color-coded status (running/idle/error) with contextual text

#### Pattern 4: Scroll Indicators
- **Location**: `.ralph/tui/src/components/messages/messages-view.tsx:503-507,536-540`
- **Implementation**: Conditional rendering at viewport boundaries
- **Style**: Dimmed text with arrow Unicode characters and item counts

### UI Components and Utilities
- **Spinner Component** (`.ralph/tui/src/components/common/spinner.tsx:17-39`): Animated loading indicators with frame cycling
- **Color Constants** (`.ralph/tui/src/lib/colors.ts`): Standardized color palette for status states
- **Fixed Heights**: `MESSAGE_ITEM_HEIGHT = 4`, `INTERRUPT_INPUT_HEIGHT = 6`

### Keyboard Shortcut Documentation
- **Shortcut Definition** (`.ralph/tui/src/lib/shortcuts.ts:25`): `latestShortcut: { key: 'L', description: 'Latest' }`
- **Footer Display**: Shortcuts shown in footer component based on current mode

## Code References
- `.ralph/tui/src/components/messages/messages-view.tsx:207-208` - `isFollowing` state declaration
- `.ralph/tui/src/components/messages/messages-view.tsx:333-340` - Auto-scroll effect implementation
- `.ralph/tui/src/components/messages/messages-view.tsx:442-445` - 'L' key handler
- `.ralph/tui/src/components/messages/messages-view.tsx:493-501` - Filter status bar pattern
- `.ralph/tui/src/components/messages/messages-view.tsx:536-540` - Bottom scroll indicator
- `.ralph/tui/src/components/errors/errors-view.tsx:156-160` - 'L' key handler in errors view
- `.ralph/tui/src/components/subagents/subagents-view.tsx:290-293` - 'L' key handler in subagents view
- `.ralph/tui/src/components/footer.tsx:70-90` - Footer status display pattern
- `.ralph/tui/src/components/header.tsx:72-81` - Header status text pattern
- `.ralph/tui/src/lib/colors.ts` - Color constants for UI states

## Architecture Documentation

### Current Patterns
- **State-Based UI**: Components conditionally render based on internal state flags
- **Space Reservation**: Components calculate available height after accounting for fixed elements
- **Layered Layout**: Views use vertical stacking with conditional elements
- **Status Communication**: Multiple patterns exist for showing status (header, footer, inline indicators)

### Conventions
- Status indicators use color coding from `colors.ts`
- Conditional elements appear/disappear without shifting layout
- Unicode characters used for visual indicators (arrows, warning signs)
- Help text shown in dimmed color alongside status

### Design Decisions
- Autoscroll state managed independently per view (not global)
- Visual feedback provided through scroll indicators but not autoscroll state
- Footer reserved for global shortcuts, not view-specific status
- Component-level keyboard handling for view-specific shortcuts

## Historical Context (from .ai-docs/thoughts/)
- `.ai-docs/thoughts/plans/autoscroll-status-indicator/task.md` - Original feature request for status indicator
- `.ai-docs/thoughts/plans/subagent-message-streaming/plan.md` - Implementation plan for extending autoscroll to subagent views
- `.ai-docs/thoughts/plans/subagent-message-streaming/research.md` - Analysis of autoscroll patterns across views

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product context for monitoring agent sessions
- `.ralph/tui/AGENTS.md` - Architecture overview and component structure
- `.ralph/tui/README.md` - Development commands and tech stack

## Open Questions
- Should the autoscroll indicator be positioned above or below the scroll down indicator?
- Should the indicator use the same dimmed color as scroll indicators or a distinct color?
- Should the indicator be visible only when scrollable content exists or always present?
- Should all three views (Messages, Errors, Subagents) have identical indicator styling?
- Should the indicator include the current autoscroll keyboard shortcut dynamically from shortcuts.ts?
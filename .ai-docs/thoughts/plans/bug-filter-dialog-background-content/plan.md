---
date: 2025-12-07
task_id: "bug-filter-dialog-background-content"
topic: "Fix Filter Dialog Background Content Showing Through"
tags: [plan, implementation, bug-fix, filter-dialog, overlay, ink]
status: draft
---

# Fix Filter Dialog Background Content Showing Through

**Task ID**: bug-filter-dialog-background-content

## Overview

The FilterDialog's background shows underlying content because it's rendered inside MessagesView rather than at the app.tsx top level like other dialogs. This plan moves the FilterDialog overlay to app.tsx following the established pattern used by ShortcutsDialog and SessionPicker for proper full-screen overlay coverage.

## Task Definition

BUG: Filter dialog box is showing background content (its background is not filled in as expected)

## Current State Analysis

The FilterDialog overlay is currently rendered inside `MessagesView` at `.ralph/tui/src/components/messages/messages-view.tsx:475-491`. This causes the absolute positioning to be relative to MessagesView's container rather than the full terminal viewport, allowing background content to show through.

Working dialogs (ShortcutsDialog, SessionPicker) are rendered at the top level in `app.tsx:574-608` which provides proper full-screen coverage.

### Key Discoveries:
- FilterDialog component correctly applies `backgroundColor={DIALOG_BG_COLOR}` to all Text elements
- The issue is purely positional - the overlay needs to be at app.tsx top level
- Filter state (`enabledFilters`, `showFilterDialog`, `messageCounts`) currently lives in MessagesView
- The 'f' key handler for opening the filter is in MessagesView's useInput

## Desired End State

After implementation:
1. FilterDialog overlay renders at the top level in app.tsx alongside other dialogs
2. The dialog fully covers all underlying content when open
3. Filter state is managed in app.tsx and passed to MessagesView as props
4. The 'f' keyboard shortcut works from the global input handler in app.tsx
5. All existing filter functionality remains identical

### Verification:
- Open the filter dialog with 'f' key
- Background content should not be visible around/behind the dialog
- Dialog should be visually identical to ShortcutsDialog and SessionPicker overlays
- All keyboard shortcuts within the dialog work correctly
- Message filtering still works as expected when dialog is closed

## What We're NOT Doing

- Changing the FilterDialog component's internal styling
- Modifying dialog-utils.ts or the DIALOG_BG_COLOR constant
- Adding new features to the filter dialog
- Changing filter persistence behavior
- Modifying the dialog's dimensions or layout

## Implementation Approach

Lift the filter dialog state and rendering from MessagesView to app.tsx, following the established pattern for overlay dialogs. This is a proven approach already used for ShortcutsDialog and SessionPicker.

## Phase 1: Lift Filter State to app.tsx

### Overview
Move filter-related state from MessagesView to app.tsx and add necessary imports.

### Changes Required:

#### 1. Add imports and state to app.tsx
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add filter-related imports and state declarations

Add imports after existing imports (around line 20):
```typescript
import { FilterDialog } from './components/messages/filter-dialog.js';
import {
  MessageFilterType,
  ALL_MESSAGE_FILTER_TYPES,
} from './lib/types.js';
import { getMessageFilterType } from './lib/parser.js';
```

Add state declarations after line 127 (after `isShortcutsDialogOpen` state):
```typescript
// Filter dialog state
const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(
  () => new Set(ALL_MESSAGE_FILTER_TYPES)
);
```

Add handlers after line 238 (after `handleCloseSessionPicker`):
```typescript
// Filter dialog handlers
const handleOpenFilterDialog = useCallback(() => {
  setIsFilterDialogOpen(true);
}, []);

const handleCloseFilterDialog = useCallback(() => {
  setIsFilterDialogOpen(false);
}, []);
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No import errors

#### Manual Verification:
- [ ] Application still starts without errors

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Compute Message Counts in app.tsx

### Overview
Move the message counts computation from MessagesView to app.tsx to support the filter dialog.

### Changes Required:

#### 1. Add message counts computation
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add useMemo for computing message counts

Add after the `sessionStats` useMemo (around line 278):
```typescript
// Compute message counts per filter type (for filter dialog display)
const messageCounts = useMemo(() => {
  const counts: Record<MessageFilterType, number> = {
    'initial-prompt': 0,
    'user': 0,
    'thinking': 0,
    'tool': 0,
    'assistant': 0,
    'subagent': 0,
    'system': 0,
    'result': 0,
  };

  // Find the initial prompt index
  const startFrom = sessionStartIndex ?? 0;
  let initialPromptIndex = -1;
  for (let i = startFrom; i < messages.length; i++) {
    if (messages[i].type === 'user' && messages[i].text.trim()) {
      initialPromptIndex = i;
      break;
    }
  }

  // Count messages by type
  for (let i = 0; i < messages.length; i++) {
    const isInitialPrompt = initialPromptIndex >= 0 && i === initialPromptIndex;
    const filterType = getMessageFilterType(messages[i], isInitialPrompt);
    counts[filterType]++;
  }

  return counts;
}, [messages, sessionStartIndex]);
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Application still runs correctly
- [ ] No performance degradation with large message counts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Update Keyboard Handling

### Overview
Move the 'f' key handler from MessagesView to app.tsx and update input guards.

### Changes Required:

#### 1. Update global keyboard handler
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add filter dialog handling to useInput

Update the input guard condition around line 325:
```typescript
// When in interrupt mode, session picker, or filter dialog is open, don't handle any global shortcuts
// Those components handle their own input
if (isInterruptMode || isSessionPickerOpen || isFilterDialogOpen) {
  return;
}
```

Add 'f' key handler after the 'p' key handler (around line 413):
```typescript
// Open filter dialog (only on messages tab in main view)
if (input === 'f' && currentTab === 'messages' && currentView === 'main') {
  handleOpenFilterDialog();
  return;
}
```

#### 2. Remove filter keyboard handling from MessagesView
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Remove 'f' key handler and filter dialog guard

Remove lines 381 (the filter dialog guard):
```typescript
// Don't handle input when filter dialog is open - FilterDialog handles its own
if (showFilterDialog) return;
```

Remove lines 386-389 (the 'f' key handler):
```typescript
// Toggle filter dialog with 'f'
if (input === 'f') {
  setShowFilterDialog(true);
  return;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] 'f' key opens filter dialog when on messages tab
- [ ] 'f' key does NOT open filter dialog on other tabs
- [ ] Filter dialog handles its own keyboard input correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Update MessagesView Props and Rendering

### Overview
Update MessagesView to receive filter state as props instead of managing it internally.

### Changes Required:

#### 1. Update MessagesView props interface
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Add filter props to interface

Update the `MessagesViewProps` interface (around lines 37-55) to add:
```typescript
/** Currently enabled message filters */
enabledFilters: Set<MessageFilterType>;
/** Callback to update filters */
onFiltersChange: (filters: Set<MessageFilterType>) => void;
/** Whether filter dialog is open */
isFilterDialogOpen: boolean;
```

#### 2. Remove local filter state
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Remove local state and use props instead

Remove lines 70-73 (filter state declarations):
```typescript
const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(
  () => new Set(ALL_MESSAGE_FILTER_TYPES)
);
const [showFilterDialog, setShowFilterDialog] = useState(false);
```

Remove lines 94-114 (messageCounts computation) - this is now computed in app.tsx

Remove the `handleCloseFilterDialog` function (should be around line 170-172)

#### 3. Remove filter dialog rendering
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Remove the filter dialog overlay

Remove lines 474-491 (the entire filter dialog overlay section):
```typescript
{/* Filter dialog overlay */}
{showFilterDialog && (
  <Box ...>
    <FilterDialog ... />
  </Box>
)}
```

#### 4. Update prop references
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`
**Changes**: Update any references to use props

Update line 383 to use prop:
```typescript
// Don't handle input when session picker is open - SessionPicker handles its own
if (isSessionPickerOpen || isFilterDialogOpen) return;
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Messages are filtered correctly based on enabled filters
- [ ] Filter status indicator shows correct state

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Add Filter Dialog to app.tsx and Pass Props

### Overview
Render FilterDialog at app.tsx top level and pass filter props to MessagesView.

### Changes Required:

#### 1. Pass filter props to MessagesView
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add filter props when rendering MessagesView

Update MessagesView component props (around lines 483-494 and 559-570):
```typescript
<MessagesView
  // ... existing props ...
  enabledFilters={enabledFilters}
  onFiltersChange={setEnabledFilters}
  isFilterDialogOpen={isFilterDialogOpen}
/>
```

#### 2. Add FilterDialog overlay to app.tsx
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add FilterDialog rendering at top level

Add after the ShortcutsDialog overlay (after line 608):
```typescript
{/* Filter Dialog Overlay */}
{isFilterDialogOpen && (
  <Box
    position="absolute"
    width="100%"
    height="100%"
    justifyContent="center"
    alignItems="center"
  >
    <FilterDialog
      enabledFilters={enabledFilters}
      onFiltersChange={setEnabledFilters}
      onClose={handleCloseFilterDialog}
      width={Math.min(60, terminalColumns - 4)}
      messageCounts={messageCounts}
    />
  </Box>
)}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Unit tests pass: `pnpm test:run`

#### Manual Verification:
- [ ] Filter dialog opens with 'f' key
- [ ] Background content is completely hidden when dialog is open
- [ ] Dialog renders identically to ShortcutsDialog and SessionPicker
- [ ] All filter dialog keyboard shortcuts work (space, a, arrow keys, enter, escape)
- [ ] Message filtering works correctly when filters are toggled
- [ ] Filter status indicator updates correctly
- [ ] Dialog closes properly with Escape key
- [ ] No visual glitches or rendering issues

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:
- Verify FilterDialog renders at app level
- Test filter state management in app.tsx
- Verify MessagesView receives and uses filter props correctly

### Integration Tests:
- Test complete filter flow: open dialog → toggle filters → close → verify message list
- Test keyboard navigation within filter dialog
- Test filter persistence during tab switches

### Manual Testing Steps:
1. Run the TUI with: `pnpm dev:tsx`
2. Press 'f' to open filter dialog
3. Verify background is completely covered (no messages, scroll bars, or status visible)
4. Toggle various filters with space bar
5. Navigate with arrow keys
6. Press 'a' to toggle all
7. Press Enter to apply
8. Verify messages are filtered correctly
9. Press 'f' again and press Escape to cancel
10. Test on different terminal sizes

## Performance Considerations

The messageCounts computation has been moved to app.tsx which means it will recompute when any app-level state changes. However, the useMemo dependency array `[messages, sessionStartIndex]` ensures it only recalculates when messages actually change, maintaining the same performance characteristics as before.

## References

- Task definition: `.ai-docs/thoughts/plans/bug-filter-dialog-background-content/task.md`
- Research doc: `.ai-docs/thoughts/plans/bug-filter-dialog-background-content/research.md`
- Working dialog pattern: `.ralph/tui/src/app.tsx:574-608`
- Current filter implementation: `.ralph/tui/src/components/messages/messages-view.tsx:70-114,474-491`
- Previous related plan: `.ai-docs/thoughts/plans/bug-message-filter-background/plan.md`
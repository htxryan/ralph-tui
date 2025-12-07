---
date: 2025-12-06
task_id: "bug-message-filter-background"
topic: "Fix Filter Dialog Background Showing Underlying Content"
tags: [plan, implementation, bug-fix, filter-dialog, overlay, ink]
status: draft
---

# Fix Filter Dialog Background Showing Underlying Content

**Task ID**: bug-message-filter-background

## Overview

The FilterDialog's background shows underlying content because it's rendered inside MessagesView rather than at the app.tsx top level like other dialogs. This plan moves the FilterDialog overlay to app.tsx for consistent behavior with ShortcutsDialog and SessionPicker.

## Task Definition

BUG: Filter dialog box is showing background content (its background is not filled in as expected)

## Current State Analysis

The FilterDialog overlay is rendered inside `MessagesView` at `.ralph/tui/src/components/messages/messages-view.tsx:475-491`:

```tsx
{showFilterDialog && (
  <Box
    position="absolute"
    width="100%"
    height="100%"
    justifyContent="center"
    alignItems="center"
  >
    <FilterDialog ... />
  </Box>
)}
```

This differs from other dialogs (ShortcutsDialog, SessionPicker) which are rendered at the top level in `app.tsx:574-608`. When the overlay is nested inside MessagesView:

1. The absolute positioning is relative to MessagesView's container, not the full terminal
2. The underlying messages list, scroll indicators, and filter status continue to render beneath
3. The centered dialog leaves gaps around it where background content shows through

### Key Discoveries:
- ShortcutsDialog and SessionPicker overlays work correctly because they're at app.tsx top level (app.tsx:574-608)
- FilterDialog uses the same internal styling pattern (DIALOG_BG_COLOR on Text elements) but is positioned incorrectly
- Filter state (`showFilterDialog`, `enabledFilters`, `messageCounts`) currently lives in MessagesView (messages-view.tsx:70-114)
- The 'f' key handler for opening the filter is in MessagesView's useInput (messages-view.tsx:386-389)

## Desired End State

After implementation:
1. FilterDialog overlay renders at the top level in app.tsx, same as ShortcutsDialog and SessionPicker
2. The dialog fully covers all underlying content when open
3. Filter state is managed in app.tsx and passed to MessagesView as props
4. The 'f' keyboard shortcut works from the global input handler in app.tsx
5. All existing filter functionality (toggle filters, keyboard navigation, message counts) works identically

### Verification:
- Open the filter dialog with 'f' key
- Background content (messages, scroll indicators, filter status bar) should not be visible around/behind the dialog
- Dialog should be visually identical to ShortcutsDialog and SessionPicker overlays

## What We're NOT Doing

- Changing the FilterDialog component's internal styling (it already follows the correct pattern)
- Modifying dialog-utils.ts or the DIALOG_BG_COLOR constant
- Adding new features to the filter dialog
- Changing the filter dialog's dimensions or layout

## Implementation Approach

Lift the filter dialog state and rendering from MessagesView to app.tsx, following the established pattern for overlay dialogs. This requires:

1. Moving state declarations to app.tsx
2. Moving the overlay rendering to app.tsx (alongside other overlays)
3. Updating MessagesView props interface to receive filter state
4. Moving the 'f' keyboard handler to app.tsx's global useInput

## Phase 1: Lift Filter State to app.tsx

### Overview
Move filter-related state from MessagesView to app.tsx.

### Changes Required:

#### 1. Update app.tsx - Add filter state and imports
**File**: `.ralph/tui/src/app.tsx`

Add imports at top (after existing imports around line 4-5):
```tsx
import {
  MessageFilterType,
  ALL_MESSAGE_FILTER_TYPES,
} from './lib/types.js';
import { getMessageFilterType } from './lib/parser.js';
```

Add state declarations after line 127 (after `isShortcutsDialogOpen` state):
```tsx
// Filter dialog state
const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(
  () => new Set(ALL_MESSAGE_FILTER_TYPES)
);
```

Add messageCounts computation after line 276 (after `sessionStats` useMemo):
```tsx
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

  // Find the initial prompt index (same logic as MessagesView)
  const startFrom = sessionStartIndex ?? 0;
  let initialPromptIndex = -1;
  for (let i = startFrom; i < messages.length; i++) {
    if (messages[i].type === 'user' && messages[i].text.trim()) {
      initialPromptIndex = i;
      break;
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const isInitialPrompt = initialPromptIndex >= 0 && i === initialPromptIndex;
    const filterType = getMessageFilterType(messages[i], isInitialPrompt);
    counts[filterType]++;
  }

  return counts;
}, [messages, sessionStartIndex]);
```

Add filter dialog handlers after line 237 (after `handleCloseSessionPicker`):
```tsx
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

#### Manual Verification:
- [ ] N/A - this phase only adds state, no visible changes yet

---

## Phase 2: Add Global Keyboard Handler for Filter Dialog

### Overview
Move the 'f' key handler from MessagesView to app.tsx's global useInput.

### Changes Required:

#### 1. Update app.tsx - Add 'f' key handler
**File**: `.ralph/tui/src/app.tsx`

In the `useInput` callback (around line 311), add check for filter dialog open state. Update the early return condition around line 325:
```tsx
// When in interrupt mode, session picker, or filter dialog is open, don't handle any global shortcuts
// Those components handle their own input
if (isInterruptMode || isSessionPickerOpen || isFilterDialogOpen) {
  return;
}
```

Add 'f' key handler after the 'p' key handler (around line 413):
```tsx
// Open filter dialog (only on messages tab in main view)
if (input === 'f' && currentTab === 'messages' && currentView === 'main') {
  handleOpenFilterDialog();
  return;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] N/A - this phase adds handler but dialog not rendered yet

---

## Phase 3: Render FilterDialog Overlay at Top Level

### Overview
Add FilterDialog overlay rendering in app.tsx alongside ShortcutsDialog and SessionPicker.

### Changes Required:

#### 1. Update app.tsx - Add FilterDialog import
**File**: `.ralph/tui/src/app.tsx`

Add import (around line 20, after MessagesView import):
```tsx
import { FilterDialog } from './components/messages/filter-dialog.js';
```

#### 2. Update app.tsx - Add FilterDialog overlay
**File**: `.ralph/tui/src/app.tsx`

Add FilterDialog overlay after ShortcutsDialog overlay (after line 608, before the closing `</Box>`):
```tsx
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

#### Manual Verification:
- [ ] Press 'f' on messages tab - filter dialog appears centered
- [ ] Dialog background should fully cover underlying content (no bleed-through)
- [ ] Note: At this point, both overlays may render (old and new) - that's expected until Phase 4

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the filter dialog overlay renders correctly before proceeding to the next phase.

---

## Phase 4: Update MessagesView to Use Props Instead of Internal State

### Overview
Remove filter state from MessagesView and accept it as props instead.

### Changes Required:

#### 1. Update MessagesViewProps interface
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Update the interface (around line 11-37) to add new props:
```tsx
export interface MessagesViewProps {
  messages: ProcessedMessage[];
  onSelectSubagent: (toolCall: ToolCall, messageIndex?: number) => void;
  onSelectMessage: (message: ProcessedMessage, messageIndex: number) => void;
  /** Height in rows for the view to fill */
  height?: number;
  /** Width in columns for proper truncation */
  width?: number;
  /** Initial selected index (for preserving position on back navigation) */
  initialSelectedIndex?: number;
  /** Message index where current session started (messages before this are "previous session") */
  sessionStartIndex?: number;
  /** Whether Ralph is currently running */
  isRalphRunning?: boolean;
  /** Whether Ralph is currently starting (before running) */
  isRalphStarting?: boolean;
  /** Whether interrupt mode is active */
  isInterruptMode?: boolean;
  /** Callback when interrupt feedback is submitted */
  onInterruptSubmit?: (feedback: string) => void;
  /** Callback when interrupt is cancelled */
  onInterruptCancel?: () => void;
  /** Callback to kill the current session before submitting interrupt (Ctrl+P) */
  onInterruptKillSession?: () => void;
  /** Whether session picker dialog is open (disables input handling) */
  isSessionPickerOpen?: boolean;
  /** Whether filter dialog is open (disables input handling) */
  isFilterDialogOpen?: boolean;
  /** Currently enabled filter types (controlled by parent) */
  enabledFilters: Set<MessageFilterType>;
  /** Callback when filters change */
  onFiltersChange: (filters: Set<MessageFilterType>) => void;
  /** Callback to open the filter dialog */
  onOpenFilterDialog: () => void;
}
```

#### 2. Update MessagesView function signature and remove internal state
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Update the function to receive new props and remove internal state. Replace lines 53-73:
```tsx
export function MessagesView({
  messages,
  onSelectSubagent,
  onSelectMessage,
  height = 30,
  width = 100,
  initialSelectedIndex,
  sessionStartIndex,
  isRalphRunning = false,
  isRalphStarting = false,
  isInterruptMode = false,
  onInterruptSubmit,
  onInterruptCancel,
  onInterruptKillSession,
  isSessionPickerOpen = false,
  isFilterDialogOpen = false,
  enabledFilters,
  onFiltersChange,
  onOpenFilterDialog,
}: MessagesViewProps): React.ReactElement {
  // Filter state is now controlled by parent - remove these lines:
  // const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(...)
  // const [showFilterDialog, setShowFilterDialog] = useState(false);
```

#### 3. Remove internal filter state declarations
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Delete lines 69-73 (the useState declarations for enabledFilters and showFilterDialog).

#### 4. Remove messageCounts computation from MessagesView
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Delete lines 93-114 (the messageCounts useMemo block) - this is now computed in app.tsx.

#### 5. Update useInput to use props
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Update the useInput callback (around line 377-447). Change line 381:
```tsx
// Don't handle input when filter dialog is open - FilterDialog handles its own
if (isFilterDialogOpen) return;
```

Change lines 385-389 to use the callback prop:
```tsx
// Toggle filter dialog with 'f'
if (input === 'f') {
  onOpenFilterDialog();
  return;
}
```

#### 6. Remove handleCloseFilterDialog callback
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Delete lines 449-452 (the handleCloseFilterDialog useCallback).

#### 7. Remove FilterDialog overlay rendering
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Delete lines 474-491 (the FilterDialog overlay Box and its contents).

#### 8. Update filter status indicator condition
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Update line 494 to use the prop instead of local state:
```tsx
{!isFilterDialogOpen && isFiltering && (
```

#### 9. Remove unused imports
**File**: `.ralph/tui/src/components/messages/messages-view.tsx`

Remove the FilterDialog import from line 9:
```tsx
// Delete this line:
import { FilterDialog } from './filter-dialog.js';
```

Remove unused constants (lines 50-51):
```tsx
// Delete these lines:
// Height of the filter dialog overlay (8 filters + header + footer + borders)
const FILTER_DIALOG_HEIGHT = 12;
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] N/A - this phase removes duplicate code, app.tsx already handles rendering

---

## Phase 5: Update app.tsx to Pass Filter Props to MessagesView

### Overview
Update the MessagesView call in app.tsx to pass the new filter-related props.

### Changes Required:

#### 1. Update MessagesView call in app.tsx
**File**: `.ralph/tui/src/app.tsx`

Update the MessagesView component call (around lines 468-485):
```tsx
<MessagesView
  messages={messages}
  onSelectSubagent={handleSelectSubagent}
  onSelectMessage={handleSelectMessage}
  height={contentHeight}
  width={terminalColumns}
  initialSelectedIndex={selectedMessageIndex}
  sessionStartIndex={sessionStartIndex}
  isRalphRunning={isRalphRunning}
  isRalphStarting={isRalphStarting}
  isInterruptMode={isInterruptMode}
  onInterruptSubmit={handleInterruptSubmit}
  onInterruptCancel={handleInterruptCancel}
  onInterruptKillSession={isRalphRunning ? handleInterruptKillSession : undefined}
  isSessionPickerOpen={isSessionPickerOpen}
  isFilterDialogOpen={isFilterDialogOpen}
  enabledFilters={enabledFilters}
  onFiltersChange={setEnabledFilters}
  onOpenFilterDialog={handleOpenFilterDialog}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] All unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Press 'f' on messages tab - filter dialog appears
- [ ] Filter dialog fully covers underlying content (no background visible)
- [ ] Use arrow keys to navigate filter options
- [ ] Press Space/Enter to toggle filters
- [ ] Press 'a' for All, 'n' for None, 'u' for Subagents only
- [ ] Press 'f' or Escape to close dialog
- [ ] Verify filter actually works - messages are filtered based on selection
- [ ] Filter status bar shows correctly when filtering is active

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that all filter functionality works correctly.

---

## Testing Strategy

### Unit Tests:
- Existing tests in `filter-dialog.test.tsx` should continue to pass
- Existing tests in `messages-view.test.tsx` may need updates for new props

### Integration Tests:
- Test filter dialog opens with 'f' key
- Test filter dialog closes with 'f' or Escape
- Test filter selection persists after closing dialog
- Test message filtering works correctly

### Manual Testing Steps:
1. Start the TUI with a session that has messages
2. Press 'f' to open filter dialog
3. Verify dialog covers ALL underlying content (no visible messages behind/around it)
4. Navigate with arrow keys, toggle with Space
5. Close with 'f' or Escape
6. Verify filtered messages update correctly
7. Compare visual appearance with ShortcutsDialog (press '.') - should look identical in terms of overlay behavior

## Performance Considerations

- The `messageCounts` computation moves from MessagesView to app.tsx, but this is O(n) and only runs when messages or sessionStartIndex changes - no performance impact
- Filter state lifting doesn't add any re-renders since MessagesView already re-renders on message changes

## References

- Task definition: `.ai-docs/thoughts/plans/bug-message-filter-background/task.md`
- Research doc: `.ai-docs/thoughts/plans/bug-message-filter-background/research.md`
- ShortcutsDialog overlay pattern: `app.tsx:594-608`
- SessionPicker overlay pattern: `app.tsx:573-592`
- FilterDialog component: `.ralph/tui/src/components/messages/filter-dialog.tsx`
- Current overlay in MessagesView: `.ralph/tui/src/components/messages/messages-view.tsx:475-491`

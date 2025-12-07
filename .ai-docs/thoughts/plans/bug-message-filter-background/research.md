---
date: 2025-12-06
task_id: "bug-message-filter-background"
researcher: claude
git_commit: 0410a43
branch: main
topic: "Filter dialog background showing underlying content"
tags: [research, codebase, filter-dialog, overlay, background, ink]
status: complete
---

# Research: Filter Dialog Background Showing Underlying Content

**Task ID**: bug-message-filter-background
**Date**: 2025-12-06
**Git Commit**: 0410a43
**Branch**: main

## Task Assignment

Investigate the bug where the filter dialog box is showing background content - its background is not filled in as expected.

## Summary

The FilterDialog component uses the standard dialog background pattern (`DIALOG_BG_COLOR` on all `<Text>` elements) consistent with other dialogs in the codebase. The filter dialog overlay is rendered inside the `MessagesView` component using an absolutely positioned wrapper Box that centers the dialog.

### Key Components Involved

| Component | File | Role |
|-----------|------|------|
| FilterDialog | `.ralph/tui/src/components/messages/filter-dialog.tsx` | The dialog UI with filter options |
| MessagesView | `.ralph/tui/src/components/messages/messages-view.tsx` | Parent that renders the overlay wrapper |
| dialog-utils | `.ralph/tui/src/lib/dialog-utils.ts` | Shared utilities including `DIALOG_BG_COLOR` |

## Detailed Findings

### FilterDialog Component

**Location**: `.ralph/tui/src/components/messages/filter-dialog.tsx`

The FilterDialog component (lines 39-213) implements:

1. **Background styling** (lines 138-210): Every `<Text>` element has `backgroundColor={DIALOG_BG_COLOR}` applied:
   ```tsx
   <Text backgroundColor={DIALOG_BG_COLOR}>
     <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
     <Text bold color={colors.header} backgroundColor={DIALOG_BG_COLOR}>
       {headerLeft}
     </Text>
     ...
   </Text>
   ```

2. **Dialog helpers** (lines 48-49): Uses `createDialogHelpers()` for width calculations:
   ```tsx
   const helpers = useMemo(() => createDialogHelpers(width, PADDING), [width]);
   const { emptyLine, contentWidth, rightPad } = helpers;
   ```

3. **Right padding** (lines 186-188): Uses `rightPad()` to fill remaining width on each line:
   ```tsx
   <Text backgroundColor={DIALOG_BG_COLOR}>
     {rightPad(lineContentWidth)}
   </Text>
   ```

4. **Box container** (lines 130-136): The outer Box has border styling but NO backgroundColor:
   ```tsx
   <Box
     flexDirection="column"
     borderStyle="round"
     borderColor={colors.selected}
     width={width}
   >
   ```

### Overlay Wrapper in MessagesView

**Location**: `.ralph/tui/src/components/messages/messages-view.tsx:472-491`

The filter dialog overlay is rendered inside MessagesView:

```tsx
return (
  <Box flexDirection="column" height={height} flexGrow={1}>
    {/* Filter dialog overlay */}
    {showFilterDialog && (
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
          width={Math.min(60, width - 4)}
          messageCounts={messageCounts}
        />
      </Box>
    )}
    {/* ... rest of content ... */}
  </Box>
);
```

Key observations:
- The overlay wrapper Box uses `position="absolute"` with `width="100%"` and `height="100%"`
- The wrapper Box does NOT have a backgroundColor property
- The wrapper's purpose is to center the dialog using flexbox (`justifyContent="center"`, `alignItems="center"`)
- The overlay is rendered **inside** MessagesView, not at the app.tsx top level

### Comparison with Other Dialogs

#### ShortcutsDialog Overlay (app.tsx:594-608)

```tsx
{isShortcutsDialogOpen && (
  <Box
    position="absolute"
    width="100%"
    height="100%"
    justifyContent="center"
    alignItems="center"
  >
    <ShortcutsDialog
      shortcuts={dialogShortcuts}
      width={Math.min(45, terminalColumns - 4)}
    />
  </Box>
)}
```

- Rendered at the **top level** of app.tsx inside the main layout Box
- Same wrapper pattern (no backgroundColor on wrapper)
- Same internal dialog background pattern (DIALOG_BG_COLOR on Text elements)

#### SessionPicker Overlay (app.tsx:573-592)

```tsx
{isSessionPickerOpen && (
  <Box
    position="absolute"
    width="100%"
    height="100%"
    justifyContent="center"
    alignItems="center"
  >
    <SessionPicker ... />
  </Box>
)}
```

- Also at app.tsx top level
- Same wrapper and background patterns

### Dialog Background Utilities

**Location**: `.ralph/tui/src/lib/dialog-utils.ts`

```tsx
/** Background color for solid overlay dialogs */
export const DIALOG_BG_COLOR = '#1a1a1a';
```

The `createDialogHelpers()` function (lines 75-128) provides:
- `fullInnerWidth`: Total width inside border (width - 2)
- `contentWidth`: Width minus padding on both sides
- `emptyLine()`: Creates a line of spaces filling the full inner width
- `rightPad(usedWidth)`: Creates spaces to fill remaining width plus right padding

### Rendering Context Hierarchy

The filter dialog's position in the component tree:

```
app.tsx
└── <Box flexDirection="column" width="100%" height={terminalRows}>
    └── <Box flexDirection="row" flexGrow={1}>
        └── <Box flexDirection="column" flexGrow={1}>
            └── MessagesView (height={contentHeight})
                └── <Box flexDirection="column" height={height} flexGrow={1}>
                    └── <Box position="absolute" width="100%" height="100%">  ← Overlay wrapper
                        └── <FilterDialog>  ← Dialog content
```

Compare to shortcuts dialog:

```
app.tsx
└── <Box flexDirection="column" width="100%" height={terminalRows}>
    └── <Box position="absolute" width="100%" height="100%">  ← Overlay wrapper
        └── <ShortcutsDialog>  ← Dialog content
```

## Code References

- `.ralph/tui/src/components/messages/filter-dialog.tsx:39-213` - FilterDialog component implementation
- `.ralph/tui/src/components/messages/filter-dialog.tsx:130-136` - Box container without backgroundColor
- `.ralph/tui/src/components/messages/filter-dialog.tsx:138-148` - Header row with backgroundColor on Text
- `.ralph/tui/src/components/messages/filter-dialog.tsx:168-190` - Filter option rows with backgroundColor
- `.ralph/tui/src/components/messages/messages-view.tsx:472-491` - Overlay wrapper rendering
- `.ralph/tui/src/components/messages/messages-view.tsx:476-482` - Wrapper Box properties
- `.ralph/tui/src/lib/dialog-utils.ts:9` - DIALOG_BG_COLOR constant definition
- `.ralph/tui/src/lib/dialog-utils.ts:75-128` - createDialogHelpers function
- `.ralph/tui/src/components/shortcuts-dialog.tsx:39-91` - ShortcutsDialog for comparison
- `.ralph/tui/src/app.tsx:594-608` - Top-level overlay wrapper pattern

## Architecture Documentation

### Dialog Background Pattern

All dialogs in this codebase follow the same pattern:

1. **Outer Box**: Has border styling but no backgroundColor
2. **Every Text element**: Has `backgroundColor={DIALOG_BG_COLOR}`
3. **Line width**: Each line fills the full inner width using helper functions
4. **Empty lines**: Created with `emptyLine()` which returns spaces

This pattern relies on the Text elements filling the full width with background color. The Box component does not support backgroundColor in Ink - only Text elements do.

### Overlay Positioning Pattern

Dialogs are displayed as overlays using:

1. **Wrapper Box**: `position="absolute"` with `width="100%"` and `height="100%"`
2. **Centering**: `justifyContent="center"` and `alignItems="center"`
3. **No wrapper background**: The wrapper Box does not have backgroundColor (Box doesn't support it)

### Input Handling

- FilterDialog uses internal `useInput` hook for keyboard handling
- MessagesView checks `showFilterDialog` before processing its own input (line 381)
- Filter dialog closes on Escape or 'f' key (lines 74-78)

## Related Documentation

- `.ai-docs/design/product-brief.md` - Product overview
- `.ralph/tui/src/components/shortcuts-dialog.tsx` - Reference implementation for dialog pattern
- `.ralph/tui/src/components/session-picker.tsx` - Another dialog implementation

## Open Questions

1. What is the expected visual behavior when the filter dialog is open?
2. Is the underlying content supposed to be completely hidden or partially visible?
3. Is this behavior different between ShortcutsDialog (works correctly?) and FilterDialog (showing background)?
4. Does Ink's `position="absolute"` behave differently depending on the parent container's position in the component tree?

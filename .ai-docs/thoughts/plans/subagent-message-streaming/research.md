---
date: 2025-12-06
task_id: "subagent-message-streaming"
researcher: claude
git_commit: 11cedef
branch: feature/prompt-overhaul
topic: "Subagent message streaming and autoscroll behavior"
tags: [research, codebase, subagent, streaming, autoscroll, messages]
status: complete
---

# Research: Subagent Message Streaming and Autoscroll Behavior

**Task ID**: subagent-message-streaming
**Date**: 2025-12-06
**Git Commit**: 11cedef
**Branch**: feature/prompt-overhaul

## Research Question

How does subagent message streaming currently work compared to the main Messages tab? Specifically, how is the streaming/autoscroll behavior implemented in each view?

## Summary

The Ralph TUI implements live streaming and autoscroll via an `isFollowing` state pattern. When `isFollowing` is true, the view automatically scrolls to the latest item as new content arrives. This pattern is implemented in three main list views:

| View | Location | Has `isFollowing` | Auto-scrolls |
|------|----------|-------------------|--------------|
| MessagesView | `components/messages/messages-view.tsx` | Yes (line 207) | Yes |
| SubagentsView | `components/subagents/subagents-view.tsx` | Yes (line 137) | Yes |
| ErrorsView | `components/errors/errors-view.tsx` | Yes (line 64) | Yes |
| **SubagentDetailView Messages Tab** | `components/subagent/subagent-detail-view.tsx` | **No** | **No** |

The SubagentDetailView's Messages tab (the subagent message list page) does NOT implement the `isFollowing` pattern, which is why it does not stream/autoscroll like the main Messages tab.

## Detailed Findings

### Main Messages Tab - Streaming Implementation

#### Data Flow
1. **File watching**: `useJSONLStream` hook watches the JSONL file with chokidar (500ms polling) at `hooks/use-jsonl-stream.ts:249-257`
2. **Parsing**: New content is processed via `processNewContent()` at `hooks/use-jsonl-stream.ts:57-123`
3. **State updates**: `setMessages()` triggers React re-renders at `hooks/use-jsonl-stream.ts:159`
4. **Component receives**: `MessagesView` receives `messages` as props from App at `app.tsx:466-482`

#### Auto-scroll Implementation
The `isFollowing` state pattern at `components/messages/messages-view.tsx:207-220`:

```typescript
const [isFollowing, setIsFollowing] = useState(false);
const hasInitializedRef = useRef(false);
const prevListLengthRef = useRef(0);
```

The auto-scroll effect at `components/messages/messages-view.tsx:326-348`:

```typescript
React.useEffect(() => {
  if (listItems.length === 0 || !hasInitializedRef.current) return;

  const newMessagesArrived = listItems.length > prevListLengthRef.current;
  prevListLengthRef.current = listItems.length;

  if (newMessagesArrived) {
    if (isFollowing) {
      // Auto-scroll to latest
      const lastIdx = getLastMessageIndex();
      setSelectedItemIndex(lastIdx);
      setWindowStart(Math.max(0, listItems.length - windowSize));
    }
  }
}, [listItems.length, isFollowing, windowSize, getLastMessageIndex]);
```

Key behaviors:
- `isFollowing` is re-enabled when user navigates to the latest message
- 'l' key jumps to latest and enables following at lines 442-446
- Navigation away from latest disables following at lines 398-399, 406-408

### Subagent Message Display - Current Implementation

#### Data Flow for Subagent Messages
1. **Identification**: Events with `parent_tool_use_id` are identified as subagent events at `hooks/use-jsonl-stream.ts:68-69`
2. **Collection**: Subagent messages are stored in `subagentMessagesMap` keyed by parent ID at `hooks/use-jsonl-stream.ts:92-103`
3. **Reference linking**: Parent ToolCall's `subagentMessages` property references the map entry directly at line 102
4. **Updates propagate**: When new subagent messages arrive, the parent ToolCall's array updates (by reference)

#### SubagentDetailView Structure

The component at `components/subagent/subagent-detail-view.tsx` has two tabs:
- **Overview** (lines 204-337): Shows subagent metadata, prompt, and response
- **Messages** (lines 339-833): Shows the subagent conversation as a scrollable list

#### Messages Tab State Variables

At `components/subagent/subagent-detail-view.tsx:731-769`:

```typescript
// Messages tab state
const [selectedIndex, setSelectedIndex] = useState(0);
const [windowStart, setWindowStart] = useState(0);
```

Notable absence: There is NO `isFollowing` state variable or auto-scroll effect in the Messages tab implementation.

#### Messages Tab Keyboard Handling

At `components/subagent/subagent-detail-view.tsx:771-813`:

```typescript
// Handle messages tab navigation
if (activeTab === 'messages') {
  if (key.upArrow) {
    setSelectedIndex(prev => Math.max(0, prev - 1));
    if (selectedIndex - 1 < windowStart) {
      setWindowStart(prev => Math.max(0, prev - 1));
    }
  }
  if (key.downArrow) {
    setSelectedIndex(prev => Math.min(subagentMessages.length - 1, prev + 1));
    // ... window adjustment
  }
  // 'g' for top, 'G' for bottom
}
```

Key observations:
- Standard up/down navigation exists
- 'g' and 'G' keys for top/bottom navigation
- NO 'l' key handling for "jump to latest"
- NO auto-scroll effect that responds to new messages

#### Message List Building

At `components/subagent/subagent-detail-view.tsx:861-864`:

```typescript
const realSubagentMessages = toolCall.subagentMessages;
const subagentMessages = useMemo(() => {
  return buildSubagentMessageList(toolCall, realSubagentMessages);
}, [realSubagentMessages, toolCall]);
```

The `buildSubagentMessageList()` function (lines 135-163):
1. Creates synthetic "Input" message from `toolCall.subagentPrompt`
2. Includes real `subagentMessages` from the ToolCall in the middle
3. Creates synthetic "Output" message from `toolCall.result`

The data IS reactive - when `toolCall.subagentMessages` updates, the `useMemo` will recompute and the component will re-render. However, without the `isFollowing` auto-scroll logic, the view position stays fixed.

### Comparison: What MessagesView Has That SubagentDetailView Lacks

#### MessagesView (has streaming + autoscroll)
- `isFollowing` state: line 207
- `hasInitializedRef`: line 208
- `prevListLengthRef`: line 210
- Auto-scroll effect: lines 326-348
- Initialization effect with following logic: lines 224-323
- 'l' key handler to jump to latest: lines 442-446
- Following state updates on navigation: lines 398-399, 406-408

#### SubagentDetailView Messages Tab (lacks streaming + autoscroll)
- NO `isFollowing` state
- NO `prevListLengthRef` for detecting new messages
- NO auto-scroll effect
- NO 'l' key handler
- Simple `selectedIndex` and `windowStart` state only

### Data Flow Visualization

```
JSONL File
    │
    ▼ (chokidar 500ms polling)
useJSONLStream hook
    │
    ├─── Main agent messages ────► App.messages state ────► MessagesView
    │                                                              │
    │                                                              ▼
    │                                                     [isFollowing effect]
    │                                                     Auto-scrolls on new
    │
    └─── Subagent messages ─────► subagentMessagesMap
              │                          │
              │                          ▼
              │                   toolCall.subagentMessages
              │                          │
              ▼                          ▼
         (by reference)           SubagentDetailView
                                         │
                                         ▼
                                 [NO isFollowing effect]
                                 View stays at same position
```

## Code References

### Main Messages Tab Streaming
- `hooks/use-jsonl-stream.ts:32-56` - Hook initialization
- `hooks/use-jsonl-stream.ts:249-257` - Chokidar file watcher setup
- `hooks/use-jsonl-stream.ts:57-123` - Content processing
- `components/messages/messages-view.tsx:207-220` - Following state
- `components/messages/messages-view.tsx:326-348` - Auto-scroll effect
- `components/messages/messages-view.tsx:442-446` - 'l' key jump to latest

### Subagent Message Collection
- `hooks/use-jsonl-stream.ts:68-69` - Subagent event detection
- `hooks/use-jsonl-stream.ts:92-103` - Subagent message collection
- `lib/types.ts:59` - `subagentMessages` on ToolCall interface

### SubagentDetailView (lacks auto-scroll)
- `components/subagent/subagent-detail-view.tsx:731-769` - Messages tab state (no `isFollowing`)
- `components/subagent/subagent-detail-view.tsx:771-813` - Keyboard handling (no 'l' key)
- `components/subagent/subagent-detail-view.tsx:861-864` - Message list useMemo

### Views WITH `isFollowing` Pattern
- `components/messages/messages-view.tsx:207` - MessagesView
- `components/subagents/subagents-view.tsx:137` - SubagentsView
- `components/errors/errors-view.tsx:64` - ErrorsView

### Views WITHOUT `isFollowing` Pattern
- `components/subagent/subagent-detail-view.tsx` - SubagentDetailView
- `components/todos/todos-view.tsx` - TodosView
- `components/messages/message-detail-view.tsx` - MessageDetailView

## Architecture Documentation

### The `isFollowing` Pattern

The codebase uses a consistent pattern for live-streaming scrollable views:

1. **State**: `const [isFollowing, setIsFollowing] = useState(false)`
2. **Ref for change detection**: `const prevListLengthRef = useRef(0)`
3. **Effect**: Watches `listItems.length` and auto-scrolls if `isFollowing && newItemsArrived`
4. **Navigation updates**: Sets `isFollowing` based on whether selection equals last item
5. **Jump to latest**: 'l' key sets selection to last and enables `isFollowing`

### Window-Based Scrolling

All scrollable views use a window/viewport approach:
- `windowStart` - Index of first visible item
- `windowSize` - Number of items visible (calculated from height / item height)
- `selectedIndex` - Currently selected item
- Items rendered via `listItems.slice(windowStart, windowStart + windowSize)`

### Subagent Message Storage

Subagent messages use a two-map architecture:
- `toolCallMap`: All tool calls by ID
- `subagentMessagesMap`: ProcessedMessage arrays keyed by parent Task tool ID
- ToolCall objects hold a direct reference to their subagentMessages array
- Updates to the map propagate to all references

## Historical Context (from .ai-docs/)

### Design Documents

**`.ai-docs/design/product-brief.md`**
- Documents "Real-Time Message Streaming" as a core feature
- Describes subagent tracking with drill-down views
- Mentions arrow keys and vim-style navigation

**`.ai-docs/design/tech-stack.md`**
- Documents `useJSONLStream` hook implementation
- Describes `parent_tool_use_id` tracking pattern
- Details chokidar usage for real-time monitoring

## Related Documentation

- `.ai-docs/design/product-brief.md` - Product requirements context
- `.ai-docs/design/tech-stack.md` - Technical architecture

## Open Questions

1. Should the SubagentDetailView Messages tab initialize `isFollowing` to `true` (start following) or `false` (start at current position)?
2. Should the 'l' key work consistently across all scrollable views?
3. Are there performance considerations for auto-scrolling in deeply nested subagent conversations?

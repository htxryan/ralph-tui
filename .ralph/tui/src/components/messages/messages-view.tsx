import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';
import { ProcessedMessage, ToolCall, MessageFilterType, ALL_MESSAGE_FILTER_TYPES } from '../../lib/types.js';
import { getMessageFilterType } from '../../lib/parser.js';
import { MessageItem, MESSAGE_ITEM_HEIGHT } from './message-item.js';
import { SessionSeparator } from './session-separator.js';
import { InterruptInput } from './interrupt-input.js';
import { FilterDialog } from './filter-dialog.js';

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
}

// Scroll indicators take 1 line each (only shown when needed)
const SCROLL_INDICATOR_HEIGHT = 1;

// List item types for rendering (includes messages and separators)
type ListItem =
  | { type: 'message'; message: ProcessedMessage; messageIndex: number; isInitialPrompt: boolean }
  | { type: 'separator'; endedAt?: Date; startedAt?: Date; showStartHint?: boolean };

// Height of the interrupt input component in rows
const INTERRUPT_INPUT_HEIGHT = 6;

// Height of the filter dialog overlay (8 filters + header + footer + borders)
const FILTER_DIALOG_HEIGHT = 12;

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
}: MessagesViewProps): React.ReactElement {
  // Filter state - which message types to show
  const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(
    () => new Set(ALL_MESSAGE_FILTER_TYPES)
  );
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Find the initial prompt - first user message at or after sessionStartIndex
  // This marks the start of the current session
  // Note: In Claude Code's JSONL format, "user" events with text content are the actual
  // prompts. Most "user" events are tool_result containers which don't have text.
  const initialPromptIndex = useMemo(() => {
    // Determine where to start looking for the initial prompt
    // If sessionStartIndex is set, look from there; otherwise look from the beginning
    const startFrom = sessionStartIndex ?? 0;

    // Find first user message with actual text content at or after startFrom
    for (let i = startFrom; i < messages.length; i++) {
      if (messages[i].type === 'user' && messages[i].text.trim()) {
        return i;
      }
    }
    return -1; // No user message with text found
  }, [messages, sessionStartIndex]);

  // Compute message counts per filter type (for filter dialog display)
  // This is O(n) and only recomputes when messages or initialPromptIndex changes
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

    for (let i = 0; i < messages.length; i++) {
      const isInitialPrompt = initialPromptIndex >= 0 && i === initialPromptIndex;
      const filterType = getMessageFilterType(messages[i], isInitialPrompt);
      counts[filterType]++;
    }

    return counts;
  }, [messages, initialPromptIndex]);

  // Build list items array with separator at session boundary
  // Filters messages based on enabledFilters
  // IMPORTANT: Separators are ONLY shown when Ralph is fully stopped (not running AND not starting).
  // While Ralph is running or starting, we just show messages without separators to avoid
  // janky flashing of the "Previous Session" block during startup.
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    // Ralph is active if it's either running or in the process of starting
    const isRalphActive = isRalphRunning || isRalphStarting;
    // We have a previous session if sessionStartIndex is set and > 0
    // BUT only show separators when Ralph is NOT active
    const hasPreviousSession = sessionStartIndex !== undefined && sessionStartIndex > 0;
    const shouldShowSeparators = hasPreviousSession && !isRalphActive;

    // Calculate session boundary timestamps (for mid-list separator)
    const boundaryEndedAt = shouldShowSeparators && sessionStartIndex > 0
      ? messages[sessionStartIndex - 1]?.timestamp
      : undefined;
    const boundaryStartedAt = shouldShowSeparators && sessionStartIndex < messages.length
      ? messages[sessionStartIndex]?.timestamp
      : undefined;

    let separatorInserted = false;

    for (let i = 0; i < messages.length; i++) {
      const isInitialPrompt = initialPromptIndex >= 0 && i === initialPromptIndex;
      const filterType = getMessageFilterType(messages[i], isInitialPrompt);

      // Skip messages that don't match enabled filters
      if (!enabledFilters.has(filterType)) {
        continue;
      }

      // Insert separator at session boundary (before first message of current session)
      // Only insert once, before the first visible message at or after sessionStartIndex
      // Only when Ralph is NOT active (to avoid flashing during startup)
      if (shouldShowSeparators && !separatorInserted && i >= sessionStartIndex) {
        items.push({ type: 'separator', endedAt: boundaryEndedAt, startedAt: boundaryStartedAt });
        separatorInserted = true;
      }

      items.push({
        type: 'message',
        message: messages[i],
        messageIndex: i,
        isInitialPrompt,
      });
    }

    // Show end separator only when Ralph is NOT active and there are messages
    // This marks the end of the session after killing Ralph
    if (!isRalphActive && messages.length > 0) {
      const lastMessageTimestamp = messages[messages.length - 1]?.timestamp;
      items.push({ type: 'separator', endedAt: lastMessageTimestamp, startedAt: undefined, showStartHint: true });
    }

    return items;
  }, [messages, initialPromptIndex, sessionStartIndex, isRalphRunning, isRalphStarting, enabledFilters]);

  // Calculate exact window size based on available height
  // All items have same height (MESSAGE_ITEM_HEIGHT = 4), plus scroll indicators (2 lines)
  // In interrupt mode, reserve space for the interrupt input at the bottom
  const interruptOverhead = isInterruptMode ? INTERRUPT_INPUT_HEIGHT : 0;
  const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2 + interruptOverhead;
  const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));

  // Helper to find the last message index in listItems
  const getLastMessageIndex = useCallback((): number => {
    for (let i = listItems.length - 1; i >= 0; i--) {
      if (listItems[i].type === 'message') return i;
    }
    return 0;
  }, [listItems]);

  // Helper to find next/prev item index (allows selecting separators too)
  const findNextItemIndex = useCallback((fromIndex: number, direction: 1 | -1): number => {
    const newIdx = fromIndex + direction;
    if (newIdx >= 0 && newIdx < listItems.length) {
      return newIdx;
    }
    return fromIndex; // Stay in place if at boundary
  }, [listItems]);

  // Helper to find separator index
  const getSeparatorIndex = useCallback((): number => {
    return listItems.findIndex(item => item.type === 'separator');
  }, [listItems]);

  // Track whether to auto-scroll to latest (user is "following" the conversation)
  // When user navigates away from latest, following stops
  // When user navigates to latest or presses 'l', following resumes
  const [isFollowing, setIsFollowing] = useState(false);

  // Track whether we've done initial positioning
  const hasInitializedRef = useRef(false);

  // Track previous sessionStartIndex to detect when Ralph starts
  const prevSessionStartRef = useRef<number | undefined>(undefined);

  // Track previous list length to detect new messages
  const prevListLengthRef = useRef(0);

  // State for selection and window position
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  // Effect: Initialize scroll position on first render with data
  // Also handles when Ralph starts (sessionStartIndex changes from undefined to a value)
  React.useEffect(() => {
    if (listItems.length === 0) return;

    // Detect if session actually just started (sessionStartIndex changed from undefined to a value)
    // We track the ACTUAL previous value, not just whether it was undefined on mount
    const sessionJustStarted =
      prevSessionStartRef.current === undefined &&
      sessionStartIndex !== undefined &&
      sessionStartIndex > 0 &&
      !hasInitializedRef.current; // Only on true first init, not remount

    // Handle initial positioning
    if (!hasInitializedRef.current) {
      // PRIORITY 1: If we have initialSelectedIndex from props (back navigation), use it
      // This takes precedence over session positioning because the parent explicitly
      // told us which message the user was viewing
      if (initialSelectedIndex !== undefined) {
        const itemIdx = listItems.findIndex(
          item => item.type === 'message' && item.messageIndex === initialSelectedIndex
        );
        if (itemIdx >= 0) {
          const lastIdx = getLastMessageIndex();
          setSelectedItemIndex(itemIdx);
          setWindowStart(Math.max(0, itemIdx - Math.floor(windowSize / 2)));
          setIsFollowing(itemIdx === lastIdx);
          hasInitializedRef.current = true;
          prevListLengthRef.current = listItems.length;
          prevSessionStartRef.current = sessionStartIndex;
          return;
        }
      }

      // PRIORITY 2: If we have a session separator, show it at top and select Initial Prompt
      const hasPreviousSession = sessionStartIndex !== undefined && sessionStartIndex > 0;
      if (hasPreviousSession) {
        const separatorIdx = getSeparatorIndex();
        if (separatorIdx >= 0) {
          // Find first message after separator (the Initial Prompt)
          let firstAfterSeparator = -1;
          for (let i = separatorIdx + 1; i < listItems.length; i++) {
            if (listItems[i].type === 'message') {
              firstAfterSeparator = i;
              break;
            }
          }

          // If there's a message after separator, select it (Initial Prompt)
          // Otherwise select the last message before separator
          const selectIdx = firstAfterSeparator >= 0
            ? firstAfterSeparator
            : (separatorIdx > 0 ? findNextItemIndex(separatorIdx, -1) : 0);

          const lastIdx = getLastMessageIndex();
          setSelectedItemIndex(selectIdx);
          setWindowStart(separatorIdx); // Separator at top of view
          // Enable following if Initial Prompt IS the latest message (typical for fresh session)
          // This ensures auto-scroll is the default behavior when Ralph just started
          setIsFollowing(selectIdx === lastIdx);
          hasInitializedRef.current = true;
          prevListLengthRef.current = listItems.length;
          prevSessionStartRef.current = sessionStartIndex;
          return;
        }
      }

      // PRIORITY 3: Default - select last message, scroll to bottom, following mode ON
      const lastIdx = getLastMessageIndex();
      setSelectedItemIndex(lastIdx);
      setWindowStart(Math.max(0, listItems.length - windowSize));
      setIsFollowing(true);
      hasInitializedRef.current = true;
      prevListLengthRef.current = listItems.length;
      prevSessionStartRef.current = sessionStartIndex;
      return;
    }

    // Handle when Ralph starts mid-session (sessionStartIndex changes while component is mounted)
    if (sessionJustStarted) {
      const separatorIdx = getSeparatorIndex();
      if (separatorIdx >= 0) {
        let firstAfterSeparator = -1;
        for (let i = separatorIdx + 1; i < listItems.length; i++) {
          if (listItems[i].type === 'message') {
            firstAfterSeparator = i;
            break;
          }
        }
        const selectIdx = firstAfterSeparator >= 0
          ? firstAfterSeparator
          : (separatorIdx > 0 ? findNextItemIndex(separatorIdx, -1) : 0);

        const lastIdx = getLastMessageIndex();
        setSelectedItemIndex(selectIdx);
        setWindowStart(separatorIdx);
        setIsFollowing(selectIdx === lastIdx);
      }
    }

    prevSessionStartRef.current = sessionStartIndex;
  }, [listItems, sessionStartIndex, initialSelectedIndex, windowSize, getLastMessageIndex, getSeparatorIndex, findNextItemIndex]);

  // Effect: Handle new messages arriving (auto-scroll only if following)
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
      // If not following, don't change selection or window position
    }

    // Ensure selected item is valid (in case items were somehow removed)
    if (selectedItemIndex >= listItems.length) {
      const lastIdx = getLastMessageIndex();
      setSelectedItemIndex(lastIdx);
      setIsFollowing(true);
    }
  }, [listItems.length, isFollowing, windowSize, getLastMessageIndex]);

  // Adjust window when height/windowSize changes (terminal resize)
  React.useEffect(() => {
    if (listItems.length === 0 || !hasInitializedRef.current) return;

    // Ensure selected item stays visible after resize
    if (selectedItemIndex < windowStart) {
      setWindowStart(selectedItemIndex);
    } else if (selectedItemIndex >= windowStart + windowSize) {
      setWindowStart(Math.max(0, selectedItemIndex - windowSize + 1));
    }
    // Ensure we don't have empty space at the bottom
    const maxWindowStart = Math.max(0, listItems.length - windowSize);
    if (windowStart > maxWindowStart) {
      setWindowStart(maxWindowStart);
    }
  }, [windowSize, height, listItems.length, selectedItemIndex, windowStart]);

  // Auto-scroll to bottom when entering interrupt mode
  useEffect(() => {
    if (isInterruptMode && listItems.length > 0) {
      const lastIdx = getLastMessageIndex();
      setSelectedItemIndex(lastIdx);
      setIsFollowing(true);
      setWindowStart(Math.max(0, listItems.length - windowSize));
    }
  }, [isInterruptMode, listItems.length, windowSize, getLastMessageIndex]);

  useInput((input, key) => {
    // Don't handle input when in interrupt mode - InterruptInput handles its own
    if (isInterruptMode) return;
    // Don't handle input when filter dialog is open - FilterDialog handles its own
    if (showFilterDialog) return;
    // Don't handle input when session picker is open - SessionPicker handles its own
    if (isSessionPickerOpen) return;

    // Toggle filter dialog with 'f'
    if (input === 'f') {
      setShowFilterDialog(true);
      return;
    }

    if (listItems.length === 0) return;

    const lastMessageIdx = getLastMessageIndex();

    if (key.upArrow) {
      const newIndex = findNextItemIndex(selectedItemIndex, -1);
      setSelectedItemIndex(newIndex);
      // Update following state: are we still at the latest message?
      setIsFollowing(newIndex === lastMessageIdx);
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = findNextItemIndex(selectedItemIndex, 1);
      setSelectedItemIndex(newIndex);
      // Update following state: did we just reach the latest message?
      setIsFollowing(newIndex === lastMessageIdx);
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedItemIndex - windowSize);
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastMessageIdx);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(listItems.length - 1, selectedItemIndex + windowSize);
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastMessageIdx);
      setWindowStart(
        Math.min(Math.max(0, listItems.length - windowSize), windowStart + windowSize)
      );
    }
    if (key.return) {
      const item = listItems[selectedItemIndex];
      if (item.type === 'message') {
        const message = item.message;
        // Find first subagent tool call - if present, navigate to subagent detail
        const subagent = message.toolCalls.find(tc => tc.isSubagent);
        if (subagent) {
          onSelectSubagent(subagent, item.messageIndex);
        } else {
          // Open message detail view
          onSelectMessage(message, item.messageIndex);
        }
      }
    }
    // Jump to latest message and resume following
    if (input === 'l') {
      setSelectedItemIndex(lastMessageIdx);
      setIsFollowing(true); // Resume auto-scroll
      setWindowStart(Math.max(0, listItems.length - windowSize));
    }
  });

  // Handler for closing the filter dialog
  const handleCloseFilterDialog = useCallback(() => {
    setShowFilterDialog(false);
  }, []);

  if (messages.length === 0) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.dimmed}>No messages yet. Waiting for JSONL stream...</Text>
      </Box>
    );
  }

  // Calculate how many messages are filtered out
  const totalMessages = messages.length;
  const visibleMessages = listItems.filter(item => item.type === 'message').length;
  const filteredCount = totalMessages - visibleMessages;
  const isFiltering = enabledFilters.size < ALL_MESSAGE_FILTER_TYPES.length;

  const visibleItems = listItems.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < listItems.length;

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

      {/* Filter status indicator */}
      {!showFilterDialog && isFiltering && (
        <Box>
          <Text color={colors.warning}>
            {'\u26A0'} Filtering: {visibleMessages} of {totalMessages} messages shown ({filteredCount} hidden)
          </Text>
          <Text color={colors.dimmed}> [F to edit filter]</Text>
        </Box>
      )}

      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {windowStart} items above
        </Text>
      )}

      {visibleItems.map((item, i) => {
        const actualIndex = windowStart + i;
        if (item.type === 'separator') {
          return <SessionSeparator key="separator" endedAt={item.endedAt} startedAt={item.startedAt} showStartHint={item.showStartHint} isSelected={actualIndex === selectedItemIndex} />;
        }
        // Calculate display index: restart numbering from #1 for current session
        const displayIndex = sessionStartIndex !== undefined && item.messageIndex >= sessionStartIndex
          ? item.messageIndex - sessionStartIndex + 1
          : item.messageIndex + 1;
        // Calculate duration as time until next message started
        const nextMessageIndex = item.messageIndex + 1;
        const durationMs = nextMessageIndex < messages.length
          ? messages[nextMessageIndex].timestamp.getTime() - item.message.timestamp.getTime()
          : undefined;
        return (
          <MessageItem
            key={item.message.id}
            message={item.message}
            isSelected={actualIndex === selectedItemIndex}
            width={width}
            index={displayIndex}
            isInitialPrompt={item.isInitialPrompt}
            durationMs={durationMs}
          />
        );
      })}

      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {listItems.length - windowStart - windowSize} items below
        </Text>
      )}

      {/* Interrupt input at the bottom when active */}
      {isInterruptMode && onInterruptSubmit && onInterruptCancel && (
        <InterruptInput
          onSubmit={onInterruptSubmit}
          onCancel={onInterruptCancel}
          onKillSession={onInterruptKillSession}
          width={width}
        />
      )}
    </Box>
  );
}

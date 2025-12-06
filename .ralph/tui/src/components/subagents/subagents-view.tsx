import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';
import { ProcessedMessage, ToolCall } from '../../lib/types.js';
import { MessageItem, MESSAGE_ITEM_HEIGHT } from '../messages/message-item.js';
import { SessionSeparator } from '../messages/session-separator.js';

export interface SubagentsViewProps {
  messages: ProcessedMessage[];
  onSelectSubagent: (toolCall: ToolCall, messageIndex?: number) => void;
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
}

// Scroll indicators take 1 line each (only shown when needed)
const SCROLL_INDICATOR_HEIGHT = 1;

// List item types for rendering (includes subagent messages and separators)
type ListItem =
  | { type: 'subagent'; msg: ProcessedMessage; originalIndex: number; displayIndex: number }
  | { type: 'separator'; endedAt?: Date; startedAt?: Date; showStartHint?: boolean };

/**
 * SubagentsView shows only messages that contain subagent (Task) tool calls.
 * It provides the same list navigation as MessagesView but filtered to subagents only.
 */
export function SubagentsView({
  messages,
  onSelectSubagent,
  height = 30,
  width = 100,
  initialSelectedIndex,
  sessionStartIndex,
  isRalphRunning = false,
}: SubagentsViewProps): React.ReactElement {
  // Filter messages to only those containing subagent tool calls
  const subagentMessages = useMemo(() => {
    return messages
      .map((msg, originalIndex) => ({ msg, originalIndex }))
      .filter(({ msg }) => msg.toolCalls.some(tc => tc.isSubagent));
  }, [messages]);

  // Build list items array with separator at session boundary
  const listItems = useMemo(() => {
    const items: ListItem[] = [];

    // Find where the session boundary falls in the filtered subagent list
    // sessionStartIndex refers to the original message index
    const hasPreviousSession = sessionStartIndex !== undefined && sessionStartIndex > 0;

    // Find the first subagent message at or after sessionStartIndex
    const sessionBoundaryFilteredIndex = hasPreviousSession
      ? subagentMessages.findIndex(({ originalIndex }) => originalIndex >= sessionStartIndex)
      : -1;

    // Calculate boundary timestamps from original messages
    const boundaryEndedAt = hasPreviousSession && sessionStartIndex > 0
      ? messages[sessionStartIndex - 1]?.timestamp
      : undefined;
    const boundaryStartedAt = hasPreviousSession && sessionStartIndex < messages.length
      ? messages[sessionStartIndex]?.timestamp
      : undefined;

    // Track display index (restarts after separator)
    let displayIndex = 1;

    for (let i = 0; i < subagentMessages.length; i++) {
      // Insert separator at session boundary
      if (hasPreviousSession && sessionBoundaryFilteredIndex >= 0 && i === sessionBoundaryFilteredIndex) {
        items.push({ type: 'separator', endedAt: boundaryEndedAt, startedAt: boundaryStartedAt });
        displayIndex = 1; // Reset numbering for new session
      }

      items.push({
        type: 'subagent',
        msg: subagentMessages[i].msg,
        originalIndex: subagentMessages[i].originalIndex,
        displayIndex: displayIndex++,
      });
    }

    // Show end separator in these cases:
    // 1. Ralph running but no new subagent messages in current session yet
    // 2. Ralph not running and there are subagent messages (initial launch or after killing)
    const hasSubagentsInCurrentSession = sessionBoundaryFilteredIndex >= 0 && sessionBoundaryFilteredIndex < subagentMessages.length;

    if (hasPreviousSession && !hasSubagentsInCurrentSession && isRalphRunning) {
      // Waiting for first subagent in new session - no hint needed
      items.push({ type: 'separator', endedAt: boundaryEndedAt, startedAt: boundaryStartedAt, showStartHint: false });
    } else if (!isRalphRunning && subagentMessages.length > 0) {
      // Initial launch or after killing Ralph - show hint to start
      const lastSubagent = subagentMessages[subagentMessages.length - 1];
      const lastMessageTimestamp = lastSubagent?.msg.timestamp;
      items.push({ type: 'separator', endedAt: lastMessageTimestamp, startedAt: undefined, showStartHint: true });
    }

    return items;
  }, [messages, subagentMessages, sessionStartIndex, isRalphRunning]);

  // Calculate exact window size based on available height
  // All items have same height (MESSAGE_ITEM_HEIGHT = 4), plus scroll indicators (2 lines)
  const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2;
  const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));

  // Helper to find the last subagent index in listItems
  const getLastSubagentIndex = useCallback((): number => {
    for (let i = listItems.length - 1; i >= 0; i--) {
      if (listItems[i].type === 'subagent') return i;
    }
    return 0;
  }, [listItems]);

  // Helper to find next/prev subagent index (skipping separators)
  const findNextSubagentIndex = useCallback((fromIndex: number, direction: 1 | -1): number => {
    let idx = fromIndex + direction;
    while (idx >= 0 && idx < listItems.length) {
      if (listItems[idx].type === 'subagent') return idx;
      idx += direction;
    }
    return fromIndex; // Stay in place if no valid index found
  }, [listItems]);

  // Helper to find separator index
  const getSeparatorIndex = useCallback((): number => {
    return listItems.findIndex(item => item.type === 'separator');
  }, [listItems]);

  // Track whether to auto-scroll to latest
  const [isFollowing, setIsFollowing] = useState(false);
  const hasInitializedRef = useRef(false);
  const prevListLengthRef = useRef(0);

  // State for selection and window position
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  // Effect: Initialize scroll position
  React.useEffect(() => {
    if (listItems.length === 0) return;

    if (!hasInitializedRef.current) {
      // If we have initialSelectedIndex, find it in the list
      if (initialSelectedIndex !== undefined) {
        const itemIdx = listItems.findIndex(
          item => item.type === 'subagent' && item.originalIndex === initialSelectedIndex
        );
        if (itemIdx >= 0) {
          const lastIdx = getLastSubagentIndex();
          setSelectedItemIndex(itemIdx);
          setWindowStart(Math.max(0, itemIdx - Math.floor(windowSize / 2)));
          setIsFollowing(itemIdx === lastIdx);
          hasInitializedRef.current = true;
          prevListLengthRef.current = listItems.length;
          return;
        }
      }

      // Check if we have a session separator to position around
      const hasPreviousSession = sessionStartIndex !== undefined && sessionStartIndex > 0;
      if (hasPreviousSession) {
        const separatorIdx = getSeparatorIndex();
        if (separatorIdx >= 0) {
          let firstAfterSeparator = -1;
          for (let i = separatorIdx + 1; i < listItems.length; i++) {
            if (listItems[i].type === 'subagent') {
              firstAfterSeparator = i;
              break;
            }
          }

          const selectIdx = firstAfterSeparator >= 0
            ? firstAfterSeparator
            : (separatorIdx > 0 ? findNextSubagentIndex(separatorIdx, -1) : 0);

          const lastIdx = getLastSubagentIndex();
          setSelectedItemIndex(selectIdx);
          setWindowStart(separatorIdx);
          setIsFollowing(selectIdx === lastIdx);
          hasInitializedRef.current = true;
          prevListLengthRef.current = listItems.length;
          return;
        }
      }

      // Default: select last subagent, scroll to bottom
      const lastIdx = getLastSubagentIndex();
      setSelectedItemIndex(lastIdx);
      setWindowStart(Math.max(0, listItems.length - windowSize));
      setIsFollowing(true);
      hasInitializedRef.current = true;
      prevListLengthRef.current = listItems.length;
    }
  }, [listItems, sessionStartIndex, initialSelectedIndex, windowSize, getLastSubagentIndex, getSeparatorIndex, findNextSubagentIndex]);

  // Effect: Handle new items arriving (auto-scroll only if following)
  React.useEffect(() => {
    if (listItems.length === 0 || !hasInitializedRef.current) return;

    const newItemsArrived = listItems.length > prevListLengthRef.current;
    prevListLengthRef.current = listItems.length;

    if (newItemsArrived && isFollowing) {
      const lastIdx = getLastSubagentIndex();
      setSelectedItemIndex(lastIdx);
      setWindowStart(Math.max(0, listItems.length - windowSize));
    }

    // Ensure selected item is valid
    if (selectedItemIndex >= listItems.length) {
      const lastIdx = getLastSubagentIndex();
      setSelectedItemIndex(lastIdx);
      setIsFollowing(true);
    }
  }, [listItems.length, isFollowing, windowSize, getLastSubagentIndex]);

  // Adjust window when height/windowSize changes (terminal resize)
  React.useEffect(() => {
    if (listItems.length === 0 || !hasInitializedRef.current) return;

    if (selectedItemIndex < windowStart) {
      setWindowStart(selectedItemIndex);
    } else if (selectedItemIndex >= windowStart + windowSize) {
      setWindowStart(Math.max(0, selectedItemIndex - windowSize + 1));
    }
    const maxWindowStart = Math.max(0, listItems.length - windowSize);
    if (windowStart > maxWindowStart) {
      setWindowStart(maxWindowStart);
    }
  }, [windowSize, height, listItems.length, selectedItemIndex, windowStart]);

  useInput((input, key) => {
    if (listItems.length === 0) return;

    const lastSubagentIdx = getLastSubagentIndex();

    if (key.upArrow) {
      const newIndex = findNextSubagentIndex(selectedItemIndex, -1);
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastSubagentIdx);
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = findNextSubagentIndex(selectedItemIndex, 1);
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastSubagentIdx);
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      let newIndex = Math.max(0, selectedItemIndex - windowSize);
      if (listItems[newIndex]?.type === 'separator') {
        newIndex = findNextSubagentIndex(newIndex, -1);
      }
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastSubagentIdx);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      let newIndex = Math.min(listItems.length - 1, selectedItemIndex + windowSize);
      if (listItems[newIndex]?.type === 'separator') {
        newIndex = findNextSubagentIndex(newIndex, 1);
      }
      setSelectedItemIndex(newIndex);
      setIsFollowing(newIndex === lastSubagentIdx);
      setWindowStart(
        Math.min(Math.max(0, listItems.length - windowSize), windowStart + windowSize)
      );
    }
    if (key.return) {
      const item = listItems[selectedItemIndex];
      if (item.type === 'subagent') {
        const subagent = item.msg.toolCalls.find(tc => tc.isSubagent);
        if (subagent) {
          onSelectSubagent(subagent, item.originalIndex);
        }
      }
    }
    // Jump to latest subagent and resume following
    if (input === 'l') {
      setSelectedItemIndex(lastSubagentIdx);
      setIsFollowing(true);
      setWindowStart(Math.max(0, listItems.length - windowSize));
    }
  });

  if (subagentMessages.length === 0) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.dimmed}>No subagent (Task) calls yet.</Text>
        <Text color={colors.dimmed}>Subagent calls will appear here when the agent spawns Task subagents.</Text>
      </Box>
    );
  }

  const visibleItems = listItems.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < listItems.length;

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {windowStart} items above
        </Text>
      )}

      {visibleItems.map((item, i) => {
        const actualIndex = windowStart + i;
        if (item.type === 'separator') {
          return <SessionSeparator key="separator" endedAt={item.endedAt} startedAt={item.startedAt} showStartHint={item.showStartHint} />;
        }
        // Calculate duration as time until next message started
        const nextMessageIndex = item.originalIndex + 1;
        const durationMs = nextMessageIndex < messages.length
          ? messages[nextMessageIndex].timestamp.getTime() - item.msg.timestamp.getTime()
          : undefined;
        return (
          <MessageItem
            key={item.msg.id}
            message={item.msg}
            isSelected={actualIndex === selectedItemIndex}
            width={width}
            index={item.displayIndex}
            durationMs={durationMs}
          />
        );
      })}

      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {listItems.length - windowStart - windowSize} items below
        </Text>
      )}
    </Box>
  );
}

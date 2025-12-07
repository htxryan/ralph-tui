import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';
import { ProcessedMessage, ErrorInfo } from '../../lib/types.js';
import { ErrorItem, ERROR_ITEM_HEIGHT } from './error-item.js';

export interface ErrorsViewProps {
  messages: ProcessedMessage[];
  onSelectError: (error: ErrorInfo) => void;
  /** Height in rows for the view to fill */
  height?: number;
  /** Width in columns for proper truncation */
  width?: number;
}

// Scroll indicators take 1 line each (only shown when needed)
const SCROLL_INDICATOR_HEIGHT = 1;

/**
 * Extract all errors from messages as ErrorInfo objects
 */
function extractErrors(messages: ProcessedMessage[]): ErrorInfo[] {
  const errors: ErrorInfo[] = [];
  let errorIdCounter = 0;

  messages.forEach((msg, messageIndex) => {
    msg.toolCalls.forEach((tc) => {
      if (tc.isError && tc.result) {
        errors.push({
          id: `error-${++errorIdCounter}`,
          toolCallId: tc.id,
          toolName: tc.name,
          timestamp: tc.timestamp,
          errorContent: tc.result,
          messageIndex,
        });
      }
    });
  });

  return errors;
}

export function ErrorsView({
  messages,
  onSelectError,
  height = 30,
  width = 100,
}: ErrorsViewProps): React.ReactElement {
  // Extract errors from messages
  const errors = useMemo(() => extractErrors(messages), [messages]);

  // Calculate exact window size based on available height
  const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2;
  const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / ERROR_ITEM_HEIGHT));

  // Track whether we've done initial positioning
  const hasInitializedRef = useRef(false);

  // Track previous list length to detect new errors
  const prevListLengthRef = useRef(0);

  // Track whether to auto-scroll to latest
  const [isFollowing, setIsFollowing] = useState(true);

  // State for selection and window position
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  // Initialize and handle new errors
  useEffect(() => {
    if (errors.length === 0) return;

    // Initial positioning - select last error
    if (!hasInitializedRef.current) {
      const lastIdx = errors.length - 1;
      setSelectedIndex(lastIdx);
      setWindowStart(Math.max(0, errors.length - windowSize));
      setIsFollowing(true);
      hasInitializedRef.current = true;
      prevListLengthRef.current = errors.length;
      return;
    }

    // Handle new errors arriving
    const newErrorsArrived = errors.length > prevListLengthRef.current;
    prevListLengthRef.current = errors.length;

    if (newErrorsArrived && isFollowing) {
      const lastIdx = errors.length - 1;
      setSelectedIndex(lastIdx);
      setWindowStart(Math.max(0, errors.length - windowSize));
    }

    // Ensure selected item is valid
    if (selectedIndex >= errors.length) {
      setSelectedIndex(Math.max(0, errors.length - 1));
      setIsFollowing(true);
    }
  }, [errors.length, isFollowing, windowSize, selectedIndex]);

  // Adjust window when height/windowSize changes (terminal resize)
  useEffect(() => {
    if (errors.length === 0 || !hasInitializedRef.current) return;

    // Ensure selected item stays visible after resize
    if (selectedIndex < windowStart) {
      setWindowStart(selectedIndex);
    } else if (selectedIndex >= windowStart + windowSize) {
      setWindowStart(Math.max(0, selectedIndex - windowSize + 1));
    }
    // Ensure we don't have empty space at the bottom
    const maxWindowStart = Math.max(0, errors.length - windowSize);
    if (windowStart > maxWindowStart) {
      setWindowStart(maxWindowStart);
    }
  }, [windowSize, height, errors.length, selectedIndex, windowStart]);

  useInput((input, key) => {
    if (errors.length === 0) return;

    const lastIdx = errors.length - 1;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = Math.min(lastIdx, selectedIndex + 1);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - windowSize);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(lastIdx, selectedIndex + windowSize);
      setSelectedIndex(newIndex);
      setIsFollowing(newIndex === lastIdx);
      setWindowStart(Math.min(Math.max(0, errors.length - windowSize), windowStart + windowSize));
    }
    if (key.return) {
      onSelectError(errors[selectedIndex]);
    }
    // Jump to latest error and resume following
    if (input === 'l') {
      setSelectedIndex(lastIdx);
      setIsFollowing(true);
      setWindowStart(Math.max(0, errors.length - windowSize));
    }
  });

  if (errors.length === 0) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.dimmed}>No errors found.</Text>
      </Box>
    );
  }

  const visibleErrors = errors.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < errors.length;

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {windowStart} errors above
        </Text>
      )}

      {visibleErrors.map((error, i) => {
        const actualIndex = windowStart + i;
        return (
          <ErrorItem
            key={error.id}
            error={error}
            isSelected={actualIndex === selectedIndex}
            width={width}
            index={actualIndex + 1}
          />
        );
      })}

      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {errors.length - windowStart - windowSize} errors below
        </Text>
      )}
    </Box>
  );
}

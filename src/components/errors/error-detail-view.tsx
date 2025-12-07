import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ErrorInfo } from '../../lib/types.js';
import { formatTime, truncate } from '../../lib/parser.js';

export interface ErrorDetailViewProps {
  error: ErrorInfo;
  onBack: () => void;
  /** Height in rows for the view to fill */
  height?: number;
  /** Width in columns for proper truncation */
  width?: number;
}

export function ErrorDetailView({
  error,
  onBack,
  height = 30,
  width = 100,
}: ErrorDetailViewProps): React.ReactElement {
  // Calculate content area height (subtract header)
  const contentHeight = height - 4;

  // Split error content into lines for scrollable view
  const errorLines = error.errorContent.split('\n');
  const [scrollOffset, setScrollOffset] = useState(0);
  const maxScroll = Math.max(0, errorLines.length - contentHeight + 2);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollOffset(prev => Math.min(maxScroll, prev + 1));
    }
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - contentHeight));
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.min(maxScroll, prev + contentHeight));
    }
  });

  const visibleLines = errorLines.slice(scrollOffset, scrollOffset + contentHeight - 2);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxScroll;

  return (
    <Box flexDirection="column" height={height} paddingX={1}>
      {/* Header */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.error}
        paddingX={1}
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text>
            <Text color={colors.error} bold>{icons.error}</Text>
            <Text color={colors.error} bold> Error Detail</Text>
            <Text color={colors.dimmed}>  {formatTime(error.timestamp)}</Text>
          </Text>
          <Text color={colors.dimmed}>Esc to go back</Text>
        </Box>
        <Text>
          <Text color={colors.dimmed}>Tool: </Text>
          <Text color={colors.subagent}>{error.toolName}</Text>
          <Text color={colors.dimmed}> (</Text>
          <Text color={colors.dimmed}>{truncate(error.toolCallId, 30)}</Text>
          <Text color={colors.dimmed}>)</Text>
        </Text>
      </Box>

      {/* Scroll up indicator */}
      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {scrollOffset} lines above
        </Text>
      )}

      {/* Error content */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, i) => (
          <Text key={i} color={colors.error} wrap="truncate">
            {truncate(line, width - 4) || ' '}
          </Text>
        ))}
      </Box>

      {/* Scroll down indicator */}
      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {maxScroll - scrollOffset} lines below
        </Text>
      )}
    </Box>
  );
}

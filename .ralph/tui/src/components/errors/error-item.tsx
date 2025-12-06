import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ErrorInfo } from '../../lib/types.js';
import { formatTime, truncate } from '../../lib/parser.js';

export interface ErrorItemProps {
  error: ErrorInfo;
  isSelected: boolean;
  /** Terminal width for proper truncation */
  width?: number;
  /** 1-based index for display */
  index: number;
}

// Fixed height for deterministic layout - all items have same height
// 5 lines = 3 content lines + 2 for border (top/bottom)
export const ERROR_ITEM_HEIGHT = 5;

export function ErrorItem({
  error,
  isSelected,
  width = 100,
  index,
}: ErrorItemProps): React.ReactElement {
  // Calculate usable width (account for indentation and borders)
  const contentWidth = Math.max(40, width - 10);

  // Truncate error content to single line
  const errorLine = error.errorContent
    ? truncate(error.errorContent.replace(/\n/g, ' '), contentWidth - 4)
    : '';

  // Hint text for selected items
  const hint = isSelected ? ' [Enter]' : '';

  const borderColor = isSelected ? colors.selected : colors.error;

  return (
    <Box
      flexDirection="column"
      height={ERROR_ITEM_HEIGHT}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {/* Line 1: Header */}
      <Text>
        <Text color={colors.dimmed}>#{index} </Text>
        <Text color={colors.error} bold={isSelected}>{icons.error}</Text>
        <Text color={isSelected ? colors.selected : colors.error} bold={isSelected}> Error</Text>
        <Text color={colors.dimmed}>  {formatTime(error.timestamp)}</Text>
      </Text>

      {/* Line 2: Tool name */}
      <Text color={isSelected ? colors.header : colors.dimmed} wrap="truncate">
        <Text color={colors.subagent}>{error.toolName}</Text>
        <Text color={colors.dimmed}> (</Text>
        <Text color={colors.dimmed}>{truncate(error.toolCallId, 20)}</Text>
        <Text color={colors.dimmed}>)</Text>
      </Text>

      {/* Line 3: Error content preview + hint */}
      <Text wrap="truncate">
        <Text color={isSelected ? colors.error : colors.dimmed}>{errorLine || ' '}</Text>
        {hint && <Text color={colors.selected}>{hint}</Text>}
      </Text>
    </Box>
  );
}

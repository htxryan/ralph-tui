import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../../lib/colors.js';
import { MESSAGE_ITEM_HEIGHT } from './message-item.js';

export interface SessionSeparatorProps {
  /** Timestamp when the previous session ended (last message before separator) */
  endedAt?: Date;
  /** Timestamp when the new session started (first message after separator) */
  startedAt?: Date;
  /** Show hint to start a new session instead of startedAt timestamp */
  showStartHint?: boolean;
  /** Whether this separator is currently selected in the list */
  isSelected?: boolean;
}

/**
 * Format a date as a sortable timestamp: YYYY-MM-DD HH:MM:SS
 */
function formatSortableTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Visual separator between previous session messages and the current session.
 * Same height as message items (2 content lines) to maintain consistent layout.
 */
export function SessionSeparator({ endedAt, startedAt, showStartHint, isSelected }: SessionSeparatorProps): React.ReactElement {
  // Build the secondary line content (simplified to fit in 2 lines total)
  let secondaryContent: React.ReactNode = null;
  if (showStartHint) {
    secondaryContent = (
      <Text color={colors.dimmed}>
        Press <Text color={colors.success} bold>s</Text> to start a new session...
      </Text>
    );
  } else if (endedAt) {
    secondaryContent = (
      <Text color={colors.dimmed}>
        Ended: {formatSortableTimestamp(endedAt)}
      </Text>
    );
  }

  return (
    <Box
      flexDirection="column"
      height={MESSAGE_ITEM_HEIGHT}
      borderStyle="round"
      borderColor={isSelected ? colors.selected : colors.dimmed}
      paddingX={1}
      justifyContent="center"
      alignItems="center"
    >
      <Text color={colors.dimmed} bold>
        {'\u2191'} Previous Session {'\u2191'}
      </Text>
      {secondaryContent}
    </Box>
  );
}

import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../../lib/colors.js';

interface AutoscrollIndicatorProps {
  isFollowing: boolean;
  isScrollable: boolean;
}

export function AutoscrollIndicator({ isFollowing, isScrollable }: AutoscrollIndicatorProps) {
  // Only show when content is scrollable
  if (!isScrollable) {
    return null;
  }

  return (
    <Box>
      <Text color={colors.dimmed}>
        {isFollowing
          ? 'Autoscrolling…'
          : 'Autoscrolling paused. Press L to resume.'
        }
      </Text>
    </Box>
  );
}

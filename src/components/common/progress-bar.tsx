import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../../lib/colors.js';

export interface ProgressBarProps {
  percent: number;
  width?: number;
  showPercent?: boolean;
  label?: string;
  filledChar?: string;
  emptyChar?: string;
  filledColor?: string;
  emptyColor?: string;
}

export function ProgressBar({
  percent,
  width = 20,
  showPercent = true,
  label,
  filledChar = '\u2588',  // Full block
  emptyChar = '\u2591',   // Light shade
  filledColor = colors.success,
  emptyColor = colors.dimmed,
}: ProgressBarProps): React.ReactElement {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round(width * (clampedPercent / 100));
  const empty = width - filled;

  return (
    <Box flexDirection="row">
      {label && <Text>{label} </Text>}
      <Text color={filledColor}>{filledChar.repeat(filled)}</Text>
      <Text color={emptyColor}>{emptyChar.repeat(empty)}</Text>
      {showPercent && <Text> {Math.round(clampedPercent)}%</Text>}
    </Box>
  );
}

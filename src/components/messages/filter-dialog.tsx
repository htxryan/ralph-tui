import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';
import {
  MessageFilterType,
  ALL_MESSAGE_FILTER_TYPES,
  MESSAGE_FILTER_LABELS,
} from '../../lib/types.js';
import { DIALOG_BG_COLOR, createDialogHelpers } from '../../lib/dialog-utils.js';

export interface FilterDialogProps {
  /** Currently enabled filter types */
  enabledFilters: Set<MessageFilterType>;
  /** Callback when filters change */
  onFiltersChange: (filters: Set<MessageFilterType>) => void;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Width of the dialog */
  width?: number;
  /** Count of messages per filter type (computed externally for performance) */
  messageCounts?: Record<MessageFilterType, number>;
}

// Padding on each side
const PADDING = 1;

// Filter type to color mapping - each type has a DISTINCT color
const filterColors: Record<MessageFilterType, string> = {
  'initial-prompt': colors.initialPrompt,
  'user': colors.user,
  'thinking': colors.thinking,
  'tool': colors.tool,
  'assistant': colors.assistant,
  'subagent': colors.subagent,
  'system': colors.system,
  'result': colors.result,
};

export function FilterDialog({
  enabledFilters,
  onFiltersChange,
  onClose,
  width = 60,
  messageCounts,
}: FilterDialogProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const helpers = useMemo(() => createDialogHelpers(width, PADDING), [width]);
  const { emptyLine, contentWidth, rightPad } = helpers;

  const toggleFilter = useCallback((filterType: MessageFilterType) => {
    const newFilters = new Set(enabledFilters);
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType);
    } else {
      newFilters.add(filterType);
    }
    onFiltersChange(newFilters);
  }, [enabledFilters, onFiltersChange]);

  const selectAll = useCallback(() => {
    onFiltersChange(new Set(ALL_MESSAGE_FILTER_TYPES));
  }, [onFiltersChange]);

  const selectNone = useCallback(() => {
    onFiltersChange(new Set());
  }, [onFiltersChange]);

  const selectSubagentsOnly = useCallback(() => {
    onFiltersChange(new Set(['subagent'] as MessageFilterType[]));
  }, [onFiltersChange]);

  useInput((input, key) => {
    // Close dialog
    if (key.escape || input === 'f') {
      onClose();
      return;
    }

    // Navigate up/down
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(ALL_MESSAGE_FILTER_TYPES.length - 1, prev + 1));
      return;
    }

    // Toggle selected filter
    if (key.return || input === ' ') {
      toggleFilter(ALL_MESSAGE_FILTER_TYPES[selectedIndex]);
      return;
    }

    // Quick toggle with number keys (1-8)
    const num = parseInt(input);
    if (num >= 1 && num <= ALL_MESSAGE_FILTER_TYPES.length) {
      toggleFilter(ALL_MESSAGE_FILTER_TYPES[num - 1]);
      return;
    }

    // Select all (a)
    if (input === 'a') {
      selectAll();
      return;
    }

    // Select none (n)
    if (input === 'n') {
      selectNone();
      return;
    }

    // Subagents only (u) - using 'u' to avoid conflict with global 's' (Start) shortcut
    if (input === 'u') {
      selectSubagentsOnly();
      return;
    }
  });

  const enabledCount = enabledFilters.size;
  const totalCount = ALL_MESSAGE_FILTER_TYPES.length;

  // Build header line content
  const headerLeft = 'Filter Messages';
  const headerRight = `${enabledCount}/${totalCount} enabled`;
  const headerSpacing = Math.max(1, contentWidth - headerLeft.length - headerRight.length);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.selected}
      width={width}
    >
      {/* Header */}
      <Text backgroundColor={DIALOG_BG_COLOR}>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
        <Text bold color={colors.header} backgroundColor={DIALOG_BG_COLOR}>
          {headerLeft}
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(headerSpacing)}</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
          {headerRight}
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
      </Text>

      {/* Empty line after header */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Filter options */}
      {ALL_MESSAGE_FILTER_TYPES.map((filterType, index) => {
        const isEnabled = enabledFilters.has(filterType);
        const isSelected = index === selectedIndex;
        const label = MESSAGE_FILTER_LABELS[filterType];
        const typeColor = filterColors[filterType];
        const count = messageCounts?.[filterType] ?? 0;

        // Build line content for width calculation
        const selector = isSelected ? '▸ ' : '  ';
        const numPrefix = `${index + 1}. `;
        const checkbox = isEnabled ? '[✓]' : '[ ]';
        const countStr = ` (${count})`;
        const lineContentWidth = selector.length + numPrefix.length + checkbox.length + 1 + label.length + countStr.length;

        return (
          <Text key={filterType} backgroundColor={DIALOG_BG_COLOR}>
            <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
            <Text color={isSelected ? colors.selected : colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {selector}
            </Text>
            <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {numPrefix}
            </Text>
            <Text color={isEnabled ? colors.success : colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {checkbox}
            </Text>
            <Text color={typeColor} backgroundColor={DIALOG_BG_COLOR}>
              {' '}{label}
            </Text>
            <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {countStr}
            </Text>
            <Text backgroundColor={DIALOG_BG_COLOR}>
              {rightPad(lineContentWidth)}
            </Text>
          </Text>
        );
      })}

      {/* Empty line before footer */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Footer shortcuts */}
      <Text backgroundColor={DIALOG_BG_COLOR}>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>Space/Enter: Toggle</Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{'  '}</Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>A</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>ll s</Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>U</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>bagents </Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>N</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>one </Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>F/Esc</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>: Close</Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
      </Text>
    </Box>
  );
}

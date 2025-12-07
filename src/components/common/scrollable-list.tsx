import React, { useState, useEffect, ReactNode } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';

export interface ScrollableListProps<T> {
  items: T[];
  renderItem: (item: T, isSelected: boolean, index: number) => ReactNode;
  windowSize?: number;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onSelect?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
}

export function ScrollableList<T>({
  items,
  renderItem,
  windowSize = 15,
  selectedIndex,
  onSelectedIndexChange,
  onSelect,
  keyExtractor = (_, i) => String(i),
  emptyMessage = 'No items',
}: ScrollableListProps<T>): React.ReactElement {
  const [windowStart, setWindowStart] = useState(0);

  // Adjust window when selected index changes
  useEffect(() => {
    if (selectedIndex < windowStart) {
      setWindowStart(selectedIndex);
    } else if (selectedIndex >= windowStart + windowSize) {
      setWindowStart(selectedIndex - windowSize + 1);
    }
  }, [selectedIndex, windowStart, windowSize]);

  useInput((input, key) => {
    if (items.length === 0) return;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      onSelectedIndexChange(newIndex);
    }
    if (key.downArrow) {
      const newIndex = Math.min(items.length - 1, selectedIndex + 1);
      onSelectedIndexChange(newIndex);
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - windowSize);
      onSelectedIndexChange(newIndex);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(items.length - 1, selectedIndex + windowSize);
      onSelectedIndexChange(newIndex);
      setWindowStart(Math.min(Math.max(0, items.length - windowSize), windowStart + windowSize));
    }
    if (key.return && onSelect) {
      onSelect(items[selectedIndex], selectedIndex);
    }
  });

  if (items.length === 0) {
    return (
      <Box>
        <Text color={colors.dimmed}>{emptyMessage}</Text>
      </Box>
    );
  }

  const visibleItems = items.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < items.length;

  return (
    <Box flexDirection="column">
      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {windowStart} more above
        </Text>
      )}
      {visibleItems.map((item, i) => {
        const actualIndex = windowStart + i;
        return (
          <Box key={keyExtractor(item, actualIndex)}>
            {renderItem(item, actualIndex === selectedIndex, actualIndex)}
          </Box>
        );
      })}
      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {items.length - windowStart - windowSize} more below
        </Text>
      )}
    </Box>
  );
}

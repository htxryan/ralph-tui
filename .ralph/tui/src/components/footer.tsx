import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';
import {
  Shortcut,
  fitShortcutsToWidth,
  moreShortcut,
  interruptModeShortcuts,
  sessionPickerShortcuts,
} from '../lib/shortcuts.js';

export interface FooterProps {
  /** List of shortcuts to display */
  shortcuts: Shortcut[];
  /** Terminal width for responsive truncation */
  width?: number;
  /** Whether interrupt mode is active */
  isInterruptMode?: boolean;
  /** Whether session picker is open */
  isSessionPickerOpen?: boolean;
}

// Fixed overhead: border (2) + paddingX (2) + "Ralph TUI v1.0" (14) + gap (2)
const FIXED_OVERHEAD = 20;

export function Footer({
  shortcuts,
  width = 80,
  isInterruptMode = false,
  isSessionPickerOpen = false,
}: FooterProps): React.ReactElement {
  // In session picker mode, show minimal shortcuts
  if (isSessionPickerOpen) {
    return (
      <Box
        flexDirection="row"
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor={colors.border}
        paddingX={1}
        justifyContent="space-between"
      >
        <Box flexDirection="row">
          {sessionPickerShortcuts.map((shortcut) => (
            <Box key={shortcut.key} marginRight={2}>
              <Text color={shortcut.color || colors.subagent} bold>
                {shortcut.key}
              </Text>
              <Text color={colors.dimmed}> {shortcut.description}</Text>
            </Box>
          ))}
        </Box>
        <Text color={colors.selected}>Session Picker</Text>
      </Box>
    );
  }

  // In interrupt mode, show minimal shortcuts
  if (isInterruptMode) {
    return (
      <Box
        flexDirection="row"
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor={colors.border}
        paddingX={1}
        justifyContent="space-between"
      >
        <Box flexDirection="row">
          {interruptModeShortcuts.map((shortcut) => (
            <Box key={shortcut.key} marginRight={2}>
              <Text color={shortcut.color || colors.subagent} bold>
                {shortcut.key}
              </Text>
              <Text color={colors.dimmed}> {shortcut.description}</Text>
            </Box>
          ))}
        </Box>
        <Text color={colors.user}>Interrupt Mode</Text>
      </Box>
    );
  }

  // Calculate available width for shortcuts
  const availableWidth = Math.max(20, width - FIXED_OVERHEAD);

  // Fit shortcuts to available width
  const { visible, truncated } = useMemo(
    () => fitShortcutsToWidth(shortcuts, availableWidth),
    [shortcuts, availableWidth]
  );

  // Build the final list of shortcuts to display
  const displayShortcuts = truncated ? [...visible, moreShortcut] : visible;

  return (
    <Box
      flexDirection="row"
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box flexDirection="row">
        {displayShortcuts.map((shortcut, index) => (
          <Box key={`${shortcut.key}-${index}`} marginRight={2}>
            <Text color={shortcut.color || colors.subagent} bold>
              {shortcut.key}
            </Text>
            <Text color={colors.dimmed}> {shortcut.description}</Text>
          </Box>
        ))}
      </Box>
      <Text color={colors.dimmed}>Ralph TUI v1.0</Text>
    </Box>
  );
}

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';
import { Shortcut } from '../lib/shortcuts.js';
import { DIALOG_BG_COLOR, createDialogHelpers } from '../lib/dialog-utils.js';

export interface ShortcutsDialogProps {
  /** List of shortcuts to display */
  shortcuts: Shortcut[];
  /** Title for the dialog */
  title?: string;
  /** Width of the dialog box */
  width?: number;
}

// Padding on each side
const PADDING = 2;

/**
 * Ephemeral overlay dialog showing all keyboard shortcuts.
 * This component is purely visual - key handling is done by the parent.
 * Pressing ANY key should dismiss this dialog AND execute that key's action.
 *
 * Uses solid background colors on all Text elements to prevent
 * underlying content from showing through in the terminal overlay.
 * Every line must fill the full width with backgroundColor, including padding areas.
 */
export function ShortcutsDialog({
  shortcuts,
  title = 'Keyboard Shortcuts',
  width = 40,
}: ShortcutsDialogProps): React.ReactElement {
  const helpers = useMemo(() => createDialogHelpers(width, PADDING), [width]);
  const { emptyLine, centeredLine, contentWidth, rightPad } = helpers;

  // Calculate the maximum key width for alignment
  const maxKeyWidth = Math.max(...shortcuts.map(s => s.key.length));

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.selected}
      width={width}
    >
      {/* Empty line for top padding */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Title - centered with full background */}
      <Text bold color={colors.header} backgroundColor={DIALOG_BG_COLOR}>
        {centeredLine(title)}
      </Text>

      {/* Empty line after title */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Shortcuts list - each row fills full width */}
      {shortcuts.map((shortcut, index) => {
        const keyText = shortcut.key.padEnd(maxKeyWidth);
        const descText = shortcut.description;
        const rowContentWidth = keyText.length + 2 + descText.length; // key + '  ' + description

        return (
          <Text key={`${shortcut.key}-${index}`} backgroundColor={DIALOG_BG_COLOR}>
            <Text backgroundColor={DIALOG_BG_COLOR}>{helpers.leftPad()}</Text>
            <Text color={shortcut.color || colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>
              {keyText}
            </Text>
            <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {'  '}{descText}
            </Text>
            <Text backgroundColor={DIALOG_BG_COLOR}>
              {rightPad(rowContentWidth)}
            </Text>
          </Text>
        );
      })}

      {/* Empty line before footer */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Footer hint - centered with full background */}
      <Text color={colors.dimmed} italic backgroundColor={DIALOG_BG_COLOR}>
        {centeredLine('Press any key to dismiss')}
      </Text>

      {/* Empty line for bottom padding */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>
    </Box>
  );
}

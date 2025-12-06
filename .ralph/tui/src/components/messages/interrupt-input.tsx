import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../lib/colors.js';

export interface InterruptInputProps {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
  onKillSession?: () => void;
  width?: number;
}

export function InterruptInput({
  onSubmit,
  onCancel,
  onKillSession,
  width = 80,
}: InterruptInputProps): React.ReactElement {
  const [value, setValue] = useState('');

  // Custom controlled text input using useInput
  // This gives us full control over what characters are accepted
  useInput((input, key) => {
    // Escape to cancel
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+K to kill the current session (works cross-platform)
    if (key.ctrl && input === 'k' && onKillSession) {
      onKillSession();
      return;
    }

    // Ctrl+C to quit (let it propagate, but don't add to input)
    if (key.ctrl && input === 'c') {
      return;
    }

    // Enter to submit
    if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
      }
      return;
    }

    // Backspace/Delete
    if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
      return;
    }

    // Ignore other control key combinations and special keys
    if (key.ctrl || key.meta || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.tab) {
      return;
    }

    // Add printable character to input
    if (input && input.length === 1) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.user}
      paddingX={1}
      width={width - 2}
    >
      <Box marginBottom={1}>
        <Text color={colors.user} bold>
          Interrupt Session
        </Text>
        <Text color={colors.dimmed}> — Provide steering guidance</Text>
      </Box>

      <Box flexDirection="row" alignItems="center">
        <Text color={colors.user}>▶ </Text>
        <Box flexGrow={1}>
          {value ? (
            <Text>{value}<Text color={colors.user}>▌</Text></Text>
          ) : (
            <Text color={colors.dimmed}>Enter feedback for the AI agent...<Text color={colors.user}>▌</Text></Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.dimmed}>
          <Text color={colors.success} bold>Enter</Text> submit
          {' • '}
          <Text color={colors.error} bold>Esc</Text> cancel
          {onKillSession && (
            <>
              {' • '}
              <Text color={colors.warning} bold>^K</Text> kill session first
            </>
          )}
        </Text>
      </Box>
    </Box>
  );
}

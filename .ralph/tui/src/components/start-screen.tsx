import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';

// Big bubble-letter RALPH ASCII art
const RALPH_ASCII = `
 ██████╗   █████╗  ██╗      ██████╗  ██╗  ██╗
 ██╔══██╗ ██╔══██╗ ██║      ██╔══██╗ ██║  ██║
 ██████╔╝ ███████║ ██║      ██████╔╝ ███████║
 ██╔══██╗ ██╔══██║ ██║      ██╔═══╝  ██╔══██║
 ██║  ██║ ██║  ██║ ███████╗ ██║      ██║  ██║
 ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝      ╚═╝  ╚═╝
`;

// Fun taglines to randomly pick from
const TAGLINES = [
  'Your Autonomous Agent Awaits',
  'Ready to Ralph and Roll',
  'Lets Get This Party Started',
  'Autonomy at Your Fingertips',
  'Your AI Sidekick is Standing By',
];

export interface StartScreenProps {
  /** Height of the container for centering */
  height?: number;
  /** Width of the container */
  width?: number;
}

export function StartScreen({
  height = 30,
  width = 100,
}: StartScreenProps): React.ReactElement {
  // Pick a random tagline (stable for component lifetime)
  const [tagline] = React.useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
  );

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={height}
      width={width}
    >
      {/* Big ASCII Art Logo */}
      <Box flexDirection="column" alignItems="center">
        <Text color={colors.subagent} bold>
          {RALPH_ASCII}
        </Text>
      </Box>

      {/* Tagline */}
      <Box marginTop={1}>
        <Text color={colors.dimmed} italic>
          ✨ {tagline} ✨
        </Text>
      </Box>

      {/* Call to Action Box */}
      <Box
        flexDirection="column"
        alignItems="center"
        marginTop={2}
        borderStyle="round"
        borderColor={colors.subagent}
        paddingX={4}
        paddingY={1}
      >
        <Box>
          <Text color={colors.header}>Press </Text>
          <Text color={colors.subagent} bold inverse>
            {' '}S{' '}
          </Text>
          <Text color={colors.header}> to start a new session</Text>
        </Box>
      </Box>

      {/* Additional hints */}
      <Box marginTop={2} flexDirection="column" alignItems="center">
        <Box>
          <Text color={colors.dimmed}>
            Press <Text color={colors.selected} bold>P</Text> to browse past sessions
          </Text>
        </Box>
        <Box marginTop={0}>
          <Text color={colors.dimmed}>
            Press <Text color={colors.user} bold>Q</Text> to quit
          </Text>
        </Box>
      </Box>

      {/* Robot decorator */}
      <Box marginTop={2}>
        <Text color={colors.dimmed}>
          {'🤖 '}
          <Text color={colors.dimmed}>─────────────────────────────</Text>
          {' 🤖'}
        </Text>
      </Box>
    </Box>
  );
}

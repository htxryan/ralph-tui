import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';
import { type TaskManagementConfig } from '../lib/task-adapters/types.js';
import { getProviderDisplayName } from '../lib/task-adapters/factory.js';
import { ProjectInfo } from '../hooks/use-projects.js';

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
  'All Systems Ralph',
  'Your Friendly Neighborhood Agent',
  'Insert Task, Receive Miracles',
  'Making PRs While You Sleep',
  'Ctrl+Alt+Ralph',
  'One Small Step for Dev, One Giant Ralph',
  'May the Forks Be With You',
  'Trust the Process, Fear the Backlog',
  'Warning: May Cause Excessive Shipping',
  '404 Excuses Not Found',
  'Have Agent, Will Travel',
  'git push origin awesome',
  'To Infinity and Beyond the Backlog',
  'Ship It Like Its Hot',
  'With Great Prompts Come Great Responses',
  'Achievement Unlocked: Ralph Mode',
  'Ralph Goes Brrr',
  'Here to Chew Bubblegum and Write Code',
  'Powered by Vibes and Transformers',
];

export interface StartScreenProps {
  /** Height of the container for centering */
  height?: number;
  /** Width of the container */
  width?: number;
  /** Task management configuration for display */
  taskConfig?: TaskManagementConfig;
  /** Active project (if selected) */
  activeProject?: ProjectInfo | null;
}

/**
 * Get a human-readable description of the task manager configuration
 */
function getTaskManagerInfo(config?: TaskManagementConfig): string | null {
  if (!config) return null;

  const providerName = getProviderDisplayName(config.provider);
  const providerConfig = config.provider_config;

  switch (config.provider) {
    case 'github-issues': {
      const repo = providerConfig?.github_repo;
      const label = providerConfig?.label_filter;
      if (repo) {
        const labelInfo = label ? ` (label: ${label})` : '';
        return `${providerName}: ${repo}${labelInfo}`;
      }
      const labelInfo = label ? ` (label: ${label})` : ' (auto-detect repo)';
      return `${providerName}${labelInfo}`;
    }
    case 'vibe-kanban': {
      const projectId = providerConfig?.vibe_kanban_project_id;
      if (projectId) {
        return `${providerName}: ${projectId}`;
      }
      return `${providerName} (auto-detect project)`;
    }
    case 'jira': {
      const host = providerConfig?.jira_host;
      const project = providerConfig?.jira_project;
      if (host && project) {
        return `${providerName}: ${project} @ ${host}`;
      }
      return providerName;
    }
    case 'linear': {
      const team = providerConfig?.linear_team;
      if (team) {
        return `${providerName}: ${team}`;
      }
      return providerName;
    }
    default:
      return providerName;
  }
}

export function StartScreen({
  height = 30,
  width = 100,
  taskConfig,
  activeProject,
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

      {/* Project and Task Manager Info */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        {activeProject && (
          <Box>
            <Text color={colors.dimmed}>
              Project: <Text color={colors.subagent} bold>{activeProject.displayName || activeProject.name}</Text>
            </Text>
          </Box>
        )}
        {!activeProject && (
          <Box>
            <Text color={colors.dimmed}>
              Project: <Text color={colors.error}>None selected</Text>
              <Text color={colors.dimmed}> - Press </Text>
              <Text color={colors.selected} bold>J</Text>
              <Text color={colors.dimmed}> to select</Text>
            </Text>
          </Box>
        )}
        {taskConfig && (
          <Box>
            <Text color={colors.dimmed}>
              Task Manager: <Text color={colors.selected}>{getTaskManagerInfo(taskConfig)}</Text>
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

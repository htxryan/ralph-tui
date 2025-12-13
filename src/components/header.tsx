import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../lib/colors.js';
import { Assignment, KanbanTask, SessionStats } from '../lib/types.js';
import { formatTokens, formatDuration } from '../lib/parser.js';
import { Spinner } from './common/spinner.js';
import { ProjectInfo } from '../hooks/use-projects.js';

/**
 * Check if a date is valid
 */
function isValidDate(date: Date | null | undefined): date is Date {
  return date != null && !isNaN(date.getTime());
}

/**
 * Calculate duration between two dates
 * Returns '--' if either date is invalid
 */
function calculateDurationBetween(start: Date | null | undefined, end: Date | null | undefined): string {
  if (!isValidDate(start) || !isValidDate(end)) return '--';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0 || isNaN(diffMs)) return '--';

  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export interface HeaderProps {
  task: KanbanTask | null;
  stats: SessionStats;
  isLoading?: boolean;
  error?: Error | null;
  isRalphRunning?: boolean;
  assignment?: Assignment | null;
  /** Error from Ralph process (start/stop/resume failures) */
  ralphError?: Error | null;
  /** Currently active project */
  activeProject?: ProjectInfo | null;
}

export function Header({
  task,
  stats,
  isLoading = false,
  error = null,
  isRalphRunning = false,
  assignment = null,
  ralphError = null,
  activeProject = null,
}: HeaderProps): React.ReactElement {
  // Combine errors - ralphError takes precedence for display
  const displayError = ralphError || error;
  // Status: Error (red), Running (green), Idle (dimmed)
  const statusColor = displayError ? colors.error : isRalphRunning ? colors.running : colors.dimmed;

  // Compute dynamic status text:
  // - Error: Show "Error"
  // - Running + no next_step: "Running - Orchestrator"
  // - Running + next_step: "Running - Executing"
  // - Idle: "Idle"
  let statusText = 'Idle';
  if (displayError) {
    statusText = 'Error';
  } else if (isRalphRunning) {
    if (assignment?.next_step) {
      statusText = 'Running - Executing';
    } else {
      statusText = 'Running - Orchestrator';
    }
  }

  // Calculate elapsed duration - live if running, fixed if ended
  const hasValidStartTime = isValidDate(stats.startTime);
  const elapsedDuration = hasValidStartTime
    ? isRalphRunning
      ? formatDuration(stats.startTime)
      : calculateDurationBetween(stats.startTime, stats.endTime)
    : '--';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.border}
      paddingX={1}
    >
      {/* Top row: Status + Title */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text color={statusColor} bold>
            {isLoading ? <Spinner /> : icons.assistant}
          </Text>
          <Text> </Text>
          <Text color={colors.header} bold>
            Ralph TUI
          </Text>
          <Text color={colors.dimmed}> | </Text>
          <Text color={statusColor}>{statusText}</Text>
          {activeProject && (
            <>
              <Text color={colors.dimmed}> | </Text>
              <Text color={colors.subagent}>
                {activeProject.displayName || activeProject.name}
              </Text>
            </>
          )}
        </Box>

        {/* Token counter */}
        <Box flexDirection="row">
          <Text color={colors.dimmed}>Tokens: </Text>
          <Text color={colors.user}>{formatTokens(stats.totalTokens.input)}</Text>
          <Text color={colors.dimmed}> in</Text>
          {stats.totalTokens.cacheRead > 0 && (
            <Text color={colors.dimmed}> ({formatTokens(stats.totalTokens.cacheRead)} cached)</Text>
          )}
          <Text color={colors.dimmed}> / </Text>
          <Text color={colors.user}>{formatTokens(stats.totalTokens.output)}</Text>
          <Text color={colors.dimmed}> out</Text>
        </Box>
      </Box>

      {/* Second row: Task + Stats */}
      <Box flexDirection="row" justifyContent="space-between">
        {/* Task summary */}
        <Box flexDirection="row">
          {task?.title ? (
            <>
              <Text color={colors.subagent} bold>
                {task.id}
              </Text>
              <Text color={colors.dimmed}>: </Text>
              <Text color={colors.header}>
                {task.title.length > 50 ? task.title.slice(0, 47) + '...' : task.title}
              </Text>
              <Text color={colors.dimmed}> [</Text>
              <Text color={colors[task.status as keyof typeof colors] || colors.dimmed}>
                {task.status ?? 'unknown'}
              </Text>
              <Text color={colors.dimmed}>]</Text>
            </>
          ) : (
            <Text color={colors.dimmed}>No task assigned</Text>
          )}
        </Box>

        {/* Session stats */}
        <Box flexDirection="row">
          <Text color={colors.dimmed}>Tools: </Text>
          <Text>{stats.toolCallCount}</Text>
          <Text color={colors.dimmed}> | Msgs: </Text>
          <Text>{stats.messageCount}</Text>
          <Text color={colors.dimmed}> | Time: </Text>
          <Text>{elapsedDuration}</Text>
          {stats.errorCount > 0 && (
            <>
              <Text color={colors.dimmed}> | </Text>
              <Text color={colors.error}>Errors: {stats.errorCount}</Text>
            </>
          )}
        </Box>
      </Box>

      {/* Error message row - only shown when there's an error */}
      {displayError && (
        <Box flexDirection="row" marginTop={0}>
          <Text color={colors.error} bold>
            {icons.error || '✗'} {displayError.message.split('\n')[0]}
          </Text>
        </Box>
      )}
    </Box>
  );
}

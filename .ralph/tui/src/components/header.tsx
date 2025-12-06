import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../lib/colors.js';
import { Assignment, BDIssue, SessionStats } from '../lib/types.js';
import { formatTokens, formatDuration, extractWorkflowName } from '../lib/parser.js';
import { Spinner } from './common/spinner.js';

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
  issue: BDIssue | null;
  stats: SessionStats;
  isLoading?: boolean;
  error?: Error | null;
  isRalphRunning?: boolean;
  assignment?: Assignment | null;
}

export function Header({
  issue,
  stats,
  isLoading = false,
  error = null,
  isRalphRunning = false,
  assignment = null,
}: HeaderProps): React.ReactElement {
  // Status: Error (red), Running (green), Idle (dimmed)
  const statusColor = error ? colors.error : isRalphRunning ? colors.running : colors.dimmed;

  // Compute dynamic status text:
  // - Error: Show "Error"
  // - Running + no workflow: "Running - Orchestrator"
  // - Running + workflow: "Running - <workflow name>"
  // - Idle: "Idle"
  let statusText = 'Idle';
  if (error) {
    statusText = 'Error';
  } else if (isRalphRunning) {
    const workflowName = extractWorkflowName(assignment?.workflow);
    if (workflowName) {
      statusText = `Running - ${workflowName}`;
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
        </Box>

        {/* Token counter */}
        <Box flexDirection="row">
          <Text color={colors.dimmed}>Tokens: </Text>
          <Text color={colors.user}>
            {formatTokens(stats.totalTokens.input + stats.totalTokens.output)}
          </Text>
          <Text color={colors.dimmed}> ({formatTokens(stats.totalTokens.input)}in/{formatTokens(stats.totalTokens.output)}out)</Text>
        </Box>
      </Box>

      {/* Second row: BD Issue + Stats */}
      <Box flexDirection="row" justifyContent="space-between">
        {/* BD Issue summary */}
        <Box flexDirection="row">
          {issue?.title ? (
            <>
              <Text color={colors.subagent} bold>
                {issue.id}
              </Text>
              <Text color={colors.dimmed}>: </Text>
              <Text color={colors.header}>
                {issue.title.length > 50 ? issue.title.slice(0, 47) + '...' : issue.title}
              </Text>
              <Text color={colors.dimmed}> [</Text>
              <Text color={colors[issue.status as keyof typeof colors] || colors.dimmed}>
                {issue.status ?? 'unknown'}
              </Text>
              <Text color={colors.dimmed}>]</Text>
            </>
          ) : (
            <Text color={colors.dimmed}>No BD issue assigned</Text>
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
    </Box>
  );
}

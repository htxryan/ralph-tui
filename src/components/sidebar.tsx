import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../lib/colors.js';
import { Todo, KanbanTask, SessionStats } from '../lib/types.js';
import { formatTokens, formatDuration } from '../lib/parser.js';
import { ProgressBar } from './common/progress-bar.js';

export interface SidebarProps {
  todos: Todo[];
  task: KanbanTask | null;
  stats: SessionStats;
  width?: number;
  isRalphRunning?: boolean;
}

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

export function Sidebar({
  todos,
  task,
  stats,
  width = 24,
  isRalphRunning = false,
}: SidebarProps): React.ReactElement {
  // Calculate todo progress
  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;
  const pending = todos.filter(t => t.status === 'pending').length;
  const total = todos.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

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
      width={width}
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
    >
      {/* Todos section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={colors.header}>
          {'\uD83D\uDCCB'} Todos
        </Text>
        <ProgressBar percent={percent} width={width - 8} />
        <Text color={colors.dimmed}>
          {completed}/{total} completed
        </Text>
        {inProgress > 0 && (
          <Text color={colors.running}>
            {icons.running} {inProgress} in progress
          </Text>
        )}
      </Box>

      {/* Session Stats section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={colors.header}>
          {'\uD83D\uDCCA'} Session
        </Text>
        <Text>
          <Text color={colors.dimmed}>Tokens: </Text>
          <Text>{formatTokens(stats.totalTokens.input + stats.totalTokens.output)}</Text>
        </Text>
        <Text>
          <Text color={colors.dimmed}>Tools: </Text>
          <Text>{stats.toolCallCount} calls</Text>
        </Text>
        <Text>
          <Text color={colors.dimmed}>Time: </Text>
          <Text>{elapsedDuration}</Text>
        </Text>
      </Box>

      {/* Task section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={colors.header}>
          {'\uD83C\uDFAF'} Task
        </Text>
        {task ? (
          <>
            <Text color={colors.subagent}>
              {task.id.length > width - 4
                ? task.id.slice(0, width - 7) + '...'
                : task.id}
            </Text>
            <Text color={colors.dimmed}>
              {task.title.length > width - 4
                ? task.title.slice(0, width - 7) + '...'
                : task.title}
            </Text>
            <Text color={colors[task.status as keyof typeof colors] || colors.dimmed}>
              {task.status}
            </Text>
          </>
        ) : (
          <Text color={colors.dimmed}>None assigned</Text>
        )}
      </Box>

      {/* Errors section */}
      {stats.errorCount > 0 && (
        <Box flexDirection="column">
          <Text bold color={colors.error}>
            {'\u26A0\uFE0F'} Errors: {stats.errorCount}
          </Text>
        </Box>
      )}
    </Box>
  );
}

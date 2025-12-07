import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { SessionStats } from '../../lib/types.js';
import { formatTokens, formatDuration } from '../../lib/parser.js';

export interface StatsViewProps {
  /** Session stats scoped to current/last session */
  sessionStats: SessionStats;
  /** Whether Ralph is currently running (active session) */
  isRalphRunning: boolean;
  /** Current working directory */
  cwd: string;
  /** Height in rows for the view */
  height?: number;
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date | null | undefined): date is Date {
  return date != null && !isNaN(date.getTime());
}

/**
 * Format a date as a sortable timestamp: YYYY-MM-DD HH:MM:SS
 * Returns null if the date is invalid
 */
function formatSortableTimestamp(date: Date | null | undefined): string | null {
  if (!isValidDate(date)) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

interface StatRowProps {
  label: string;
  value: string | number;
  icon?: string;
  valueColor?: string;
}

function StatRow({ label, value, icon, valueColor }: StatRowProps): React.ReactElement {
  return (
    <Box flexDirection="row" marginBottom={0}>
      <Text color={colors.dimmed}>
        {icon ? `${icon} ` : ''}{label}:{' '}
      </Text>
      <Text color={valueColor || colors.header} bold>
        {value}
      </Text>
    </Box>
  );
}

export function StatsView({
  sessionStats,
  isRalphRunning,
  cwd,
  height = 30,
}: StatsViewProps): React.ReactElement {
  const hasSession = sessionStats.messageCount > 0;
  const hasValidStartTime = isValidDate(sessionStats.startTime);
  const sessionStatus = isRalphRunning ? 'Active' : hasSession ? 'Ended' : 'No Session';
  const statusColor = isRalphRunning ? colors.running : hasSession ? colors.dimmed : colors.dimmed;

  // Calculate elapsed duration - live if running, fixed if ended
  const elapsedDuration = hasValidStartTime
    ? isRalphRunning
      ? formatDuration(sessionStats.startTime)
      : calculateDurationBetween(sessionStats.startTime, sessionStats.endTime)
    : '--';

  return (
    <Box flexDirection="column" height={height} paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.header}>
          {'\uD83D\uDCCA'} Session Statistics
        </Text>
        <Text color={colors.dimmed}> - </Text>
        <Text color={statusColor} bold>
          {sessionStatus}
        </Text>
        {isRalphRunning && (
          <Text color={colors.running}> {icons.running}</Text>
        )}
      </Box>

      {/* Session Timing Section */}
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={colors.border} paddingX={1} paddingY={0}>
        <Text bold color={colors.subagent} underline>
          Timing
        </Text>
        <StatRow
          label="Started"
          value={formatSortableTimestamp(sessionStats.startTime) ?? '--'}
          icon={'\uD83D\uDD51'}
        />
        {!isRalphRunning && isValidDate(sessionStats.endTime) && (
          <StatRow
            label="Ended"
            value={formatSortableTimestamp(sessionStats.endTime) ?? '--'}
            icon={'\uD83C\uDFC1'}
          />
        )}
        <StatRow
          label="Duration"
          value={elapsedDuration}
          icon={'\u23F1'}
          valueColor={isRalphRunning ? colors.running : colors.header}
        />
      </Box>

      {/* Messages & Tools Section */}
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={colors.border} paddingX={1} paddingY={0}>
        <Text bold color={colors.subagent} underline>
          Activity
        </Text>
        <StatRow
          label="Messages"
          value={sessionStats.messageCount}
          icon={'\uD83D\uDCAC'}
        />
        <StatRow
          label="Tool Calls"
          value={sessionStats.toolCallCount}
          icon={'\uD83D\uDD27'}
        />
        <StatRow
          label="Subagents"
          value={sessionStats.subagentCount}
          icon={'\uD83E\uDD16'}
        />
        {sessionStats.errorCount > 0 && (
          <StatRow
            label="Errors"
            value={sessionStats.errorCount}
            icon={'\u26A0\uFE0F'}
            valueColor={colors.error}
          />
        )}
      </Box>

      {/* Token Usage Section */}
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={colors.border} paddingX={1} paddingY={0}>
        <Text bold color={colors.subagent} underline>
          Token Usage
        </Text>
        <StatRow
          label="Input"
          value={formatTokens(sessionStats.totalTokens.input)}
          icon={'\u2B07'}
        />
        {sessionStats.totalTokens.cacheRead > 0 && (
          <StatRow
            label="  └ From cache"
            value={formatTokens(sessionStats.totalTokens.cacheRead)}
            icon={'\u21BA'}
            valueColor={colors.dimmed}
          />
        )}
        {sessionStats.totalTokens.cacheCreation > 0 && (
          <StatRow
            label="  └ Cached"
            value={formatTokens(sessionStats.totalTokens.cacheCreation)}
            icon={'\uD83D\uDCBE'}
            valueColor={colors.dimmed}
          />
        )}
        <StatRow
          label="Output"
          value={formatTokens(sessionStats.totalTokens.output)}
          icon={'\u2B06'}
        />
        <StatRow
          label="Total"
          value={formatTokens(sessionStats.totalTokens.input + sessionStats.totalTokens.output)}
          icon={'\u2211'}
          valueColor={colors.success}
        />
      </Box>

      {/* Environment Section */}
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={colors.border} paddingX={1} paddingY={0}>
        <Text bold color={colors.subagent} underline>
          Environment
        </Text>
        <StatRow
          label="Working Dir"
          value={cwd || process.cwd()}
          icon={'\uD83D\uDCC1'}
        />
      </Box>

      {/* Empty state hint */}
      {!hasSession && (
        <Box marginTop={1}>
          <Text color={colors.dimmed}>
            Press <Text color={colors.success} bold>s</Text> to start a new Ralph session...
          </Text>
        </Box>
      )}
    </Box>
  );
}

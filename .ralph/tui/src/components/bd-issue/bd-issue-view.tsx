import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { BDIssue } from '../../lib/types.js';
import { Spinner } from '../common/spinner.js';

export interface BDIssueViewProps {
  issue: BDIssue | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  /** Height in rows for the view to fill */
  height?: number;
}

export function BDIssueView({
  issue,
  isLoading,
  error,
  onRefresh,
  height,
}: BDIssueViewProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input, key) => {
    if (input === 'r') {
      onRefresh();
    }
    if (key.upArrow) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    }
    if (key.downArrow) {
      setScrollOffset(scrollOffset + 1);
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Spinner label="Loading BD issue..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.error}>
          {icons.error} Error loading BD issue: {error.message}
        </Text>
        <Text color={colors.dimmed}>Press 'r' to refresh</Text>
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.dimmed}>No BD issue selected.</Text>
      </Box>
    );
  }

  const statusColor = colors[issue.status as keyof typeof colors] || colors.dimmed;
  const priorityColor = issue.priority
    ? colors[issue.priority as keyof typeof colors] || colors.dimmed
    : colors.dimmed;
  const typeEmoji =
    issue.type === 'bug'
      ? '\uD83D\uDC1B'
      : issue.type === 'feature'
      ? '\u2728'
      : '\uD83D\uDCCB';

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {/* Issue ID */}
      <Box
        borderStyle="double"
        borderColor={colors.subagent}
        paddingX={1}
        marginBottom={1}
      >
        <Text color={colors.subagent} bold>
          {issue.id}
        </Text>
      </Box>

      {/* Title */}
      <Text bold color={colors.header}>
        {issue.title}
      </Text>

      {/* Metadata row */}
      <Box flexDirection="row" marginY={1}>
        <Box marginRight={3}>
          <Text color={colors.dimmed}>Type: </Text>
          <Text>{typeEmoji} {issue.type}</Text>
        </Box>
        <Box marginRight={3}>
          <Text color={colors.dimmed}>Status: </Text>
          <Text color={statusColor} bold>
            {issue.status}
          </Text>
        </Box>
        {issue.priority && (
          <Box marginRight={3}>
            <Text color={colors.dimmed}>Priority: </Text>
            <Text color={priorityColor}>{issue.priority}</Text>
          </Box>
        )}
        {issue.assignee && (
          <Box>
            <Text color={colors.dimmed}>Assignee: </Text>
            <Text>{issue.assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Dates */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={colors.dimmed}>
          Created: {new Date(issue.created_at).toLocaleDateString()}
        </Text>
        <Text color={colors.dimmed}> | </Text>
        <Text color={colors.dimmed}>
          Updated: {new Date(issue.updated_at).toLocaleDateString()}
        </Text>
      </Box>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color={colors.dimmed}>Labels: </Text>
          {issue.labels.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <Text>, </Text>}
              <Text color={colors.user}>[{label}]</Text>
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Description */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.border}
        paddingX={1}
        marginY={1}
      >
        <Text bold color={colors.header}>Description:</Text>
        {issue.description ? (
          issue.description.split('\n').map((line, i) => (
            <Text key={i}>{line}</Text>
          ))
        ) : (
          <Text color={colors.dimmed}>No description provided.</Text>
        )}
      </Box>

      {/* Dependencies */}
      {((issue.blockers && issue.blockers.length > 0) ||
        (issue.blocks && issue.blocks.length > 0)) && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.border}
          paddingX={1}
          marginY={1}
        >
          <Text bold color={colors.header}>Dependencies:</Text>

          {issue.blockers && issue.blockers.length > 0 && (
            <Box flexDirection="column">
              <Text color={colors.dimmed}>
                {'\u2190'} Blocked by:
              </Text>
              {issue.blockers.map(blocker => (
                <Text key={blocker} color={colors.error}>
                  {'  '}{blocker}
                </Text>
              ))}
            </Box>
          )}

          {issue.blocks && issue.blocks.length > 0 && (
            <Box flexDirection="column">
              <Text color={colors.dimmed}>
                {'\u2192'} Blocks:
              </Text>
              {issue.blocks.map(blocked => (
                <Text key={blocked} color={colors.pending}>
                  {'  '}{blocked}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Comments */}
      {issue.comments && issue.comments.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.border}
          paddingX={1}
          marginY={1}
        >
          <Text bold color={colors.header}>
            Comments ({issue.comments.length}):
          </Text>
          {issue.comments.map((comment, i) => (
            <Box key={comment.id || i} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
              <Text color={colors.dimmed}>
                [{new Date(comment.created_at).toLocaleString()}]
                {comment.author && ` ${comment.author}`}
              </Text>
              <Text>{comment.content}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Help text */}
      <Text color={colors.dimmed}>Press 'r' to refresh</Text>
    </Box>
  );
}

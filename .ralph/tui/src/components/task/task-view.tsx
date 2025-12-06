import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { KanbanTask } from '../../lib/types.js';
import { Spinner } from '../common/spinner.js';

export interface TaskViewProps {
  task: KanbanTask | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  /** Height in rows for the view to fill */
  height?: number;
}

export function TaskView({
  task,
  isLoading,
  error,
  onRefresh,
  height,
}: TaskViewProps): React.ReactElement {
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
        <Spinner label="Loading task..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.error}>
          {icons.error} Error loading task: {error.message}
        </Text>
        <Text color={colors.dimmed}>Press 'r' to refresh</Text>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.dimmed}>No task selected.</Text>
      </Box>
    );
  }

  const statusColor = colors[task.status as keyof typeof colors] || colors.dimmed;
  const priorityColor = task.priority
    ? colors[task.priority as keyof typeof colors] || colors.dimmed
    : colors.dimmed;
  const typeEmoji =
    task.type === 'bug'
      ? '\uD83D\uDC1B'
      : task.type === 'feature'
      ? '\u2728'
      : '\uD83D\uDCCB';

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {/* Task ID */}
      <Box
        borderStyle="double"
        borderColor={colors.subagent}
        paddingX={1}
        marginBottom={1}
      >
        <Text color={colors.subagent} bold>
          {task.id}
        </Text>
      </Box>

      {/* Title */}
      <Text bold color={colors.header}>
        {task.title}
      </Text>

      {/* Metadata row */}
      <Box flexDirection="row" marginY={1}>
        <Box marginRight={3}>
          <Text color={colors.dimmed}>Type: </Text>
          <Text>{typeEmoji} {task.type}</Text>
        </Box>
        <Box marginRight={3}>
          <Text color={colors.dimmed}>Status: </Text>
          <Text color={statusColor} bold>
            {task.status}
          </Text>
        </Box>
        {task.priority && (
          <Box marginRight={3}>
            <Text color={colors.dimmed}>Priority: </Text>
            <Text color={priorityColor}>{task.priority}</Text>
          </Box>
        )}
        {task.assignee && (
          <Box>
            <Text color={colors.dimmed}>Assignee: </Text>
            <Text>{task.assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Dates */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={colors.dimmed}>
          Created: {new Date(task.created_at).toLocaleDateString()}
        </Text>
        <Text color={colors.dimmed}> | </Text>
        <Text color={colors.dimmed}>
          Updated: {new Date(task.updated_at).toLocaleDateString()}
        </Text>
      </Box>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <Box flexDirection="row" marginBottom={1}>
          <Text color={colors.dimmed}>Labels: </Text>
          {task.labels.map((label, i) => (
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
        {task.description ? (
          task.description.split('\n').map((line, i) => (
            <Text key={i}>{line}</Text>
          ))
        ) : (
          <Text color={colors.dimmed}>No description provided.</Text>
        )}
      </Box>

      {/* Dependencies */}
      {((task.blockers && task.blockers.length > 0) ||
        (task.blocks && task.blocks.length > 0)) && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.border}
          paddingX={1}
          marginY={1}
        >
          <Text bold color={colors.header}>Dependencies:</Text>

          {task.blockers && task.blockers.length > 0 && (
            <Box flexDirection="column">
              <Text color={colors.dimmed}>
                {'\u2190'} Blocked by:
              </Text>
              {task.blockers.map(blocker => (
                <Text key={blocker} color={colors.error}>
                  {'  '}{blocker}
                </Text>
              ))}
            </Box>
          )}

          {task.blocks && task.blocks.length > 0 && (
            <Box flexDirection="column">
              <Text color={colors.dimmed}>
                {'\u2192'} Blocks:
              </Text>
              {task.blocks.map(blocked => (
                <Text key={blocked} color={colors.pending}>
                  {'  '}{blocked}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Comments */}
      {task.comments && task.comments.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.border}
          paddingX={1}
          marginY={1}
        >
          <Text bold color={colors.header}>
            Comments ({task.comments.length}):
          </Text>
          {task.comments.map((comment, i) => (
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

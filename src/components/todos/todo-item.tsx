import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { Todo } from '../../lib/types.js';
import { truncate } from '../../lib/parser.js';

export interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
}

export function TodoItem({ todo, isSelected }: TodoItemProps): React.ReactElement {
  const statusIcon =
    todo.status === 'completed'
      ? icons.todoCompleted
      : todo.status === 'in_progress'
      ? icons.todoInProgress
      : icons.todoPending;

  const statusColor =
    todo.status === 'completed'
      ? colors.todoCompleted
      : todo.status === 'in_progress'
      ? colors.todoInProgress
      : colors.todoPending;

  const priorityColor = todo.priority
    ? colors[todo.priority as keyof typeof colors] || colors.dimmed
    : null;

  return (
    <Box flexDirection="row">
      {isSelected && <Text color={colors.selected}>{icons.selected} </Text>}
      <Text color={statusColor}>{statusIcon} </Text>
      <Text
        color={todo.status === 'completed' ? colors.dimmed : colors.header}
        strikethrough={todo.status === 'completed'}
      >
        {truncate(todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content, 60)}
      </Text>
      {priorityColor && (
        <Text color={priorityColor}> [{todo.priority}]</Text>
      )}
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { Todo } from '../../lib/types.js';
import { TodoItem } from './todo-item.js';
import { ProgressBar } from '../common/progress-bar.js';
import { Spinner } from '../common/spinner.js';

export interface TodosViewProps {
  todos: Todo[];
  sessionId: string | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  windowSize?: number;
  /** Height in rows for the view to fill */
  height?: number;
}

export function TodosView({
  todos,
  sessionId,
  isLoading,
  error,
  onRefresh,
  windowSize = 15,
  height,
}: TodosViewProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  // Reset selection when todos change significantly
  useEffect(() => {
    if (selectedIndex >= todos.length) {
      setSelectedIndex(Math.max(0, todos.length - 1));
    }
  }, [todos.length, selectedIndex]);

  useInput((input, key) => {
    if (input === 'r') {
      onRefresh();
      return;
    }
    if (todos.length === 0) return;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = Math.min(todos.length - 1, selectedIndex + 1);
      setSelectedIndex(newIndex);
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - windowSize);
      setSelectedIndex(newIndex);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(todos.length - 1, selectedIndex + windowSize);
      setSelectedIndex(newIndex);
      setWindowStart(
        Math.min(Math.max(0, todos.length - windowSize), windowStart + windowSize)
      );
    }
  });

  // Calculate stats
  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;
  const pending = todos.filter(t => t.status === 'pending').length;
  const total = todos.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Spinner label="Loading todos..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1} height={height} flexGrow={1}>
        <Text color={colors.error}>
          {icons.error} Error loading todos: {error.message}
        </Text>
        <Text color={colors.dimmed}>Press 'r' to refresh</Text>
      </Box>
    );
  }

  const visibleTodos = todos.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < todos.length;

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {/* Header with session info */}
      <Box flexDirection="row" marginBottom={1}>
        <Text bold color={colors.header}>
          Claude Code Todos
        </Text>
        {sessionId && (
          <>
            <Text color={colors.dimmed}> | Session: </Text>
            <Text color={colors.subagent}>{sessionId.slice(0, 12)}...</Text>
          </>
        )}
      </Box>

      {/* Progress bar */}
      <Box marginBottom={1}>
        <ProgressBar percent={percent} width={40} />
      </Box>

      {/* Stats */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={colors.todoCompleted}>{icons.todoCompleted} {completed} completed</Text>
        <Text color={colors.dimmed}> | </Text>
        <Text color={colors.todoInProgress}>{icons.todoInProgress} {inProgress} in progress</Text>
        <Text color={colors.dimmed}> | </Text>
        <Text color={colors.todoPending}>{icons.todoPending} {pending} pending</Text>
      </Box>

      {/* Todo list */}
      {todos.length === 0 ? (
        <Text color={colors.dimmed}>No todos found.</Text>
      ) : (
        <Box flexDirection="column">
          {showScrollUp && (
            <Text color={colors.dimmed}>
              {'\u2191'} {windowStart} todos above
            </Text>
          )}

          {visibleTodos.map((todo, i) => {
            const actualIndex = windowStart + i;
            return (
              <TodoItem
                key={todo.id || actualIndex}
                todo={todo}
                isSelected={actualIndex === selectedIndex}
              />
            );
          })}

          {showScrollDown && (
            <Text color={colors.dimmed}>
              {'\u2193'} {todos.length - windowStart - windowSize} todos below
            </Text>
          )}
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1}>
        <Text color={colors.dimmed}>Press 'r' to refresh</Text>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ProcessedMessage } from '../../lib/types.js';
import { formatTime, formatMessageDuration, truncate, formatTokens, calculateSubagentTokens } from '../../lib/parser.js';
import { formatToolCall } from '../../lib/tool-formatting.js';

export interface MessageItemProps {
  message: ProcessedMessage;
  isSelected: boolean;
  /** Terminal width for proper truncation */
  width?: number;
  /** 1-based index for display */
  index: number;
  /** Whether this is the initial prompt (first user message in current session) */
  isInitialPrompt?: boolean;
  /** Duration in milliseconds (time until next message started) */
  durationMs?: number;
}

// Fixed height for deterministic layout - all items have same height
// 4 lines = 2 content lines + 2 for border (top/bottom)
// Line 1: Header (type icon, label, timestamp)
// Line 2: Either text content OR tool summary (never both in practice)
// Border is always present: gray when unselected, green when selected
export const MESSAGE_ITEM_HEIGHT = 4;

export function MessageItem({
  message,
  isSelected,
  width = 100,
  index,
  isInitialPrompt = false,
  durationMs,
}: MessageItemProps): React.ReactElement {
  // Calculate usable width (account for indentation and borders)
  const contentWidth = Math.max(40, width - 10);
  const toolLineWidth = contentWidth - 6; // Account for indent and icon

  // Check if this message contains a subagent (Task) tool call
  const hasSubagent = message.toolCalls.some(tc => tc.isSubagent);

  // Calculate subagent token totals if this message has subagents
  const subagentTokens = hasSubagent
    ? message.toolCalls
        .filter(tc => tc.isSubagent && tc.subagentMessages)
        .reduce(
          (acc, tc) => {
            const tokens = calculateSubagentTokens(tc.subagentMessages || []);
            return {
              input: acc.input + tokens.input,
              output: acc.output + tokens.output,
              cacheRead: acc.cacheRead + tokens.cacheRead,
              total: acc.total + tokens.total,
            };
          },
          { input: 0, output: 0, cacheRead: 0, total: 0 }
        )
    : null;

  // Check if this message has any incomplete tool calls (pending or running)
  const hasIncompleteToolCalls = message.toolCalls.some(
    tc => tc.status === 'pending' || tc.status === 'running'
  );

  // Determine icon, color, and label based on message type and subagent status
  let typeIcon: string;
  let typeColor: string;
  let typeLabel: string;

  if (message.type === 'system') {
    typeIcon = icons.system;
    typeColor = colors.system;
    typeLabel = 'System';
  } else if (message.type === 'result') {
    // Session result/completion message
    typeIcon = icons.completed;
    typeColor = colors.result;
    typeLabel = 'Result';
  } else if (isInitialPrompt) {
    // Initial prompt gets special styling - distinct from regular user messages
    typeIcon = icons.user;
    typeColor = colors.initialPrompt;
    typeLabel = 'Initial Prompt';
  } else if (message.type === 'user') {
    typeIcon = icons.user;
    typeColor = colors.user;
    typeLabel = 'User';
  } else if (hasSubagent) {
    // Assistant message with subagent tool call
    typeIcon = icons.assistant;
    typeColor = colors.subagent;
    typeLabel = 'Task Subagent';
  } else {
    // Determine label and color based on content: text-only = Thinking, tools-only = Tool, both = Assistant
    const hasText = !!message.text.trim();
    const hasToolCalls = message.toolCalls.length > 0;

    typeIcon = icons.assistant;

    if (hasText && !hasToolCalls) {
      typeLabel = 'Thinking';
      typeColor = colors.thinking;
    } else if (!hasText && hasToolCalls) {
      typeLabel = 'Tool';
      typeColor = colors.tool;
    } else {
      typeLabel = 'Assistant';
      typeColor = colors.assistant;
    }
  }

  // Override color for incomplete tool calls (yellow dot)
  const dotColor = hasIncompleteToolCalls ? colors.pending : typeColor;

  // Truncate text to single line
  const textLine = message.text
    ? truncate(message.text.replace(/\n/g, ' '), contentWidth - 4)
    : '';

  // Build tool summary with proper formatting
  const toolCount = message.toolCalls.length;

  // Hint text for selected items
  const hint = isSelected ? ' [Enter]' : '';

  // Colors based on selection and completion state
  // Border: yellow when incomplete (and not selected), green when selected, gray otherwise
  const borderColor = isSelected
    ? colors.selected
    : hasIncompleteToolCalls
      ? colors.pending
      : colors.border;

  // Header label color - keep original type color regardless of selection
  // Selection is indicated by border color change only
  const headerLabelColor = typeColor;

  return (
    <Box
      flexDirection="column"
      height={MESSAGE_ITEM_HEIGHT}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {/* Line 1: Header */}
      <Text>
        <Text color={colors.dimmed}>#{index} </Text>
        <Text color={dotColor}>{typeIcon}</Text>
        <Text color={headerLabelColor}> {typeLabel}</Text>
        {/* Add token count for subagents - detailed format with input/output/cache */}
        {hasSubagent && subagentTokens && subagentTokens.total > 0 && (
          <>
            <Text color={colors.dimmed}> | Tokens: </Text>
            <Text color={colors.subagent}>{formatTokens(subagentTokens.input)}</Text>
            <Text color={colors.dimmed}> in</Text>
            {subagentTokens.cacheRead > 0 && (
              <Text color={colors.dimmed}> ({formatTokens(subagentTokens.cacheRead)} from cache)</Text>
            )}
            <Text color={colors.dimmed}>, </Text>
            <Text color={colors.subagent}>{formatTokens(subagentTokens.output)}</Text>
            <Text color={colors.dimmed}> out</Text>
          </>
        )}
        <Text color={colors.dimmed}>  {formatTime(message.timestamp)}</Text>
        {durationMs !== undefined && durationMs >= 0 && (
          <Text color={colors.dimmed}> ({formatMessageDuration(durationMs)})</Text>
        )}
      </Text>

      {/* Line 2: Text content OR Tool summary (never both in practice) */}
      <Text wrap="truncate">
        {toolCount > 0 ? (
          // Show tool summary for messages with tool calls
          <>
            <Text color={colors.dimmed}>{icons.collapsed} </Text>
            {message.toolCalls.slice(0, 2).map((tc, i) => {
              const formatted = formatToolCall(tc, Math.floor(toolLineWidth / Math.min(2, toolCount)));
              return (
                <React.Fragment key={tc.id}>
                  {i > 0 && <Text color={colors.dimmed}>, </Text>}
                  {formatted.pill ? (
                    // Render subagent with pill styling
                    <>
                      <Text
                        backgroundColor={formatted.pill.backgroundColor}
                        color={formatted.pill.textColor}
                      >
                        {' '}{formatted.pill.text}{' '}
                      </Text>
                      {formatted.suffix && (
                        <Text color={colors.dimmed}>{formatted.suffix}</Text>
                      )}
                      <Text color={formatted.color}>{formatted.statusIcon}</Text>
                    </>
                  ) : (
                    // Regular tool call
                    <Text color={formatted.color}>{formatted.text}{formatted.statusIcon}</Text>
                  )}
                </React.Fragment>
              );
            })}
            {toolCount > 2 && (
              <Text color={colors.dimmed}>, +{toolCount - 2} more</Text>
            )}
            {hint && <Text color={colors.selected}>{hint}</Text>}
          </>
        ) : (
          // Show text content for messages without tool calls
          <>
            <Text color={isSelected ? colors.header : colors.dimmed}>
              {textLine || ' '}
            </Text>
            {hint && <Text color={colors.selected}>{hint}</Text>}
          </>
        )}
      </Text>
    </Box>
  );
}

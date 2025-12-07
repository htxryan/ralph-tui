import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ToolCall } from '../../lib/types.js';
import { truncate } from '../../lib/parser.js';

export interface ToolCallSummaryProps {
  toolCall: ToolCall;
  isLast?: boolean;
}

export function ToolCallSummary({
  toolCall,
  isLast = false,
}: ToolCallSummaryProps): React.ReactElement {
  const statusIcon =
    toolCall.status === 'completed'
      ? icons.completed
      : toolCall.status === 'error'
      ? icons.error
      : toolCall.status === 'running'
      ? icons.running
      : icons.pending;

  const statusColor =
    toolCall.status === 'completed'
      ? colors.completed
      : toolCall.status === 'error'
      ? colors.error
      : toolCall.status === 'running'
      ? colors.running
      : colors.pending;

  const prefix = isLast ? '\u2514\u2500' : '\u251C\u2500';

  // Get a summary of the input
  const inputSummary = toolCall.isSubagent
    ? toolCall.subagentDescription || toolCall.subagentType || ''
    : Object.entries(toolCall.input)
        .slice(0, 2)
        .map(([k, v]) => {
          const val = typeof v === 'string' ? v : JSON.stringify(v);
          return `${k}: ${truncate(val, 30)}`;
        })
        .join(', ');

  return (
    <Box flexDirection="row">
      <Text color={colors.dimmed}>{prefix} </Text>
      <Text color={toolCall.isSubagent ? colors.subagent : colors.toolName} bold={toolCall.isSubagent}>
        {toolCall.name}
      </Text>
      {inputSummary && (
        <>
          <Text color={colors.dimmed}>(</Text>
          <Text color={colors.toolInput}>{truncate(inputSummary, 40)}</Text>
          <Text color={colors.dimmed}>)</Text>
        </>
      )}
      <Box flexGrow={1} />
      <Text color={statusColor}>{statusIcon}</Text>
    </Box>
  );
}

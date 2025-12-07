import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ProcessedMessage } from '../../lib/types.js';
import { formatTime } from '../../lib/parser.js';
import { Breadcrumb } from '../subagent/breadcrumb.js';

export interface MessageDetailViewProps {
  message: ProcessedMessage;
  onBack: () => void;
  height?: number;
  width?: number;
}

interface ContentLine {
  type: 'text' | 'tool-header' | 'tool-input' | 'tool-result' | 'tool-error' | 'divider';
  content: string;
  color?: string;
  bold?: boolean;
  dimmed?: boolean;
}

export function MessageDetailView({
  message,
  onBack,
  height = 20,
  width = 100,
}: MessageDetailViewProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Wrap long lines to fit terminal width
  const wrapLine = (text: string, maxWidth: number): string[] => {
    if (!text || text.length <= maxWidth) return [text];
    const result: string[] = [];
    let remaining = text;
    while (remaining.length > maxWidth) {
      result.push(remaining.slice(0, maxWidth));
      remaining = remaining.slice(maxWidth);
    }
    if (remaining) result.push(remaining);
    return result;
  };

  // Effective width for content (account for padding/borders)
  const contentWidth = Math.max(40, width - 10);

  // Build all content lines for unified scrolling
  const contentLines = useMemo(() => {
    const lines: ContentLine[] = [];

    const addWrappedLines = (
      text: string,
      type: ContentLine['type'],
      props: Partial<ContentLine>
    ) => {
      wrapLine(text, contentWidth).forEach(wrappedLine => {
        lines.push({ type, content: wrappedLine, ...props });
      });
    };

    // Message text lines
    if (message.text) {
      message.text.split('\n').forEach(line => {
        addWrappedLines(line, 'text', { color: colors.header });
      });
    }

    // Tool calls with their results
    if (message.toolCalls.length > 0) {
      lines.push({ type: 'divider', content: '' });
      lines.push({
        type: 'divider',
        content: `── Tool Calls (${message.toolCalls.length}) ──`,
        dimmed: true,
      });

      message.toolCalls.forEach((tc, index) => {
        if (index > 0) {
          lines.push({ type: 'divider', content: '' });
        }

        // Tool header
        const statusIcon = tc.status === 'completed' ? icons.completed
          : tc.status === 'error' ? icons.error
          : tc.status === 'running' ? icons.running
          : icons.pending;

        lines.push({
          type: 'tool-header',
          content: `${statusIcon} ${tc.name}${tc.isSubagent ? ` (${tc.subagentType || 'Task'})` : ''}`,
          color: tc.isSubagent ? colors.subagent : colors.toolName,
          bold: true,
        });

        // Show full tool input - all parameters
        if (tc.input && Object.keys(tc.input).length > 0) {
          lines.push({ type: 'tool-input', content: '  Input:', dimmed: true });
          for (const [key, value] of Object.entries(tc.input)) {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            // Split multi-line values
            const valueLines = valueStr.split('\n');
            if (valueLines.length === 1) {
              addWrappedLines(`    ${key}: ${valueStr}`, 'tool-input', { color: colors.toolInput });
            } else {
              addWrappedLines(`    ${key}:`, 'tool-input', { color: colors.toolInput });
              valueLines.forEach(vline => {
                addWrappedLines(`      ${vline}`, 'tool-input', { color: colors.toolInput });
              });
            }
          }
        }

        // Tool result
        if (tc.result) {
          lines.push({
            type: tc.isError ? 'tool-error' : 'tool-result',
            content: '  Result:',
            dimmed: true,
          });
          tc.result.split('\n').forEach(line => {
            addWrappedLines(`    ${line}`, tc.isError ? 'tool-error' : 'tool-result', {
              color: tc.isError ? colors.error : colors.toolResult,
            });
          });
        }
      });
    }

    return lines;
  }, [message, contentWidth]);

  // Calculate visible window - reserve space for header (~6 lines), breadcrumb (1), footer (2), scroll indicators (2)
  const windowSize = Math.max(5, height - 11);
  const maxScroll = Math.max(0, contentLines.length - windowSize);

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      onBack();
      return;
    }
    if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollOffset(prev => Math.min(Math.max(0, contentLines.length - windowSize), prev + 1));
    }
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - windowSize));
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, contentLines.length - windowSize), prev + windowSize));
    }
    // Home key
    if (input === 'g') {
      setScrollOffset(0);
    }
    // End key
    if (input === 'G') {
      setScrollOffset(Math.max(0, contentLines.length - windowSize));
    }
  });

  // Message type info
  const typeIcon = message.type === 'system' ? icons.system
    : message.type === 'user' ? icons.user
    : icons.assistant;
  const typeColor = message.type === 'system' ? colors.system
    : message.type === 'user' ? colors.user
    : colors.assistant;
  const typeLabel = message.type.charAt(0).toUpperCase() + message.type.slice(1);

  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + windowSize);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + windowSize < contentLines.length;

  return (
    <Box flexDirection="column" height={height}>
      {/* Breadcrumb */}
      <Breadcrumb path={['Messages', `${typeLabel} Message`]} />

      {/* Message header */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.border}
        paddingX={1}
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={typeColor}>
            {typeIcon} {typeLabel}
          </Text>
          <Text color={colors.dimmed}>{formatTime(message.timestamp)}</Text>
        </Box>
        {message.usage && (
          <Text color={colors.dimmed}>
            Tokens: {message.usage.input_tokens.toLocaleString()} in / {message.usage.output_tokens.toLocaleString()} out
          </Text>
        )}
        <Text color={colors.dimmed}>
          {message.toolCalls.length} tool call{message.toolCalls.length !== 1 ? 's' : ''}
        </Text>
      </Box>

      {/* Scrollable content - fixed height to prevent overflow */}
      <Box flexDirection="column" height={windowSize + 2}>
        {showScrollUp && (
          <Text color={colors.dimmed}>
            {'\u2191'} {scrollOffset} lines above
          </Text>
        )}

        {visibleLines.map((line, i) => (
          <Text
            key={scrollOffset + i}
            color={line.dimmed ? colors.dimmed : line.color}
            bold={line.bold}
            wrap="truncate"
          >
            {line.content || ' '}
          </Text>
        ))}

        {showScrollDown && (
          <Text color={colors.dimmed}>
            {'\u2193'} {contentLines.length - scrollOffset - windowSize} lines below
          </Text>
        )}
      </Box>

      {/* Help text */}
      <Box>
        <Text color={colors.dimmed}>
          [Esc/b] Back | [{'\u2191\u2193'}] Scroll | [PgUp/PgDn] Page | [g/G] Top/Bottom
        </Text>
      </Box>
    </Box>
  );
}

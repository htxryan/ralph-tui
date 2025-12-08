import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { KanbanTask } from '../../lib/types.js';
import { Spinner } from '../common/spinner.js';
import {
  parseMarkdown,
  flattenMarkdownLines,
  FlatLine,
  StyledSegment,
} from '../../lib/markdown.js';
import { StyledText } from '../common/styled-text.js';

export interface TaskViewProps {
  task: KanbanTask | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  /** Height in rows for the view to fill */
  height?: number;
}

// Content line type for unified scrolling
interface ContentLine {
  segments: StyledSegment[];
  type: 'header' | 'metadata' | 'label' | 'description' | 'dependency' | 'comment' | 'divider';
}

export function TaskView({
  task,
  isLoading,
  error,
  onRefresh,
  height = 30,
}: TaskViewProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Build all content lines for unified scrolling
  const { contentLines, descriptionStartIndex } = useMemo(() => {
    if (!task) return { contentLines: [], descriptionStartIndex: 0 };

    const lines: ContentLine[] = [];
    const contentWidth = 80; // Default content width for wrapping

    // Helper to add a simple text line
    const addLine = (
      text: string,
      type: ContentLine['type'],
      style: Partial<StyledSegment> = {}
    ) => {
      lines.push({
        segments: [{ text, ...style }],
        type,
      });
    };

    // Title
    addLine(task.title, 'header', { bold: true, color: colors.header });
    addLine('', 'divider');

    // Metadata
    const typeEmoji =
      task.type === 'bug'
        ? '\uD83D\uDC1B'
        : task.type === 'feature'
        ? '\u2728'
        : '\uD83D\uDCCB';
    const statusColor = colors[task.status as keyof typeof colors] || colors.dimmed;
    const priorityColor = task.priority
      ? colors[task.priority as keyof typeof colors] || colors.dimmed
      : colors.dimmed;

    lines.push({
      segments: [
        { text: 'Type: ', color: colors.dimmed },
        { text: `${typeEmoji} ${task.type}`, color: undefined },
        { text: '  Status: ', color: colors.dimmed },
        { text: task.status, color: statusColor, bold: true },
        ...(task.priority
          ? [
              { text: '  Priority: ', color: colors.dimmed },
              { text: task.priority, color: priorityColor },
            ]
          : []),
        ...(task.assignee
          ? [
              { text: '  Assignee: ', color: colors.dimmed },
              { text: task.assignee, color: undefined },
            ]
          : []),
      ],
      type: 'metadata',
    });

    // Dates
    lines.push({
      segments: [
        { text: `Created: ${new Date(task.created_at).toLocaleDateString()}`, color: colors.dimmed },
        { text: ' | ', color: colors.dimmed },
        { text: `Updated: ${new Date(task.updated_at).toLocaleDateString()}`, color: colors.dimmed },
      ],
      type: 'metadata',
    });

    // Labels
    if (task.labels && task.labels.length > 0) {
      const labelSegments: StyledSegment[] = [{ text: 'Labels: ', color: colors.dimmed }];
      task.labels.forEach((label, i) => {
        if (i > 0) labelSegments.push({ text: ', ' });
        labelSegments.push({ text: `[${label}]`, color: colors.user });
      });
      lines.push({ segments: labelSegments, type: 'label' });
    }

    addLine('', 'divider');

    // Description header
    const descStartIdx = lines.length;
    addLine('Description:', 'description', { bold: true, color: colors.header });
    addLine('─'.repeat(40), 'divider', { dimmed: true });

    // Parse description as markdown
    if (task.description) {
      const parsed = parseMarkdown(task.description);
      const flattened = flattenMarkdownLines(parsed, contentWidth);

      for (const flatLine of flattened) {
        lines.push({
          segments: flatLine.segments,
          type: 'description',
        });
      }
    } else {
      addLine('No description provided.', 'description', { dimmed: true });
    }

    // Dependencies
    if (
      (task.blockers && task.blockers.length > 0) ||
      (task.blocks && task.blocks.length > 0)
    ) {
      addLine('', 'divider');
      addLine('Dependencies:', 'dependency', { bold: true, color: colors.header });
      addLine('─'.repeat(40), 'divider', { dimmed: true });

      if (task.blockers && task.blockers.length > 0) {
        addLine('← Blocked by:', 'dependency', { dimmed: true });
        for (const blocker of task.blockers) {
          addLine(`  ${blocker}`, 'dependency', { color: colors.error });
        }
      }

      if (task.blocks && task.blocks.length > 0) {
        addLine('→ Blocks:', 'dependency', { dimmed: true });
        for (const blocked of task.blocks) {
          addLine(`  ${blocked}`, 'dependency', { color: colors.pending });
        }
      }
    }

    // Comments
    if (task.comments && task.comments.length > 0) {
      addLine('', 'divider');
      addLine(`Comments (${task.comments.length}):`, 'comment', { bold: true, color: colors.header });
      addLine('─'.repeat(40), 'divider', { dimmed: true });

      for (const comment of task.comments) {
        const dateStr = new Date(comment.created_at).toLocaleString();
        addLine(
          `[${dateStr}]${comment.author ? ` ${comment.author}` : ''}`,
          'comment',
          { dimmed: true }
        );
        // Parse comment content as markdown too
        const parsed = parseMarkdown(comment.content);
        const flattened = flattenMarkdownLines(parsed, contentWidth);
        for (const flatLine of flattened) {
          lines.push({ segments: flatLine.segments, type: 'comment' });
        }
        addLine('', 'divider');
      }
    }

    return { contentLines: lines, descriptionStartIndex: descStartIdx };
  }, [task]);

  // Calculate visible window
  // Reserve space for: task ID box (3 lines), content border (2 lines), help text (1 line)
  // The border adds 2 lines (top + bottom), plus we want scroll indicators inside
  const reservedLines = 6;
  const windowSize = Math.max(5, (height || 30) - reservedLines);
  const maxScroll = Math.max(0, contentLines.length - windowSize);

  useInput((input, key) => {
    if (input === 'r') {
      onRefresh();
    }
    if (key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollOffset(prev => Math.min(maxScroll, prev + 1));
    }
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - windowSize));
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.min(maxScroll, prev + windowSize));
    }
    // Home key - go to top
    if (input === 'g') {
      setScrollOffset(0);
    }
    // End key - go to bottom
    if (input === 'G') {
      setScrollOffset(maxScroll);
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

  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + windowSize);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + windowSize < contentLines.length;

  return (
    <Box flexDirection="column" height={height} flexGrow={1}>
      {/* Task ID */}
      <Box
        borderStyle="double"
        borderColor={colors.subagent}
        paddingX={1}
      >
        <Text color={colors.subagent} bold>
          {task.id}
        </Text>
      </Box>

      {/* Scrollable content area with border */}
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor={colors.border}
        paddingX={1}
      >
        {showScrollUp && (
          <Text color={colors.dimmed}>
            {'\u2191'} {scrollOffset} lines above
          </Text>
        )}

        {visibleLines.map((line, i) => (
          <Box key={scrollOffset + i}>
            <StyledText segments={line.segments} />
          </Box>
        ))}

        {showScrollDown && (
          <Text color={colors.dimmed}>
            {'\u2193'} {contentLines.length - scrollOffset - windowSize} lines below
          </Text>
        )}
      </Box>

      {/* Help text */}
      <Text color={colors.dimmed}>
        [r] Refresh | [{'\u2191\u2193'}] Scroll | [PgUp/PgDn] Page | [g/G] Top/Bottom
      </Text>
    </Box>
  );
}

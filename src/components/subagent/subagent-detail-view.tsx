import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../../lib/colors.js';
import { ToolCall, ProcessedMessage } from '../../lib/types.js';
import { formatTime, formatMessageDuration, truncate, formatTokens, calculateSubagentTokens } from '../../lib/parser.js';
import { formatToolCall, getToolInputPreview } from '../../lib/tool-formatting.js';
import { Breadcrumb } from './breadcrumb.js';

export interface SubagentDetailViewProps {
  toolCall: ToolCall;
  onBack: () => void;
  height?: number;
  width?: number;
}

type SubagentTab = 'overview' | 'messages';

// Fixed height for message items - all items have same height (matching main message list)
// 4 lines = 2 content lines + 2 for border (top/bottom)
// Border is always present: gray when unselected, green when selected
const MESSAGE_ITEM_HEIGHT = 4;

/**
 * Parse content blocks from Task tool result
 * Task tool returns content in format: [{"type": "text", "text": "..."}, ...]
 */
function parseContentBlocks(value: unknown): string {
  if (value === null || value === undefined) return '';

  let data = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return value;
    }
  }

  if (Array.isArray(data)) {
    return data
      .filter((block): block is { type: string; text: string } =>
        block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string'
      )
      .map(block => block.text)
      .join('\n\n');
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Create the input message for a subagent (first item in list)
 */
function createInputMessage(toolCall: ToolCall): ProcessedMessage | null {
  const promptText = toolCall.subagentPrompt || toolCall.input?.prompt as string || '';
  if (!promptText) return null;

  return {
    id: `${toolCall.id}-input`,
    type: 'system', // Use 'system' to distinguish from regular user/assistant
    timestamp: toolCall.timestamp,
    text: promptText,
    toolCalls: [],
  };
}

/**
 * Create the output/result message for a subagent (last item in list)
 */
function createOutputMessage(toolCall: ToolCall): ProcessedMessage | null {
  let responseText = '';
  if (toolCall.subagentResult) {
    responseText = parseContentBlocks(toolCall.subagentResult);
  } else if (toolCall.result) {
    responseText = parseContentBlocks(toolCall.result);
  }

  // Create response message if we have content or the task is done
  if (responseText || toolCall.status === 'completed' || toolCall.status === 'error') {
    let finalText = responseText;
    if (!finalText || finalText.trim() === '') {
      if (toolCall.status === 'error') {
        finalText = '(Error occurred)';
      } else if (toolCall.status === 'completed') {
        finalText = '(Task completed - no text response)';
      } else if (toolCall.status === 'running') {
        finalText = '(Running...)';
      } else {
        finalText = '(Pending...)';
      }
    }

    return {
      id: `${toolCall.id}-output`,
      type: 'result', // Use 'result' to distinguish from regular assistant
      timestamp: new Date(toolCall.timestamp.getTime() + (toolCall.duration || 0)),
      text: finalText,
      toolCalls: [],
    };
  }

  return null;
}

/**
 * Convert a ToolCall for a subagent into synthetic ProcessedMessages
 * Used as fallback when no real subagent messages are captured
 */
function createSubagentMessages(toolCall: ToolCall): ProcessedMessage[] {
  const messages: ProcessedMessage[] = [];

  const inputMsg = createInputMessage(toolCall);
  if (inputMsg) messages.push(inputMsg);

  const outputMsg = createOutputMessage(toolCall);
  if (outputMsg) messages.push(outputMsg);

  // If we have no messages at all, add a placeholder
  if (messages.length === 0) {
    messages.push({
      id: `${toolCall.id}-pending`,
      type: 'assistant',
      timestamp: toolCall.timestamp,
      text: `(Subagent ${toolCall.status || 'pending'}...)`,
      toolCalls: [],
    });
  }

  return messages;
}

/**
 * Build complete message list with input/output wrappers around real messages
 */
function buildSubagentMessageList(toolCall: ToolCall, realMessages: ProcessedMessage[] | undefined): ProcessedMessage[] {
  const messages: ProcessedMessage[] = [];

  // First: Input message (prompt to subagent)
  const inputMsg = createInputMessage(toolCall);
  if (inputMsg) messages.push(inputMsg);

  // Middle: Real subagent conversation messages (if any)
  if (realMessages && realMessages.length > 0) {
    messages.push(...realMessages);
  }

  // Last: Output message (final result from subagent)
  const outputMsg = createOutputMessage(toolCall);
  if (outputMsg) messages.push(outputMsg);

  // If we have no messages at all, add a placeholder
  if (messages.length === 0) {
    messages.push({
      id: `${toolCall.id}-pending`,
      type: 'assistant',
      timestamp: toolCall.timestamp,
      text: `(Subagent ${toolCall.status || 'pending'}...)`,
      toolCalls: [],
    });
  }

  return messages;
}

// ============================================================================
// Tab Bar Component
// ============================================================================

interface SubagentTabBarProps {
  currentTab: SubagentTab;
  onTabChange: (tab: SubagentTab) => void;
}

function SubagentTabBar({ currentTab, onTabChange }: SubagentTabBarProps): React.ReactElement {
  const tabs: { id: SubagentTab; label: string; key: string }[] = [
    { id: 'overview', label: 'Overview', key: '1' },
    { id: 'messages', label: 'Messages', key: '2' },
  ];

  return (
    <Box flexDirection="row">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <Box key={tab.id} marginRight={1}>
            <Text
              color={isActive ? colors.activeTab : colors.inactiveTab}
              bold={isActive}
              inverse={isActive}
            >
              {' '}{tab.key}. {tab.label}{' '}
            </Text>
          </Box>
        );
      })}
      <Box flexGrow={1} />
      <Text color={colors.dimmed}>Tab to switch</Text>
    </Box>
  );
}

// ============================================================================
// Overview Tab Component
// ============================================================================

interface OverviewTabProps {
  toolCall: ToolCall;
  promptText: string;
  responseText: string;
  height: number;
  width: number;
}

function OverviewTab({
  toolCall,
  promptText,
  responseText,
  height,
  width,
}: OverviewTabProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);
  const contentWidth = Math.max(40, width - 6);

  // Build all content lines for unified scrolling
  const contentLines = useMemo(() => {
    const lines: { text: string; color?: string; bold?: boolean; dimmed?: boolean }[] = [];

    const wrapAndAdd = (text: string, props: { color?: string; bold?: boolean; dimmed?: boolean } = {}) => {
      if (!text) {
        lines.push({ text: '', ...props });
        return;
      }
      text.split('\n').forEach(line => {
        if (line.length <= contentWidth) {
          lines.push({ text: line, ...props });
        } else {
          let remaining = line;
          while (remaining.length > contentWidth) {
            lines.push({ text: remaining.slice(0, contentWidth), ...props });
            remaining = remaining.slice(contentWidth);
          }
          if (remaining) lines.push({ text: remaining, ...props });
        }
      });
    };

    // Subagent info section
    lines.push({ text: `${icons.assistant} Task Subagent`, color: colors.subagent, bold: true });
    if (toolCall.subagentType) {
      lines.push({ text: `Type: ${toolCall.subagentType}`, dimmed: true });
    }
    if (toolCall.subagentDescription) {
      lines.push({ text: `Description: ${toolCall.subagentDescription}`, dimmed: true });
    }
    lines.push({
      text: `Status: ${toolCall.status}`,
      color: toolCall.status === 'error' ? colors.error : toolCall.status === 'completed' ? colors.success : undefined,
    });
    lines.push({ text: '' });

    // Prompt section
    lines.push({ text: '── Prompt to Subagent ──', color: colors.user, bold: true });
    lines.push({ text: '' });
    if (promptText) {
      wrapAndAdd(promptText);
    } else {
      lines.push({ text: '(No prompt)', dimmed: true });
    }
    lines.push({ text: '' });

    // Response section
    lines.push({ text: '── Subagent Response ──', color: colors.assistant, bold: true });
    lines.push({ text: '' });
    if (responseText) {
      wrapAndAdd(responseText);
    } else {
      lines.push({ text: '(No response yet)', dimmed: true });
    }

    return lines;
  }, [toolCall, promptText, responseText, contentWidth]);

  const windowSize = Math.max(5, height - 4);
  const maxScroll = Math.max(0, contentLines.length - windowSize);

  useInput((input, key) => {
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
    if (input === 'g') {
      setScrollOffset(0);
    }
    if (input === 'G') {
      setScrollOffset(maxScroll);
    }
  });

  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + windowSize);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + windowSize < contentLines.length;

  return (
    <Box flexDirection="column" height={height}>
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
          {line.text || ' '}
        </Text>
      ))}

      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {contentLines.length - scrollOffset - windowSize} lines below
        </Text>
      )}
    </Box>
  );
}

// ============================================================================
// Messages Tab Components
// ============================================================================

interface SubagentMessageItemProps {
  message: ProcessedMessage;
  isSelected: boolean;
  width: number;
  /** 1-based index for display */
  index: number;
  /** Duration in milliseconds (time until next message started) */
  durationMs?: number;
}

function SubagentMessageItem({
  message,
  isSelected,
  width,
  index,
  durationMs,
}: SubagentMessageItemProps): React.ReactElement {
  const contentWidth = Math.max(40, width - 10);
  const toolLineWidth = contentWidth - 6;

  // Check if this message has any incomplete tool calls (pending or running)
  const hasIncompleteToolCalls = message.toolCalls?.some(
    tc => tc.status === 'pending' || tc.status === 'running'
  ) || false;

  // Determine icon, color, and label based on message type
  // 'system' = Subagent Input (prompt), 'result' = Subagent Output (final result)
  let typeIcon: string;
  let typeColor: string;
  let typeLabel: string;

  switch (message.type) {
    case 'system':
      typeIcon = icons.system;
      typeColor = colors.subagent;
      typeLabel = 'Subagent Input';
      break;
    case 'result':
      typeIcon = icons.assistant;
      typeColor = colors.success;
      typeLabel = 'Subagent Output';
      break;
    case 'user':
      typeIcon = icons.user;
      typeColor = colors.user;
      typeLabel = 'User';
      break;
    default: {
      // Determine label and color based on content: text-only = Thinking, tools-only = Tool, both = Assistant
      const hasText = !!message.text?.trim();
      const hasToolCalls = (message.toolCalls?.length ?? 0) > 0;

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
  }

  // Override color for incomplete tool calls (yellow dot)
  const dotColor = hasIncompleteToolCalls ? colors.pending : typeColor;

  const toolCallCount = message.toolCalls?.length || 0;

  // Text content line
  const textLine = message.text?.trim()
    ? truncate(message.text.replace(/\n/g, ' '), contentWidth - 4)
    : '';

  const hint = isSelected ? ' [Enter]' : '';

  // Colors based on selection and completion state
  // Border: yellow when incomplete (and not selected), green when selected, gray otherwise
  const borderColor = isSelected
    ? colors.selected
    : hasIncompleteToolCalls
      ? colors.pending
      : colors.border;

  // Header label color (not the dot)
  const headerLabelColor = isSelected ? colors.selected : typeColor;

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
        <Text color={dotColor} bold={isSelected}>{typeIcon}</Text>
        <Text color={headerLabelColor} bold={isSelected}> {typeLabel}</Text>
        <Text color={colors.dimmed}>  {formatTime(message.timestamp)}</Text>
        {durationMs !== undefined && durationMs >= 0 && (
          <Text color={colors.dimmed}> ({formatMessageDuration(durationMs)})</Text>
        )}
      </Text>

      {/* Line 2: Text content OR Tool summary (never both in practice) */}
      <Text wrap="truncate">
        {toolCallCount > 0 ? (
          // Show tool summary for messages with tool calls
          <>
            <Text color={colors.dimmed}>{icons.collapsed} </Text>
            {message.toolCalls.slice(0, 2).map((tc, i) => {
              const formatted = formatToolCall(tc, Math.floor(toolLineWidth / Math.min(2, toolCallCount)));
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
            {toolCallCount > 2 && (
              <Text color={colors.dimmed}>, +{toolCallCount - 2} more</Text>
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

interface SubagentMessageDetailProps {
  message: ProcessedMessage;
  onBack: () => void;
  height: number;
  width: number;
}

function SubagentMessageDetail({
  message,
  onBack,
  height,
  width,
}: SubagentMessageDetailProps): React.ReactElement {
  // Determine label based on message type and content
  let label: string;
  switch (message.type) {
    case 'system':
      label = 'Subagent Input';
      break;
    case 'result':
      label = 'Subagent Output';
      break;
    case 'user':
      label = 'User';
      break;
    default: {
      // Determine label based on content: text-only = Thinking, tools-only = Tool, both = Assistant
      const hasText = !!message.text?.trim();
      const hasToolCalls = (message.toolCalls?.length ?? 0) > 0;
      if (hasText && !hasToolCalls) {
        label = 'Thinking';
      } else if (!hasText && hasToolCalls) {
        label = 'Tool';
      } else {
        label = 'Assistant';
      }
    }
  }
  const [scrollOffset, setScrollOffset] = useState(0);
  const contentWidth = Math.max(40, width - 10);

  const contentLines = useMemo(() => {
    const lines: string[] = [];

    const wrapText = (text: string) => {
      text.split('\n').forEach(line => {
        if (line.length <= contentWidth) {
          lines.push(line);
        } else {
          let remaining = line;
          while (remaining.length > contentWidth) {
            lines.push(remaining.slice(0, contentWidth));
            remaining = remaining.slice(contentWidth);
          }
          if (remaining) lines.push(remaining);
        }
      });
    };

    // Add text content if present
    if (message.text?.trim()) {
      wrapText(message.text);
    }

    // Add tool calls section if present
    if (message.toolCalls && message.toolCalls.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push(`── Tool Calls (${message.toolCalls.length}) ──`);
      lines.push('');

      for (const tc of message.toolCalls) {
        // Show tool name with input preview (like main message list)
        const inputPreview = getToolInputPreview(tc, contentWidth - 20);
        const statusIcon = tc.status === 'completed' ? '✓'
          : tc.status === 'error' ? '✗'
          : '○';

        if (inputPreview) {
          lines.push(`${statusIcon} ${tc.name}(${inputPreview})`);
        } else {
          lines.push(`${statusIcon} ${tc.name}`);
        }

        // Show full input for context (no truncation)
        const inputStr = JSON.stringify(tc.input, null, 2);
        for (const inputLine of inputStr.split('\n')) {
          wrapText(`    ${inputLine}`);
        }

        // Show full result (no truncation)
        if (tc.status === 'completed' && tc.result) {
          lines.push('');
          lines.push('  Result:');
          for (const resultLine of tc.result.split('\n')) {
            wrapText(`    ${resultLine}`);
          }
        } else if (tc.status === 'error' && tc.result) {
          lines.push('');
          lines.push('  Error:');
          for (const errorLine of tc.result.split('\n')) {
            wrapText(`    ${errorLine}`);
          }
        }
        lines.push('');
      }
    }

    // Show placeholder if no content
    if (lines.length === 0) {
      lines.push('(No content)');
    }

    return lines;
  }, [message.text, message.toolCalls, contentWidth]);

  const windowSize = Math.max(5, height - 8);
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
      setScrollOffset(prev => Math.min(maxScroll, prev + 1));
    }
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - windowSize));
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.min(maxScroll, prev + windowSize));
    }
    if (input === 'g') {
      setScrollOffset(0);
    }
    if (input === 'G') {
      setScrollOffset(maxScroll);
    }
  });

  // Determine icon and color based on message type
  let typeIcon: string;
  let typeColor: string;
  switch (message.type) {
    case 'system':
      typeIcon = icons.system;
      typeColor = colors.subagent;
      break;
    case 'result':
      typeIcon = icons.assistant;
      typeColor = colors.success;
      break;
    case 'user':
      typeIcon = icons.user;
      typeColor = colors.user;
      break;
    default:
      typeIcon = icons.assistant;
      typeColor = colors.assistant;
      break;
  }

  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + windowSize);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + windowSize < contentLines.length;

  return (
    <Box flexDirection="column" height={height}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.border}
        paddingX={1}
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={typeColor}>
            {typeIcon} {label}
          </Text>
          <Text color={colors.dimmed}>{formatTime(message.timestamp)}</Text>
        </Box>
        <Text color={colors.dimmed}>
          {contentLines.length} lines total
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {showScrollUp && (
          <Text color={colors.dimmed}>
            {'\u2191'} {scrollOffset} lines above
          </Text>
        )}

        {visibleLines.map((line, i) => (
          <Text key={scrollOffset + i} wrap="wrap">
            {line || ' '}
          </Text>
        ))}

        {showScrollDown && (
          <Text color={colors.dimmed}>
            {'\u2193'} {contentLines.length - scrollOffset - windowSize} lines below
          </Text>
        )}
      </Box>

      <Box>
        <Text color={colors.dimmed}>
          [Esc/b] Back | [{'\u2191\u2193'}] Scroll | [PgUp/PgDn] Page | [g/G] Top/Bottom
        </Text>
      </Box>
    </Box>
  );
}

interface MessagesTabProps {
  messages: ProcessedMessage[];
  height: number;
  width: number;
  onEnterDetailMode: (index: number) => void;
}

// Scroll indicators take 1 line each
const SCROLL_INDICATOR_HEIGHT = 1;

function MessagesTab({
  messages,
  height,
  width,
  onEnterDetailMode,
}: MessagesTabProps): React.ReactElement {
  // Calculate window size similar to main messages view
  // All items have same height (MESSAGE_ITEM_HEIGHT = 4), plus scroll indicators (2 lines)
  const fixedOverhead = SCROLL_INDICATOR_HEIGHT * 2;
  const windowSize = Math.max(1, Math.floor((height - fixedOverhead) / MESSAGE_ITEM_HEIGHT));

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  useInput((input, key) => {
    if (messages.length === 0) return;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = Math.min(messages.length - 1, selectedIndex + 1);
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
      const newIndex = Math.min(messages.length - 1, selectedIndex + windowSize);
      setSelectedIndex(newIndex);
      setWindowStart(
        Math.min(Math.max(0, messages.length - windowSize), windowStart + windowSize)
      );
    }
    if (key.return) {
      onEnterDetailMode(selectedIndex);
    }
    // Jump to latest message
    if (input === 'l') {
      const latestIndex = messages.length - 1;
      setSelectedIndex(latestIndex);
      setWindowStart(Math.max(0, messages.length - windowSize));
    }
  });

  if (messages.length === 0) {
    return (
      <Box flexDirection="column" height={height}>
        <Text color={colors.dimmed}>
          No messages available (subagent may still be running)
        </Text>
      </Box>
    );
  }

  const visibleMessages = messages.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < messages.length;

  return (
    <Box flexDirection="column" height={height}>
      {showScrollUp && (
        <Text color={colors.dimmed}>
          {'\u2191'} {windowStart} messages above
        </Text>
      )}

      {visibleMessages.map((msg, i) => {
        const actualIndex = windowStart + i;
        // Calculate duration as time until next message started
        const nextMessageIndex = actualIndex + 1;
        const durationMs = nextMessageIndex < messages.length
          ? messages[nextMessageIndex].timestamp.getTime() - msg.timestamp.getTime()
          : undefined;
        return (
          <SubagentMessageItem
            key={msg.id}
            message={msg}
            isSelected={actualIndex === selectedIndex}
            width={width}
            index={actualIndex + 1}
            durationMs={durationMs}
          />
        );
      })}

      {showScrollDown && (
        <Text color={colors.dimmed}>
          {'\u2193'} {messages.length - windowStart - windowSize} messages below
        </Text>
      )}
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SubagentDetailView({
  toolCall,
  onBack,
  height = 30,
  width = 100,
}: SubagentDetailViewProps): React.ReactElement {
  const [currentTab, setCurrentTab] = useState<SubagentTab>('overview');
  const [detailMode, setDetailMode] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);

  // Parse prompt and response text
  const promptText = toolCall.subagentPrompt || '';
  const responseText = useMemo(() => {
    return toolCall.subagentResult
      ? parseContentBlocks(toolCall.subagentResult)
      : toolCall.result
      ? parseContentBlocks(toolCall.result)
      : '';
  }, [toolCall.subagentResult, toolCall.result]);

  // Build message list: Input + real messages + Output
  // Always include input/output wrappers, with real messages in the middle if available
  const realSubagentMessages = toolCall.subagentMessages;
  const subagentMessages = useMemo(() => {
    return buildSubagentMessageList(toolCall, realSubagentMessages);
  }, [realSubagentMessages, toolCall]);

  // Calculate total tokens for all subagent messages
  const tokenStats = useMemo(() => {
    return calculateSubagentTokens(realSubagentMessages || []);
  }, [realSubagentMessages]);

  // Handle entering detail mode from Messages tab
  const handleEnterDetailMode = (index: number) => {
    setDetailIndex(index);
    setDetailMode(true);
  };

  // Global input handling for tab switching and navigation
  useInput((input, key) => {
    // Don't handle input when in message detail mode
    if (detailMode) return;

    // Tab switching
    if (key.tab) {
      setCurrentTab(prev => prev === 'overview' ? 'messages' : 'overview');
      return;
    }
    if (input === '1') {
      setCurrentTab('overview');
      return;
    }
    if (input === '2') {
      setCurrentTab('messages');
      return;
    }

    // Back navigation
    if (key.escape) {
      onBack();
      return;
    }
  });

  const breadcrumbPath = [
    'Main Agent',
    `Task: "${truncate(toolCall.subagentDescription || toolCall.subagentType || 'Subagent', 30)}"`,
  ];

  // Show message detail view when in detail mode
  if (detailMode && subagentMessages[detailIndex]) {
    const detailMessage = subagentMessages[detailIndex];
    // Determine label for breadcrumb based on message type and content
    let detailLabel: string;
    switch (detailMessage.type) {
      case 'system':
        detailLabel = 'Subagent Input';
        break;
      case 'result':
        detailLabel = 'Subagent Output';
        break;
      case 'user':
        detailLabel = 'User';
        break;
      default: {
        // Determine label based on content: text-only = Thinking, tools-only = Tool, both = Assistant
        const hasText = !!detailMessage.text?.trim();
        const hasToolCalls = (detailMessage.toolCalls?.length ?? 0) > 0;
        if (hasText && !hasToolCalls) {
          detailLabel = 'Thinking';
        } else if (!hasText && hasToolCalls) {
          detailLabel = 'Tool';
        } else {
          detailLabel = 'Assistant';
        }
      }
    }
    return (
      <Box flexDirection="column" height={height}>
        <Breadcrumb path={[...breadcrumbPath, 'Messages', detailLabel]} />
        <SubagentMessageDetail
          message={detailMessage}
          onBack={() => setDetailMode(false)}
          height={height - 2}
          width={width}
        />
      </Box>
    );
  }

  // Calculate content height
  // Breadcrumb: 1 line, Token info: 1 line, TabBar: 1 line, Footer: 1 line
  const headerHeight = 3;
  const footerHeight = 1;
  const contentHeight = height - headerHeight - footerHeight;

  return (
    <Box flexDirection="column" height={height}>
      {/* Breadcrumb */}
      <Breadcrumb path={breadcrumbPath} />

      {/* Token counter */}
      <Box paddingLeft={1}>
        <Text color={colors.dimmed}>Tokens: </Text>
        <Text color={colors.subagent}>
          {formatTokens(tokenStats.total)}
        </Text>
        {tokenStats.total > 0 && (
          <Text color={colors.dimmed}> ({formatTokens(tokenStats.input)}in/{formatTokens(tokenStats.output)}out)</Text>
        )}
      </Box>

      {/* Tab bar */}
      <SubagentTabBar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Tab content */}
      {currentTab === 'overview' ? (
        <OverviewTab
          toolCall={toolCall}
          promptText={promptText}
          responseText={responseText}
          height={contentHeight}
          width={width}
        />
      ) : (
        <MessagesTab
          messages={subagentMessages}
          height={contentHeight}
          width={width}
          onEnterDetailMode={handleEnterDetailMode}
        />
      )}

      {/* Help text */}
      <Box>
        <Text color={colors.dimmed}>
          [Esc] Back | [Tab/1/2] Switch tabs | [{'\u2191\u2193'}] {currentTab === 'overview' ? 'Scroll' : 'Navigate'}
          {currentTab === 'messages' && ' | [Enter] Expand | [l] Latest'}
        </Text>
      </Box>
    </Box>
  );
}

import { ClaudeEvent, ContentBlock, ProcessedMessage, ToolCall, SessionStats, MessageFilterType } from './types.js';

let messageIdCounter = 0;
let toolIdCounter = 0;

/**
 * Parse a JSONL line into a ClaudeEvent
 */
export function parseJSONLLine(line: string): ClaudeEvent | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as ClaudeEvent;
  } catch {
    return null;
  }
}

/**
 * Extract text content from content blocks
 */
export function extractTextContent(content: ContentBlock[]): string {
  return content
    .filter((block): block is ContentBlock & { type: 'text'; text: string } =>
      block.type === 'text' && typeof block.text === 'string'
    )
    .map(block => block.text)
    .join('\n');
}

/**
 * Extract tool calls from content blocks
 */
export function extractToolCalls(content: ContentBlock[], timestamp: Date): ToolCall[] {
  return content
    .filter((block): block is ContentBlock & { type: 'tool_use' } =>
      block.type === 'tool_use'
    )
    .map(block => {
      const isSubagent = block.name === 'Task';
      const input = block.input ?? {};

      return {
        id: block.id ?? `tool-${++toolIdCounter}`,
        name: block.name ?? 'Unknown',
        input,
        status: 'pending' as const,
        isSubagent,
        subagentType: isSubagent ? (input as Record<string, unknown>).subagent_type as string | undefined : undefined,
        subagentDescription: isSubagent ? (input as Record<string, unknown>).description as string | undefined : undefined,
        subagentPrompt: isSubagent ? (input as Record<string, unknown>).prompt as string | undefined : undefined,
        timestamp,
      };
    });
}

/**
 * Process a ClaudeEvent into a ProcessedMessage
 */
export function processEvent(event: ClaudeEvent): ProcessedMessage | null {
  // Skip tool_use and tool_result events - they're part of assistant messages
  if (event.type === 'tool_use' || event.type === 'tool_result') {
    return null;
  }

  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

  // Handle result events - these contain session completion info
  // Note: result events may duplicate the final assistant message text,
  // deduplication is handled at a higher level in the stream processing
  if (event.type === 'result') {
    const resultText = event.result ?? '';
    // Skip empty result events
    if (!resultText.trim()) {
      return null;
    }
    return {
      id: `msg-${++messageIdCounter}`,
      type: 'result',
      timestamp,
      text: resultText,
      toolCalls: [],
      usage: event.message?.usage,
    };
  }

  const content = event.message?.content ?? [];

  const text = extractTextContent(content);
  const toolCalls = extractToolCalls(content, timestamp);

  // Skip empty messages (no text and no tool calls) - these are typically
  // continuation markers or empty user turns with no meaningful content
  if (!text.trim() && toolCalls.length === 0) {
    return null;
  }

  return {
    id: `msg-${++messageIdCounter}`,
    type: event.type,
    timestamp,
    text,
    toolCalls,
    usage: event.message?.usage,
  };
}

/**
 * Match tool results to tool calls
 */
export function matchToolResults(
  toolCalls: Map<string, ToolCall>,
  content: ContentBlock[]
): void {
  content
    .filter((block): block is ContentBlock & { type: 'tool_result' } =>
      block.type === 'tool_result'
    )
    .forEach(block => {
      const toolCall = toolCalls.get(block.tool_use_id ?? '');
      if (toolCall) {
        toolCall.status = block.is_error ? 'error' : 'completed';
        // Handle case where content might be an object instead of a string
        const content = block.content;
        if (typeof content === 'string') {
          toolCall.result = content;
        } else if (content === null || content === undefined) {
          toolCall.result = '';
        } else {
          toolCall.result = JSON.stringify(content, null, 2);
        }
        toolCall.isError = block.is_error;
      }
    });
}

/**
 * Calculate session statistics from processed messages
 */
export function calculateStats(messages: ProcessedMessage[]): SessionStats {
  const stats: SessionStats = {
    totalTokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    toolCallCount: 0,
    messageCount: messages.length,
    errorCount: 0,
    startTime: messages.length > 0 ? messages[0].timestamp : null,
    endTime: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
    subagentCount: 0,
  };

  for (const msg of messages) {
    if (msg.usage) {
      // Include all input token types in the total
      const cacheRead = msg.usage.cache_read_input_tokens || 0;
      const cacheCreation = msg.usage.cache_creation_input_tokens || 0;
      stats.totalTokens.input += msg.usage.input_tokens + cacheRead + cacheCreation;
      stats.totalTokens.output += msg.usage.output_tokens;
      stats.totalTokens.cacheRead += cacheRead;
      stats.totalTokens.cacheCreation += cacheCreation;
    }
    stats.toolCallCount += msg.toolCalls.length;
    stats.errorCount += msg.toolCalls.filter(tc => tc.isError).length;
    stats.subagentCount += msg.toolCalls.filter(tc => tc.isSubagent).length;
  }

  return stats;
}

/**
 * Calculate session statistics for a specific session range.
 * If sessionStartIndex is provided, calculates stats only for messages from that index onwards.
 * If no sessionStartIndex and isRalphRunning is false, calculates stats for the "last session"
 * (all messages from the most recent session boundary, or all messages if no boundary).
 */
export function calculateSessionStats(
  messages: ProcessedMessage[],
  sessionStartIndex: number | undefined,
  isRalphRunning: boolean
): SessionStats {
  if (messages.length === 0) {
    return {
      totalTokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      toolCallCount: 0,
      messageCount: 0,
      errorCount: 0,
      startTime: null,
      endTime: null,
      subagentCount: 0,
    };
  }

  // Determine which messages to include in session stats
  let sessionMessages: ProcessedMessage[];

  if (sessionStartIndex !== undefined && sessionStartIndex < messages.length) {
    // Current session: messages from sessionStartIndex onwards
    sessionMessages = messages.slice(sessionStartIndex);
  } else if (!isRalphRunning) {
    // No active session: show stats for the "last session" (all messages if no boundary)
    // This makes sense when viewing historical data
    sessionMessages = messages;
  } else {
    // Ralph is running but no messages yet in this session
    sessionMessages = [];
  }

  return calculateStats(sessionMessages);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format token count for display
 */
export function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Calculate total tokens from an array of messages
 */
export function calculateSubagentTokens(messages: ProcessedMessage[]): {
  input: number;
  output: number;
  cacheRead: number;
  total: number;
} {
  let input = 0;
  let output = 0;
  let cacheRead = 0;

  for (const message of messages) {
    if (message.usage) {
      input += message.usage.input_tokens || 0;
      output += message.usage.output_tokens || 0;
      cacheRead += message.usage.cache_read_input_tokens || 0;
    }
  }

  return {
    input,
    output,
    cacheRead,
    total: input + output,
  };
}

/**
 * Format duration for display
 */
export function formatDuration(startTime: Date | null): string {
  if (!startTime || isNaN(startTime.getTime())) return '0s';

  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

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

/**
 * Format timestamp for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format message duration in a compact format.
 * - Under 60s: "12s"
 * - 1-60min: "02m 23s"
 * - 1+ hours: "01h 58m 02s"
 */
export function formatMessageDuration(ms: number): string {
  if (ms < 0) return '';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get first N lines of text
 */
export function getFirstLines(text: string | undefined | null, n: number): { lines: string[]; hasMore: boolean } {
  if (!text || typeof text !== 'string') {
    return { lines: [], hasMore: false };
  }
  const allLines = text.split('\n');
  const lines = allLines.slice(0, n);
  return {
    lines,
    hasMore: allLines.length > n,
  };
}

/**
 * Categorize a message by its filter type
 * This logic mirrors the categorization in message-item.tsx
 */
export function getMessageFilterType(
  message: ProcessedMessage,
  isInitialPrompt: boolean = false
): MessageFilterType {
  if (message.type === 'system') {
    return 'system';
  }

  if (message.type === 'result') {
    return 'result';
  }

  if (isInitialPrompt) {
    return 'initial-prompt';
  }

  if (message.type === 'user') {
    return 'user';
  }

  // Assistant message - check for subagent, thinking, tool, or mixed
  const hasSubagent = message.toolCalls.some(tc => tc.isSubagent);
  if (hasSubagent) {
    return 'subagent';
  }

  const hasText = !!message.text.trim();
  const hasToolCalls = message.toolCalls.length > 0;

  if (hasText && !hasToolCalls) {
    return 'thinking';
  }

  if (!hasText && hasToolCalls) {
    return 'tool';
  }

  // Has both text and tool calls
  return 'assistant';
}

/**
 * Extract a human-readable workflow name from a workflow file path
 * e.g., ".ralph/workflows/01-feature-branch-incomplete.md" → "Feature Branch Incomplete"
 */
export function extractWorkflowName(workflowPath: string | undefined | null): string | null {
  if (!workflowPath) return null;

  // Extract filename from path
  const filename = workflowPath.split('/').pop() ?? '';

  // Remove .md extension
  const baseName = filename.replace(/\.md$/, '');

  // Remove number prefix (e.g., "01-")
  const withoutPrefix = baseName.replace(/^\d+-/, '');

  // Convert kebab-case to Title Case
  const titleCase = withoutPrefix
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return titleCase || null;
}

import { describe, it, expect } from 'vitest';
import {
  parseJSONLLine,
  extractTextContent,
  extractToolCalls,
  processEvent,
  matchToolResults,
  truncate,
  formatTokens,
  formatDuration,
  getFirstLines,
  calculateStats,
  calculateSessionStats,
  extractWorkflowName,
} from '../lib/parser.js';
import { ClaudeEvent, ContentBlock, ProcessedMessage, ToolCall } from '../lib/types.js';

describe('parseJSONLLine', () => {
  it('parses valid JSON line', () => {
    const line = '{"type":"assistant","message":{"content":[]}}';
    const result = parseJSONLLine(line);
    expect(result).toEqual({ type: 'assistant', message: { content: [] } });
  });

  it('returns null for empty line', () => {
    expect(parseJSONLLine('')).toBeNull();
    expect(parseJSONLLine('   ')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSONLLine('not json')).toBeNull();
    expect(parseJSONLLine('{invalid}')).toBeNull();
  });
});

describe('extractTextContent', () => {
  it('extracts text from content blocks', () => {
    const content: ContentBlock[] = [
      { type: 'text', text: 'Hello ' },
      { type: 'tool_use', name: 'Read' },
      { type: 'text', text: 'World' },
    ];
    expect(extractTextContent(content)).toBe('Hello \nWorld');
  });

  it('returns empty string for no text blocks', () => {
    const content: ContentBlock[] = [
      { type: 'tool_use', name: 'Read' },
    ];
    expect(extractTextContent(content)).toBe('');
  });
});

describe('extractToolCalls', () => {
  it('extracts tool calls from content blocks', () => {
    const content: ContentBlock[] = [
      { type: 'text', text: 'Hello' },
      { type: 'tool_use', id: 'tool1', name: 'Read', input: { path: '/test' } },
      { type: 'tool_use', id: 'tool2', name: 'Write', input: { path: '/out' } },
    ];
    const result = extractToolCalls(content, new Date());
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Read');
    expect(result[1].name).toBe('Write');
  });

  it('identifies Task subagent calls', () => {
    const content: ContentBlock[] = [
      {
        type: 'tool_use',
        id: 'task1',
        name: 'Task',
        input: {
          subagent_type: 'Explore',
          description: 'Find auth code',
          prompt: 'Search for authentication',
        },
      },
    ];
    const result = extractToolCalls(content, new Date());
    expect(result).toHaveLength(1);
    expect(result[0].isSubagent).toBe(true);
    expect(result[0].subagentType).toBe('Explore');
    expect(result[0].subagentDescription).toBe('Find auth code');
  });
});

describe('processEvent', () => {
  it('processes assistant message', () => {
    const event: ClaudeEvent = {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Hello world' },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      },
    };
    const result = processEvent(event);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('assistant');
    expect(result?.text).toBe('Hello world');
    expect(result?.usage).toEqual({ input_tokens: 100, output_tokens: 50 });
  });

  it('skips tool_use and tool_result events', () => {
    expect(processEvent({ type: 'tool_use' })).toBeNull();
    expect(processEvent({ type: 'tool_result' })).toBeNull();
  });
});

describe('matchToolResults', () => {
  const createToolCall = (id: string, name: string): ToolCall => ({
    id,
    name,
    input: {},
    status: 'pending',
    isSubagent: false,
    timestamp: new Date(),
  });

  it('matches tool result to tool call by tool_use_id', () => {
    const toolCall = createToolCall('toolu_01XYZ', 'Read');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_01XYZ', toolCall);

    const content: ContentBlock[] = [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_01XYZ',
        content: 'File contents here',
        is_error: false,
      },
    ];

    matchToolResults(toolCalls, content);

    expect(toolCall.status).toBe('completed');
    expect(toolCall.result).toBe('File contents here');
    expect(toolCall.isError).toBe(false);
  });

  it('handles error tool results', () => {
    const toolCall = createToolCall('toolu_error', 'Bash');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_error', toolCall);

    const content: ContentBlock[] = [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_error',
        content: 'Command failed with exit code 1',
        is_error: true,
      },
    ];

    matchToolResults(toolCalls, content);

    expect(toolCall.status).toBe('error');
    expect(toolCall.result).toBe('Command failed with exit code 1');
    expect(toolCall.isError).toBe(true);
  });

  it('handles null content in tool result', () => {
    const toolCall = createToolCall('toolu_null', 'Write');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_null', toolCall);

    const content: ContentBlock[] = [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_null',
        content: undefined,
        is_error: false,
      },
    ];

    matchToolResults(toolCalls, content);

    expect(toolCall.status).toBe('completed');
    expect(toolCall.result).toBe('');
  });

  it('ignores tool results with no matching tool call', () => {
    const toolCall = createToolCall('toolu_different', 'Read');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_different', toolCall);

    const content: ContentBlock[] = [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_unknown',
        content: 'Some result',
        is_error: false,
      },
    ];

    matchToolResults(toolCalls, content);

    // Original tool call should be unchanged
    expect(toolCall.status).toBe('pending');
    expect(toolCall.result).toBeUndefined();
  });

  it('handles multiple tool results at once', () => {
    const toolCall1 = createToolCall('toolu_1', 'Read');
    const toolCall2 = createToolCall('toolu_2', 'Bash');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_1', toolCall1);
    toolCalls.set('toolu_2', toolCall2);

    const content: ContentBlock[] = [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_1',
        content: 'First result',
        is_error: false,
      },
      {
        type: 'tool_result',
        tool_use_id: 'toolu_2',
        content: 'Second result',
        is_error: false,
      },
    ];

    matchToolResults(toolCalls, content);

    expect(toolCall1.status).toBe('completed');
    expect(toolCall1.result).toBe('First result');
    expect(toolCall2.status).toBe('completed');
    expect(toolCall2.result).toBe('Second result');
  });

  it('filters out non-tool_result content blocks', () => {
    const toolCall = createToolCall('toolu_filter', 'Read');
    const toolCalls = new Map<string, ToolCall>();
    toolCalls.set('toolu_filter', toolCall);

    const content: ContentBlock[] = [
      { type: 'text', text: 'Some text' },
      {
        type: 'tool_result',
        tool_use_id: 'toolu_filter',
        content: 'The result',
        is_error: false,
      },
      { type: 'tool_use', id: 'other', name: 'Write', input: {} },
    ];

    matchToolResults(toolCalls, content);

    expect(toolCall.status).toBe('completed');
    expect(toolCall.result).toBe('The result');
  });
});

describe('truncate', () => {
  it('returns original if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
});

describe('formatTokens', () => {
  it('formats small numbers as-is', () => {
    expect(formatTokens(500)).toBe('500');
  });

  it('formats thousands with k suffix', () => {
    expect(formatTokens(1500)).toBe('1.5k');
    expect(formatTokens(45234)).toBe('45.2k');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1500000)).toBe('1.5M');
  });
});

describe('formatDuration', () => {
  it('returns 0s for null', () => {
    expect(formatDuration(null)).toBe('0s');
  });

  it('returns 0s for invalid Date', () => {
    expect(formatDuration(new Date('invalid'))).toBe('0s');
    expect(formatDuration(new Date(NaN))).toBe('0s');
  });

  it('formats seconds', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    expect(formatDuration(thirtySecondsAgo)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 150000); // 2.5 minutes
    expect(formatDuration(twoMinutesAgo)).toBe('2m 30s');
  });
});

describe('getFirstLines', () => {
  it('returns all lines if fewer than limit', () => {
    const result = getFirstLines('line1\nline2', 5);
    expect(result.lines).toEqual(['line1', 'line2']);
    expect(result.hasMore).toBe(false);
  });

  it('returns limited lines with hasMore flag', () => {
    const result = getFirstLines('line1\nline2\nline3\nline4', 2);
    expect(result.lines).toEqual(['line1', 'line2']);
    expect(result.hasMore).toBe(true);
  });
});

describe('calculateStats', () => {
  const createMessage = (
    id: string,
    timestamp: Date,
    toolCalls: ProcessedMessage['toolCalls'] = [],
    usage?: ProcessedMessage['usage']
  ): ProcessedMessage => ({
    id,
    type: 'assistant',
    timestamp,
    text: 'test',
    toolCalls,
    usage,
  });

  it('returns empty stats for empty messages array', () => {
    const result = calculateStats([]);
    expect(result).toEqual({
      totalTokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      toolCallCount: 0,
      messageCount: 0,
      errorCount: 0,
      startTime: null,
      endTime: null,
      subagentCount: 0,
    });
  });

  it('calculates message count and timestamps', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = new Date('2024-01-01T10:30:00Z');
    const messages = [
      createMessage('1', start),
      createMessage('2', new Date('2024-01-01T10:15:00Z')),
      createMessage('3', end),
    ];
    const result = calculateStats(messages);
    expect(result.messageCount).toBe(3);
    expect(result.startTime).toEqual(start);
    expect(result.endTime).toEqual(end);
  });

  it('sums token usage', () => {
    const messages = [
      createMessage('1', new Date(), [], { input_tokens: 100, output_tokens: 50 }),
      createMessage('2', new Date(), [], { input_tokens: 200, output_tokens: 100 }),
    ];
    const result = calculateStats(messages);
    expect(result.totalTokens.input).toBe(300);
    expect(result.totalTokens.output).toBe(150);
  });

  it('includes cache tokens in input total', () => {
    const messages = [
      createMessage('1', new Date(), [], {
        input_tokens: 10,
        output_tokens: 50,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 200,
      }),
    ];
    const result = calculateStats(messages);
    // Total input = input_tokens + cache_read + cache_creation
    expect(result.totalTokens.input).toBe(310); // 10 + 100 + 200
    expect(result.totalTokens.output).toBe(50);
    expect(result.totalTokens.cacheRead).toBe(100);
    expect(result.totalTokens.cacheCreation).toBe(200);
  });

  it('handles messages without cache tokens', () => {
    const messages = [
      createMessage('1', new Date(), [], { input_tokens: 100, output_tokens: 50 }),
    ];
    const result = calculateStats(messages);
    expect(result.totalTokens.input).toBe(100);
    expect(result.totalTokens.cacheRead).toBe(0);
    expect(result.totalTokens.cacheCreation).toBe(0);
  });

  it('sums cache tokens across multiple messages', () => {
    const messages = [
      createMessage('1', new Date(), [], {
        input_tokens: 5,
        output_tokens: 25,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 0,
      }),
      createMessage('2', new Date(), [], {
        input_tokens: 10,
        output_tokens: 50,
        cache_read_input_tokens: 200,
        cache_creation_input_tokens: 50,
      }),
    ];
    const result = calculateStats(messages);
    expect(result.totalTokens.input).toBe(365); // (5+100+0) + (10+200+50)
    expect(result.totalTokens.output).toBe(75);
    expect(result.totalTokens.cacheRead).toBe(300); // 100 + 200
    expect(result.totalTokens.cacheCreation).toBe(50); // 0 + 50
  });

  it('counts tool calls and subagents', () => {
    const messages = [
      createMessage('1', new Date(), [
        { id: 't1', name: 'Read', input: {}, status: 'completed', isSubagent: false, timestamp: new Date() },
        { id: 't2', name: 'Task', input: {}, status: 'completed', isSubagent: true, timestamp: new Date() },
      ]),
      createMessage('2', new Date(), [
        { id: 't3', name: 'Write', input: {}, status: 'error', isError: true, isSubagent: false, timestamp: new Date() },
      ]),
    ];
    const result = calculateStats(messages);
    expect(result.toolCallCount).toBe(3);
    expect(result.subagentCount).toBe(1);
    expect(result.errorCount).toBe(1);
  });
});

describe('calculateSessionStats', () => {
  const createMessage = (
    id: string,
    timestamp: Date,
    usage?: ProcessedMessage['usage']
  ): ProcessedMessage => ({
    id,
    type: 'assistant',
    timestamp,
    text: 'test',
    toolCalls: [],
    usage,
  });

  it('returns empty stats for empty messages', () => {
    const result = calculateSessionStats([], undefined, false);
    expect(result.messageCount).toBe(0);
    expect(result.startTime).toBeNull();
  });

  it('returns stats for all messages when sessionStartIndex is undefined and not running', () => {
    const messages = [
      createMessage('1', new Date('2024-01-01T10:00:00Z'), { input_tokens: 100, output_tokens: 50 }),
      createMessage('2', new Date('2024-01-01T10:10:00Z'), { input_tokens: 200, output_tokens: 100 }),
    ];
    const result = calculateSessionStats(messages, undefined, false);
    expect(result.messageCount).toBe(2);
    expect(result.totalTokens.input).toBe(300);
  });

  it('returns stats only from sessionStartIndex onwards', () => {
    const messages = [
      createMessage('1', new Date('2024-01-01T10:00:00Z'), { input_tokens: 100, output_tokens: 50 }),
      createMessage('2', new Date('2024-01-01T10:10:00Z'), { input_tokens: 200, output_tokens: 100 }),
      createMessage('3', new Date('2024-01-01T10:20:00Z'), { input_tokens: 300, output_tokens: 150 }),
    ];
    const result = calculateSessionStats(messages, 1, true);
    expect(result.messageCount).toBe(2); // Only messages at index 1 and 2
    expect(result.totalTokens.input).toBe(500); // 200 + 300
    expect(result.startTime).toEqual(new Date('2024-01-01T10:10:00Z'));
  });

  it('returns empty stats when Ralph is running but no messages in current session', () => {
    const messages = [
      createMessage('1', new Date('2024-01-01T10:00:00Z')),
    ];
    // sessionStartIndex >= messages.length means no messages in current session yet
    const result = calculateSessionStats(messages, 1, true);
    expect(result.messageCount).toBe(0);
    expect(result.startTime).toBeNull();
  });

  // Regression tests for bug-summary-stats-zero-blank
  // Bug: Summary stats showed 0 when Ralph was running with sessionStartIndex = undefined
  describe('session boundary regression tests', () => {
    it('BUG REGRESSION: should return empty stats when Ralph running with undefined sessionStartIndex', () => {
      // This test documents the EXPECTED behavior:
      // When Ralph is running but sessionStartIndex is undefined, it means we have
      // an invalid state (should have been set when Ralph started). The system
      // returns empty stats in this case as a safety measure.
      const messages = [
        createMessage('1', new Date(), { input_tokens: 100, output_tokens: 50 }),
        createMessage('2', new Date(), { input_tokens: 200, output_tokens: 100 }),
      ];
      const stats = calculateSessionStats(messages, undefined, true);

      // When Ralph is running but sessionStartIndex is undefined, we get empty stats
      // This is the "bug" scenario - the fix is to ensure sessionStartIndex is always
      // set when starting Ralph (to 0 for fresh sessions, or messages.length for resumes)
      expect(stats.messageCount).toBe(0);
      expect(stats.totalTokens.input).toBe(0);
      expect(stats.totalTokens.output).toBe(0);
    });

    it('should calculate stats correctly when sessionStartIndex is 0 (fresh session)', () => {
      // This is the FIXED scenario: Ralph starts with sessionStartIndex = 0
      const messages = [
        createMessage('1', new Date(), { input_tokens: 100, output_tokens: 50 }),
        createMessage('2', new Date(), { input_tokens: 200, output_tokens: 100 }),
      ];
      const stats = calculateSessionStats(messages, 0, true);

      // Should count all messages from index 0
      expect(stats.messageCount).toBe(2);
      expect(stats.totalTokens.input).toBe(300);
      expect(stats.totalTokens.output).toBe(150);
    });

    it('should calculate stats from resume point (sessionStartIndex = messages.length before resume)', () => {
      // Resume scenario: sessionStartIndex is set to the message count at resume time
      const oldMessages = [
        createMessage('1', new Date('2024-01-01T10:00:00Z'), { input_tokens: 100, output_tokens: 50 }),
        createMessage('2', new Date('2024-01-01T10:10:00Z'), { input_tokens: 200, output_tokens: 100 }),
      ];
      const newMessages = [
        createMessage('3', new Date('2024-01-01T11:00:00Z'), { input_tokens: 300, output_tokens: 150 }),
        createMessage('4', new Date('2024-01-01T11:10:00Z'), { input_tokens: 400, output_tokens: 200 }),
      ];
      const allMessages = [...oldMessages, ...newMessages];

      // Resume at index 2 (old messages count)
      const stats = calculateSessionStats(allMessages, 2, true);

      // Should only count new messages (indices 2 and 3)
      expect(stats.messageCount).toBe(2);
      expect(stats.totalTokens.input).toBe(700); // 300 + 400
      expect(stats.totalTokens.output).toBe(350); // 150 + 200
    });

    it('should handle sessionStartIndex at exact boundary (no new messages yet)', () => {
      // Edge case: Ralph just started, no new messages yet
      const messages = [
        createMessage('1', new Date(), { input_tokens: 100, output_tokens: 50 }),
        createMessage('2', new Date(), { input_tokens: 200, output_tokens: 100 }),
      ];

      // Session started at index 2 (messages.length), no new messages yet
      const stats = calculateSessionStats(messages, 2, true);

      // Should show zeros since no new messages in current session
      expect(stats.messageCount).toBe(0);
      expect(stats.totalTokens.input).toBe(0);
      expect(stats.totalTokens.output).toBe(0);
    });
  });
});

describe('extractWorkflowName', () => {
  it('extracts name from full workflow path', () => {
    const result = extractWorkflowName('.ralph/workflows/01-feature-branch-incomplete.md');
    expect(result).toBe('Feature Branch Incomplete');
  });

  it('extracts name from path with different number prefix', () => {
    const result = extractWorkflowName('.ralph/workflows/06-new-work.md');
    expect(result).toBe('New Work');
  });

  it('handles path with "pr" in kebab-case correctly', () => {
    const result = extractWorkflowName('.ralph/workflows/02-feature-branch-pr-ready.md');
    expect(result).toBe('Feature Branch Pr Ready');
  });

  it('handles filename-only input', () => {
    const result = extractWorkflowName('03-pr-pipeline-fix.md');
    expect(result).toBe('Pr Pipeline Fix');
  });

  it('returns null for null input', () => {
    expect(extractWorkflowName(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractWorkflowName(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractWorkflowName('')).toBeNull();
  });
});

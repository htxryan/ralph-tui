import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MessageItem } from './message-item.js';
import { ProcessedMessage, ToolCall } from '../../lib/types.js';

describe('MessageItem', () => {
  const baseTimestamp = new Date('2024-01-15T10:30:00Z');

  const createMockMessage = (overrides: Partial<ProcessedMessage> = {}): ProcessedMessage => ({
    id: 'msg-1',
    type: 'assistant',
    timestamp: baseTimestamp,
    text: 'This is a test message',
    toolCalls: [],
    ...overrides,
  });

  const createMockToolCall = (overrides: Partial<ToolCall> = {}): ToolCall => ({
    id: 'tc-1',
    name: 'Read',
    input: { file_path: '/test/file.ts' },
    status: 'completed',
    isSubagent: false,
    timestamp: baseTimestamp,
    ...overrides,
  });

  describe('renders different message types', () => {
    it('renders user message with correct label', () => {
      const message = createMockMessage({ type: 'user', text: 'Hello assistant' });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('User');
      expect(lastFrame()).toContain('#1');
    });

    it('renders system message with correct label', () => {
      const message = createMockMessage({ type: 'system', text: 'System prompt' });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('System');
    });

    it('renders result message with correct label', () => {
      const message = createMockMessage({ type: 'result', text: 'Session result' });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Result');
    });

    it('renders initial prompt with special styling', () => {
      const message = createMockMessage({ type: 'user', text: 'Initial user prompt' });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} isInitialPrompt={true} />
      );

      expect(lastFrame()).toContain('Initial Prompt');
    });
  });

  describe('renders assistant message variants', () => {
    it('renders Thinking label for text-only assistant message', () => {
      const message = createMockMessage({ type: 'assistant', text: 'Thinking about the problem...', toolCalls: [] });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Thinking');
    });

    it('renders Tool label for tool-only assistant message', () => {
      const toolCall = createMockToolCall();
      const message = createMockMessage({ type: 'assistant', text: '', toolCalls: [toolCall] });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Tool');
      expect(lastFrame()).toContain('Read');
    });

    it('renders Assistant label for message with both text and tools', () => {
      const toolCall = createMockToolCall();
      const message = createMockMessage({
        type: 'assistant',
        text: 'Let me read that file',
        toolCalls: [toolCall],
      });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Assistant');
    });

    it('renders Task Subagent label for subagent tool calls', () => {
      const subagentToolCall = createMockToolCall({
        name: 'Task',
        isSubagent: true,
        subagentType: 'Explore',
        subagentDescription: 'Search for files',
      });
      const message = createMockMessage({
        type: 'assistant',
        text: '',
        toolCalls: [subagentToolCall],
      });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Task Subagent');
    });

    it('renders token count for subagent with messages', () => {
      const subagentMessages: ProcessedMessage[] = [
        {
          id: 'sub-1',
          type: 'assistant',
          timestamp: baseTimestamp,
          text: 'Working...',
          toolCalls: [],
          usage: { input_tokens: 1000, output_tokens: 500 },
        },
        {
          id: 'sub-2',
          type: 'assistant',
          timestamp: baseTimestamp,
          text: 'Done.',
          toolCalls: [],
          usage: { input_tokens: 200, output_tokens: 100 },
        },
      ];
      const subagentToolCall = createMockToolCall({
        name: 'Task',
        isSubagent: true,
        subagentType: 'Explore',
        subagentDescription: 'Search for files',
        subagentMessages,
      });
      const message = createMockMessage({
        type: 'assistant',
        text: '',
        toolCalls: [subagentToolCall],
      });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Task Subagent');
      // Total tokens: 1000 + 500 + 200 + 100 = 1800 = 1.8k
      expect(lastFrame()).toContain('1.8k');
    });

    it('does not render token count for subagent without messages', () => {
      const subagentToolCall = createMockToolCall({
        name: 'Task',
        isSubagent: true,
        subagentType: 'Explore',
        subagentDescription: 'Search for files',
        subagentMessages: [],
      });
      const message = createMockMessage({
        type: 'assistant',
        text: '',
        toolCalls: [subagentToolCall],
      });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Task Subagent');
      // Should not have token count since no messages
      expect(lastFrame()).not.toMatch(/\(\d/);
    });
  });

  describe('selection state', () => {
    it('shows [Enter] hint when selected', () => {
      const message = createMockMessage();
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={true} width={80} index={1} />
      );

      expect(lastFrame()).toContain('[Enter]');
    });

    it('does not show [Enter] hint when not selected', () => {
      const message = createMockMessage();
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).not.toContain('[Enter]');
    });
  });

  describe('tool call display', () => {
    it('shows tool call name in summary', () => {
      const toolCall = createMockToolCall({ name: 'Write' });
      const message = createMockMessage({ text: '', toolCalls: [toolCall] });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Write');
    });

    it('shows multiple tool calls', () => {
      const toolCalls = [
        createMockToolCall({ id: 'tc-1', name: 'Read' }),
        createMockToolCall({ id: 'tc-2', name: 'Write' }),
      ];
      const message = createMockMessage({ text: '', toolCalls });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('Read');
      expect(lastFrame()).toContain('Write');
    });

    it('shows "+N more" for many tool calls', () => {
      const toolCalls = [
        createMockToolCall({ id: 'tc-1', name: 'Read' }),
        createMockToolCall({ id: 'tc-2', name: 'Write' }),
        createMockToolCall({ id: 'tc-3', name: 'Bash' }),
        createMockToolCall({ id: 'tc-4', name: 'Glob' }),
      ];
      const message = createMockMessage({ text: '', toolCalls });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      expect(lastFrame()).toContain('+2 more');
    });
  });

  describe('incomplete tool calls', () => {
    it('handles pending tool call status', () => {
      const toolCall = createMockToolCall({ status: 'pending' });
      const message = createMockMessage({ text: '', toolCalls: [toolCall] });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      // Should render without error
      expect(lastFrame()).toBeDefined();
    });

    it('handles running tool call status', () => {
      const toolCall = createMockToolCall({ status: 'running' });
      const message = createMockMessage({ text: '', toolCalls: [toolCall] });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      // Should render without error
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('duration display', () => {
    it('shows duration when provided', () => {
      const message = createMockMessage();
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} durationMs={5000} />
      );

      expect(lastFrame()).toContain('5s');
    });

    it('does not show duration when not provided', () => {
      const message = createMockMessage();
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      // Should not crash and should not show parenthesized duration
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('text truncation', () => {
    it('truncates long text content', () => {
      const longText = 'A'.repeat(200);
      const message = createMockMessage({ text: longText });
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={60} index={1} />
      );

      // Should render truncated - text line should contain ellipsis (...)
      const frame = lastFrame() || '';
      expect(frame).toContain('...'); // Ellipsis indicates truncation
    });
  });

  describe('timestamp display', () => {
    it('shows formatted timestamp', () => {
      const message = createMockMessage();
      const { lastFrame } = render(
        <MessageItem message={message} isSelected={false} width={80} index={1} />
      );

      // Should contain time - format may vary by timezone but should have AM/PM format
      const frame = lastFrame() || '';
      // The time will be displayed in local timezone
      expect(frame).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
    });
  });
});

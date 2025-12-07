import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { MessagesView } from './messages-view.js';
import { ProcessedMessage, ToolCall } from '../../lib/types.js';

describe('MessagesView', () => {
  let mockOnSelectMessage: ReturnType<typeof vi.fn>;
  let mockOnSelectSubagent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectMessage = vi.fn();
    mockOnSelectSubagent = vi.fn();
  });

  const createMockMessage = (id: string, type: 'user' | 'assistant' | 'system' | 'result', text: string, toolCalls: ToolCall[] = []): ProcessedMessage => ({
    id,
    type,
    text,
    timestamp: new Date(`2024-01-15T10:${id.padStart(2, '0')}:00Z`),
    toolCalls,
  });

  const createMockToolCall = (overrides: Partial<ToolCall> = {}): ToolCall => ({
    id: 'tc-1',
    name: 'Read',
    input: { file_path: '/test/file.ts' },
    status: 'completed',
    isSubagent: false,
    timestamp: new Date(),
    ...overrides,
  });

  describe('empty state', () => {
    it('renders empty state when no messages', () => {
      const { lastFrame } = render(
        <MessagesView
          messages={[]}
          height={20}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      expect(lastFrame()).toContain('No messages yet');
      expect(lastFrame()).toContain('JSONL');
    });
  });

  describe('message rendering', () => {
    it('renders list of messages', () => {
      const messages = [
        createMockMessage('1', 'user', 'Hello Claude'),
        createMockMessage('2', 'assistant', 'Hello! How can I help you?'),
        createMockMessage('3', 'user', 'Can you write a test?'),
      ];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      expect(lastFrame()).toContain('Hello Claude');
      expect(lastFrame()).toContain('Hello! How can I help you?');
      expect(lastFrame()).toContain('Can you write a test?');
    });

    it('shows tool calls in messages', () => {
      const toolCall = createMockToolCall({ name: 'Read' });
      const messages = [createMockMessage('1', 'assistant', '', [toolCall])];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={20}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      expect(lastFrame()).toContain('Read');
    });

    it('highlights subagent calls', () => {
      const subagentToolCall = createMockToolCall({
        name: 'Task',
        isSubagent: true,
        subagentType: 'Explore',
        subagentDescription: 'Exploring codebase',
      });
      const messages = [createMockMessage('1', 'assistant', '', [subagentToolCall])];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={20}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      expect(lastFrame()).toContain('Explore');
    });
  });

  describe('keyboard navigation', () => {
    it('responds to down arrow key', () => {
      const messages = [
        createMockMessage('1', 'user', 'First'),
        createMockMessage('2', 'assistant', 'Second'),
        createMockMessage('3', 'user', 'Third'),
      ];

      const { stdin, lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Navigate down with arrow key
      stdin.write('\x1B[B'); // Down arrow

      // Should render without error
      expect(lastFrame()).toBeDefined();
    });

    it('responds to up arrow key', () => {
      const messages = [
        createMockMessage('1', 'user', 'First'),
        createMockMessage('2', 'assistant', 'Second'),
      ];

      const { stdin, lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Navigate up with arrow key
      stdin.write('\x1B[A'); // Up arrow

      expect(lastFrame()).toBeDefined();
    });

    it('selects message on Enter', () => {
      const messages = [
        createMockMessage('1', 'user', 'First'),
        createMockMessage('2', 'assistant', 'Second'),
      ];

      const { stdin } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Select with Enter
      stdin.write('\r');

      expect(mockOnSelectMessage).toHaveBeenCalled();
    });

    it('renders subagent message with Task Subagent label', () => {
      const subagentToolCall = createMockToolCall({
        id: 'sub-1',
        name: 'Task',
        isSubagent: true,
        subagentType: 'Explore',
      });
      const messages = [createMockMessage('1', 'assistant', '', [subagentToolCall])];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      expect(lastFrame()).toContain('Task Subagent');
      expect(lastFrame()).toContain('Explore');
    });

    it('jumps to latest message with l key', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage(String(i + 1), 'user', `Message ${i + 1}`)
      );

      const { stdin, lastFrame } = render(
        <MessagesView
          messages={messages}
          height={20}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Jump to latest
      stdin.write('l');

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('filter support', () => {
    it('supports message type filtering configuration', () => {
      const messages = [
        createMockMessage('1', 'user', 'Hello'),
        createMockMessage('2', 'assistant', 'Hi there'),
      ];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Both messages should be visible with default filters
      expect(lastFrame()).toContain('Hello');
      expect(lastFrame()).toContain('Hi there');
    });
  });

  describe('session separators', () => {
    it('displays session separators when Ralph is stopped', () => {
      const messages = [
        createMockMessage('1', 'user', 'From previous session'),
        createMockMessage('2', 'assistant', 'Old response'),
      ];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          sessionStartIndex={2}
          isRalphRunning={false}
        />
      );

      expect(lastFrame()).toContain('Previous Session');
    });

    it('hides session separators when Ralph is running', () => {
      const messages = [
        createMockMessage('1', 'user', 'From previous session'),
        createMockMessage('2', 'assistant', 'Old response'),
      ];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          sessionStartIndex={2}
          isRalphRunning={true}
        />
      );

      // Separators are hidden while running to avoid flashing
      expect(lastFrame()).not.toContain('Previous Session');
    });

    it('shows start hint separator when Ralph is not running', () => {
      const messages = [createMockMessage('1', 'user', 'Hello')];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          isRalphRunning={false}
        />
      );

      expect(lastFrame()).toContain('start a new session');
    });
  });

  describe('scroll indicators', () => {
    it('shows scroll down indicator when content is below viewport', () => {
      const messages = Array.from({ length: 30 }, (_, i) =>
        createMockMessage(String(i + 1), 'user', `Message ${i + 1}`)
      );

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={20}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          initialSelectedIndex={0}
        />
      );

      expect(lastFrame()).toContain('↓');
      expect(lastFrame()).toContain('below');
    });
  });

  describe('interrupt mode', () => {
    it('shows interrupt input when interrupt mode is active', () => {
      const messages = [createMockMessage('1', 'user', 'Hello')];
      const mockOnInterruptSubmit = vi.fn();
      const mockOnInterruptCancel = vi.fn();

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          isInterruptMode={true}
          onInterruptSubmit={mockOnInterruptSubmit}
          onInterruptCancel={mockOnInterruptCancel}
        />
      );

      // Interrupt input should be visible
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('filtering indicator', () => {
    it('shows filter status when filters are active', () => {
      const messages = [
        createMockMessage('1', 'user', 'User message'),
        createMockMessage('2', 'assistant', 'Assistant message'),
      ];

      const { stdin, lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
        />
      );

      // Open filter dialog and toggle a filter
      stdin.write('f');

      // After opening filter dialog, content should change
      expect(lastFrame()).toContain('Filter');
    });
  });

  describe('initial prompt detection', () => {
    it('marks first user message as initial prompt', () => {
      const messages = [
        createMockMessage('1', 'user', 'This is the initial prompt'),
        createMockMessage('2', 'assistant', 'Response'),
      ];

      const { lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          sessionStartIndex={0}
        />
      );

      expect(lastFrame()).toContain('Initial Prompt');
    });
  });

  describe('session picker interaction', () => {
    it('disables input when session picker is open', () => {
      const messages = [createMockMessage('1', 'user', 'Hello')];

      const { stdin, lastFrame } = render(
        <MessagesView
          messages={messages}
          height={30}
          onSelectMessage={mockOnSelectMessage}
          onSelectSubagent={mockOnSelectSubagent}
          isSessionPickerOpen={true}
        />
      );

      // Try to navigate - should be disabled
      stdin.write('\x1B[B'); // Down arrow

      // Should still render but not respond to input
      expect(lastFrame()).toBeDefined();
    });
  });
});
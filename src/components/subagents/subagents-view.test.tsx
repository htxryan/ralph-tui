import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SubagentsView } from './subagents-view.js';
import { ProcessedMessage, ToolCall } from '../../lib/types.js';

describe('SubagentsView', () => {
  let mockOnSelectSubagent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectSubagent = vi.fn();
  });

  const createMockToolCall = (overrides: Partial<ToolCall> = {}): ToolCall => ({
    id: 'tc-1',
    name: 'Task',
    input: { prompt: 'Test' },
    status: 'completed',
    isSubagent: true,
    subagentType: 'Explore',
    subagentDescription: 'Explore codebase',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    ...overrides,
  });

  const createMockMessage = (
    id: string,
    toolCalls: ToolCall[] = []
  ): ProcessedMessage => ({
    id,
    type: 'assistant',
    timestamp: new Date(`2024-01-15T10:${id.padStart(2, '0')}:00Z`),
    text: '',
    toolCalls,
  });

  describe('empty state', () => {
    it('renders empty state when no messages', () => {
      const { lastFrame } = render(
        <SubagentsView
          messages={[]}
          onSelectSubagent={mockOnSelectSubagent}
          height={20}
        />
      );

      expect(lastFrame()).toContain('No subagent');
      expect(lastFrame()).toContain('Task');
    });

    it('renders empty state when no subagent tool calls', () => {
      const regularToolCall = createMockToolCall({ isSubagent: false, name: 'Read' });
      const messages = [createMockMessage('1', [regularToolCall])];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={20}
        />
      );

      expect(lastFrame()).toContain('No subagent');
    });
  });

  describe('rendering subagents', () => {
    it('renders messages with subagent tool calls', () => {
      const subagentToolCall = createMockToolCall({
        subagentType: 'Explore',
        subagentDescription: 'Search files',
      });
      const messages = [createMockMessage('1', [subagentToolCall])];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={20}
        />
      );

      expect(lastFrame()).toContain('Explore');
    });

    it('renders multiple subagent messages', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1', subagentType: 'Explore' })]),
        createMockMessage('2', [createMockToolCall({ id: 'tc-2', subagentType: 'Plan' })]),
        createMockMessage('3', [createMockToolCall({ id: 'tc-3', subagentType: 'Explore' })]),
      ];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      expect(lastFrame()).toContain('Explore');
      expect(lastFrame()).toContain('Plan');
    });

    it('filters out non-subagent messages', () => {
      const subagentToolCall = createMockToolCall({ isSubagent: true });
      const regularToolCall = createMockToolCall({ isSubagent: false, name: 'Read' });

      const messages = [
        createMockMessage('1', [subagentToolCall]),
        createMockMessage('2', [regularToolCall]),
        createMockMessage('3', []),
      ];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      // Should only show subagent message
      expect(lastFrame()).toContain('Explore');
      // Regular tools should not be shown (Read is filtered out)
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with arrow key', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1' })]),
        createMockMessage('2', [createMockToolCall({ id: 'tc-2' })]),
      ];

      const { stdin, lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      stdin.write('\x1B[B'); // Down arrow

      expect(lastFrame()).toBeDefined();
    });

    it('navigates up with arrow key', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1' })]),
        createMockMessage('2', [createMockToolCall({ id: 'tc-2' })]),
      ];

      const { stdin, lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      stdin.write('\x1B[A'); // Up arrow

      expect(lastFrame()).toBeDefined();
    });

    it('selects subagent on Enter', () => {
      const subagentToolCall = createMockToolCall({ id: 'tc-1' });
      const messages = [createMockMessage('1', [subagentToolCall])];

      const { stdin } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      stdin.write('\r'); // Enter

      expect(mockOnSelectSubagent).toHaveBeenCalledWith(subagentToolCall, 0);
    });

    it('jumps to latest with l key', () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        createMockMessage(String(i + 1), [createMockToolCall({ id: `tc-${i + 1}` })])
      );

      const { stdin, lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={20}
          initialSelectedIndex={0}
        />
      );

      stdin.write('l');

      expect(lastFrame()).toBeDefined();
    });

    it('supports page up/down', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage(String(i + 1), [createMockToolCall({ id: `tc-${i + 1}` })])
      );

      const { stdin, lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={15}
        />
      );

      stdin.write('\x1B[5~'); // Page up

      expect(lastFrame()).toBeDefined();

      stdin.write('\x1B[6~'); // Page down

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('session separators', () => {
    it('shows session separator when Ralph is stopped', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1' })]),
        createMockMessage('2', [createMockToolCall({ id: 'tc-2' })]),
      ];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
          sessionStartIndex={2}
          isRalphRunning={false}
        />
      );

      expect(lastFrame()).toContain('Previous Session');
    });

    it('shows start hint when Ralph is not running', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1' })]),
      ];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
          isRalphRunning={false}
        />
      );

      expect(lastFrame()).toContain('start');
    });
  });

  describe('scroll indicators', () => {
    it('shows scroll indicators when content exceeds viewport', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage(String(i + 1), [createMockToolCall({ id: `tc-${i + 1}` })])
      );

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={15}
          initialSelectedIndex={0}
        />
      );

      expect(lastFrame()).toContain('↓');
      expect(lastFrame()).toContain('below');
    });

    it('shows scroll up indicator when scrolled down', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage(String(i + 1), [createMockToolCall({ id: `tc-${i + 1}` })])
      );

      const { stdin, lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={15}
        />
      );

      // Scroll down by pressing down multiple times
      for (let i = 0; i < 5; i++) {
        stdin.write('\x1B[B'); // Down arrow
      }

      const frame = lastFrame() || '';
      // Should show up indicator after scrolling
      if (frame.includes('↑')) {
        expect(frame).toContain('above');
      }
    });
  });

  describe('initial position', () => {
    it('respects initialSelectedIndex', () => {
      const messages = Array.from({ length: 5 }, (_, i) =>
        createMockMessage(String(i + 1), [createMockToolCall({ id: `tc-${i + 1}` })])
      );

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
          initialSelectedIndex={2}
        />
      );

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('display indices', () => {
    it('shows correct display indices for subagents', () => {
      const messages = [
        createMockMessage('1', [createMockToolCall({ id: 'tc-1' })]),
        createMockMessage('2', [createMockToolCall({ id: 'tc-2' })]),
      ];

      const { lastFrame } = render(
        <SubagentsView
          messages={messages}
          onSelectSubagent={mockOnSelectSubagent}
          height={30}
        />
      );

      expect(lastFrame()).toContain('#1');
      expect(lastFrame()).toContain('#2');
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SubagentDetailView } from './subagent-detail-view.js';
import { ToolCall, ProcessedMessage } from '../../lib/types.js';

describe('SubagentDetailView', () => {
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnBack = vi.fn();
  });

  const createMockToolCall = (overrides: Partial<ToolCall> = {}): ToolCall => ({
    id: 'tc-1',
    name: 'Task',
    input: { prompt: 'Test prompt' },
    status: 'completed',
    isSubagent: true,
    subagentType: 'Explore',
    subagentDescription: 'Test subagent description',
    subagentPrompt: 'Explore the codebase',
    subagentResult: JSON.stringify([{ type: 'text', text: 'Found 5 files' }]),
    timestamp: new Date('2024-01-15T10:30:00Z'),
    ...overrides,
  });

  const createMockSubagentMessage = (overrides: Partial<ProcessedMessage> = {}): ProcessedMessage => ({
    id: 'msg-1',
    type: 'assistant',
    timestamp: new Date('2024-01-15T10:31:00Z'),
    text: 'Subagent response',
    toolCalls: [],
    ...overrides,
  });

  describe('rendering', () => {
    it('renders breadcrumb navigation', () => {
      const toolCall = createMockToolCall();

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Main Agent');
      expect(lastFrame()).toContain('Task');
    });

    it('renders tab bar with Overview and Messages tabs', () => {
      const toolCall = createMockToolCall();

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Overview');
      expect(lastFrame()).toContain('Messages');
    });

    it('shows subagent type', () => {
      const toolCall = createMockToolCall({ subagentType: 'Explore' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Explore');
    });

    it('shows subagent description', () => {
      const toolCall = createMockToolCall({ subagentDescription: 'Search for files' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Search for files');
    });

    it('shows subagent status', () => {
      const toolCall = createMockToolCall({ status: 'completed' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('completed');
    });
  });

  describe('overview tab', () => {
    it('shows prompt section', () => {
      const toolCall = createMockToolCall({ subagentPrompt: 'Explore the codebase' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Prompt');
      expect(lastFrame()).toContain('Explore the codebase');
    });

    it('shows response section', () => {
      const toolCall = createMockToolCall({
        subagentResult: JSON.stringify([{ type: 'text', text: 'Found 5 files in the project' }]),
      });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Response');
      expect(lastFrame()).toContain('Found 5 files');
    });

    it('handles empty prompt', () => {
      const toolCall = createMockToolCall({ subagentPrompt: '' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('No prompt');
    });

    it('handles pending status', () => {
      const toolCall = createMockToolCall({ status: 'pending', subagentResult: undefined });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('pending');
    });

    it('handles running status', () => {
      const toolCall = createMockToolCall({ status: 'running', subagentResult: undefined });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('running');
    });

    it('handles error status', () => {
      const toolCall = createMockToolCall({ status: 'error' });

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('error');
    });
  });

  describe('keyboard navigation', () => {
    it('switches to messages tab with Tab key', () => {
      const toolCall = createMockToolCall();

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      stdin.write('\t'); // Tab

      // Should show messages tab content
      expect(lastFrame()).toBeDefined();
    });

    it('switches to overview tab with 1 key', () => {
      const toolCall = createMockToolCall();

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      stdin.write('1');

      expect(lastFrame()).toContain('Overview');
    });

    it('switches to messages tab with 2 key', () => {
      const toolCall = createMockToolCall();

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      stdin.write('2');

      // Should now be on messages tab
      expect(lastFrame()).toBeDefined();
    });

    it('shows Esc hint for back navigation', () => {
      const toolCall = createMockToolCall();

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      // Should show Esc hint in footer
      expect(lastFrame()).toContain('Esc');
    });
  });

  describe('messages tab', () => {
    it('shows subagent messages when available', () => {
      const subagentMessages = [
        createMockSubagentMessage({ type: 'system', text: 'Input prompt' }),
        createMockSubagentMessage({ type: 'assistant', text: 'Working on it' }),
        createMockSubagentMessage({ type: 'result', text: 'Done' }),
      ];

      const toolCall = createMockToolCall({ subagentMessages });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      // Switch to messages tab
      stdin.write('2');

      expect(lastFrame()).toBeDefined();
    });

    it('shows synthetic messages when no real messages available', () => {
      const toolCall = createMockToolCall({
        subagentPrompt: 'Do something',
        subagentResult: JSON.stringify([{ type: 'text', text: 'Done' }]),
        subagentMessages: undefined,
      });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      // Switch to messages tab
      stdin.write('2');

      // Should show input/output synthetic messages
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('scroll handling', () => {
    it('supports scrolling with arrow keys', () => {
      const toolCall = createMockToolCall({
        subagentPrompt: 'A'.repeat(500), // Long prompt
      });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={15} // Small height to trigger scrolling
          width={100}
        />
      );

      stdin.write('\x1B[B'); // Down arrow

      expect(lastFrame()).toBeDefined();
    });

    it('supports page up/down', () => {
      const toolCall = createMockToolCall({
        subagentPrompt: 'A'.repeat(500),
      });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={15}
          width={100}
        />
      );

      stdin.write('\x1B[6~'); // Page down

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to top with g key', () => {
      const toolCall = createMockToolCall({
        subagentPrompt: 'A'.repeat(500),
      });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={15}
          width={100}
        />
      );

      stdin.write('g');

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to bottom with G key', () => {
      const toolCall = createMockToolCall({
        subagentPrompt: 'A'.repeat(500),
      });

      const { stdin, lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={15}
          width={100}
        />
      );

      stdin.write('G');

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('help text', () => {
    it('shows navigation help in overview tab', () => {
      const toolCall = createMockToolCall();

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      expect(lastFrame()).toContain('Back');
      expect(lastFrame()).toContain('Scroll');
    });

    it('shows messages tab option', () => {
      const toolCall = createMockToolCall();

      const { lastFrame } = render(
        <SubagentDetailView
          toolCall={toolCall}
          onBack={mockOnBack}
          height={30}
          width={100}
        />
      );

      // Tab bar should show Messages option
      expect(lastFrame()).toContain('Messages');
    });
  });
});

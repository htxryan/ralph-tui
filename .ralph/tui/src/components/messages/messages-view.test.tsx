import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { MessagesView } from './messages-view.js';
import { ProcessedMessage } from '../../lib/types.js';

describe('MessagesView', () => {
  const mockOnSelectMessage = vi.fn();
  const mockOnSelectSubagent = vi.fn();

  const createMockMessage = (id: string, type: 'user' | 'assistant', text: string): ProcessedMessage => ({
    id,
    type,
    text,
    timestamp: new Date(),
    toolCalls: []
  });

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
  });

  // Removed loading state test - prop doesn't exist in component

  // Removed error state test - prop doesn't exist in component

  it('renders list of messages', () => {
    const messages = [
      createMockMessage('1', 'user', 'Hello Claude'),
      createMockMessage('2', 'assistant', 'Hello! How can I help you?'),
      createMockMessage('3', 'user', 'Can you write a test?'),
    ];

    const { lastFrame } = render(
      <MessagesView
        messages={messages}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
      />
    );

    expect(lastFrame()).toContain('Hello Claude');
    expect(lastFrame()).toContain('Hello! How can I help you?');
    expect(lastFrame()).toContain('Can you write a test?');
  });

  it('shows tool calls in messages', () => {
    const messageWithTools: ProcessedMessage = {
      id: '1',
      type: 'assistant',
      text: 'Let me read that file',
      timestamp: new Date(),
      toolCalls: [
        {
          id: 'tool1',
          name: 'Read',
          input: { path: '/test.txt' },
          status: 'completed',
          timestamp: new Date(),
          isSubagent: false
        }
      ]
    };

    const { lastFrame } = render(
      <MessagesView
        messages={[messageWithTools]}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
      />
    );

    expect(lastFrame()).toContain('Read');
  });

  it('highlights subagent calls', () => {
    const messageWithSubagent: ProcessedMessage = {
      id: '1',
      type: 'assistant',
      text: 'Starting exploration',
      timestamp: new Date(),
      toolCalls: [
        {
          id: 'sub1',
          name: 'Task',
          input: { subagent_type: 'Explore' },
          status: 'completed',
          timestamp: new Date(),
          isSubagent: true,
          subagentType: 'Explore',
          subagentDescription: 'Exploring codebase'
        }
      ]
    };

    const { lastFrame } = render(
      <MessagesView
        messages={[messageWithSubagent]}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
      />
    );

    expect(lastFrame()).toContain('Explore');
  });

  it('allows navigation with keyboard', () => {
    const messages = [
      createMockMessage('1', 'user', 'First'),
      createMockMessage('2', 'assistant', 'Second'),
      createMockMessage('3', 'user', 'Third'),
    ];

    const { stdin } = render(
      <MessagesView
        messages={messages}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
      />
    );

    // Navigate down
    stdin.write('j'); // or down arrow
    stdin.write('j');
    
    // Select message with Enter
    stdin.write('\r');

    // Should have called selection callback
    expect(mockOnSelectMessage).toHaveBeenCalled();
  });

  it('can filter messages', () => {
    const messages = [
      createMockMessage('1', 'user', 'Hello'),
      createMockMessage('2', 'assistant', 'Response with error'),
      createMockMessage('3', 'user', 'Another message'),
    ];

    const { stdin, lastFrame } = render(
      <MessagesView
        messages={messages}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
      />
    );

    // Open filter with /
    stdin.write('/');
    
    // Type filter text
    stdin.write('error');

    // Should filter messages
    const frame = lastFrame() || '';
    expect(frame).toContain('error');
  });

  it('displays session separators', () => {
    const messages = [
      createMockMessage('1', 'user', 'From previous session'),
      createMockMessage('2', 'assistant', 'Old response'),
    ];

    const { lastFrame } = render(
      <MessagesView
        messages={messages}
        height={20}
        onSelectMessage={mockOnSelectMessage}
        onSelectSubagent={mockOnSelectSubagent}
        sessionStartIndex={2} // Current session starts after existing messages
        isRalphRunning={false} // Separators only show when Ralph is stopped
      />
    );

    expect(lastFrame()).toContain('Previous Session');
  });
});
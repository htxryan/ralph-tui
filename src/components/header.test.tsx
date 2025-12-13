import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './header.js';
import { SessionStats, KanbanTask, Assignment } from '../lib/types.js';

describe('Header', () => {
  const mockStats: SessionStats = {
    totalTokens: { input: 100, output: 50, cacheRead: 0, cacheCreation: 0 },
    toolCallCount: 5,
    messageCount: 10,
    errorCount: 0,
    startTime: new Date(Date.now() - 60000), // 1 minute ago
    endTime: null,
    subagentCount: 0,
  };

  it('renders Ralph TUI title', () => {
    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Ralph TUI');
    expect(lastFrame()).toContain('Idle');
  });

  it('shows Running status when Ralph is running', () => {
    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={true}
      />
    );

    expect(lastFrame()).toContain('Running - Orchestrator');
  });

  it('displays executing status when next_step is provided', () => {
    const assignment: Assignment = {
      task_id: 'ISSUE-123',
      next_step: 'Implement the feature',
      pull_request_url: null
    };

    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={true}
        assignment={assignment}
      />
    );

    expect(lastFrame()).toContain('Running - Executing');
  });

  it('displays task information when provided', () => {
    const task: KanbanTask = {
      id: 'test-123',
      title: 'Test Task Title',
      status: 'in_progress',
      type: 'feature',
      priority: 'medium' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { lastFrame } = render(
      <Header
        task={task}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('test-123');
    expect(lastFrame()).toContain('Test Task Title');
    expect(lastFrame()).toContain('in_progress');
  });

  it('shows error status when error is present', () => {
    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={false}
        error={new Error('Test error')}
      />
    );

    expect(lastFrame()).toContain('Error');
  });

  it('displays token counts', () => {
    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Tokens:');
    expect(lastFrame()).toContain('100 in'); // Input tokens
    expect(lastFrame()).toContain('50 out'); // Output tokens
  });

  it('displays cached token info when cache is used', () => {
    const statsWithCache: SessionStats = {
      ...mockStats,
      totalTokens: { input: 150, output: 50, cacheRead: 45, cacheCreation: 0 },
    };
    const { lastFrame } = render(
      <Header
        task={null}
        stats={statsWithCache}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Tokens:');
    expect(lastFrame()).toContain('150 in'); // Total input (includes cached)
    expect(lastFrame()).toContain('45 cached'); // Cached portion
    expect(lastFrame()).toContain('50 out'); // Output tokens
  });

  it('displays session statistics', () => {
    const { lastFrame } = render(
      <Header
        task={null}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Tools: 5');
    expect(lastFrame()).toContain('Msgs: 10');
    expect(lastFrame()).toContain('Time:');
  });

  it('displays error count when present', () => {
    const statsWithErrors: SessionStats = {
      ...mockStats,
      errorCount: 3,
    };

    const { lastFrame } = render(
      <Header
        task={null}
        stats={statsWithErrors}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Errors: 3');
  });
});
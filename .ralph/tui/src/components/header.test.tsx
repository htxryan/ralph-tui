import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './header.js';
import { SessionStats, BDIssue, Assignment } from '../lib/types.js';

describe('Header', () => {
  const mockStats: SessionStats = {
    totalTokens: { input: 100, output: 50 },
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
        issue={null}
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
        issue={null}
        stats={mockStats}
        isRalphRunning={true}
      />
    );

    expect(lastFrame()).toContain('Running - Orchestrator');
  });

  it('displays workflow name when provided', () => {
    const assignment: Assignment = {
      workflow: '.ralph/workflows/01-new-work.md',
      bd_issue: undefined
    };

    const { lastFrame } = render(
      <Header
        issue={null}
        stats={mockStats}
        isRalphRunning={true}
        assignment={assignment}
      />
    );

    expect(lastFrame()).toContain('Running - New Work');
  });

  it('displays issue information when provided', () => {
    const issue: BDIssue = {
      id: 'test-123',
      title: 'Test Issue Title',
      status: 'in_progress',
      type: 'feature',
      priority: 'medium' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { lastFrame } = render(
      <Header
        issue={issue}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('test-123');
    expect(lastFrame()).toContain('Test Issue Title');
    expect(lastFrame()).toContain('in_progress');
  });

  it('shows error status when error is present', () => {
    const { lastFrame } = render(
      <Header
        issue={null}
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
        issue={null}
        stats={mockStats}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Tokens:');
    expect(lastFrame()).toContain('150'); // Total tokens
    expect(lastFrame()).toContain('100in'); // Input tokens
    expect(lastFrame()).toContain('50out'); // Output tokens
  });

  it('displays session statistics', () => {
    const { lastFrame } = render(
      <Header
        issue={null}
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
        issue={null}
        stats={statsWithErrors}
        isRalphRunning={false}
      />
    );

    expect(lastFrame()).toContain('Errors: 3');
  });
});
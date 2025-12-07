import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatsView } from './stats-view.js';
import { SessionStats } from '../../lib/types.js';

describe('StatsView', () => {
  const createMockStats = (overrides: Partial<SessionStats> = {}): SessionStats => ({
    totalTokens: { input: 1000, output: 500, cacheRead: 0, cacheCreation: 0 },
    toolCallCount: 10,
    messageCount: 20,
    errorCount: 0,
    startTime: new Date('2024-01-15T10:30:00Z'),
    endTime: null,
    subagentCount: 2,
    ...overrides,
  });

  describe('rendering', () => {
    it('renders session statistics header', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Session Statistics');
    });

    it('shows Active status when Ralph is running', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={true}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Active');
    });

    it('shows Ended status when Ralph is stopped with messages', () => {
      const stats = createMockStats({
        endTime: new Date('2024-01-15T11:00:00Z'),
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Ended');
    });

    it('shows No Session status when no messages', () => {
      const stats = createMockStats({
        messageCount: 0,
        startTime: null,
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('No Session');
    });
  });

  describe('timing section', () => {
    it('shows start time', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Started');
      expect(lastFrame()).toContain('2024-01-15');
      // Time is shown in local timezone
      expect(lastFrame()).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('shows end time when session ended', () => {
      const stats = createMockStats({
        endTime: new Date('2024-01-15T11:00:00Z'),
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Ended');
      // Time is shown in local timezone
      expect(lastFrame()).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('hides end time when Ralph is running', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={true}
          cwd="/test/project"
        />
      );

      // Should not show "Ended" line
      const frame = lastFrame() || '';
      const endedOccurrences = (frame.match(/Ended/g) || []).length;
      expect(endedOccurrences).toBe(0);
    });

    it('shows duration', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Duration');
    });
  });

  describe('activity section', () => {
    it('shows message count', () => {
      const stats = createMockStats({ messageCount: 25 });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Messages');
      expect(lastFrame()).toContain('25');
    });

    it('shows tool call count', () => {
      const stats = createMockStats({ toolCallCount: 15 });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Tool Calls');
      expect(lastFrame()).toContain('15');
    });

    it('shows subagent count', () => {
      const stats = createMockStats({ subagentCount: 3 });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Subagents');
      expect(lastFrame()).toContain('3');
    });

    it('shows error count when present', () => {
      const stats = createMockStats({ errorCount: 5 });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Errors');
      expect(lastFrame()).toContain('5');
    });

    it('hides error count when zero', () => {
      const stats = createMockStats({ errorCount: 0 });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      // Should not show Errors row when count is 0
      // But the word might appear elsewhere, so we check it's not followed by 0
      const frame = lastFrame() || '';
      expect(frame).not.toMatch(/Errors.*0/);
    });
  });

  describe('token usage section', () => {
    it('shows input tokens', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 0, cacheCreation: 0 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Input');
      expect(lastFrame()).toContain('5');
    });

    it('shows output tokens', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 0, cacheCreation: 0 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Output');
      expect(lastFrame()).toContain('2');
    });

    it('shows total tokens', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 0, cacheCreation: 0 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Total');
      expect(lastFrame()).toContain('7'); // 5000 + 2000 = 7000 -> 7K
    });

    it('shows cache read tokens when present', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 3000, cacheCreation: 0 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('From cache');
      expect(lastFrame()).toContain('3'); // 3000 -> 3k
    });

    it('shows cache creation tokens when present', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 0, cacheCreation: 1500 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Cached');
      expect(lastFrame()).toContain('1.5'); // 1500 -> 1.5k
    });

    it('hides cache rows when no cache usage', () => {
      const stats = createMockStats({
        totalTokens: { input: 5000, output: 2000, cacheRead: 0, cacheCreation: 0 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).not.toContain('From cache');
      expect(lastFrame()).not.toContain('Cached');
    });
  });

  describe('environment section', () => {
    it('shows working directory', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Working Dir');
      expect(lastFrame()).toContain('/test/project');
    });
  });

  describe('empty session hint', () => {
    it('shows start hint when no session', () => {
      const stats = createMockStats({
        messageCount: 0,
        startTime: null,
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      expect(lastFrame()).toContain('Press');
      expect(lastFrame()).toContain('s');
      expect(lastFrame()).toContain('start');
    });

    it('hides start hint when session exists', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      // Should not show the start hint
      const frame = lastFrame() || '';
      expect(frame).not.toMatch(/Press.*s.*start a new/);
    });
  });

  describe('large numbers', () => {
    it('formats large token counts', () => {
      const stats = createMockStats({
        totalTokens: { input: 150000, output: 50000 },
      });

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
        />
      );

      // Should show formatted numbers (e.g., 150.0k)
      expect(lastFrame()).toContain('k');
    });
  });

  describe('running indicator', () => {
    it('shows running indicator when Ralph is active', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={true}
          cwd="/test/project"
        />
      );

      // Should show running status with indicator
      expect(lastFrame()).toContain('Active');
    });
  });

  describe('height handling', () => {
    it('respects custom height', () => {
      const stats = createMockStats();

      const { lastFrame } = render(
        <StatsView
          sessionStats={stats}
          isRalphRunning={false}
          cwd="/test/project"
          height={40}
        />
      );

      expect(lastFrame()).toBeDefined();
    });
  });
});

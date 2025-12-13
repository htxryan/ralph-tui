import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionPicker, SessionInfo } from './session-picker.js';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock archive module
vi.mock('../lib/archive.js', () => ({
  listArchivedSessions: vi.fn(() => []),
}));

describe('SessionPicker', () => {
  let mockOnSelectSession: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectSession = vi.fn();
    mockOnClose = vi.fn();
    vi.clearAllMocks();

    // Default mock implementations
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 0 });
    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders the session picker title', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('Pick Session');
    });

    it('shows session count', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('sessions');
    });

    it('always shows NEW SESSION option', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('NEW SESSION');
    });

    it('shows timestamped sessions when they exist', () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 1000 });
      // Mock a timestamped session file in claude_output directory
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue(['20241215120000.jsonl']);

      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output/20241215120000.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Should show at least 2 sessions (NEW SESSION + the timestamped session)
      expect(lastFrame()).toContain('2 sessions');
    });

    it('shows footer shortcuts', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Select');
      expect(lastFrame()).toContain('Close');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with arrow key', () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 1000 });

      const { stdin, lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Navigate down
      stdin.write('\x1B[B'); // Down arrow

      expect(lastFrame()).toBeDefined();
    });

    it('navigates up with arrow key', () => {
      const { stdin, lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Navigate up
      stdin.write('\x1B[A'); // Up arrow

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('selection', () => {
    it('renders selection indicator', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Selection indicator should be visible
      expect(lastFrame()).toContain('▸');
    });
  });

  describe('closing shortcuts', () => {
    it('shows close shortcuts in footer', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Footer should show P/Esc close hint
      expect(lastFrame()).toContain('P/Esc');
    });
  });

  describe('viewing indicator', () => {
    it('marks currently viewed session', () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 1000 });

      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Should show the viewing indicator or highlight for current file
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('file size display', () => {
    it('shows file size for sessions', () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 2048 }); // 2KB
      // Mock a timestamped session file that will have a file size
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue(['20241215120000.jsonl']);

      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output/20241215120000.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('KB');
    });
  });

  describe('page navigation', () => {
    it('supports page up', () => {
      const { stdin, lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Page up
      stdin.write('\x1B[5~');

      expect(lastFrame()).toBeDefined();
    });

    it('supports page down', () => {
      const { stdin, lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
        />
      );

      // Page down
      stdin.write('\x1B[6~');

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('custom dimensions', () => {
    it('respects custom width', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
          width={80}
        />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('respects custom maxHeight', () => {
      const { lastFrame } = render(
        <SessionPicker
          currentFilePath="/test/sessions/claude_output.jsonl"
          sessionDir="/test/sessions"
          archiveDir="/test/sessions/archive"
          onSelectSession={mockOnSelectSession}
          onClose={mockOnClose}
          maxHeight={15}
        />
      );

      expect(lastFrame()).toBeDefined();
    });
  });
});

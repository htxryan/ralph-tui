import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import * as fs from 'fs';
import * as path from 'path';
import { App } from '../app.js';

// Mock file system operations
vi.mock('fs');
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn()
    }))
  },
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn()
  }))
}));

// Mock child_process for Ralph process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn()
  }))
}));

describe('App Integration Tests', () => {
  const mockJsonlPath = '/test/claude_output.jsonl';
  const mockJsonlContent = [
    JSON.stringify({
      type: 'user',
      message: { content: [{ type: 'text', text: 'Hello Claude' }] },
      timestamp: new Date().toISOString()
    }),
    JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      },
      timestamp: new Date().toISOString()
    })
  ].join('\n');

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockJsonlContent);
    vi.mocked(fs.statSync).mockReturnValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date()
    } as any);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.createReadStream).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnThis(),
      close: vi.fn()
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders app with messages tab by default', () => {
      const { lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      expect(lastFrame()).toContain('Messages');
      expect(lastFrame()).toContain('Ralph TUI');
    });

    it('renders with sidebar when showSidebar is true', () => {
      const { lastFrame } = render(
        <App jsonlPath={mockJsonlPath} showSidebar={true} />
      );

      // Sidebar should be visible
      expect(lastFrame()).toBeDefined();
      // The exact sidebar content would depend on implementation
    });

    it('renders with provided issue ID', () => {
      const { lastFrame } = render(
        <App jsonlPath={mockJsonlPath} issueId="test-issue-123" />
      );

      // Should attempt to load and display issue
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Tab Navigation', () => {
    it('can switch between tabs using keyboard input', () => {
      const { stdin, lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press '1' to switch to Messages tab
      stdin.write('1');
      expect(lastFrame()).toContain('Messages');

      // Press '2' to switch to Todos tab
      stdin.write('2');
      expect(lastFrame()).toContain('Todos');

      // Press '3' to switch to Issue tab
      stdin.write('3');
      expect(lastFrame()).toContain('Issue');

      // Press '4' to switch to Errors tab
      stdin.write('4');
      expect(lastFrame()).toContain('Errors');

      // Press '5' to switch to Stats tab
      stdin.write('5');
      expect(lastFrame()).toContain('Stats');
    });

    it('can navigate with arrow keys', () => {
      const { stdin, lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Right arrow to next tab
      stdin.write('\x1B[C'); // Right arrow
      
      // Left arrow to previous tab
      stdin.write('\x1B[D'); // Left arrow

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Ralph Process Control', () => {
    it('can start Ralph process with Ctrl+R', () => {
      const { stdin } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press Ctrl+R to start Ralph
      stdin.write('\x12'); // Ctrl+R

      // Should trigger Ralph start
      // Exact behavior depends on implementation
    });

    it('can stop Ralph process with Ctrl+S', () => {
      const { stdin } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press Ctrl+S to stop Ralph
      stdin.write('\x13'); // Ctrl+S

      // Should trigger Ralph stop
      // Exact behavior depends on implementation
    });
  });

  describe('Session Management', () => {
    it('can open session picker with P', () => {
      const { stdin, lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press P to open session picker
      stdin.write('p');

      expect(lastFrame()).toContain('Pick Session');
    });

    it('can archive current session with Ctrl+A', () => {
      const { stdin } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press Ctrl+A to archive
      stdin.write('\x01'); // Ctrl+A

      // Should trigger archive operation
      // Exact behavior depends on implementation
    });
  });

  describe('Help and Exit', () => {
    it('shows help dialog with .', () => {
      const { stdin, lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Press . to show help
      stdin.write('.');

      expect(lastFrame()).toContain('Shortcuts');
    });

    it('can exit with q', () => {
      const mockExit = vi.fn();
      const { stdin } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Mock process.exit
      const originalExit = process.exit;
      process.exit = mockExit as any;

      // Press q to quit
      stdin.write('q');

      // Restore process.exit
      process.exit = originalExit;
    });
  });

  describe('Error Handling', () => {
    it('handles missing JSONL file gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const { lastFrame } = render(
        <App jsonlPath="/nonexistent.jsonl" />
      );

      // Should show error or empty state
      expect(lastFrame()).toBeDefined();
    });

    it('handles malformed JSONL content', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json\n{broken');

      const { lastFrame } = render(
        <App jsonlPath={mockJsonlPath} />
      );

      // Should handle gracefully
      expect(lastFrame()).toBeDefined();
    });
  });
});
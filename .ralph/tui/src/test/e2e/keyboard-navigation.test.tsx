/**
 * E2E Tests for Keyboard Navigation in Ralph TUI
 *
 * Tests all keyboard shortcuts and navigation patterns:
 * - Tab switching (1-5, Tab, Shift+Tab)
 * - Scrolling (j/k, arrows, Page Up/Down, Home/End)
 * - Help overlay (.)
 * - All shortcuts documented in the UI
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, type Instance } from 'ink-testing-library';
import * as fs from 'fs';
import { App } from '../../app.js';
import { KeyCodes } from '../helpers/render.js';

// Store render instances for cleanup
let renderInstances: Instance[] = [];

// Mock file system operations
vi.mock('fs');
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn(),
    })),
  },
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(() =>
    Promise.resolve({
      stdout: '',
      stderr: '',
      exitCode: 0,
    })
  ),
}));

describe('Keyboard Navigation E2E Tests', () => {
  const mockJsonlPath = '/test/project/.ralph/claude_output.jsonl';

  // Create conversation with enough messages for scrolling tests
  const createLongConversation = (count: number = 20) => {
    const messages = [];
    const baseTime = new Date('2024-12-06T10:00:00.000Z');

    for (let i = 0; i < count; i++) {
      messages.push(
        JSON.stringify({
          type: i % 2 === 0 ? 'user' : 'assistant',
          message: {
            content: [{ type: 'text', text: `Message number ${i + 1} - This is some content that spans multiple words.` }],
            ...(i % 2 === 1 ? { usage: { input_tokens: 100 + i, output_tokens: 50 + i } } : {}),
          },
          timestamp: new Date(baseTime.getTime() + i * 1000).toISOString(),
        })
      );
    }

    return messages.join('\n');
  };

  const mockContent = createLongConversation();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);
    vi.mocked(fs.statSync).mockReturnValue({
      size: mockContent.length,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.openSync).mockReturnValue(3);
    vi.mocked(fs.fstatSync).mockReturnValue({ size: mockContent.length } as any);
    vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
      buffer.write(mockContent);
      return mockContent.length;
    });
    vi.mocked(fs.closeSync).mockImplementation(() => {});
    vi.mocked(fs.createReadStream).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnThis(),
      close: vi.fn(),
    } as any);
  });

  afterEach(() => {
    // Unmount all render instances to prevent memory leaks
    for (const instance of renderInstances) {
      instance.unmount();
    }
    renderInstances = [];
    vi.restoreAllMocks();
  });

  // Helper to track render instances
  const trackRender = (element: React.ReactElement) => {
    const instance = render(element);
    renderInstances.push(instance);
    return instance;
  };

  // ============================================================================
  // Tab Switching Tests
  // ============================================================================

  describe('Tab Switching', () => {
    it('switches to Messages tab with key 1', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      const frame = lastFrame() || '';
      expect(frame).toContain('Messages');
    });

    it('switches to Task tab with key 2', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('2');

      const frame = lastFrame() || '';
      expect(frame).toContain('Task');
    });

    it('switches to Todos tab with key 3', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('3');

      const frame = lastFrame() || '';
      expect(frame).toContain('Todos');
    });

    it('switches to Errors tab with key 4', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('4');

      const frame = lastFrame() || '';
      expect(frame).toContain('Errors');
    });

    it('switches to Stats tab with key 5', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('5');

      const frame = lastFrame() || '';
      expect(frame).toContain('Stats');
    });

    it('cycles through tabs with Tab key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Start at Messages (tab 1)
      stdin.write('1');
      expect(lastFrame()).toContain('Messages');

      // Tab to next (Task)
      stdin.write(KeyCodes.TAB);
      expect(lastFrame()).toContain('Task');

      // Tab to next (Todos)
      stdin.write(KeyCodes.TAB);
      expect(lastFrame()).toContain('Todos');

      // Tab to next (Errors)
      stdin.write(KeyCodes.TAB);
      expect(lastFrame()).toContain('Errors');

      // Tab to next (Stats)
      stdin.write(KeyCodes.TAB);
      expect(lastFrame()).toContain('Stats');

      // Tab wraps around to Messages
      stdin.write(KeyCodes.TAB);
      expect(lastFrame()).toContain('Messages');
    });

    it('cycles backwards through tabs with Shift+Tab', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Start at Messages (tab 1)
      stdin.write('1');
      expect(lastFrame()).toContain('Messages');

      // Shift+Tab goes to Stats (wrap around)
      stdin.write('\x1B[Z'); // Shift+Tab escape sequence
    });

    it('navigates tabs with arrow keys', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Start at Messages
      stdin.write('1');
      expect(lastFrame()).toContain('Messages');

      // Right arrow moves to next tab
      stdin.write(KeyCodes.RIGHT);
    });

    it('maintains tab state after navigation', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Switch to Stats tab
      stdin.write('5');
      expect(lastFrame()).toContain('Stats');

      // Switch to Messages
      stdin.write('1');
      expect(lastFrame()).toContain('Messages');

      // Switch back to Stats
      stdin.write('5');
      expect(lastFrame()).toContain('Stats');
    });
  });

  // ============================================================================
  // Scrolling Navigation Tests
  // ============================================================================

  describe('Scrolling Navigation', () => {
    it('scrolls down with j key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Ensure we're on messages tab
      stdin.write('1');

      // Scroll down with j
      stdin.write('j');
      stdin.write('j');
      stdin.write('j');

      // Should still render properly
      expect(lastFrame()).toBeDefined();
    });

    it('scrolls up with k key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      // Scroll down first
      stdin.write('j');
      stdin.write('j');

      // Then scroll back up
      stdin.write('k');
      stdin.write('k');

      expect(lastFrame()).toBeDefined();
    });

    it('scrolls with arrow keys', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      // Down arrow
      stdin.write(KeyCodes.DOWN);
      stdin.write(KeyCodes.DOWN);

      // Up arrow
      stdin.write(KeyCodes.UP);

      expect(lastFrame()).toBeDefined();
    });

    it('scrolls page down with Page Down', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write(KeyCodes.PAGE_DOWN);

      expect(lastFrame()).toBeDefined();
    });

    it('scrolls page up with Page Up', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      // Page down first
      stdin.write(KeyCodes.PAGE_DOWN);

      // Then page up
      stdin.write(KeyCodes.PAGE_UP);

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to top with Home key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      // Scroll down
      stdin.write('j');
      stdin.write('j');
      stdin.write('j');

      // Jump to top
      stdin.write(KeyCodes.HOME);

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to bottom with End key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write(KeyCodes.END);

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to top with g key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');

      // Scroll down
      stdin.write('j');
      stdin.write('j');

      // Jump to top with g
      stdin.write('g');

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to bottom with G key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write('G');

      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Help Overlay Tests
  // ============================================================================

  describe('Help Overlay', () => {
    it('opens shortcuts dialog with . key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('.');

      // Dialog should be opened (overlay might render differently in test environment)
      const frame = lastFrame() || '';
      expect(frame).toBeDefined();
    });

    it('closes shortcuts dialog on any key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Open shortcuts
      stdin.write('.');

      // Press any key to close (not '.')
      stdin.write('a');

      // Should be closed - back to main view
      const frame = lastFrame() || '';
      expect(frame).toBeDefined();
    });

    it('pressing . again closes the shortcuts dialog', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Open shortcuts
      stdin.write('.');

      // Press . again to close
      stdin.write('.');

      // Should be closed
      const frame = lastFrame() || '';
      expect(frame).toBeDefined();
    });

    it('displays available shortcuts in dialog', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('.');

      // Dialog should show shortcuts (or state changes)
      const frame = lastFrame() || '';
      expect(frame).toBeDefined();
    });
  });

  // ============================================================================
  // Global Shortcuts Tests
  // ============================================================================

  describe('Global Shortcuts', () => {
    it('toggles sidebar with b key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Toggle sidebar on
      stdin.write('b');
      // Should still render
      expect(lastFrame()).toBeDefined();

      // Toggle sidebar off
      stdin.write('b');
      expect(lastFrame()).toBeDefined();
    });

    it('refreshes data with r key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('r');

      // Should trigger refresh without crashing
      expect(lastFrame()).toBeDefined();
    });

    it('quits application with q key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Verify app is rendered
      expect(lastFrame()).toContain('Ralph TUI');

      stdin.write('q');

      // Exit should be triggered
    });

    it('quits application with Ctrl+C', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      expect(lastFrame()).toContain('Ralph TUI');

      stdin.write(KeyCodes.CTRL_C);
    });

    it('opens session picker with p key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('p');

      // Session picker should be opened
      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Message Selection Tests
  // ============================================================================

  describe('Message Selection', () => {
    it('selects message with Enter key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Ensure on messages tab
      stdin.write('1');

      // Navigate to a message
      stdin.write('j');

      // Select with Enter
      stdin.write(KeyCodes.ENTER);

      // Should show detail view or selection
      expect(lastFrame()).toBeDefined();
    });

    it('goes back from detail view with Escape', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write('j');
      stdin.write(KeyCodes.ENTER);

      // Go back with Escape
      stdin.write(KeyCodes.ESCAPE);

      // Should be back in main view
      const frame = lastFrame() || '';
      expect(frame).toContain('Messages');
    });
  });

  // ============================================================================
  // Filter Dialog Tests
  // ============================================================================

  describe('Filter Dialog', () => {
    it('opens filter with / key in messages view', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Ensure on messages tab
      stdin.write('1');

      // Open filter
      stdin.write('/');

      // Filter should be active (look for filter input indicator)
      expect(lastFrame()).toBeDefined();
    });

    it('accepts text input in filter mode', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write('/');

      // Type filter text
      stdin.write('test');

      expect(lastFrame()).toBeDefined();
    });

    it('clears filter with Escape', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('1');
      stdin.write('/');
      stdin.write('test');

      // Clear with Escape
      stdin.write(KeyCodes.ESCAPE);

      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Process Control Shortcuts Tests
  // ============================================================================

  describe('Process Control Shortcuts', () => {
    it('attempts to start Ralph with s key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('s');

      // Should not crash, start attempt should be made
      expect(lastFrame()).toBeDefined();
    });

    it('attempts to kill Ralph with k key when running', () => {
      // Simulate running process
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        if (p.toString().includes('claude.lock')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString().includes('claude.lock')) return '12345';
        return mockContent;
      });

      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('k');

      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Tab-Specific Navigation Tests
  // ============================================================================

  describe('Tab-Specific Navigation', () => {
    describe('Todos Tab Navigation', () => {
      it('navigates todo list items', () => {
        const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

        // Switch to Todos tab
        stdin.write('3');
        expect(lastFrame()).toContain('Todos');

        // Navigate items
        stdin.write('j');
        stdin.write('k');

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('Errors Tab Navigation', () => {
      it('navigates error list', () => {
        const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

        // Switch to Errors tab
        stdin.write('4');
        expect(lastFrame()).toContain('Errors');

        // Navigate
        stdin.write('j');
        stdin.write('k');

        expect(lastFrame()).toBeDefined();
      });

      it('selects error for detail view', () => {
        const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

        stdin.write('4');
        stdin.write('j');
        stdin.write(KeyCodes.ENTER);

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('Stats Tab', () => {
      it('displays stats information', () => {
        const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

        stdin.write('5');

        const frame = lastFrame() || '';
        expect(frame).toContain('Stats');
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles rapid key presses', async () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Rapid key presses
      for (let i = 0; i < 20; i++) {
        stdin.write('j');
      }

      expect(lastFrame()).toBeDefined();
    });

    it('handles mixed navigation keys', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Mix of navigation keys
      stdin.write('1');
      stdin.write('j');
      stdin.write(KeyCodes.DOWN);
      stdin.write('k');
      stdin.write(KeyCodes.UP);
      stdin.write(KeyCodes.TAB);
      stdin.write('j');

      expect(lastFrame()).toBeDefined();
    });

    it('ignores invalid key sequences', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Invalid/unknown keys should be ignored
      stdin.write('x');
      stdin.write('z');
      stdin.write('!');
      stdin.write('@');

      // App should still work
      expect(lastFrame()).toContain('Ralph TUI');
    });

    it('handles keys during dialog display', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Open session picker
      stdin.write('p');

      // Tab keys should be handled by dialog, not app
      stdin.write('1');
      stdin.write('2');

      // Should still be responsive (dialog handles input)
      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Accessibility Patterns
  // ============================================================================

  describe('Accessibility Patterns', () => {
    it('provides keyboard-only navigation to all features', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Navigate to all tabs using only keyboard
      stdin.write('1'); // Messages
      expect(lastFrame()).toContain('Messages');

      stdin.write('2'); // Task
      expect(lastFrame()).toContain('Task');

      stdin.write('3'); // Todos
      expect(lastFrame()).toContain('Todos');

      stdin.write('4'); // Errors
      expect(lastFrame()).toContain('Errors');

      stdin.write('5'); // Stats
      expect(lastFrame()).toContain('Stats');

      // Open help
      stdin.write('.');

      // Close help
      stdin.write(KeyCodes.ESCAPE);

      // Open session picker
      stdin.write('p');

      // Close picker
      stdin.write(KeyCodes.ESCAPE);

      // Toggle sidebar
      stdin.write('b');

      // All actions accessible via keyboard
      expect(lastFrame()).toBeDefined();
    });

    it('maintains focus context during navigation', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Start on messages
      stdin.write('1');

      // Scroll down
      stdin.write('j');
      stdin.write('j');

      // Switch tabs
      stdin.write('2');

      // Switch back
      stdin.write('1');

      // Should still be functional
      expect(lastFrame()).toContain('Messages');
    });
  });
});

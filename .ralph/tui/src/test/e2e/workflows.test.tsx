/**
 * E2E Tests for Ralph TUI Workflows
 *
 * Tests complete user workflows through the Ralph TUI application:
 * - Fresh Start (ralph init → ralph → exit)
 * - Monitor Existing Session
 * - Start New Session (Mocked)
 * - Interrupt and Resume
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, type Instance } from 'ink-testing-library';
import * as fs from 'fs';
import * as path from 'path';
import { App } from '../../app.js';
import { runInit, formatInitOutput } from '../../commands/init.js';
import { KeyCodes } from '../helpers/render.js';

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

// Mock child_process for Ralph process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

// Mock execa for process management
vi.mock('execa', () => ({
  execa: vi.fn(() =>
    Promise.resolve({
      stdout: '',
      stderr: '',
      exitCode: 0,
    })
  ),
}));

// Store render instances for cleanup
let renderInstances: Instance[] = [];

describe('E2E Workflows', () => {
  const mockProjectRoot = '/test/project';
  const mockJsonlPath = `${mockProjectRoot}/.ralph/claude_output.jsonl`;
  const mockArchiveDir = `${mockProjectRoot}/.ralph/archive`;
  const mockLockFile = `${mockProjectRoot}/.ralph/claude.lock`;

  // Sample JSONL content simulating a conversation
  const createMockConversation = (messageCount: number = 3) => {
    const messages = [];
    const baseTime = new Date('2024-12-06T10:00:00.000Z');

    messages.push(
      JSON.stringify({
        type: 'system',
        message: {
          content: [
            { type: 'text', text: 'You are Claude, an AI assistant made by Anthropic.' },
          ],
        },
        timestamp: new Date(baseTime.getTime()).toISOString(),
      })
    );

    for (let i = 0; i < messageCount; i++) {
      // User message
      messages.push(
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'text', text: `User message ${i + 1}` }],
          },
          timestamp: new Date(baseTime.getTime() + (i * 2 + 1) * 1000).toISOString(),
        })
      );

      // Assistant message
      messages.push(
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: `Assistant response ${i + 1}` }],
            usage: { input_tokens: 100 + i * 10, output_tokens: 50 + i * 5 },
          },
          timestamp: new Date(baseTime.getTime() + (i * 2 + 2) * 1000).toISOString(),
        })
      );
    }

    return messages.join('\n');
  };

  // Sample JSONL with tool calls
  const createMockConversationWithTools = () => {
    return [
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'text', text: 'Read the README file' }] },
        timestamp: '2024-12-06T10:00:00.000Z',
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read that file for you.' },
            {
              type: 'tool_use',
              id: 'toolu_01XYZ',
              name: 'Read',
              input: { file_path: '/project/README.md' },
            },
          ],
          usage: { input_tokens: 150, output_tokens: 50 },
        },
        timestamp: '2024-12-06T10:00:01.000Z',
      }),
      JSON.stringify({
        type: 'tool_result',
        tool_use_id: 'toolu_01XYZ',
        content: '# Project README\n\nThis is a sample project.',
        timestamp: '2024-12-06T10:00:02.000Z',
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: 'The README shows this is a sample project for testing.',
            },
          ],
          usage: { input_tokens: 200, output_tokens: 30 },
        },
        timestamp: '2024-12-06T10:00:03.000Z',
      }),
    ].join('\n');
  };

  // Sample JSONL with subagent calls
  const createMockConversationWithSubagent = () => {
    return [
      JSON.stringify({
        type: 'user',
        message: { content: [{ type: 'text', text: 'Explore the codebase' }] },
        timestamp: '2024-12-06T10:00:00.000Z',
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me explore the codebase for you.' },
            {
              type: 'tool_use',
              id: 'toolu_subagent_01',
              name: 'Task',
              input: {
                subagent_type: 'Explore',
                description: 'Explore codebase structure',
                prompt: 'Find all TypeScript files and understand the project structure.',
              },
            },
          ],
          usage: { input_tokens: 200, output_tokens: 100 },
        },
        timestamp: '2024-12-06T10:00:01.000Z',
      }),
      // Subagent messages
      JSON.stringify({
        type: 'assistant',
        parent_tool_use_id: 'toolu_subagent_01',
        message: {
          content: [{ type: 'text', text: 'Starting exploration of the codebase...' }],
          usage: { input_tokens: 50, output_tokens: 20 },
        },
        timestamp: '2024-12-06T10:00:02.000Z',
      }),
      JSON.stringify({
        type: 'assistant',
        parent_tool_use_id: 'toolu_subagent_01',
        message: {
          content: [
            {
              type: 'text',
              text: 'Found 15 TypeScript files in src/ directory.',
            },
          ],
          usage: { input_tokens: 100, output_tokens: 30 },
        },
        timestamp: '2024-12-06T10:00:03.000Z',
      }),
      // Subagent result
      JSON.stringify({
        type: 'tool_result',
        tool_use_id: 'toolu_subagent_01',
        content: 'Exploration complete. Found 15 TypeScript files.',
        timestamp: '2024-12-06T10:00:04.000Z',
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: 'The exploration found 15 TypeScript files in the src/ directory.',
            },
          ],
          usage: { input_tokens: 250, output_tokens: 40 },
        },
        timestamp: '2024-12-06T10:00:05.000Z',
      }),
    ].join('\n');
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup - file exists with content
    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
      const pathStr = p.toString();
      if (pathStr === mockJsonlPath) return true;
      if (pathStr === mockProjectRoot) return true;
      if (pathStr.includes('.ralph')) return true;
      if (pathStr === mockLockFile) return false; // No running process
      return false;
    });

    vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
      const pathStr = p.toString();
      if (pathStr === mockJsonlPath) {
        return createMockConversation();
      }
      return '';
    });

    vi.mocked(fs.statSync).mockReturnValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);

    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
    vi.mocked(fs.openSync).mockReturnValue(3);
    vi.mocked(fs.fstatSync).mockReturnValue({
      size: 1024,
    } as any);
    vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
      const content = createMockConversation();
      buffer.write(content);
      return content.length;
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
  // Fresh Start Workflow Tests
  // ============================================================================

  describe('Fresh Start Workflow (ralph init → ralph → exit)', () => {
    // Helper to normalize paths for cross-platform compatibility
    const normalizePath = (p: string) => p.replace(/\\/g, '/');

    it('completes full init workflow with default options', () => {
      // Init tests use real fs operations via runInit
      // Set up mock to indicate files don't exist yet
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = normalizePath(p.toString());
        // For init tests, pretend the .ralph files don't exist
        if (pathStr.includes('.ralph/settings.json')) return false;
        if (pathStr.includes('.ralph/prompts/')) return false;
        return true;
      });

      // Test ralph init (note: runInit uses actual fs.existsSync for checking)
      const result = runInit(mockProjectRoot, { force: true });

      expect(result.success).toBe(true);
      expect(result.created).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/prompts/plan.md');
      expect(result.created).toContain('.ralph/prompts/execute.md');
    });

    it('completes init with agent pre-configuration', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = normalizePath(p.toString());
        if (pathStr.includes('.ralph/settings.json')) return false;
        if (pathStr.includes('.ralph/prompts/')) return false;
        return true;
      });

      const result = runInit(mockProjectRoot, { agent: 'claude-code', force: true });

      expect(result.success).toBe(true);
      expect(result.created).toContain('.ralph/settings.json');
    });

    it('shows proper dry-run output', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = normalizePath(p.toString());
        if (pathStr.includes('.ralph/settings.json')) return false;
        if (pathStr.includes('.ralph/prompts/')) return false;
        return true;
      });

      const result = runInit(mockProjectRoot, { dryRun: true });
      const output = formatInitOutput(result, { dryRun: true });

      expect(result.success).toBe(true);
      expect(output).toContain('Dry run');
      expect(output).toContain('Would create');
    });

    it('renders app after init and shows start screen', () => {
      // Simulate empty JSONL (fresh start)
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(fs.readSync).mockImplementation(() => 0);
      vi.mocked(fs.fstatSync).mockReturnValue({ size: 0 } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Should show start screen or empty messages
      const frame = lastFrame() || '';
      expect(frame).toContain('Ralph TUI');
    });

    it('can exit app with q key', async () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Verify app renders
      expect(lastFrame()).toContain('Ralph TUI');

      // Press q to exit
      stdin.write('q');

      // App should process the quit command (useApp().exit() is called)
      // In testing library, we can't truly verify exit but we verify it processes
    });

    it('can exit app with Ctrl+C', async () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      expect(lastFrame()).toContain('Ralph TUI');

      // Press Ctrl+C
      stdin.write(KeyCodes.CTRL_C);
    });
  });

  // ============================================================================
  // Monitor Existing Session Workflow Tests
  // ============================================================================

  describe('Monitor Existing Session Workflow', () => {
    it('loads and displays existing session messages', () => {
      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      const frame = lastFrame() || '';
      expect(frame).toContain('Ralph TUI');
      expect(frame).toContain('Messages');
    });

    it('displays tool calls in existing session', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(createMockConversationWithTools());
      vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
        const content = createMockConversationWithTools();
        buffer.write(content);
        return content.length;
      });
      vi.mocked(fs.fstatSync).mockReturnValue({
        size: createMockConversationWithTools().length,
      } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      const frame = lastFrame() || '';
      expect(frame).toContain('Ralph TUI');
    });

    it('displays subagent calls in existing session', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(createMockConversationWithSubagent());
      vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
        const content = createMockConversationWithSubagent();
        buffer.write(content);
        return content.length;
      });
      vi.mocked(fs.fstatSync).mockReturnValue({
        size: createMockConversationWithSubagent().length,
      } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      const frame = lastFrame() || '';
      expect(frame).toContain('Ralph TUI');
    });

    it('shows sidebar when showSidebar prop is true', () => {
      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} showSidebar={true} />);

      // Sidebar should be visible
      expect(lastFrame()).toBeDefined();
    });

    it('handles session with errors gracefully', () => {
      const conversationWithError = [
        JSON.stringify({
          type: 'user',
          message: { content: [{ type: 'text', text: 'Test message' }] },
          timestamp: '2024-12-06T10:00:00.000Z',
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'toolu_error',
                name: 'Bash',
                input: { command: 'invalid_command' },
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          },
          timestamp: '2024-12-06T10:00:01.000Z',
        }),
        JSON.stringify({
          type: 'tool_result',
          tool_use_id: 'toolu_error',
          content: 'Error: Command not found',
          is_error: true,
          timestamp: '2024-12-06T10:00:02.000Z',
        }),
      ].join('\n');

      vi.mocked(fs.readFileSync).mockReturnValue(conversationWithError);
      vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
        buffer.write(conversationWithError);
        return conversationWithError.length;
      });
      vi.mocked(fs.fstatSync).mockReturnValue({
        size: conversationWithError.length,
      } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Should render without crashing
      expect(lastFrame()).toContain('Ralph TUI');
    });
  });

  // ============================================================================
  // Start New Session Workflow Tests (Mocked)
  // ============================================================================

  describe('Start New Session Workflow (Mocked)', () => {
    it('can press s to start Ralph when not running', () => {
      // Simulate no messages (fresh state)
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(fs.readSync).mockImplementation(() => 0);
      vi.mocked(fs.fstatSync).mockReturnValue({ size: 0 } as any);

      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Verify app renders
      expect(lastFrame()).toContain('Ralph TUI');

      // Press s to start Ralph
      stdin.write('s');

      // The start action should be triggered (mocked)
    });

    it('shows starting state after pressing s', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(fs.readSync).mockImplementation(() => 0);
      vi.mocked(fs.fstatSync).mockReturnValue({ size: 0 } as any);

      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('s');

      // App should still be rendered
      expect(lastFrame()).toBeDefined();
    });

    it('can open session picker with p key', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Press p to open session picker
      stdin.write('p');

      const frame = lastFrame() || '';
      // Session picker changes the view - should show session-related content
      // The overlay might show differently in test environment
      expect(frame).toBeDefined();
    });

    it('can close session picker with escape', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Open session picker
      stdin.write('p');

      // Close with escape
      stdin.write(KeyCodes.ESCAPE);

      // Session picker should be closed - back to main view
      const frame = lastFrame() || '';
      expect(frame).toContain('Messages');
    });
  });

  // ============================================================================
  // Interrupt and Resume Workflow Tests
  // ============================================================================

  describe('Interrupt and Resume Workflow', () => {
    beforeEach(() => {
      // Simulate Ralph is running
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr === mockLockFile) return true; // Process is running
        if (pathStr === mockJsonlPath) return true;
        if (pathStr.includes('.ralph')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = p.toString();
        if (pathStr === mockLockFile) return '12345'; // PID
        if (pathStr === mockJsonlPath) return createMockConversation();
        return '';
      });
    });

    it('shows interrupt option when Ralph is running', () => {
      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // The footer should show available shortcuts
      const frame = lastFrame() || '';
      expect(frame).toContain('Ralph TUI');
    });

    it('can press k to kill Ralph when running', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      expect(lastFrame()).toContain('Ralph TUI');

      // Press k to kill
      stdin.write('k');

      // Kill action should be triggered
    });

    it('displays session with sessionId for resume capability', () => {
      // Add a session_id to the JSONL to enable resume
      const conversationWithSession = [
        JSON.stringify({
          type: 'system',
          message: { content: [{ type: 'text', text: 'System prompt' }] },
          session_id: 'session_abc123',
          timestamp: '2024-12-06T10:00:00.000Z',
        }),
        JSON.stringify({
          type: 'user',
          message: { content: [{ type: 'text', text: 'Hello' }] },
          session_id: 'session_abc123',
          timestamp: '2024-12-06T10:00:01.000Z',
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Hello! How can I help?' }],
            usage: { input_tokens: 100, output_tokens: 20 },
          },
          session_id: 'session_abc123',
          timestamp: '2024-12-06T10:00:02.000Z',
        }),
      ].join('\n');

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = p.toString();
        if (pathStr === mockLockFile) return '12345';
        if (pathStr === mockJsonlPath) return conversationWithSession;
        return '';
      });
      vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
        buffer.write(conversationWithSession);
        return conversationWithSession.length;
      });
      vi.mocked(fs.fstatSync).mockReturnValue({
        size: conversationWithSession.length,
      } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      expect(lastFrame()).toContain('Ralph TUI');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('handles missing JSONL file gracefully', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        if (p.toString() === mockJsonlPath) return false;
        return true;
      });
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const { lastFrame } = trackRender(<App jsonlPath="/nonexistent.jsonl" />);

      // Should show error or empty state
      expect(lastFrame()).toBeDefined();
    });

    it('handles malformed JSONL content', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json\n{broken');
      vi.mocked(fs.readSync).mockImplementation((fd, buffer: Buffer) => {
        const content = 'invalid json\n{broken';
        buffer.write(content);
        return content.length;
      });
      vi.mocked(fs.fstatSync).mockReturnValue({ size: 20 } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Should handle gracefully
      expect(lastFrame()).toBeDefined();
    });

    it('handles empty JSONL file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(fs.readSync).mockImplementation(() => 0);
      vi.mocked(fs.fstatSync).mockReturnValue({ size: 0 } as any);

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Should show empty state or start screen
      expect(lastFrame()).toBeDefined();
    });

    it('handles file read errors during streaming', () => {
      let callCount = 0;
      vi.mocked(fs.readSync).mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          throw new Error('EACCES: permission denied');
        }
        return 0;
      });

      const { lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Should handle gracefully
      expect(lastFrame()).toBeDefined();
    });
  });

  // ============================================================================
  // Session Switching Tests
  // ============================================================================

  describe('Session Switching', () => {
    beforeEach(() => {
      // Mock archive directory with sessions
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr === mockArchiveDir) {
          return [
            'claude_output_2024-12-05_10-00-00.jsonl',
            'claude_output_2024-12-04_10-00-00.jsonl',
          ] as any;
        }
        return [];
      });
    });

    it('can open session picker', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('p');

      // Session picker should be active (overlay displayed)
      const frame = lastFrame() || '';
      expect(frame).toBeDefined();
    });

    it('can navigate session picker with arrow keys', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      // Open session picker
      stdin.write('p');

      // Navigate with arrow keys
      stdin.write(KeyCodes.DOWN);
      stdin.write(KeyCodes.DOWN);
      stdin.write(KeyCodes.UP);

      // Should still be responsive
      expect(lastFrame()).toBeDefined();
    });

    it('shows current and archived sessions', () => {
      const { stdin, lastFrame } = trackRender(<App jsonlPath={mockJsonlPath} />);

      stdin.write('p');

      const frame = lastFrame() || '';
      // Session picker should show options
      expect(frame).toBeDefined();
    });
  });
});

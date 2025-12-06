/**
 * Mock Agent Process Utility for Ralph TUI Tests
 *
 * Provides utilities to simulate agent process behavior for testing,
 * including streaming output, error injection, and process lifecycle.
 *
 * NOTE: This is a placeholder for the mock agent functionality.
 * Full implementation will be done in rt-ds3 (Create mock agent process utility).
 */

import { vi, type Mock } from 'vitest';
import { EventEmitter } from 'events';

/**
 * Mock agent configuration options
 */
export interface MockAgentOptions {
  /** Delay between output lines in ms */
  outputDelay?: number;
  /** Output format: JSONL or streaming text */
  outputFormat?: 'jsonl' | 'text';
  /** Fail after N lines */
  failAfter?: number;
  /** Agent capabilities to simulate */
  capabilities?: Partial<MockAgentCapabilities>;
}

/**
 * Simulated agent capabilities
 */
export interface MockAgentCapabilities {
  supportsResume: boolean;
  supportsStop: boolean;
  supportsStreaming: boolean;
}

/**
 * Mock agent process interface
 */
export interface MockAgentProcess {
  /** Agent process PID */
  pid: number;
  /** Stdout event emitter */
  stdout: EventEmitter;
  /** Stderr event emitter */
  stderr: EventEmitter;
  /** Process event emitter */
  on: Mock;
  /** Kill the process */
  kill: Mock;
  /** Emit a line of output */
  emitOutput: (line: string) => void;
  /** Emit an error */
  emitError: (error: string) => void;
  /** Emit process exit */
  emitExit: (code: number) => void;
  /** Start streaming fixture data */
  streamFixture: (lines: string[], delayMs?: number) => Promise<void>;
}

/**
 * Create a mock agent process
 *
 * @param options - Mock agent configuration
 * @returns Mock agent process object
 *
 * @example
 * ```ts
 * const mockAgent = createMockAgent({ outputDelay: 50 });
 * mockAgent.emitOutput('{"type": "assistant", "message": "Hello"}');
 * mockAgent.emitExit(0);
 * ```
 */
export function createMockAgent(options: MockAgentOptions = {}): MockAgentProcess {
  const { outputDelay = 0 } = options;

  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const processEmitter = new EventEmitter();

  const mockAgent: MockAgentProcess = {
    pid: Math.floor(Math.random() * 10000) + 1000,
    stdout,
    stderr,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      processEmitter.on(event, handler);
      return mockAgent;
    }),
    kill: vi.fn(() => {
      processEmitter.emit('exit', 0, null);
    }),

    emitOutput: (line: string) => {
      stdout.emit('data', Buffer.from(line + '\n'));
    },

    emitError: (error: string) => {
      stderr.emit('data', Buffer.from(error + '\n'));
    },

    emitExit: (code: number) => {
      processEmitter.emit('exit', code, null);
      processEmitter.emit('close', code, null);
    },

    streamFixture: async (lines: string[], delayMs = outputDelay) => {
      for (const line of lines) {
        mockAgent.emitOutput(line);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    },
  };

  return mockAgent;
}

/**
 * Create a mock spawn function that returns a mock agent
 *
 * @param mockAgent - Pre-configured mock agent to return
 * @returns Mock spawn function
 *
 * @example
 * ```ts
 * const mockAgent = createMockAgent();
 * vi.mock('child_process', () => ({
 *   spawn: createMockSpawn(mockAgent)
 * }));
 * ```
 */
export function createMockSpawn(mockAgent: MockAgentProcess): Mock {
  return vi.fn(() => mockAgent);
}

/**
 * Default capabilities for Claude Code agent
 */
export const CLAUDE_CODE_CAPABILITIES: MockAgentCapabilities = {
  supportsResume: true,
  supportsStop: true,
  supportsStreaming: true,
};

/**
 * Default capabilities for generic agent
 */
export const GENERIC_AGENT_CAPABILITIES: MockAgentCapabilities = {
  supportsResume: false,
  supportsStop: true,
  supportsStreaming: false,
};

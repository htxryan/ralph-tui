/**
 * File System Mocking Utilities for Ralph TUI Tests
 *
 * Provides utilities for mocking file system operations
 * consistently across tests.
 *
 * NOTE: This is a placeholder for the mock fs functionality.
 * Full implementation will be done in a subsequent task.
 */

import { vi, type Mock } from 'vitest';
import * as fs from 'fs';

/**
 * File system mock configuration
 */
export interface MockFsConfig {
  /** Virtual file system contents: path -> content */
  files?: Record<string, string>;
  /** Directories that should exist */
  directories?: string[];
  /** Paths that should throw ENOENT */
  nonExistent?: string[];
}

/**
 * Mock file stats configuration
 */
export interface MockStatConfig {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtime?: Date;
}

/**
 * Create mock file system based on configuration
 *
 * @param config - File system configuration
 * @returns Cleanup function to restore original fs
 *
 * @example
 * ```ts
 * const cleanup = createMockFs({
 *   files: {
 *     '/path/to/file.json': '{"key": "value"}',
 *     '/path/to/output.jsonl': '{"type": "user"}\n{"type": "assistant"}',
 *   },
 *   directories: ['/path/to', '/path'],
 * });
 *
 * // ... run tests ...
 *
 * cleanup();
 * ```
 */
export function createMockFs(config: MockFsConfig = {}): () => void {
  const { files = {}, directories = [], nonExistent = [] } = config;

  // Store original implementations
  const originals = {
    existsSync: fs.existsSync,
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    mkdirSync: fs.mkdirSync,
    statSync: fs.statSync,
    readdirSync: fs.readdirSync,
  };

  // Mock existsSync
  vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
    const pathStr = path.toString();
    if (nonExistent.includes(pathStr)) return false;
    if (files[pathStr] !== undefined) return true;
    if (directories.includes(pathStr)) return true;
    return false;
  });

  // Mock readFileSync
  vi.mocked(fs.readFileSync).mockImplementation((path: fs.PathOrFileDescriptor) => {
    const pathStr = path.toString();
    if (files[pathStr] !== undefined) {
      return files[pathStr];
    }
    const error = new Error(`ENOENT: no such file or directory, open '${pathStr}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  });

  // Mock statSync
  vi.mocked(fs.statSync).mockImplementation((path: fs.PathLike) => {
    const pathStr = path.toString();
    if (files[pathStr] !== undefined) {
      return createMockStat({ isFile: true, size: files[pathStr].length });
    }
    if (directories.includes(pathStr)) {
      return createMockStat({ isDirectory: true });
    }
    const error = new Error(`ENOENT: no such file or directory, stat '${pathStr}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  });

  // Return cleanup function
  return () => {
    vi.restoreAllMocks();
  };
}

/**
 * Create a mock fs.Stats object
 *
 * @param config - Stats configuration
 * @returns Mock Stats object
 */
export function createMockStat(config: MockStatConfig = {}): fs.Stats {
  const {
    isFile = true,
    isDirectory = false,
    size = 1024,
    mtime = new Date(),
  } = config;

  return {
    isFile: () => isFile,
    isDirectory: () => isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: 0o644,
    nlink: 1,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    size,
    blksize: 4096,
    blocks: Math.ceil(size / 512),
    atimeMs: mtime.getTime(),
    mtimeMs: mtime.getTime(),
    ctimeMs: mtime.getTime(),
    birthtimeMs: mtime.getTime(),
    atime: mtime,
    mtime,
    ctime: mtime,
    birthtime: mtime,
  } as fs.Stats;
}

/**
 * Create a mock chokidar watcher
 *
 * @returns Mock watcher with on/close methods
 *
 * @example
 * ```ts
 * vi.mock('chokidar', () => ({
 *   watch: vi.fn(() => createMockWatcher())
 * }));
 * ```
 */
export function createMockWatcher() {
  const events: Record<string, ((...args: unknown[]) => void)[]> = {};

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      events[event] = events[event] || [];
      events[event].push(handler);
      return this;
    }),
    close: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      (events[event] || []).forEach((handler) => handler(...args));
    },
  };
}

/**
 * Create mock for fs.createReadStream
 *
 * @param content - Content to stream
 * @returns Mock readable stream
 */
export function createMockReadStream(content: string) {
  const events: Record<string, ((...args: unknown[]) => void)[]> = {};

  const stream = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      events[event] = events[event] || [];
      events[event].push(handler);

      // Simulate immediate data emission for 'data' event
      if (event === 'data') {
        setImmediate(() => {
          handler(Buffer.from(content));
          (events['end'] || []).forEach((h) => h());
        });
      }

      return stream;
    }),
    pipe: vi.fn().mockReturnThis(),
    close: vi.fn(),
  };

  return stream;
}

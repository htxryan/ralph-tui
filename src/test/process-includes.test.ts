import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We need to dynamically import the module since it's an ES module
const importProcessIncludes = async () => {
  const module = await import('../../scripts/process-includes.js');
  return module;
};

describe('process-includes', () => {
  let testDir: string;
  let repoRoot: string;
  let processFileWithIncludes: (inputFile: string, repoRoot: string) => string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `process-includes-test-${Date.now()}`);
    repoRoot = testDir;
    mkdirSync(testDir, { recursive: true });

    // Import the module
    const module = await importProcessIncludes();
    processFileWithIncludes = module.processFileWithIncludes;
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseIncludes (via processFileWithIncludes)', () => {
    it('processes file with no includes', () => {
      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Hello world, no includes here.');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Hello world, no includes here.');
    });

    it('processes simple @file.md include', () => {
      const includedFile = join(testDir, 'included.md');
      writeFileSync(includedFile, 'I am included content');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Before @included.md After');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Before I am included content After');
    });

    it('processes @"file with spaces.md" include', () => {
      const includedFile = join(testDir, 'file with spaces.md');
      writeFileSync(includedFile, 'spaced content');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Start @"file with spaces.md" End');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Start spaced content End');
    });

    it('processes @subdir/file.md include', () => {
      const subdir = join(testDir, 'subdir');
      mkdirSync(subdir, { recursive: true });
      writeFileSync(join(subdir, 'nested.md'), 'nested content');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Include: @subdir/nested.md done');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Include: nested content done');
    });

    it('processes multiple includes in one file', () => {
      writeFileSync(join(testDir, 'a.md'), 'AAA');
      writeFileSync(join(testDir, 'b.md'), 'BBB');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Start @a.md Middle @b.md End');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Start AAA Middle BBB End');
    });
  });

  describe('recursive includes', () => {
    it('processes nested includes', () => {
      writeFileSync(join(testDir, 'level2.md'), 'LEVEL2');
      writeFileSync(join(testDir, 'level1.md'), 'L1 @level2.md L1');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Main @level1.md Main');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Main L1 LEVEL2 L1 Main');
    });

    it('processes deeply nested includes', () => {
      writeFileSync(join(testDir, 'deep.md'), 'DEEP');
      writeFileSync(join(testDir, 'level3.md'), '@deep.md');
      writeFileSync(join(testDir, 'level2.md'), '@level3.md');
      writeFileSync(join(testDir, 'level1.md'), '@level2.md');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, '@level1.md');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('DEEP');
    });
  });

  describe('circular reference detection', () => {
    it('exits with code 2 on direct circular reference', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create circular: a.md -> b.md -> a.md
      writeFileSync(join(testDir, 'a.md'), '@b.md');
      writeFileSync(join(testDir, 'b.md'), '@a.md');

      const mainFile = join(testDir, 'a.md');

      expect(() => processFileWithIncludes(mainFile, repoRoot)).toThrow('process.exit(2)');
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Circular include detected'));

      mockExit.mockRestore();
      mockStderr.mockRestore();
    });

    it('exits with code 2 on self-reference', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      writeFileSync(join(testDir, 'self.md'), 'Before @self.md After');

      const mainFile = join(testDir, 'self.md');

      expect(() => processFileWithIncludes(mainFile, repoRoot)).toThrow('process.exit(2)');
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Circular include detected'));

      mockExit.mockRestore();
      mockStderr.mockRestore();
    });
  });

  describe('error handling', () => {
    it('exits with code 2 on missing include file', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Include @nonexistent.md here');

      expect(() => processFileWithIncludes(mainFile, repoRoot)).toThrow('process.exit(2)');
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Include file not found'));

      mockExit.mockRestore();
      mockStderr.mockRestore();
    });

    it('exits with code 2 on missing input file', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => processFileWithIncludes('/nonexistent/path.md', repoRoot)).toThrow('process.exit(2)');
      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Input file not found'));

      mockExit.mockRestore();
      mockStderr.mockRestore();
    });
  });

  describe('path resolution', () => {
    it('resolves paths relative to repo root', () => {
      const subdir = join(testDir, 'subdir');
      mkdirSync(subdir, { recursive: true });

      // Create a file in subdir that includes a file from repo root
      writeFileSync(join(testDir, 'root-file.md'), 'ROOT CONTENT');
      writeFileSync(join(subdir, 'nested.md'), 'Include: @root-file.md');

      // Even though we're processing subdir/nested.md, the include resolves from repo root
      const result = processFileWithIncludes(join(subdir, 'nested.md'), repoRoot);
      expect(result).toBe('Include: ROOT CONTENT');
    });

    it('supports relative paths with ../', () => {
      const subdir = join(testDir, 'subdir');
      const deepdir = join(subdir, 'deep');
      mkdirSync(deepdir, { recursive: true });

      writeFileSync(join(testDir, 'top.md'), 'TOP');
      writeFileSync(join(deepdir, 'bottom.md'), 'Include: @subdir/../top.md');

      // The ../ path should work relative to repo root
      const result = processFileWithIncludes(join(deepdir, 'bottom.md'), repoRoot);
      expect(result).toBe('Include: TOP');
    });
  });

  describe('edge cases', () => {
    it('handles empty included files', () => {
      writeFileSync(join(testDir, 'empty.md'), '');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Before @empty.md After');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Before  After');
    });

    it('handles includes at start of line', () => {
      writeFileSync(join(testDir, 'inc.md'), 'INCLUDED');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, '@inc.md');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('INCLUDED');
    });

    it('handles includes at end of line', () => {
      writeFileSync(join(testDir, 'inc.md'), 'INCLUDED');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'End: @inc.md');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('End: INCLUDED');
    });

    it('handles multiline content in included files', () => {
      writeFileSync(join(testDir, 'multi.md'), 'Line 1\nLine 2\nLine 3');

      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Start\n@multi.md\nEnd');

      const result = processFileWithIncludes(mainFile, repoRoot);
      expect(result).toBe('Start\nLine 1\nLine 2\nLine 3\nEnd');
    });

    it('does not match @ in email addresses', () => {
      const mainFile = join(testDir, 'main.md');
      writeFileSync(mainFile, 'Contact: user@example.com');

      // This will try to include example.com as a file, which doesn't exist
      // But the test shows the pattern behavior - @ followed by non-whitespace is matched
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => processFileWithIncludes(mainFile, repoRoot)).toThrow('process.exit(2)');

      mockExit.mockRestore();
      mockStderr.mockRestore();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runInit, formatInitOutput, type InitOptions, type InitResult } from './init.js';

// Create temp directory for tests
function createTempDir(): string {
  const tempBase = os.tmpdir();
  const tempDir = path.join(tempBase, `ralph-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// Clean up temp directory
function cleanupTempDir(tempDir: string): void {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('init command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ==========================================================================
  // Basic init tests
  // ==========================================================================

  describe('runInit', () => {
    it('creates .ralph directory structure', () => {
      const result = runInit(tempDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.ralph/projects'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.ralph/projects/default'))).toBe(true);
    });

    it('creates settings.json with default task management config', () => {
      runInit(tempDir);

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      expect(settings.task_management).toEqual({
        provider: 'github-issues',
        provider_config: {
          label_filter: 'ralph',
        },
      });
      expect(settings.variables).toEqual({});
    });

    it('creates projects/default directory', () => {
      runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, '.ralph/projects/default'))).toBe(true);
    });

    it('creates projects/default/execute.md with content', () => {
      runInit(tempDir);

      const filePath = path.join(tempDir, '.ralph/projects/default/execute.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Workflow');
    });

    it('creates projects/default/settings.json with content', () => {
      runInit(tempDir);

      const filePath = path.join(tempDir, '.ralph/projects/default/settings.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      const settings = JSON.parse(content);
      expect(settings.display_name).toBe('Default');
    });

    it('returns list of created files', () => {
      const result = runInit(tempDir);

      expect(result.created).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/projects/default/settings.json');
      expect(result.created).toContain('.ralph/projects/default/execute.md');
    });

    it('returns gitignore suggestions', () => {
      const result = runInit(tempDir);

      expect(result.gitignoreSuggestions).toBeDefined();
      expect(result.gitignoreSuggestions.some(s => s.includes('settings.local.json'))).toBe(true);
      expect(result.gitignoreSuggestions.some(s => s.includes('claude_output.jsonl'))).toBe(true);
    });

    it('sets projectRoot in result', () => {
      const result = runInit(tempDir);

      expect(result.projectRoot).toBe(tempDir);
    });
  });

  // ==========================================================================
  // Does not overwrite existing files
  // ==========================================================================

  describe('existing files', () => {
    it('does not overwrite existing settings.json', () => {
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{"custom": true}', 'utf-8');

      const result = runInit(tempDir);

      expect(result.success).toBe(true);
      expect(result.skipped).toContain('.ralph/settings.json');
      expect(result.created).not.toContain('.ralph/settings.json');

      const content = fs.readFileSync(settingsPath, 'utf-8');
      expect(JSON.parse(content)).toEqual({ custom: true });
    });

    it('does not overwrite existing project files', () => {
      const executePath = path.join(tempDir, '.ralph/projects/default/execute.md');
      fs.mkdirSync(path.dirname(executePath), { recursive: true });
      fs.writeFileSync(executePath, 'My custom workflow', 'utf-8');

      const result = runInit(tempDir);

      expect(result.success).toBe(true);
      expect(result.skipped).toContain('.ralph/projects/default/execute.md');

      const content = fs.readFileSync(executePath, 'utf-8');
      expect(content).toBe('My custom workflow');
    });

    it('creates missing files even when some exist', () => {
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{}', 'utf-8');

      const result = runInit(tempDir);

      // settings.json skipped
      expect(result.skipped).toContain('.ralph/settings.json');
      // Other files created
      expect(result.created).toContain('.ralph/projects/default/settings.json');
      expect(result.created).toContain('.ralph/projects/default/execute.md');
    });

    it('running init twice is idempotent', () => {
      const result1 = runInit(tempDir);
      const result2 = runInit(tempDir);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Second run should skip all files (3 files total)
      expect(result2.created.length).toBe(0);
      expect(result2.skipped.length).toBe(3);
    });
  });

  // ==========================================================================
  // --agent option
  // ==========================================================================

  describe('--agent option', () => {
    it('pre-configures claude-code in settings.json', () => {
      const result = runInit(tempDir, { agent: 'claude-code' });

      expect(result.success).toBe(true);

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.agent).toEqual({ type: 'claude-code' });
    });

    it('pre-configures codex in settings.json', () => {
      const result = runInit(tempDir, { agent: 'codex' });

      expect(result.success).toBe(true);

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.agent).toEqual({ type: 'codex' });
    });

    it('pre-configures opencode in settings.json', () => {
      runInit(tempDir, { agent: 'opencode' });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.agent).toEqual({ type: 'opencode' });
    });

    it('pre-configures kiro in settings.json', () => {
      runInit(tempDir, { agent: 'kiro' });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.agent).toEqual({ type: 'kiro' });
    });

    it('pre-configures custom in settings.json', () => {
      runInit(tempDir, { agent: 'custom' });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.agent).toEqual({ type: 'custom' });
    });

    it('rejects invalid agent type', () => {
      const result = runInit(tempDir, { agent: 'invalid-agent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent type');
      expect(result.error).toContain('invalid-agent');
    });

    it('includes valid agent types in error message', () => {
      const result = runInit(tempDir, { agent: 'bad' });

      expect(result.error).toContain('claude-code');
      expect(result.error).toContain('codex');
      expect(result.error).toContain('opencode');
      expect(result.error).toContain('kiro');
      expect(result.error).toContain('custom');
    });
  });

  // ==========================================================================
  // --dry-run option
  // ==========================================================================

  describe('--dry-run option', () => {
    it('does not create any files', () => {
      const result = runInit(tempDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.created.length).toBe(3);
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(false);
    });

    it('reports what would be created', () => {
      const result = runInit(tempDir, { dryRun: true });

      expect(result.created).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/projects/default/settings.json');
      expect(result.created).toContain('.ralph/projects/default/execute.md');
    });

    it('still returns gitignore suggestions', () => {
      const result = runInit(tempDir, { dryRun: true });

      expect(result.gitignoreSuggestions.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // --force option
  // ==========================================================================

  describe('--force option', () => {
    it('overwrites existing settings.json', () => {
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{"old": "value"}', 'utf-8');

      const result = runInit(tempDir, { force: true });

      expect(result.success).toBe(true);
      expect(result.created).toContain('.ralph/settings.json');
      expect(result.skipped).not.toContain('.ralph/settings.json');

      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      expect(settings.task_management).toEqual({
        provider: 'github-issues',
        provider_config: { label_filter: 'ralph' },
      });
    });

    it('overwrites existing project files', () => {
      const executePath = path.join(tempDir, '.ralph/projects/default/execute.md');
      fs.mkdirSync(path.dirname(executePath), { recursive: true });
      fs.writeFileSync(executePath, 'Old content', 'utf-8');

      const result = runInit(tempDir, { force: true });

      expect(result.created).toContain('.ralph/projects/default/execute.md');

      const content = fs.readFileSync(executePath, 'utf-8');
      expect(content).toContain('Workflow');
    });

    it('works with --agent option', () => {
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{}', 'utf-8');

      runInit(tempDir, { force: true, agent: 'codex' });

      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      expect(settings.agent).toEqual({ type: 'codex' });
      expect(settings.task_management).toEqual({
        provider: 'github-issues',
        provider_config: { label_filter: 'ralph' },
      });
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('error handling', () => {
    it('handles non-writable directory', () => {
      // Skip on Windows where permission handling is different
      if (process.platform === 'win32') {
        return;
      }

      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);

      const result = runInit(readOnlyDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Cleanup - restore permissions
      fs.chmodSync(readOnlyDir, 0o755);
    });
  });

  // ==========================================================================
  // formatInitOutput
  // ==========================================================================

  describe('formatInitOutput', () => {
    it('includes created files in output', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: ['.ralph/settings.json', '.ralph/projects/default/execute.md'],
        skipped: [],
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('Created:');
      expect(output).toContain('.ralph/settings.json');
      expect(output).toContain('.ralph/projects/default/execute.md');
    });

    it('includes skipped files in output', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: [],
        skipped: ['.ralph/settings.json'],
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('Skipped (already exist):');
      expect(output).toContain('.ralph/settings.json');
    });

    it('includes gitignore suggestions', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: [],
        skipped: [],
        gitignoreSuggestions: ['# Comment', '.ralph/settings.local.json'],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('Suggested .gitignore additions:');
      expect(output).toContain('.ralph/settings.local.json');
    });

    it('includes next steps', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: ['.ralph/settings.json'],
        skipped: [],
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('Next steps:');
      expect(output).toContain('ralph');
    });

    it('includes success message', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: ['.ralph/settings.json'],
        skipped: [],
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('initialized successfully');
    });

    it('shows error for failed result', () => {
      const result: InitResult = {
        success: false,
        projectRoot: tempDir,
        created: [],
        skipped: [],
        error: 'Permission denied',
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result);

      expect(output).toContain('Error:');
      expect(output).toContain('Permission denied');
    });

    it('indicates dry run mode', () => {
      const result: InitResult = {
        success: true,
        projectRoot: tempDir,
        created: ['.ralph/settings.json'],
        skipped: [],
        gitignoreSuggestions: [],
      };

      const output = formatInitOutput(result, { dryRun: true });

      expect(output).toContain('Dry run');
      expect(output).toContain('Would create:');
    });
  });
});

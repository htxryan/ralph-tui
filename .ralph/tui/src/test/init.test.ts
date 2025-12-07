/**
 * Integration tests for ralph init command
 *
 * These tests verify the init command works correctly in realistic scenarios,
 * including integration with the config loading system and end-to-end CLI behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runInit, formatInitOutput } from '../commands/init.js';
import { loadConfigFile, getProjectConfigPath } from '../lib/config.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createTempDir(): string {
  const tempBase = os.tmpdir();
  const tempDir = path.join(
    tempBase,
    `ralph-init-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(tempDir: string): void {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('init integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ==========================================================================
  // Basic Init Tests - Directory Structure
  // ==========================================================================

  describe('basic init - directory structure', () => {
    it('creates .ralph/ directory', () => {
      runInit(tempDir);
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(true);
    });

    it('creates settings.json file', () => {
      runInit(tempDir);
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
    });

    it('creates workflows/ directory', () => {
      runInit(tempDir);
      expect(fs.existsSync(path.join(tempDir, '.ralph/workflows'))).toBe(true);
    });

    it('creates orchestrate.example.md file', () => {
      runInit(tempDir);
      const orchestratePath = path.join(tempDir, '.ralph/orchestrate.example.md');
      expect(fs.existsSync(orchestratePath)).toBe(true);
    });

    it('creates workflow example files', () => {
      runInit(tempDir);
      const workflowPath = path.join(tempDir, '.ralph/workflows/01-feature-branch-incomplete.example.md');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('creates all expected files', () => {
      const result = runInit(tempDir);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(8);
      expect(result.created).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/orchestrate.example.md');
      expect(result.created).toContain('.ralph/workflows/01-feature-branch-incomplete.example.md');
      expect(result.created).toContain('.ralph/workflows/06-new-work.example.md');
    });
  });

  // ==========================================================================
  // Does not overwrite existing files
  // ==========================================================================

  describe('does not overwrite existing files', () => {
    it('preserves existing settings.json content', () => {
      // Pre-create settings with custom content
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      const settingsPath = path.join(ralphDir, 'settings.json');
      const customSettings = { custom: 'value', agent: { type: 'codex' } };
      fs.writeFileSync(settingsPath, JSON.stringify(customSettings), 'utf-8');

      // Run init
      const result = runInit(tempDir);

      // Verify original content preserved
      expect(result.success).toBe(true);
      expect(result.skipped).toContain('.ralph/settings.json');
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(content).toEqual(customSettings);
    });

    it('preserves existing orchestrate.example.md content', () => {
      // Pre-create orchestrate.example.md with custom content
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      const orchestratePath = path.join(ralphDir, 'orchestrate.example.md');
      const customContent = '# My Custom Orchestration\n\nThis should be preserved.';
      fs.writeFileSync(orchestratePath, customContent, 'utf-8');

      // Run init
      const result = runInit(tempDir);

      // Verify original content preserved
      expect(result.skipped).toContain('.ralph/orchestrate.example.md');
      expect(fs.readFileSync(orchestratePath, 'utf-8')).toBe(customContent);
    });

    it('creates missing files when some already exist', () => {
      // Pre-create only settings.json
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      fs.writeFileSync(path.join(ralphDir, 'settings.json'), '{}', 'utf-8');

      // Run init
      const result = runInit(tempDir);

      // settings.json skipped, others created
      expect(result.skipped).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/orchestrate.example.md');
      expect(result.created).toContain('.ralph/workflows/01-feature-branch-incomplete.example.md');
    });
  });

  // ==========================================================================
  // --agent option
  // ==========================================================================

  describe('--agent option', () => {
    it('pre-configures claude-code agent in settings.json', () => {
      runInit(tempDir, { agent: 'claude-code' });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.agent).toEqual({ type: 'claude-code' });
    });

    it('pre-configures codex agent in settings.json', () => {
      runInit(tempDir, { agent: 'codex' });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.agent).toEqual({ type: 'codex' });
    });

    it('settings.json with agent is loadable by config system', () => {
      runInit(tempDir, { agent: 'opencode' });

      // Use the config loading function to verify it's valid
      const configResult = loadConfigFile(getProjectConfigPath(tempDir));
      expect(configResult.loaded).toBe(true);
      expect(configResult.error).toBeUndefined();
      expect(configResult.config.agent).toEqual({ type: 'opencode' });
    });

    it('rejects invalid agent type', () => {
      const result = runInit(tempDir, { agent: 'invalid-agent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid agent type');
      expect(result.error).toContain('invalid-agent');
      // No files should be created
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(false);
    });

    it('error message lists valid agent types', () => {
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
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(false);
    });

    it('reports what would be created', () => {
      const result = runInit(tempDir, { dryRun: true });

      expect(result.created).toHaveLength(8);
      expect(result.created).toContain('.ralph/settings.json');
      expect(result.created).toContain('.ralph/orchestrate.example.md');
    });

    it('output indicates dry run mode', () => {
      const result = runInit(tempDir, { dryRun: true });
      const output = formatInitOutput(result, { dryRun: true });

      expect(output).toContain('Dry run');
      expect(output).toContain('Would create:');
    });

    it('combined with --agent shows what config would look like', () => {
      const result = runInit(tempDir, { dryRun: true, agent: 'claude-code' });

      expect(result.success).toBe(true);
      expect(result.created).toContain('.ralph/settings.json');
      // Still no files created
      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(false);
    });
  });

  // ==========================================================================
  // Idempotency - Running init twice
  // ==========================================================================

  describe('idempotency', () => {
    it('running init twice succeeds both times', () => {
      const result1 = runInit(tempDir);
      const result2 = runInit(tempDir);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('second init skips all files', () => {
      runInit(tempDir);
      const result2 = runInit(tempDir);

      expect(result2.created).toHaveLength(0);
      expect(result2.skipped).toHaveLength(8);
    });

    it('files are identical after second init', () => {
      runInit(tempDir);

      // Read file contents after first init
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const orchestratePath = path.join(tempDir, '.ralph/orchestrate.example.md');
      const content1 = {
        settings: fs.readFileSync(settingsPath, 'utf-8'),
        orchestrate: fs.readFileSync(orchestratePath, 'utf-8'),
      };

      // Run init again
      runInit(tempDir);

      // Verify contents unchanged
      const content2 = {
        settings: fs.readFileSync(settingsPath, 'utf-8'),
        orchestrate: fs.readFileSync(orchestratePath, 'utf-8'),
      };

      expect(content1).toEqual(content2);
    });

    it('running init with different agent does not overwrite existing config', () => {
      // First init with claude-code
      runInit(tempDir, { agent: 'claude-code' });

      // Second init with codex (without force)
      const result2 = runInit(tempDir, { agent: 'codex' });

      expect(result2.skipped).toContain('.ralph/settings.json');

      // Verify original agent type preserved
      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.agent.type).toBe('claude-code');
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('error handling', () => {
    it('handles read-only directory gracefully', () => {
      // Skip on Windows
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

    it('returns error message when init fails', () => {
      // Skip on Windows
      if (process.platform === 'win32') {
        return;
      }

      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);

      const result = runInit(readOnlyDir);
      const output = formatInitOutput(result);

      expect(output).toContain('Error:');

      // Cleanup
      fs.chmodSync(readOnlyDir, 0o755);
    });
  });

  // ==========================================================================
  // Config system integration
  // ==========================================================================

  describe('config system integration', () => {
    it('settings.json created by init is loadable by config system', () => {
      runInit(tempDir);

      const configResult = loadConfigFile(getProjectConfigPath(tempDir));
      expect(configResult.loaded).toBe(true);
      expect(configResult.error).toBeUndefined();
    });

    it('empty settings.json is valid for config system', () => {
      runInit(tempDir);

      const configResult = loadConfigFile(getProjectConfigPath(tempDir));
      expect(configResult.loaded).toBe(true);
      expect(configResult.config).toEqual({});
    });

    it('settings.json with agent is merged correctly by config system', () => {
      runInit(tempDir, { agent: 'codex' });

      const configResult = loadConfigFile(getProjectConfigPath(tempDir));
      expect(configResult.config.agent?.type).toBe('codex');
    });
  });

  // ==========================================================================
  // Force option
  // ==========================================================================

  describe('--force option', () => {
    it('overwrites existing settings.json', () => {
      // Pre-create with custom content
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      const settingsPath = path.join(ralphDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{"old": "value"}', 'utf-8');

      // Run init with force
      const result = runInit(tempDir, { force: true });

      expect(result.created).toContain('.ralph/settings.json');
      expect(result.skipped).not.toContain('.ralph/settings.json');

      // Verify content was overwritten
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(content).toEqual({});
    });

    it('--force with --agent overwrites config with new agent', () => {
      // First init with claude-code
      runInit(tempDir, { agent: 'claude-code' });

      // Force init with codex
      runInit(tempDir, { agent: 'codex', force: true });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.agent.type).toBe('codex');
    });
  });

  // ==========================================================================
  // Multi-option combinations
  // ==========================================================================

  describe('option combinations', () => {
    it('--dry-run --agent does not create files', () => {
      runInit(tempDir, { dryRun: true, agent: 'claude-code' });

      expect(fs.existsSync(path.join(tempDir, '.ralph'))).toBe(false);
    });

    it('--dry-run --force reports all files would be created', () => {
      // Pre-create some files
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      fs.writeFileSync(path.join(ralphDir, 'settings.json'), '{}', 'utf-8');

      // Dry run with force
      const result = runInit(tempDir, { dryRun: true, force: true });

      // All files should be in "created" (would be created)
      expect(result.created).toHaveLength(8);
      expect(result.skipped).toHaveLength(0);
    });

    it('--agent with --force creates properly configured settings', () => {
      // Pre-create with different agent
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      fs.writeFileSync(
        path.join(ralphDir, 'settings.json'),
        '{"agent": {"type": "claude-code"}}',
        'utf-8'
      );

      // Force with new agent
      runInit(tempDir, { agent: 'kiro', force: true });

      const settingsPath = path.join(tempDir, '.ralph/settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.agent.type).toBe('kiro');
    });
  });

  // ==========================================================================
  // Output formatting
  // ==========================================================================

  describe('output formatting', () => {
    it('includes gitignore suggestions in output', () => {
      const result = runInit(tempDir);
      const output = formatInitOutput(result);

      expect(output).toContain('Suggested .gitignore additions:');
      expect(output).toContain('settings.local.json');
      expect(output).toContain('claude_output.jsonl');
    });

    it('includes next steps in output', () => {
      const result = runInit(tempDir);
      const output = formatInitOutput(result);

      expect(output).toContain('Next steps:');
      expect(output).toContain('ralph');
    });

    it('includes success message', () => {
      const result = runInit(tempDir);
      const output = formatInitOutput(result);

      expect(output).toContain('initialized successfully');
    });

    it('shows created files in output', () => {
      const result = runInit(tempDir);
      const output = formatInitOutput(result);

      expect(output).toContain('Created:');
      expect(output).toContain('.ralph/settings.json');
    });

    it('shows skipped files when some exist', () => {
      // Pre-create settings
      const ralphDir = path.join(tempDir, '.ralph');
      fs.mkdirSync(ralphDir, { recursive: true });
      fs.writeFileSync(path.join(ralphDir, 'settings.json'), '{}', 'utf-8');

      const result = runInit(tempDir);
      const output = formatInitOutput(result);

      expect(output).toContain('Skipped (already exist):');
      expect(output).toContain('.ralph/settings.json');
    });
  });

  // ==========================================================================
  // Nested directory scenarios
  // ==========================================================================

  describe('nested directory scenarios', () => {
    it('creates .ralph in deeply nested directory', () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c', 'project');
      fs.mkdirSync(nestedDir, { recursive: true });

      const result = runInit(nestedDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(nestedDir, '.ralph'))).toBe(true);
      expect(fs.existsSync(path.join(nestedDir, '.ralph/settings.json'))).toBe(true);
    });

    it('handles spaces in directory path', () => {
      const spacesDir = path.join(tempDir, 'my project', 'sub folder');
      fs.mkdirSync(spacesDir, { recursive: true });

      const result = runInit(spacesDir);

      expect(result.success).toBe(true);
      expect(result.projectRoot).toBe(spacesDir);
    });
  });

  // ==========================================================================
  // Tests are isolated and clean up
  // ==========================================================================

  describe('test isolation', () => {
    it('temp directory is unique for each test', () => {
      const currentTempDir = tempDir;
      expect(currentTempDir).toContain('ralph-init-integration-');
    });

    it('temp directory exists before test', () => {
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('can write files to temp directory', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test', 'utf-8');
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });
});

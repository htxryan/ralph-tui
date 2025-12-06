import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  DEFAULT_CONFIG,
  deepMerge,
  getGlobalConfigDir,
  getGlobalConfigPath,
  getProjectConfigPath,
  getLocalConfigPath,
  loadConfigFile,
  validateConfig,
  cliOptionsToConfig,
  getConfig,
  loadConfig,
  writeConfigFile,
  ConfigValidationError,
  type RalphConfig,
  type PartialRalphConfig,
  type CLIOptions,
} from './config.js';

// Mock fs module
vi.mock('fs');
vi.mock('os');

describe('config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for os.platform
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(os.homedir).mockReturnValue('/Users/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Platform-specific paths
  // ==========================================================================

  describe('getGlobalConfigDir', () => {
    it('returns macOS path on darwin', () => {
      vi.mocked(os.platform).mockReturnValue('darwin');
      vi.mocked(os.homedir).mockReturnValue('/Users/testuser');

      expect(getGlobalConfigDir()).toBe('/Users/testuser/Library/Application Support/ralph');
    });

    it('returns Windows path on win32', () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      vi.mocked(os.homedir).mockReturnValue('C:\\Users\\testuser');
      process.env.APPDATA = 'C:\\Users\\testuser\\AppData\\Roaming';

      expect(getGlobalConfigDir()).toBe('C:\\Users\\testuser\\AppData\\Roaming\\ralph');

      delete process.env.APPDATA;
    });

    it('returns Windows fallback path when APPDATA not set', () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      vi.mocked(os.homedir).mockReturnValue('C:\\Users\\testuser');
      delete process.env.APPDATA;

      const result = getGlobalConfigDir();
      expect(result).toContain('ralph');
      expect(result).toContain('AppData');
    });

    it('returns Linux XDG path on linux', () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      delete process.env.XDG_CONFIG_HOME;

      expect(getGlobalConfigDir()).toBe('/home/testuser/.config/ralph');
    });

    it('respects XDG_CONFIG_HOME on Linux', () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      process.env.XDG_CONFIG_HOME = '/custom/config';

      expect(getGlobalConfigDir()).toBe('/custom/config/ralph');

      delete process.env.XDG_CONFIG_HOME;
    });
  });

  describe('getGlobalConfigPath', () => {
    it('returns settings.json in global config dir', () => {
      vi.mocked(os.platform).mockReturnValue('darwin');
      vi.mocked(os.homedir).mockReturnValue('/Users/testuser');

      expect(getGlobalConfigPath()).toBe(
        '/Users/testuser/Library/Application Support/ralph/settings.json'
      );
    });
  });

  describe('getProjectConfigPath', () => {
    it('returns .ralph/settings.json in project root', () => {
      expect(getProjectConfigPath('/my/project')).toBe('/my/project/.ralph/settings.json');
    });
  });

  describe('getLocalConfigPath', () => {
    it('returns .ralph/settings.local.json in project root', () => {
      expect(getLocalConfigPath('/my/project')).toBe('/my/project/.ralph/settings.local.json');
    });
  });

  // ==========================================================================
  // Deep merge
  // ==========================================================================

  describe('deepMerge', () => {
    it('merges flat objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('merges nested objects recursively', () => {
      const target = { outer: { a: 1, b: 2 } };
      const source = { outer: { b: 3, c: 4 } };

      expect(deepMerge(target, source)).toEqual({ outer: { a: 1, b: 3, c: 4 } });
    });

    it('replaces arrays instead of merging them', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };

      expect(deepMerge(target, source)).toEqual({ arr: [4, 5] });
    });

    it('skips undefined values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { a: undefined, c: 3 };

      expect(deepMerge(target, source)).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('allows null to overwrite values', () => {
      const target = { a: 1 };
      const source = { a: null };

      expect(deepMerge(target, source)).toEqual({ a: null });
    });

    it('does not mutate the original target', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      const result = deepMerge(target, source);

      expect(target).toEqual({ a: 1 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('handles deeply nested structures', () => {
      const target = {
        level1: {
          level2: {
            level3: { a: 1, b: 2 },
          },
        },
      };
      const source = {
        level1: {
          level2: {
            level3: { b: 3, c: 4 },
          },
        },
      };

      expect(deepMerge(target, source)).toEqual({
        level1: {
          level2: {
            level3: { a: 1, b: 3, c: 4 },
          },
        },
      });
    });
  });

  // ==========================================================================
  // Config file loading
  // ==========================================================================

  describe('loadConfigFile', () => {
    it('returns empty config when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadConfigFile('/path/to/settings.json');

      expect(result.loaded).toBe(false);
      expect(result.config).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('loads and parses valid JSON config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"agent": {"type": "codex"}}');

      const result = loadConfigFile('/path/to/settings.json');

      expect(result.loaded).toBe(true);
      expect(result.config).toEqual({ agent: { type: 'codex' } });
      expect(result.error).toBeUndefined();
    });

    it('handles empty files gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('   ');

      const result = loadConfigFile('/path/to/settings.json');

      expect(result.loaded).toBe(true);
      expect(result.config).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('returns error for invalid JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const result = loadConfigFile('/path/to/settings.json');

      expect(result.loaded).toBe(false);
      expect(result.config).toEqual({});
      expect(result.error).toBeDefined();
    });

    it('includes path in result', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadConfigFile('/custom/path/config.json');

      expect(result.path).toBe('/custom/path/config.json');
    });
  });

  // ==========================================================================
  // Config validation
  // ==========================================================================

  describe('validateConfig', () => {
    it('accepts valid default config', () => {
      expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
    });

    it('rejects invalid agent type', () => {
      const config = {
        ...DEFAULT_CONFIG,
        agent: { ...DEFAULT_CONFIG.agent, type: 'invalid' as any },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/agent\.type/);
    });

    it('rejects non-boolean showSidebar', () => {
      const config = {
        ...DEFAULT_CONFIG,
        display: { ...DEFAULT_CONFIG.display, showSidebar: 'yes' as any },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/display\.showSidebar/);
    });

    it('rejects invalid defaultTab', () => {
      const config = {
        ...DEFAULT_CONFIG,
        display: { ...DEFAULT_CONFIG.display, defaultTab: 'invalid' as any },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/display\.defaultTab/);
    });

    it('rejects invalid theme', () => {
      const config = {
        ...DEFAULT_CONFIG,
        display: { ...DEFAULT_CONFIG.display, theme: 'neon' as any },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/display\.theme/);
    });

    it('rejects empty jsonlPath', () => {
      const config = {
        ...DEFAULT_CONFIG,
        process: { ...DEFAULT_CONFIG.process, jsonlPath: '' },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/process\.jsonlPath/);
    });

    it('rejects negative timeout', () => {
      const config = {
        ...DEFAULT_CONFIG,
        process: { ...DEFAULT_CONFIG.process, startupTimeout: -1 },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/process\.startupTimeout/);
    });

    it('accepts valid custom config', () => {
      const config: RalphConfig = {
        agent: {
          type: 'codex',
          binaryPath: '/usr/local/bin/codex',
          args: ['--verbose'],
          env: { DEBUG: '1' },
        },
        display: {
          showSidebar: true,
          defaultTab: 'stats',
          defaultFilters: ['user', 'assistant'],
          theme: 'minimal',
        },
        process: {
          jsonlPath: 'custom/output.jsonl',
          lockPath: 'custom/lock',
          startupTimeout: 60000,
          shutdownTimeout: 10000,
        },
        paths: {
          archiveDir: 'custom/archive',
          promptsDir: 'custom/prompts',
          planningDir: 'custom/planning',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  // ==========================================================================
  // CLI options conversion
  // ==========================================================================

  describe('cliOptionsToConfig', () => {
    it('converts file option to process.jsonlPath', () => {
      const options: CLIOptions = { file: 'custom.jsonl' };

      expect(cliOptionsToConfig(options)).toEqual({
        process: { jsonlPath: 'custom.jsonl' },
      });
    });

    it('converts sidebar option to display.showSidebar', () => {
      const options: CLIOptions = { sidebar: true };

      expect(cliOptionsToConfig(options)).toEqual({
        display: { showSidebar: true },
      });
    });

    it('converts valid agent option', () => {
      const options: CLIOptions = { agent: 'codex' };

      expect(cliOptionsToConfig(options)).toEqual({
        agent: { type: 'codex' },
      });
    });

    it('ignores invalid agent option', () => {
      const options: CLIOptions = { agent: 'invalid-agent' };

      expect(cliOptionsToConfig(options)).toEqual({});
    });

    it('handles multiple options', () => {
      const options: CLIOptions = {
        file: 'test.jsonl',
        sidebar: true,
        agent: 'opencode',
      };

      expect(cliOptionsToConfig(options)).toEqual({
        process: { jsonlPath: 'test.jsonl' },
        display: { showSidebar: true },
        agent: { type: 'opencode' },
      });
    });

    it('returns empty object for no options', () => {
      expect(cliOptionsToConfig({})).toEqual({});
    });
  });

  // ==========================================================================
  // Full config loading
  // ==========================================================================

  describe('getConfig', () => {
    beforeEach(() => {
      // Default: no config files exist
      vi.mocked(fs.existsSync).mockReturnValue(false);
    });

    it('returns default config when no files exist', () => {
      const result = getConfig('/project');

      expect(result.config).toEqual(DEFAULT_CONFIG);
      expect(result.sources.global.loaded).toBe(false);
      expect(result.sources.project.loaded).toBe(false);
      expect(result.sources.local.loaded).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('merges global config over defaults', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === getGlobalConfigPath());
      vi.mocked(fs.readFileSync).mockReturnValue('{"display": {"showSidebar": true}}');

      const result = getConfig('/project');

      expect(result.config.display.showSidebar).toBe(true);
      // Other defaults preserved
      expect(result.config.agent.type).toBe('claude-code');
      expect(result.sources.global.loaded).toBe(true);
    });

    it('merges project config over global', () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (p) => p === getGlobalConfigPath() || p === getProjectConfigPath('/project')
      );
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === getGlobalConfigPath()) {
          return '{"agent": {"type": "codex"}, "display": {"showSidebar": true}}';
        }
        return '{"agent": {"type": "opencode"}}';
      });

      const result = getConfig('/project');

      // Project overrides global
      expect(result.config.agent.type).toBe('opencode');
      // Global setting preserved where not overridden
      expect(result.config.display.showSidebar).toBe(true);
    });

    it('merges local config over project', () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (p) => p === getProjectConfigPath('/project') || p === getLocalConfigPath('/project')
      );
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === getProjectConfigPath('/project')) {
          return '{"agent": {"type": "codex"}}';
        }
        return '{"agent": {"type": "kiro"}}';
      });

      const result = getConfig('/project');

      expect(result.config.agent.type).toBe('kiro');
    });

    it('applies CLI options over all config files', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === getLocalConfigPath('/project'));
      vi.mocked(fs.readFileSync).mockReturnValue('{"display": {"showSidebar": true}}');

      const result = getConfig('/project', { sidebar: false });

      // CLI overrides config file
      expect(result.config.display.showSidebar).toBe(false);
    });

    it('collects warnings for parse errors but continues', () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (p) => p === getGlobalConfigPath() || p === getProjectConfigPath('/project')
      );
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === getGlobalConfigPath()) {
          return '{ invalid json }';
        }
        return '{"agent": {"type": "codex"}}';
      });

      const result = getConfig('/project');

      // Project config still applied despite global parse error
      expect(result.config.agent.type).toBe('codex');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('global config');
    });

    it('throws on validation error', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => p === getProjectConfigPath('/project'));
      vi.mocked(fs.readFileSync).mockReturnValue('{"agent": {"type": "invalid-type"}}');

      expect(() => getConfig('/project')).toThrow(/Configuration validation failed/);
    });
  });

  describe('loadConfig', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
    });

    it('returns just the config object', () => {
      const config = loadConfig('/project');

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('logs warnings to stderr', () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      vi.mocked(fs.existsSync).mockImplementation((p) => p === getGlobalConfigPath());
      vi.mocked(fs.readFileSync).mockReturnValue('{ bad json }');

      loadConfig('/project');

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Warning:'));
    });
  });

  // ==========================================================================
  // Config file writing
  // ==========================================================================

  describe('writeConfigFile', () => {
    it('creates directory if needed and writes JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const mkdirSpy = vi.mocked(fs.mkdirSync);
      const writeSpy = vi.mocked(fs.writeFileSync);

      const config: PartialRalphConfig = { agent: { type: 'codex' } };
      writeConfigFile('/new/dir/settings.json', config);

      expect(mkdirSpy).toHaveBeenCalledWith('/new/dir', { recursive: true });
      expect(writeSpy).toHaveBeenCalledWith(
        '/new/dir/settings.json',
        expect.stringContaining('"type": "codex"'),
        'utf-8'
      );
    });

    it('skips mkdir if directory exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const mkdirSpy = vi.mocked(fs.mkdirSync);

      writeConfigFile('/existing/settings.json', {});

      expect(mkdirSpy).not.toHaveBeenCalled();
    });

    it('writes pretty-printed JSON with trailing newline', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const writeSpy = vi.mocked(fs.writeFileSync);

      writeConfigFile('/path/settings.json', { agent: { type: 'kiro' } });

      const writtenContent = writeSpy.mock.calls[0][1] as string;
      expect(writtenContent).toMatch(/^\{/);
      expect(writtenContent).toMatch(/\}\n$/);
      expect(writtenContent).toContain('  '); // Indentation
    });
  });

  // ==========================================================================
  // Default config values
  // ==========================================================================

  describe('DEFAULT_CONFIG', () => {
    it('has claude-code as default agent', () => {
      expect(DEFAULT_CONFIG.agent.type).toBe('claude-code');
    });

    it('hides sidebar by default', () => {
      expect(DEFAULT_CONFIG.display.showSidebar).toBe(false);
    });

    it('defaults to messages tab', () => {
      expect(DEFAULT_CONFIG.display.defaultTab).toBe('messages');
    });

    it('enables all message filters by default', () => {
      expect(DEFAULT_CONFIG.display.defaultFilters).toContain('user');
      expect(DEFAULT_CONFIG.display.defaultFilters).toContain('assistant');
      expect(DEFAULT_CONFIG.display.defaultFilters).toContain('thinking');
    });

    it('uses standard Ralph paths', () => {
      expect(DEFAULT_CONFIG.process.jsonlPath).toBe('.ralph/claude_output.jsonl');
      expect(DEFAULT_CONFIG.process.lockPath).toBe('.ralph/claude.lock');
      expect(DEFAULT_CONFIG.paths.archiveDir).toBe('.ralph/archive');
    });
  });
});

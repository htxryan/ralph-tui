/**
 * Configuration loading system for Ralph
 *
 * Loads settings from multiple sources with the following precedence (highest to lowest):
 * 1. CLI arguments
 * 2. Local overrides (.ralph/settings.local.json)
 * 3. Project settings (.ralph/settings.json)
 * 4. Global user config (~/.config/ralph/settings.json or platform equivalent)
 * 5. Built-in defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported agent types that Ralph can orchestrate
 */
export type AgentType = 'claude-code' | 'codex' | 'opencode' | 'kiro' | 'custom';

/**
 * Agent-specific configuration
 */
export interface AgentConfig {
  /** Agent type identifier */
  type: AgentType;
  /** Path to agent CLI binary (if not in PATH) */
  binaryPath?: string;
  /** Additional CLI arguments to pass to the agent */
  args?: string[];
  /** Environment variables to set when spawning the agent */
  env?: Record<string, string>;
}

/**
 * Display/UI configuration options
 */
export interface DisplayConfig {
  /** Show sidebar on startup */
  showSidebar: boolean;
  /** Default tab to show on startup */
  defaultTab: 'messages' | 'bdissue' | 'todos' | 'errors' | 'stats';
  /** Enable/disable message filters by default */
  defaultFilters: string[];
  /** Color theme (reserved for future use) */
  theme?: 'default' | 'minimal' | 'colorblind';
}

/**
 * Process management configuration
 */
export interface ProcessConfig {
  /** Path to JSONL output file (relative to project root) */
  jsonlPath: string;
  /** Path to lock file (relative to project root) */
  lockPath: string;
  /** Timeout in ms for waiting on agent startup */
  startupTimeout: number;
  /** Timeout in ms for graceful shutdown before SIGKILL */
  shutdownTimeout: number;
}

/**
 * Paths configuration for Ralph directory structure
 */
export interface PathsConfig {
  /** Directory for archived sessions (relative to project root) */
  archiveDir: string;
  /** Directory for prompt templates (relative to project root) */
  promptsDir: string;
  /** Planning directory (relative to project root) */
  planningDir: string;
}

/**
 * Complete Ralph configuration schema
 */
export interface RalphConfig {
  /** Agent configuration */
  agent: AgentConfig;
  /** Display/UI settings */
  display: DisplayConfig;
  /** Process management settings */
  process: ProcessConfig;
  /** Directory paths */
  paths: PathsConfig;
}

/**
 * Partial configuration for merging (all fields optional)
 */
export type PartialRalphConfig = {
  agent?: Partial<AgentConfig>;
  display?: Partial<DisplayConfig>;
  process?: Partial<ProcessConfig>;
  paths?: Partial<PathsConfig>;
};

/**
 * CLI options that can override configuration
 */
export interface CLIOptions {
  file?: string;
  issue?: string;
  sidebar?: boolean;
  watch?: boolean;
  agent?: string;
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly reason: string
  ) {
    super(`Invalid configuration for '${field}': ${reason}`);
    this.name = 'ConfigValidationError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Built-in default configuration values
 */
export const DEFAULT_CONFIG: RalphConfig = {
  agent: {
    type: 'claude-code',
    args: [],
    env: {},
  },
  display: {
    showSidebar: false,
    defaultTab: 'messages',
    defaultFilters: [
      'initial-prompt',
      'user',
      'thinking',
      'tool',
      'assistant',
      'subagent',
      'system',
      'result',
    ],
  },
  process: {
    jsonlPath: '.ralph/claude_output.jsonl',
    lockPath: '.ralph/claude.lock',
    startupTimeout: 30000,
    shutdownTimeout: 5000,
  },
  paths: {
    archiveDir: '.ralph/archive',
    promptsDir: '.ralph/prompts',
    planningDir: '.ralph/planning',
  },
};

// ============================================================================
// Platform-specific Paths
// ============================================================================

/**
 * Get the platform-specific global configuration directory
 *
 * - macOS: ~/Library/Application Support/ralph
 * - Linux: ~/.config/ralph (XDG_CONFIG_HOME)
 * - Windows: %APPDATA%/ralph
 */
export function getGlobalConfigDir(): string {
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/ralph
    return path.join(os.homedir(), 'Library', 'Application Support', 'ralph');
  } else if (platform === 'win32') {
    // Windows: %APPDATA%/ralph
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'ralph');
  } else {
    // Linux and others: XDG_CONFIG_HOME or ~/.config
    const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(xdgConfig, 'ralph');
  }
}

/**
 * Get the path to the global settings file
 */
export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'settings.json');
}

/**
 * Get the path to the project settings file
 */
export function getProjectConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.ralph', 'settings.json');
}

/**
 * Get the path to the local overrides file
 */
export function getLocalConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.ralph', 'settings.local.json');
}

// ============================================================================
// Deep Merge Utility
// ============================================================================

/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Deep merge two objects
 *
 * Rules:
 * - Nested objects are merged recursively
 * - Arrays are replaced (not merged)
 * - Undefined values in source don't overwrite target
 * - null values in source DO overwrite target
 *
 * Note: Uses Record<string, unknown> internally to handle
 * complex nested partial types like PartialRalphConfig
 */
export function deepMerge<T extends object>(
  target: T,
  source: Record<string, unknown>
): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    // Skip undefined values in source
    if (sourceValue === undefined) {
      continue;
    }

    // If both are plain objects, merge recursively
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      // Otherwise, replace (including arrays, primitives, null)
      result[key] = sourceValue;
    }
  }

  return result as T;
}

// ============================================================================
// Config File Loading
// ============================================================================

/**
 * Result of attempting to load a config file
 */
export interface ConfigLoadResult {
  /** Whether the file was found and loaded */
  loaded: boolean;
  /** The parsed configuration (empty object if not loaded) */
  config: PartialRalphConfig;
  /** Error message if loading failed (file exists but couldn't be parsed) */
  error?: string;
  /** Path that was attempted */
  path: string;
}

/**
 * Load a configuration file from disk
 *
 * Returns an empty config if the file doesn't exist.
 * Returns an error if the file exists but can't be parsed.
 */
export function loadConfigFile(configPath: string): ConfigLoadResult {
  const result: ConfigLoadResult = {
    loaded: false,
    config: {},
    path: configPath,
  };

  try {
    if (!fs.existsSync(configPath)) {
      return result;
    }

    const content = fs.readFileSync(configPath, 'utf-8');

    // Handle empty files gracefully
    if (!content.trim()) {
      result.loaded = true;
      return result;
    }

    result.config = JSON.parse(content) as PartialRalphConfig;
    result.loaded = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

// ============================================================================
// Config Validation
// ============================================================================

const VALID_AGENT_TYPES: AgentType[] = ['claude-code', 'codex', 'opencode', 'kiro', 'custom'];
const VALID_TABS = ['messages', 'bdissue', 'todos', 'errors', 'stats'];
const VALID_THEMES = ['default', 'minimal', 'colorblind'];

/**
 * Validate a complete configuration object
 *
 * Throws ConfigValidationError with helpful message if validation fails.
 */
export function validateConfig(config: RalphConfig): void {
  // Validate agent config
  if (!VALID_AGENT_TYPES.includes(config.agent.type)) {
    throw new ConfigValidationError(
      'agent.type',
      config.agent.type,
      `must be one of: ${VALID_AGENT_TYPES.join(', ')}`
    );
  }

  if (config.agent.binaryPath !== undefined && typeof config.agent.binaryPath !== 'string') {
    throw new ConfigValidationError(
      'agent.binaryPath',
      config.agent.binaryPath,
      'must be a string path'
    );
  }

  if (config.agent.args !== undefined && !Array.isArray(config.agent.args)) {
    throw new ConfigValidationError('agent.args', config.agent.args, 'must be an array of strings');
  }

  // Validate display config
  if (typeof config.display.showSidebar !== 'boolean') {
    throw new ConfigValidationError(
      'display.showSidebar',
      config.display.showSidebar,
      'must be a boolean'
    );
  }

  if (!VALID_TABS.includes(config.display.defaultTab)) {
    throw new ConfigValidationError(
      'display.defaultTab',
      config.display.defaultTab,
      `must be one of: ${VALID_TABS.join(', ')}`
    );
  }

  if (config.display.theme !== undefined && !VALID_THEMES.includes(config.display.theme)) {
    throw new ConfigValidationError(
      'display.theme',
      config.display.theme,
      `must be one of: ${VALID_THEMES.join(', ')}`
    );
  }

  // Validate process config
  if (typeof config.process.jsonlPath !== 'string' || !config.process.jsonlPath) {
    throw new ConfigValidationError(
      'process.jsonlPath',
      config.process.jsonlPath,
      'must be a non-empty string path'
    );
  }

  if (typeof config.process.startupTimeout !== 'number' || config.process.startupTimeout < 0) {
    throw new ConfigValidationError(
      'process.startupTimeout',
      config.process.startupTimeout,
      'must be a non-negative number (milliseconds)'
    );
  }

  if (typeof config.process.shutdownTimeout !== 'number' || config.process.shutdownTimeout < 0) {
    throw new ConfigValidationError(
      'process.shutdownTimeout',
      config.process.shutdownTimeout,
      'must be a non-negative number (milliseconds)'
    );
  }

  // Validate paths config
  if (typeof config.paths.archiveDir !== 'string' || !config.paths.archiveDir) {
    throw new ConfigValidationError(
      'paths.archiveDir',
      config.paths.archiveDir,
      'must be a non-empty string path'
    );
  }

  if (typeof config.paths.promptsDir !== 'string' || !config.paths.promptsDir) {
    throw new ConfigValidationError(
      'paths.promptsDir',
      config.paths.promptsDir,
      'must be a non-empty string path'
    );
  }
}

// ============================================================================
// CLI Options to Config Conversion
// ============================================================================

/**
 * Convert CLI options to a partial config for merging
 */
export function cliOptionsToConfig(options: CLIOptions): PartialRalphConfig {
  const config: PartialRalphConfig = {};

  // File path option
  if (options.file !== undefined) {
    config.process = { jsonlPath: options.file };
  }

  // Sidebar option
  if (options.sidebar !== undefined) {
    config.display = { showSidebar: options.sidebar };
  }

  // Agent option
  if (options.agent !== undefined) {
    const agentType = options.agent as AgentType;
    if (VALID_AGENT_TYPES.includes(agentType)) {
      config.agent = { type: agentType };
    }
  }

  return config;
}

// ============================================================================
// Main Configuration Loading
// ============================================================================

/**
 * Result of loading configuration
 */
export interface GetConfigResult {
  /** The merged, validated configuration */
  config: RalphConfig;
  /** Information about which config files were loaded */
  sources: {
    global: ConfigLoadResult;
    project: ConfigLoadResult;
    local: ConfigLoadResult;
  };
  /** Any warnings (e.g., config file parse errors that were skipped) */
  warnings: string[];
}

/**
 * Load configuration from all sources and merge them
 *
 * @param projectRoot - The project root directory
 * @param cliOptions - CLI options that override config files
 * @returns The merged configuration and loading metadata
 */
export function getConfig(projectRoot: string, cliOptions: CLIOptions = {}): GetConfigResult {
  const warnings: string[] = [];

  // Load from all sources
  const globalResult = loadConfigFile(getGlobalConfigPath());
  const projectResult = loadConfigFile(getProjectConfigPath(projectRoot));
  const localResult = loadConfigFile(getLocalConfigPath(projectRoot));

  // Collect warnings for files that existed but couldn't be parsed
  if (globalResult.error) {
    warnings.push(`Failed to parse global config (${globalResult.path}): ${globalResult.error}`);
  }
  if (projectResult.error) {
    warnings.push(`Failed to parse project config (${projectResult.path}): ${projectResult.error}`);
  }
  if (localResult.error) {
    warnings.push(`Failed to parse local config (${localResult.path}): ${localResult.error}`);
  }

  // Convert CLI options to config format
  const cliConfig = cliOptionsToConfig(cliOptions);

  // Merge in order of precedence (lowest to highest)
  // 1. Defaults (lowest)
  let merged: RalphConfig = { ...DEFAULT_CONFIG };

  // 2. Global config
  if (globalResult.loaded && !globalResult.error) {
    merged = deepMerge(merged, globalResult.config);
  }

  // 3. Project config
  if (projectResult.loaded && !projectResult.error) {
    merged = deepMerge(merged, projectResult.config);
  }

  // 4. Local overrides
  if (localResult.loaded && !localResult.error) {
    merged = deepMerge(merged, localResult.config);
  }

  // 5. CLI options (highest)
  merged = deepMerge(merged, cliConfig);

  // Validate the final merged config
  try {
    validateConfig(merged);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      // Re-throw with more context
      throw new Error(
        `Configuration validation failed: ${err.message}\n` +
          `Check your config files or CLI options for invalid values.`
      );
    }
    throw err;
  }

  return {
    config: merged,
    sources: {
      global: globalResult,
      project: projectResult,
      local: localResult,
    },
    warnings,
  };
}

/**
 * Simple version of getConfig that just returns the config object
 * Throws on validation errors, logs warnings to stderr
 */
export function loadConfig(projectRoot: string, cliOptions: CLIOptions = {}): RalphConfig {
  const result = getConfig(projectRoot, cliOptions);

  // Log warnings to stderr
  for (const warning of result.warnings) {
    process.stderr.write(`Warning: ${warning}\n`);
  }

  return result.config;
}

// ============================================================================
// Config File Creation Utilities
// ============================================================================

/**
 * Ensure the global config directory exists
 */
export function ensureGlobalConfigDir(): string {
  const dir = getGlobalConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Write a config file (pretty-printed JSON)
 */
export function writeConfigFile(configPath: string, config: PartialRalphConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

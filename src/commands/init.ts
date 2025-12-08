/**
 * ralph init command
 *
 * Creates the .ralph/ directory structure in a project, including:
 * - settings.json (empty or pre-configured with agent)
 * - orchestrate.md (orchestration prompt)
 * - workflows/ directory with workflow files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { AgentType } from '../lib/config.js';
import type { TaskProvider } from '../lib/task-adapters/types.js';

// Get the package root directory (works in both dev and installed contexts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dev: src/commands -> ../ -> src -> ../ -> package root
// In dist: dist/commands -> ../ -> dist -> ../ -> package root
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

// ============================================================================
// Types
// ============================================================================

export interface InitOptions {
  /** Pre-configure a specific agent */
  agent?: string;
  /** Pre-configure task management provider */
  provider?: string;
  /** Show what would be created without creating */
  dryRun?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
}

export interface InitResult {
  /** Whether init was successful */
  success: boolean;
  /** Directory where .ralph was created */
  projectRoot: string;
  /** Files that were created */
  created: string[];
  /** Files that were skipped (already exist) */
  skipped: string[];
  /** Error message if failed */
  error?: string;
  /** Suggested .gitignore entries */
  gitignoreSuggestions: string[];
}

interface FileToCreate {
  /** Relative path from project root */
  relativePath: string;
  /** Content to write */
  content: string;
  /** Description for output */
  description: string;
}

// ============================================================================
// Template Loading
// ============================================================================

/**
 * Load a template file from the templates directory
 *
 * Templates are bundled with the npm package and loaded at runtime.
 * Falls back to empty string if template file is not found.
 */
function loadTemplate(templateName: string): string {
  const templatePath = path.join(PACKAGE_ROOT, 'templates', templateName);
  try {
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch {
    // Ignore read errors, return empty string
  }
  return '';
}

/**
 * Get the path to the templates directory
 */
export function getTemplatesDir(): string {
  return path.join(PACKAGE_ROOT, 'templates');
}

/**
 * Get the path to the prompts directory
 */
export function getPromptsDir(): string {
  return path.join(PACKAGE_ROOT, 'prompts');
}

// ============================================================================
// Valid Agent Types
// ============================================================================

const VALID_AGENT_TYPES: AgentType[] = ['claude-code', 'codex', 'opencode', 'kiro', 'custom'];
const VALID_TASK_PROVIDERS: TaskProvider[] = ['vibe-kanban', 'github-issues', 'jira', 'linear', 'beads'];
const DEFAULT_TASK_PROVIDER: TaskProvider = 'vibe-kanban';

// ============================================================================
// Gitignore Suggestions
// ============================================================================

const GITIGNORE_SUGGESTIONS = [
  '# Ralph - Local settings (user-specific overrides)',
  '.ralph/settings.local.json',
  '',
  '# Ralph - Session outputs (regenerated each session)',
  '.ralph/claude_output.jsonl',
  '.ralph/claude.lock',
  '',
  '# Ralph - Archives (optional, can be large)',
  '# .ralph/archive/',
];

// ============================================================================
// Core Logic
// ============================================================================

/**
 * Workflow files to create as examples
 */
const WORKFLOW_FILES = [
  '01-feature-branch-incomplete',
  '02-feature-branch-pr-ready',
  '03-pr-pipeline-fix',
  '04-cd-pipeline-fix',
  '05-resume-in-progress',
  '06-new-work',
];

/**
 * Determine the task provider from options, existing settings, or default
 */
function determineProvider(projectRoot: string, options: InitOptions): TaskProvider {
  // First, check if provider is specified in options
  if (options.provider && VALID_TASK_PROVIDERS.includes(options.provider as TaskProvider)) {
    return options.provider as TaskProvider;
  }

  // Second, try to read from existing settings.json
  const settingsPath = path.join(projectRoot, '.ralph', 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      if (settings.taskManagement?.provider && VALID_TASK_PROVIDERS.includes(settings.taskManagement.provider)) {
        return settings.taskManagement.provider as TaskProvider;
      }
    }
  } catch {
    // Ignore parse errors, use default
  }

  // Default to vibe-kanban
  return DEFAULT_TASK_PROVIDER;
}

/**
 * Get the list of files to create during init
 */
function getFilesToCreate(projectRoot: string, options: InitOptions): FileToCreate[] {
  const files: FileToCreate[] = [];

  // Determine which task provider to use
  const provider = determineProvider(projectRoot, options);

  // settings.json - with agent and/or task management config
  const settingsObj: Record<string, unknown> = {};

  if (options.agent && VALID_AGENT_TYPES.includes(options.agent as AgentType)) {
    settingsObj.agent = { type: options.agent };
  }

  // Always include taskManagement config with the determined provider
  settingsObj.taskManagement = {
    provider: provider,
    ...(provider === 'github-issues' ? { providerConfig: { labelFilter: 'ralph' } } : {}),
  };

  const settingsContent = JSON.stringify(settingsObj, null, 2);

  files.push({
    relativePath: '.ralph/settings.json',
    content: settingsContent + '\n',
    description: 'Configuration file',
  });

  // orchestrate.md - template with placeholder (processed at runtime by sync2.sh)
  files.push({
    relativePath: '.ralph/orchestrate.md',
    content: loadTemplate('orchestrate.md'),
    description: 'Orchestration prompt template',
  });

  // workflows/*.md - workflow files
  for (const workflow of WORKFLOW_FILES) {
    files.push({
      relativePath: `.ralph/workflows/${workflow}.md`,
      content: loadTemplate(`workflows/${workflow}.md`),
      description: `Workflow: ${workflow}`,
    });
  }

  return files;
}

/**
 * Check if a file already exists
 */
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Create a file with its parent directories
 */
function createFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Run the ralph init command
 */
export function runInit(projectRoot: string, options: InitOptions = {}): InitResult {
  const result: InitResult = {
    success: false,
    projectRoot,
    created: [],
    skipped: [],
    gitignoreSuggestions: GITIGNORE_SUGGESTIONS,
  };

  try {
    // Validate agent option if provided
    if (options.agent && !VALID_AGENT_TYPES.includes(options.agent as AgentType)) {
      result.error = `Invalid agent type: "${options.agent}". Valid types are: ${VALID_AGENT_TYPES.join(', ')}`;
      return result;
    }

    // Validate provider option if provided
    if (options.provider && !VALID_TASK_PROVIDERS.includes(options.provider as TaskProvider)) {
      result.error = `Invalid task provider: "${options.provider}". Valid providers are: ${VALID_TASK_PROVIDERS.join(', ')}`;
      return result;
    }

    // Get files to create
    const files = getFilesToCreate(projectRoot, options);

    // Check what exists vs what needs to be created
    for (const file of files) {
      const fullPath = path.join(projectRoot, file.relativePath);
      const exists = fileExists(fullPath);

      if (exists && !options.force) {
        result.skipped.push(file.relativePath);
      } else {
        if (!options.dryRun) {
          createFile(fullPath, file.content);
        }
        result.created.push(file.relativePath);
      }
    }

    result.success = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

/**
 * Format the init result for console output
 */
export function formatInitOutput(result: InitResult, options: InitOptions = {}): string {
  const lines: string[] = [];

  if (options.dryRun) {
    lines.push('Dry run - no files will be created\n');
  }

  if (result.success) {
    lines.push(`Initializing Ralph in ${result.projectRoot}\n`);

    if (result.created.length > 0) {
      lines.push(options.dryRun ? 'Would create:' : 'Created:');
      for (const file of result.created) {
        lines.push(`  ${file}`);
      }
      lines.push('');
    }

    if (result.skipped.length > 0) {
      lines.push('Skipped (already exist):');
      for (const file of result.skipped) {
        lines.push(`  ${file}`);
      }
      lines.push('');
    }

    // Gitignore suggestions
    lines.push('Suggested .gitignore additions:');
    lines.push('');
    for (const suggestion of result.gitignoreSuggestions) {
      lines.push(`  ${suggestion}`);
    }
    lines.push('');

    // Next steps
    lines.push('Next steps:');
    lines.push('  1. Review and customize the files in .ralph/orchestrate.md and .ralph/workflows/');
    lines.push('  2. Add the suggested entries to your .gitignore');
    lines.push('  3. Run `ralph` to start monitoring');
    lines.push('');
    lines.push('Ralph initialized successfully!');
  } else {
    lines.push(`Error: ${result.error}`);
  }

  return lines.join('\n');
}

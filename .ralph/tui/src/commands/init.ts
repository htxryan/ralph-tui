/**
 * ralph init command
 *
 * Creates the .ralph/ directory structure in a project, including:
 * - settings.json (empty or pre-configured with agent)
 * - prompts/ directory with blank and example files
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentType } from '../lib/config.js';

// ============================================================================
// Types
// ============================================================================

export interface InitOptions {
  /** Pre-configure a specific agent */
  agent?: string;
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
// Example Prompt Templates
// ============================================================================

const PLAN_EXAMPLE_CONTENT = `# Planning Prompt Template

This is an example planning prompt. Customize this for your project.

## Context

You are a senior software engineer tasked with planning the implementation of a feature or fix.

## Task

{{task}}

## Instructions

1. **Analyze the Request**
   - Break down the task into clear, actionable steps
   - Identify potential challenges or edge cases
   - Consider dependencies and order of operations

2. **Review Existing Code**
   - Search for related code in the codebase
   - Understand current patterns and conventions
   - Identify files that will need modification

3. **Create Implementation Plan**
   - List specific files to create or modify
   - Outline the changes needed in each file
   - Note any tests that should be added or updated

4. **Risk Assessment**
   - Identify potential breaking changes
   - Note areas requiring careful review
   - Suggest rollback strategies if applicable

## Output Format

Provide a structured plan with:
- Summary of the approach
- Numbered steps for implementation
- List of files to modify
- Testing strategy
- Any open questions that need clarification

---

**Variables available:**
- \`{{task}}\` - The user's original task/request
- \`{{projectRoot}}\` - Path to project root
- \`{{date}}\` - Current date/time
- \`{{step}}\` - Current step name
`;

const EXECUTE_EXAMPLE_CONTENT = `# Execution Prompt Template

This is an example execution prompt. Customize this for your project.

## Context

You are a senior software engineer implementing a planned feature or fix.

## Task

{{task}}

## Plan Context

{{context}}

## Instructions

1. **Follow the Plan**
   - Implement each step from the planning phase
   - Write clean, well-documented code
   - Follow project conventions and patterns

2. **Quality Standards**
   - Write meaningful commit messages
   - Add appropriate comments for complex logic
   - Ensure code is properly formatted

3. **Testing**
   - Add unit tests for new functionality
   - Update existing tests as needed
   - Verify all tests pass before completion

4. **Documentation**
   - Update README if public API changes
   - Add JSDoc comments for public functions
   - Update any affected documentation

## Completion

When done:
- Verify all changes compile without errors
- Ensure tests pass
- Confirm the original task requirements are met

---

**Variables available:**
- \`{{task}}\` - The user's original task/request
- \`{{context}}\` - Plan output from previous step
- \`{{projectRoot}}\` - Path to project root
- \`{{date}}\` - Current date/time
- \`{{step}}\` - Current step name
`;

// ============================================================================
// Valid Agent Types
// ============================================================================

const VALID_AGENT_TYPES: AgentType[] = ['claude-code', 'codex', 'opencode', 'kiro', 'custom'];

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
 * Get the list of files to create during init
 */
function getFilesToCreate(projectRoot: string, options: InitOptions): FileToCreate[] {
  const files: FileToCreate[] = [];

  // settings.json - empty object or with agent config
  let settingsContent = '{}';
  if (options.agent && VALID_AGENT_TYPES.includes(options.agent as AgentType)) {
    settingsContent = JSON.stringify(
      {
        agent: {
          type: options.agent,
        },
      },
      null,
      2
    );
  }

  files.push({
    relativePath: '.ralph/settings.json',
    content: settingsContent + '\n',
    description: 'Configuration file',
  });

  // prompts/plan.md - blank file for user customization
  files.push({
    relativePath: '.ralph/prompts/plan.md',
    content: '',
    description: 'Custom planning prompt (blank - edit to customize)',
  });

  // prompts/plan.example.md - example template
  files.push({
    relativePath: '.ralph/prompts/plan.example.md',
    content: PLAN_EXAMPLE_CONTENT,
    description: 'Example planning prompt template',
  });

  // prompts/execute.md - blank file for user customization
  files.push({
    relativePath: '.ralph/prompts/execute.md',
    content: '',
    description: 'Custom execution prompt (blank - edit to customize)',
  });

  // prompts/execute.example.md - example template
  files.push({
    relativePath: '.ralph/prompts/execute.example.md',
    content: EXECUTE_EXAMPLE_CONTENT,
    description: 'Example execution prompt template',
  });

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
    lines.push('  1. Review and customize .ralph/prompts/*.md');
    lines.push('  2. Add the suggested entries to your .gitignore');
    lines.push('  3. Run `ralph` to start monitoring');
    lines.push('');
    lines.push('Ralph initialized successfully!');
  } else {
    lines.push(`Error: ${result.error}`);
  }

  return lines.join('\n');
}

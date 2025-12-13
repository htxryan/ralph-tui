#!/usr/bin/env node
/**
 * Process orchestrate.md template by injecting provider-specific instructions
 * and substituting template variables like {{execute_path}}
 *
 * Usage: node process-prompt.js <template-path> [settings-path] [project-name] [project-settings-path]
 *
 * Reads the template file, determines the task provider from settings.json,
 * loads the appropriate provider instructions, substitutes template variables,
 * and outputs the processed template to stdout.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { processFileWithIncludes } from './process-includes.js';

// Get script directory to find provider templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..');
const PROVIDERS_DIR = join(PACKAGE_ROOT, 'templates', 'providers');

// Default provider if not specified
const DEFAULT_PROVIDER = 'vibe-kanban';

// Supported providers
const VALID_PROVIDERS = ['vibe-kanban', 'github-issues', 'jira', 'linear', 'beads'];

// Pattern to match template variables: {{variable_name}}
const VARIABLE_PATTERN = /\{\{([^!}][^}]*)\}\}/g;

/**
 * Load provider-specific instructions
 */
function loadProviderInstructions(provider) {
  const providerPath = join(PROVIDERS_DIR, `${provider}.md`);

  try {
    if (existsSync(providerPath)) {
      return readFileSync(providerPath, 'utf-8');
    }
  } catch {
    // Fall through to placeholder
  }

  // Return a placeholder if provider file doesn't exist
  return `## Task Manager: ${provider}\n\nProvider instructions not available. Please configure manually.`;
}

/**
 * Determine the task provider from settings.json
 */
function determineProvider(settingsPath) {
  try {
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      const provider = settings.task_management?.provider;

      if (provider && VALID_PROVIDERS.includes(provider)) {
        return provider;
      }
    }
  } catch {
    // Ignore parse errors, use default
  }

  return DEFAULT_PROVIDER;
}

/**
 * Load variables from a settings file
 */
function loadVariables(settingsPath) {
  try {
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return settings.variables || {};
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

/**
 * Substitute template variables in a string
 */
function substituteVariables(template, variables) {
  return template.replace(VARIABLE_PATTERN, (match, variableName) => {
    const trimmedName = variableName.trim();
    if (trimmedName in variables) {
      return variables[trimmedName];
    }
    // Log warning and leave as-is
    console.error(`Warning: Template variable '${trimmedName}' not found, leaving as-is`);
    return match;
  });
}

/**
 * Process the template by injecting provider instructions and substituting variables
 */
function processTemplate(templatePath, settingsPath, projectName, projectSettingsPath) {
  // Read the template
  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  // Determine repo root (parent of .ralph directory)
  const ralphDir = dirname(settingsPath);
  const repoRoot = dirname(ralphDir);

  // Process includes first (before any other processing)
  let template = processFileWithIncludes(templatePath, repoRoot);

  // Replace provider instructions placeholder if present
  if (template.includes('{{!TASK_MANAGER_INSTRUCTIONS}}')) {
    // Determine provider
    const provider = determineProvider(settingsPath);

    // Load provider instructions
    const providerInstructions = loadProviderInstructions(provider);

    // Replace placeholder
    template = template.replace('{{!TASK_MANAGER_INSTRUCTIONS}}', providerInstructions);
  }

  // Build variables object by merging:
  // 1. Main settings variables
  // 2. Project-specific settings variables (overrides main)
  // 3. Built-in special variables
  const mainVariables = loadVariables(settingsPath);
  const projectVariables = projectSettingsPath ? loadVariables(projectSettingsPath) : {};

  const allVariables = {
    ...mainVariables,
    ...projectVariables,
  };

  // Add special built-in variables
  if (projectName) {
    allVariables['execute_path'] = `.ralph/projects/${projectName}/execute.md`;
    allVariables['assignment_path'] = `.ralph/projects/${projectName}/assignment.json`;
  }

  // Substitute template variables
  template = substituteVariables(template, allVariables);

  return template;
}

// Main
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: process-prompt.js <template-path> [settings-path] [project-name] [project-settings-path]');
  console.error('');
  console.error('Arguments:');
  console.error('  template-path          Path to orchestrate.md template');
  console.error('  settings-path          Path to settings.json (optional, defaults to .ralph/settings.json)');
  console.error('  project-name           Active project name (optional, e.g., "default")');
  console.error('  project-settings-path  Path to project settings.json (optional)');
  process.exit(1);
}

const templatePath = args[0];
const settingsPath = args[1] || join(dirname(templatePath), 'settings.json');
const projectName = args[2] || null;
const projectSettingsPath = args[3] || null;

const result = processTemplate(templatePath, settingsPath, projectName, projectSettingsPath);
process.stdout.write(result);

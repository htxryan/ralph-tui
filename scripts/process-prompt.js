#!/usr/bin/env node
/**
 * Process orchestrate.md template by injecting provider-specific instructions
 *
 * Usage: node process-prompt.js <template-path> [settings-path]
 *
 * Reads the template file, determines the task provider from settings.json,
 * loads the appropriate provider instructions, and outputs the processed
 * template to stdout.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get script directory to find provider templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..');
const PROVIDERS_DIR = join(PACKAGE_ROOT, 'templates', 'providers');

// Default provider if not specified
const DEFAULT_PROVIDER = 'vibe-kanban';

// Supported providers
const VALID_PROVIDERS = ['vibe-kanban', 'github-issues', 'jira', 'linear', 'beads'];

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
      const provider = settings.taskManagement?.provider;

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
 * Process the template by injecting provider instructions
 */
function processTemplate(templatePath, settingsPath) {
  // Read the template
  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const template = readFileSync(templatePath, 'utf-8');

  // Check if template has placeholder
  if (!template.includes('{{TASK_MANAGER_INSTRUCTIONS}}')) {
    // No placeholder - return template as-is (backwards compatibility)
    return template;
  }

  // Determine provider
  const provider = determineProvider(settingsPath);

  // Load provider instructions
  const providerInstructions = loadProviderInstructions(provider);

  // Replace placeholder
  return template.replace('{{TASK_MANAGER_INSTRUCTIONS}}', providerInstructions);
}

// Main
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: process-prompt.js <template-path> [settings-path]');
  console.error('');
  console.error('Arguments:');
  console.error('  template-path   Path to orchestrate.md template');
  console.error('  settings-path   Path to settings.json (optional, defaults to .ralph/settings.json)');
  process.exit(1);
}

const templatePath = args[0];
const settingsPath = args[1] || join(dirname(templatePath), 'settings.json');

const result = processTemplate(templatePath, settingsPath);
process.stdout.write(result);

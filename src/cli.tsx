#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { App } from './app.js';
import { runInit, formatInitOutput } from './commands/init.js';
import { loadConfig, type CLIOptions, type RalphConfig } from './lib/config.js';

// Find the project root by looking for .ralph directory
function findProjectRoot(): string {
  let dir = process.cwd();

  // If we're inside .ralph, go up to project root
  if (dir.endsWith('.ralph') || dir.includes('/.ralph/')) {
    dir = dir.replace(/\.ralph(\/.*)?$/, '');
  }

  // Verify .ralph exists at this location
  const ralphDir = path.join(dir, '.ralph');
  if (fs.existsSync(ralphDir)) {
    return dir;
  }

  // Walk up looking for .ralph directory
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.ralph'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return process.cwd();
}

const program = new Command();

program
  .name('ralph')
  .description('Terminal UI for monitoring and controlling autonomous AI coding agent sessions')
  .version('1.0.0')
  .option(
    '-f, --file <path>',
    'Path to JSONL file to monitor (overrides config)'
  )
  .option(
    '-i, --issue <id>',
    'Task ID to display'
  )
  .option(
    '-s, --sidebar',
    'Show the sidebar on startup'
  )
  .option(
    '-S, --no-sidebar',
    'Hide the sidebar on startup'
  )
  .option(
    '-a, --agent <type>',
    'Agent type to use (claude-code, codex, opencode, kiro, custom)'
  )
  .option(
    '-w, --watch',
    'Continue watching for new entries (default: true)',
    true
  )
  .action(async (options) => {
    // Find project root
    const projectRoot = findProjectRoot();

    // Build CLI options for config system
    const cliOptions: CLIOptions = {
      file: options.file,
      issue: options.issue,
      agent: options.agent,
    };

    // Handle sidebar option (Commander handles --no-sidebar as sidebar: false)
    if (options.sidebar !== undefined) {
      cliOptions.sidebar = options.sidebar;
    }

    // Load configuration from all sources
    let config: RalphConfig;
    try {
      config = loadConfig(projectRoot, cliOptions);
    } catch (err) {
      process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    }

    // Resolve the JSONL file path - sessions are now in project folders with timestamps
    // Format: .ralph/projects/<project>/claude_output/<timestamp>.jsonl
    let jsonlPath: string;

    if (cliOptions.file) {
      // User specified a file explicitly
      jsonlPath = path.isAbsolute(cliOptions.file)
        ? cliOptions.file
        : path.resolve(projectRoot, cliOptions.file);
    } else {
      // Find the most recent session file in the default project's claude_output folder
      const claudeOutputDir = path.join(projectRoot, '.ralph', 'projects', 'default', 'claude_output');

      // Find all timestamped session files (if directory exists)
      // Files are named <timestamp>.jsonl where timestamp is 14 digits (YYYYMMDDHHmmss)
      const sessionFiles = fs.existsSync(claudeOutputDir)
        ? fs.readdirSync(claudeOutputDir)
            .filter(f => f.endsWith('.jsonl'))
            .filter(f => /^(\d{14})\.jsonl$/.test(f)) // Match YYYYMMDDHHmmss.jsonl format
            .sort()
            .reverse() // Most recent first
        : [];

      if (sessionFiles.length > 0) {
        // Use the most recent session
        jsonlPath = path.join(claudeOutputDir, sessionFiles[0]!);
      } else {
        // No sessions exist yet - use a placeholder path
        // The actual file will be created when Ralph starts (via use-ralph-process.ts)
        // useJSONLStream handles non-existent files gracefully
        jsonlPath = path.join(claudeOutputDir, 'placeholder.jsonl');
      }
    }

    // Render the app with configuration
    const { waitUntilExit } = render(
      <App
        jsonlPath={jsonlPath}
        issueId={options.issue}
        showSidebar={config.display.showSidebar}
        config={config}
      />
    );

    waitUntilExit().then(() => {
      process.exit(0);
    });
  });

// ============================================================================
// init subcommand
// ============================================================================

program
  .command('init')
  .description('Initialize Ralph in the current directory')
  .option('-a, --agent <name>', 'Pre-configure a specific agent (claude-code, codex, opencode, kiro, custom)')
  .option('-p, --provider <name>', 'Task management provider (vibe-kanban, github-issues, jira, linear, beads)')
  .option('-n, --dry-run', 'Show what would be created without creating files')
  .option('-f, --force', 'Overwrite existing files')
  .action((options) => {
    const projectRoot = process.cwd();

    const result = runInit(projectRoot, {
      agent: options.agent,
      provider: options.provider,
      dryRun: options.dryRun,
      force: options.force,
    });

    const output = formatInitOutput(result, {
      agent: options.agent,
      provider: options.provider,
      dryRun: options.dryRun,
      force: options.force,
    });

    console.log(output);

    if (!result.success) {
      process.exit(1);
    }
  });

program.parse();

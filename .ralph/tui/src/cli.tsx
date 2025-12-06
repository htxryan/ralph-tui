#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { App } from './app.js';
import { archiveCurrentSession } from './lib/archive.js';
import { runInit, formatInitOutput } from './commands/init.js';

// Find the project root by looking for .ralph directory
function findProjectRoot(): string {
  let dir = process.cwd();

  // If we're inside .ralph/tui, go up to project root
  if (dir.includes('.ralph/tui')) {
    dir = dir.replace(/\.ralph\/tui.*$/, '');
  } else if (dir.endsWith('.ralph')) {
    dir = path.dirname(dir);
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

// Check if Ralph is already running by looking at the lock file
function isRalphRunning(projectRoot: string): boolean {
  const lockFile = path.join(projectRoot, '.ralph', 'claude.lock');
  try {
    if (fs.existsSync(lockFile)) {
      const pid = fs.readFileSync(lockFile, 'utf-8').trim();
      if (pid) {
        try {
          // Check if process with this PID exists (signal 0 doesn't kill, just checks)
          process.kill(parseInt(pid), 0);
          return true;
        } catch {
          // Process doesn't exist, stale lock file
          return false;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

const program = new Command();

program
  .name('ralph-tui')
  .description('Terminal UI for monitoring Ralph autonomous agent system')
  .version('1.0.0')
  .option(
    '-f, --file <path>',
    'Path to JSONL file to monitor',
    '.ralph/claude_output.jsonl'
  )
  .option(
    '-i, --issue <id>',
    'BD issue ID to display'
  )
  .option(
    '-s, --sidebar',
    'Show the sidebar (hidden by default)'
  )
  .option(
    '-w, --watch',
    'Continue watching for new entries (default: true)',
    true
  )
  .action(async (options) => {
    // Find project root
    const projectRoot = findProjectRoot();

    // Resolve the JSONL file path
    let jsonlPath = options.file;

    // If relative path, resolve from project root (not cwd)
    if (!path.isAbsolute(jsonlPath)) {
      jsonlPath = path.resolve(projectRoot, jsonlPath);
    }

    // Check if Ralph is already running - if so, DON'T archive or truncate!
    // We want to reconnect to the running session with all historical messages intact.
    const ralphAlreadyRunning = isRalphRunning(projectRoot);

    if (!ralphAlreadyRunning) {
      // Archive previous session if file exists with content
      const archiveDir = path.join(projectRoot, '.ralph', 'archive');
      const archiveResult = await archiveCurrentSession(jsonlPath, archiveDir);

      if (archiveResult.archived) {
        // Log to stderr so it doesn't interfere with TUI rendering
        process.stderr.write(
          `Archived previous session to: ${archiveResult.archivePath}\n`
        );
      }

      if (archiveResult.error) {
        process.stderr.write(
          `Warning: Failed to archive previous session: ${archiveResult.error}\n`
        );
      }

      // Ensure directory exists and create fresh JSONL file
      const dir = path.dirname(jsonlPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(jsonlPath, '', 'utf-8');
    } else {
      // Ralph is running - ensure file exists but don't truncate
      const dir = path.dirname(jsonlPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Only create the file if it doesn't exist (don't truncate existing content!)
      if (!fs.existsSync(jsonlPath)) {
        fs.writeFileSync(jsonlPath, '', 'utf-8');
      }
    }

    // Render the app
    const { waitUntilExit } = render(
      <App
        jsonlPath={jsonlPath}
        issueId={options.issue}
        showSidebar={options.sidebar}
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
  .option('-n, --dry-run', 'Show what would be created without creating files')
  .option('-f, --force', 'Overwrite existing files')
  .action((options) => {
    const projectRoot = process.cwd();

    const result = runInit(projectRoot, {
      agent: options.agent,
      dryRun: options.dryRun,
      force: options.force,
    });

    const output = formatInitOutput(result, {
      agent: options.agent,
      dryRun: options.dryRun,
      force: options.force,
    });

    console.log(output);

    if (!result.success) {
      process.exit(1);
    }
  });

program.parse();

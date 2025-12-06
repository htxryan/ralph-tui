#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { App } from './app.js';
import { archiveCurrentSession } from './lib/archive.js';
import { loadConfig, type CLIOptions, type RalphConfig } from './lib/config.js';

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
function isRalphRunning(projectRoot: string, config: RalphConfig): boolean {
  const lockFile = path.join(projectRoot, config.process.lockPath);
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
  .name('ralph')
  .description('Terminal UI for monitoring and controlling autonomous AI coding agent sessions')
  .version('1.0.0')
  .option(
    '-f, --file <path>',
    'Path to JSONL file to monitor (overrides config)'
  )
  .option(
    '-i, --issue <id>',
    'BD issue ID to display'
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

    // Resolve the JSONL file path from config
    let jsonlPath = config.process.jsonlPath;

    // If relative path, resolve from project root (not cwd)
    if (!path.isAbsolute(jsonlPath)) {
      jsonlPath = path.resolve(projectRoot, jsonlPath);
    }

    // Check if Ralph is already running - if so, DON'T archive or truncate!
    // We want to reconnect to the running session with all historical messages intact.
    const ralphAlreadyRunning = isRalphRunning(projectRoot, config);

    if (!ralphAlreadyRunning) {
      // Archive previous session if file exists with content
      const archiveDir = path.resolve(projectRoot, config.paths.archiveDir);
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

program.parse();

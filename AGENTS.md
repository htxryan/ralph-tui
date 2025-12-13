# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph TUI is a terminal user interface for monitoring and controlling autonomous AI coding agent sessions. It provides real-time visibility into long-running AI agent workflows, enabling developers to observe, interrupt, and guide autonomous coding sessions. Built with Ink (React for CLIs) and TypeScript.

## Repository Structure

```
ralph-tui/
├── src/                         # TUI source code (TypeScript + React/Ink)
│   ├── cli.tsx                  # Entry point, argument parsing
│   ├── app.tsx                  # Main React app, keyboard handling
│   ├── commands/                # CLI commands (init, etc.)
│   ├── components/              # React components by feature
│   ├── hooks/                   # React hooks
│   ├── lib/                     # Utilities, types, parser
│   └── test/                    # Tests (unit, integration, e2e)
│
├── .ralph-templates/            # Default templates for `ralph init`
│   ├── settings.json            # Default settings
│   └── projects/
│       └── default/
│           ├── settings.json    # Default project settings
│           └── execute.md       # Default execution workflow
│
├── prompts/                     # Bundled prompt templates (not copied)
│   ├── orchestrate.md           # Orchestration prompt
│   └── resume.md                # Resume prompt
│
├── templates/                   # Provider-specific templates
│   └── providers/               # Task provider prompts
│       ├── github-issues.md
│       └── vibe-kanban.md
│
├── scripts/                     # Runtime scripts (for autonomous loops)
│   ├── ralph.sh                 # Main autonomous loop
│   ├── sync2.sh                 # Two-phase sync script
│   ├── kill.sh                  # Process cleanup helper
│   └── visualize.py             # Log visualization tool
│
├── docs/                        # User documentation
├── .ai-docs/                    # AI-native documentation
│   ├── design/                  # Product brief, tech stack
│   ├── adr/                     # Architecture Decision Records
│   └── thoughts/                # Research, plans, notes
│
├── .github/workflows/           # CI/CD pipelines
│
└── .ralph/                      # RUNTIME ONLY (gitignored)
    ├── settings.json            # Project configuration
    ├── claude_output.jsonl      # Session logs
    ├── claude.lock              # Lock file
    ├── archive/                 # Archived sessions
    └── projects/                # User project definitions
        └── <name>/
            ├── settings.json    # Project-specific settings
            ├── execute.md       # Project execution workflow
            └── assignment.json  # Current task assignment (runtime)
```

## Development Commands

Commands run from the repository root:

```bash
# Development
pnpm install          # Install dependencies
pnpm dev:tsx          # Run with tsx (hot reload)
pnpm dev              # Watch mode TypeScript compilation

# Build & Run
pnpm build            # Compile TypeScript
pnpm start            # Run compiled version
pnpm run              # Install + build + start

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Single test run
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:e2e         # End-to-end tests
pnpm test:ci          # Verbose output for CI
pnpm test:coverage    # With coverage report
pnpm typecheck        # TypeScript type checking only
```

## Tech Stack

- **Runtime**: Node.js >= 18, ES Modules
- **Language**: TypeScript ^5.7
- **UI**: Ink ^5.2 (React renderer for CLIs), React ^18.3
- **CLI**: Commander ^12.1
- **File watching**: chokidar ^3.6
- **Process management**: execa ^9.5
- **Testing**: Vitest, ink-testing-library

## Architecture

### Key Patterns

1. **Stream Processing**: JSONL file → chokidar watch → parse → React state (`useJSONLStream` hook)
2. **Subagent Tracking**: Messages with `parent_tool_use_id` are collected into parent ToolCall's `subagentMessages` array
3. **Process Management**: Lock file + PID tracking for Start/Stop/Resume (`useRalphProcess` hook)
4. **Project Selection**: Users select a project (execution mode) at startup; the active project's `execute.md` defines the workflow (`useProjects` hook, `ProjectPicker` component)

### Component Structure

```
src/
├── cli.tsx              # Entry point, argument parsing
├── app.tsx              # Main React app, keyboard handling, state
├── components/          # React components by feature
│   ├── common/          # Reusable (ProgressBar, Spinner, ScrollableList)
│   ├── messages/        # Message stream display
│   ├── errors/          # Error aggregation views
│   ├── subagent/        # Nested agent conversation views
│   └── ...
├── hooks/               # React hooks
│   ├── use-jsonl-stream.ts    # Real-time JSONL file tailing
│   ├── use-ralph-process.ts   # Process lifecycle management
│   ├── use-projects.ts        # Project discovery and selection
│   ├── use-keyboard.ts        # Keyboard input handling
│   └── ...
└── lib/                 # Utilities
    ├── types.ts         # All TypeScript interfaces
    ├── parser.ts        # JSONL parsing, stats calculation
    ├── template.ts      # Template variable substitution
    └── ...
```

### Core Types (lib/types.ts)

- `ClaudeEvent` - Raw JSONL event from Claude Code
- `ProcessedMessage` - Normalized message for display
- `ToolCall` - Tool invocation with status, result, subagent data
- `SessionStats` - Token counts, timing, error counts
- `TabName` - 'messages' | 'task' | 'todos' | 'errors' | 'stats'
- `Assignment` - Current task assignment with `task_id`, `next_step`, `pull_request_url`
- `ProjectInfo` (hooks/use-projects.ts) - Project metadata: name, path, displayName, description

## Testing Patterns

Tests use `ink-testing-library` for component testing:

```tsx
import { render } from 'ink-testing-library';
import { MyComponent } from './my-component.js';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { lastFrame } = render(<MyComponent prop="value" />);
    expect(lastFrame()).toContain('expected text');
  });
});
```

Test files are co-located with components (`*.test.tsx`) or in `src/test/` for integration tests.

## Work Tracking

This project uses GitHub Issues for task tracking instead of markdown TODOs. Use the `github-operator` Task subagent (which will in turn use the GitHub CLI (`gh`)) to manage tasks.

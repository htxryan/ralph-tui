# Product Brief: Ralph TUI

## Overview

**Ralph TUI** is a terminal user interface for monitoring and controlling autonomous AI coding agent sessions. It provides real-time visibility into long-running AI agent workflows, enabling developers to observe, interrupt, and guide autonomous coding sessions across multiple agent platforms.

The name "Ralph" comes from the "Ralph Wiggum Method" - a safe autonomous loop pattern that runs AI coding agents continuously with safety features like lock files, log rotation, and graceful shutdown.

## Problem Statement

Running AI coding agents autonomously presents several challenges:

1. **Opacity**: Long-running agent sessions produce streams of output that are difficult to read and monitor in real-time
2. **Lack of Control**: Once started, autonomous sessions are hard to interrupt or redirect without killing the process
3. **Context Loss**: Previous sessions' context and progress get lost or buried in log files
4. **Debugging Difficulty**: Tool errors and failures are hidden in log streams, making debugging tedious
5. **No Progress Visibility**: Hard to understand what the agent is doing, how many tokens it's using, or when it will finish
6. **Agent Lock-in**: Developers want flexibility to switch between agents without changing their workflow tooling

## Solution

Ralph TUI provides a rich terminal interface that:

- **Streams agent output in real-time** with syntax highlighting and intelligent formatting
- **Tracks subagent conversations** (nested agent calls) in drillable views
- **Monitors session statistics** including token usage, tool calls, and error counts
- **Enables session control** - start, stop, and resume sessions with human feedback
- **Archives sessions automatically** with timestamp-based naming for later review
- **Supports multiple AI agents** including Claude Code, Codex CLI, OpenCode, and Kiro CLI
- **Works seamlessly across platforms** - Mac, Windows (native), and Linux

## Supported Agents

Ralph TUI supports a pluggable agent architecture with first-class support for:

| Agent | Description | Output Format |
|-------|-------------|---------------|
| **Claude Code** | Anthropic's official CLI for Claude | JSONL |
| **Codex CLI** | OpenAI's Codex-powered coding agent | TBD |
| **OpenCode** | Open-source coding agent | TBD |
| **Kiro CLI** | AWS's AI coding assistant | TBD |

Each agent adapter handles:
- Output format parsing (JSONL, streaming text, etc.)
- Process lifecycle management (start, stop, signal handling)
- Session resumption semantics
- Subagent/tool call detection

## Target Users

1. **Developers using autonomous AI coding workflows** who need visibility into what the agent is doing
2. **Teams building AI-assisted development pipelines** who need monitoring and control
3. **Power users** who want to supervise and occasionally guide long-running agent sessions
4. **Developers who switch between agents** and want a consistent monitoring experience

## Core Features

### 1. Real-Time Message Streaming
- Parses agent output formats in real-time (JSONL, streaming, etc.)
- Displays user prompts, assistant responses, and tool calls
- Shows thinking/reasoning when present
- Supports message filtering by type
- Agent-agnostic message normalization

### 2. Subagent Tracking
- Detects and tracks nested agent spawns (Task tool calls, etc.)
- Maintains nested conversation threads per subagent
- Provides drill-down views into subagent activity
- Shows subagent type, prompt, and results

### 3. Session Management
- **Start**: Launch the autonomous loop with configured agent
- **Stop**: Gracefully terminate running sessions
- **Resume**: Continue a session with human feedback
- **Archive**: Automatically archive completed sessions
- **Browse**: Session picker to view current or archived sessions

### 4. Multi-Tab Interface
- **Messages**: Main conversation view with scrolling and filtering
- **Agent Info**: Current agent status and configuration
- **Todos**: Agent's internal todo/task list state (when available)
- **Errors**: Aggregated tool errors for quick debugging
- **Stats**: Token usage, timing, and session metrics

### 5. Keyboard-Driven Navigation
- Number keys (1-5) for tab switching
- Arrow keys and vim-style navigation for scrolling
- Shortcut keys for common actions (start, stop, interrupt)
- Context-sensitive help overlay

### 6. Interrupt Mode
- Pause the autonomous loop to provide feedback
- Submit guidance that gets injected as a user message
- Resume with new context without losing session history

## Cross-Platform Compatibility

Ralph TUI is designed for seamless operation across all major platforms:

### Supported Platforms
- **macOS**: Full support (Intel and Apple Silicon)
- **Linux**: Full support (x86_64 and ARM64)
- **Windows**: **Native support** (no WSL required)

### Platform Considerations
- Uses Node.js for cross-platform runtime
- Terminal rendering via Ink (React for CLIs)
- File paths handled with platform-aware utilities
- Process management adapted per platform (signals on Unix, taskkill on Windows)
- Configuration paths follow OS conventions when appropriate

### Windows-Specific Design
- Native Windows terminal support (Windows Terminal, cmd.exe, PowerShell)
- No dependency on WSL, Cygwin, or MSYS2
- Proper handling of Windows file paths and line endings
- Compatible with Windows-native agent installations

## Project Initialization

When a user runs `ralph init`, Ralph creates a `.ralph/` directory with a carefully designed starter structure.

### What `ralph init` Creates

```
.ralph/
├── settings.json              # Project settings (empty object, uses defaults)
├── prompts/
│   ├── plan.md                # User's custom plan prompt (blank)
│   ├── plan.example.md        # Example plan prompt for reference
│   ├── execute.md             # User's custom execute prompt (blank)
│   └── execute.example.md     # Example execute prompt for reference
├── workflows/
│   ├── index.md               # Workflow decision matrix and quick reference
│   ├── 01-feature-branch-incomplete.md    # Continue work on feature branch
│   ├── 02-feature-branch-pr-ready.md      # Merge existing PR
│   ├── 03-pr-pipeline-fix.md              # Fix failing PR CI/CD
│   ├── 04-cd-pipeline-fix.md              # Fix failing deployment
│   ├── 05-resume-in-progress.md           # Continue in-progress issue
│   └── 06-new-work.md                     # Start new feature/fix
└── archive/                   # Created on first session archive
```

### Generated Files

#### `.ralph/settings.json`

Created as an empty JSON object. All settings use built-in defaults unless overridden here:

```json
{}
```

Users can progressively add settings as needed:

```json
{
  "agent": {
    "name": "codex-cli"
  }
}
```

#### `.ralph/prompts/plan.md` (blank)

Created empty. When this file has content, it overrides the built-in plan prompt:

```markdown

```

#### `.ralph/prompts/plan.example.md`

A comprehensive example showing how to write an effective planning prompt:

```markdown
# Planning Phase

You are entering the **planning phase** of an autonomous coding workflow.

## Your Task

{{task}}

## Instructions

1. **Analyze the task** - Break down what needs to be accomplished
2. **Examine the codebase** - Understand the existing architecture, patterns, and conventions
3. **Identify dependencies** - What must be done before other things can start?
4. **Create a step-by-step plan** - Ordered list of concrete implementation steps

## Plan Requirements

Your plan MUST include:

- [ ] Clear, actionable steps (not vague descriptions)
- [ ] File paths that will be created or modified
- [ ] Any new dependencies that need to be installed
- [ ] Potential risks or edge cases to handle
- [ ] A definition of "done" - how do we know the task is complete?

## Output Format

Write your plan to a markdown file at `.ralph/current-plan.md` with the following structure:

```
# Implementation Plan: [Brief Title]

## Summary
[1-2 sentence overview]

## Steps
1. [First step]
2. [Second step]
...

## Files to Modify
- `path/to/file.ts` - [what changes]

## Files to Create
- `path/to/new-file.ts` - [purpose]

## Testing Strategy
[How to verify the implementation works]

## Done When
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

## Important

- Do NOT implement anything yet - only plan
- Be specific about file paths and function names
- Consider backward compatibility
- Think about error handling and edge cases
```

#### `.ralph/prompts/execute.md` (blank)

Created empty. When this file has content, it overrides the built-in execute prompt:

```markdown

```

#### `.ralph/prompts/execute.example.md`

A comprehensive example showing how to write an effective execution prompt:

```markdown
# Execution Phase

You are entering the **execution phase** of an autonomous coding workflow.

## Your Task

{{task}}

## Context

{{context}}

## Instructions

You have a plan to follow. Execute it precisely and methodically.

### Execution Rules

1. **Follow the plan** - Do not deviate unless you encounter a blocking issue
2. **One step at a time** - Complete each step fully before moving to the next
3. **Verify as you go** - After each significant change, verify it works
4. **Update your progress** - Mark completed items in your todo list

### Code Quality Standards

- Follow existing code patterns and conventions in the codebase
- Write clean, readable code with meaningful names
- Add comments only where the logic is non-obvious
- Handle errors appropriately for the context
- Do not over-engineer - implement exactly what's needed

### When You Encounter Issues

If you hit a blocking issue:
1. Document what went wrong
2. Attempt a reasonable fix (max 2-3 attempts)
3. If unresolved, note it and continue with other steps if possible
4. Do NOT spiral - move forward or stop

### Testing

- Run existing tests after changes: `npm test` (or project equivalent)
- Fix any tests you break
- Add tests for new functionality if the project has test coverage

### Completion

When finished:
1. Run the full test suite
2. Run the linter/formatter if available
3. Verify the original task requirements are met
4. Summarize what was accomplished

## Important

- Do not create unnecessary files
- Do not refactor code outside the scope of the task
- Do not add features that weren't requested
- Keep changes minimal and focused
```

### Prompt Override Behavior

Ralph uses a simple override system for prompts:

| File | Purpose |
|------|---------|
| `prompts/plan.md` | If non-empty, replaces built-in plan prompt |
| `prompts/execute.md` | If non-empty, replaces built-in execute prompt |
| `prompts/*.example.md` | Reference only, never used by Ralph |

**How it works:**
1. Ralph checks if `prompts/{step}.md` exists and has content
2. If yes, use that file's content as the prompt
3. If no (empty or missing), use the built-in default prompt
4. `.example.md` files are ignored - they're just for user reference

This allows users to:
- Start with zero configuration (built-in defaults work great)
- Reference the examples to understand prompt structure
- Gradually customize by copying example content to the real file and modifying

### Initialization Command

```bash
# Initialize Ralph in current directory
ralph init

# Initialize with a specific agent pre-configured
ralph init --agent codex-cli

# Initialize and show what would be created (dry run)
ralph init --dry-run
```

### Files Added to .gitignore

Ralph suggests adding to `.gitignore`:

```
# Ralph local files
.ralph/settings.local.json
.ralph/output.jsonl
.ralph/archive/
```

The following should typically be committed:
- `.ralph/settings.json` - shared project configuration
- `.ralph/prompts/*.md` - team's custom prompts
- `.ralph/prompts/*.example.md` - reference examples
- `.ralph/workflows/*.md` - team's workflow definitions

---

## Configuration System

Ralph uses a layered configuration system with sane defaults and progressive customization.

### Configuration Files (Full Structure)

```
.ralph/
├── settings.json              # Project settings (committed to git)
├── settings.local.json        # Local overrides (gitignored, created by user)
├── prompts/
│   ├── plan.md                # Custom plan prompt override
│   ├── plan.example.md        # Example plan prompt (reference)
│   ├── execute.md             # Custom execute prompt override
│   ├── execute.example.md     # Example execute prompt (reference)
│   └── [custom-step].md       # Additional custom step prompts
├── workflows/
│   ├── index.md               # Workflow decision matrix and quick reference
│   ├── 01-feature-branch-incomplete.md
│   ├── 02-feature-branch-pr-ready.md
│   ├── 03-pr-pipeline-fix.md
│   ├── 04-cd-pipeline-fix.md
│   ├── 05-resume-in-progress.md
│   ├── 06-new-work.md
│   └── [custom-workflow].md   # User-defined workflows
├── output.jsonl               # Current session log (gitignored)
└── archive/                   # Archived sessions (gitignored)
    └── 2024-01-15T10-30-00/
        ├── output.jsonl
        └── metadata.json
```

### Configuration Hierarchy (lowest to highest priority)

1. **Built-in defaults** - Shipped with the npm package
2. **Global user config** - `~/.config/ralph/settings.json` (or platform equivalent)
3. **Project settings** - `.ralph/settings.json`
4. **Local overrides** - `.ralph/settings.local.json`
5. **CLI arguments** - Runtime flags override all

### Settings Schema

```json
{
  "$schema": "https://ralph.dev/schema/settings.json",

  "agent": {
    "name": "claude-code",
    "command": "claude",
    "args": ["--output-format", "stream-json"],
    "env": {}
  },

  "session": {
    "logFile": ".ralph/output.jsonl",
    "archiveDir": ".ralph/archive",
    "maxLogSizeMb": 50,
    "maxLogAgeDays": 7,
    "autoArchive": true
  },

  "sequence": {
    "enabled": true,
    "steps": ["plan", "execute"],
    "prompts": {
      "plan": null,
      "execute": null
    }
  },

  "workflows": {
    "enabled": true,
    "autoSelect": true,
    "directory": ".ralph/workflows",
    "available": {},
    "fallback": "new-work"
  },

  "ui": {
    "theme": "auto",
    "showSidebar": false,
    "showStats": true
  }
}
```

### Agent Configuration

Each supported agent has a built-in adapter with sensible defaults:

```json
{
  "agent": {
    "name": "claude-code"
  }
}
```

Or fully customized:

```json
{
  "agent": {
    "name": "custom",
    "command": "/path/to/my-agent",
    "args": ["--format", "jsonl"],
    "outputFormat": "jsonl",
    "resumeArg": "--resume"
  }
}
```

### Flexible Agent Sequence

The autonomous loop can run through configurable phases:

```json
{
  "sequence": {
    "steps": ["plan", "execute"],
    "prompts": {
      "plan": "Create a detailed implementation plan for: {{task}}",
      "execute": "Execute the plan. Follow it exactly."
    }
  }
}
```

Or with additional custom steps:

```json
{
  "sequence": {
    "steps": ["plan", "execute", "test", "review"],
    "prompts": {
      "plan": null,
      "execute": null,
      "test": "Run tests and fix any failures.",
      "review": "Review the changes for quality and correctness."
    }
  }
}
```

- **steps**: Ordered list of phases to execute
- **prompts**: Template strings for each phase (supports `{{task}}`, `{{context}}` variables)
- **null prompt**: Uses built-in default for that step (from `.ralph/prompts/{step}.md` or package default)
- **Custom steps**: Define any step name with a corresponding prompt

### Configurable Workflows

Workflows define the high-level decision logic that determines what the executor agent should do based on the current project state. Each workflow represents a distinct path through the autonomous loop based on conditions like branch type, CI/CD status, and issue state.

#### Workflow Configuration in Settings

```json
{
  "workflows": {
    "enabled": true,
    "autoSelect": true,
    "directory": ".ralph/workflows",
    "available": {
      "feature-branch-incomplete": {
        "enabled": true,
        "file": "01-feature-branch-incomplete.md",
        "displayName": "Feature Branch - Incomplete",
        "description": "Continue implementation on a feature/bugfix branch",
        "priority": 10,
        "conditions": {
          "branchPattern": "^(feature|bugfix|fix)/.*",
          "notOnMain": true,
          "prStatus": ["none", "draft"]
        }
      },
      "feature-branch-pr-ready": {
        "enabled": true,
        "file": "02-feature-branch-pr-ready.md",
        "displayName": "Feature Branch - PR Ready",
        "description": "Merge existing PR from feature branch",
        "priority": 20,
        "conditions": {
          "branchPattern": "^(feature|bugfix|fix)/.*",
          "notOnMain": true,
          "prStatus": ["open"]
        }
      },
      "pr-pipeline-fix": {
        "enabled": true,
        "file": "03-pr-pipeline-fix.md",
        "displayName": "Fix PR Pipeline",
        "description": "Fix failing CI/CD on open PRs",
        "priority": 5,
        "conditions": {
          "onMain": true,
          "hasFailingPRPipelines": true
        }
      },
      "cd-pipeline-fix": {
        "enabled": true,
        "file": "04-cd-pipeline-fix.md",
        "displayName": "Fix CD Pipeline",
        "description": "Fix failing deployment pipeline",
        "priority": 1,
        "conditions": {
          "onMain": true,
          "cdPipelineFailing": true
        }
      },
      "resume-in-progress": {
        "enabled": true,
        "file": "05-resume-in-progress.md",
        "displayName": "Resume In-Progress Work",
        "description": "Continue existing in-progress issue",
        "priority": 15,
        "conditions": {
          "onMain": true,
          "hasInProgressTasks": true
        }
      },
      "new-work": {
        "enabled": true,
        "file": "06-new-work.md",
        "displayName": "Start New Work",
        "description": "Plan and implement next feature/fix",
        "priority": 100,
        "conditions": {
          "onMain": true,
          "noBlockers": true
        }
      }
    },
    "fallback": "new-work"
  }
}
```

#### Workflow Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Master switch to enable/disable workflow system |
| `autoSelect` | boolean | Automatically select workflow based on conditions |
| `directory` | string | Path to workflows directory (relative to project root) |
| `available` | object | Map of workflow ID to workflow configuration |
| `fallback` | string | Workflow ID to use when no conditions match |

#### Per-Workflow Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable/disable this specific workflow |
| `file` | string | Markdown file containing workflow steps |
| `displayName` | string | Human-readable name for UI display |
| `description` | string | Brief description of workflow purpose |
| `priority` | number | Lower number = higher priority (checked first) |
| `conditions` | object | Conditions that must be met to select this workflow |

#### Workflow Conditions

| Condition | Type | Description |
|-----------|------|-------------|
| `branchPattern` | regex | Pattern to match current branch name |
| `onMain` | boolean | Must be on main/develop branch |
| `notOnMain` | boolean | Must NOT be on main/develop branch |
| `prStatus` | array | PR status: "none", "draft", "open", "merged" |
| `hasFailingPRPipelines` | boolean | Has open PRs with failing CI |
| `cdPipelineFailing` | boolean | CD pipeline is failing |
| `hasInProgressTasks` | boolean | Has task in "in_progress" status |
| `noBlockers` | boolean | No blocking conditions exist |

#### Workflow Selection Algorithm

1. Sort workflows by `priority` (ascending, lower = higher priority)
2. For each workflow (in priority order):
   - Skip if `enabled: false`
   - Evaluate all conditions
   - If all conditions match, select this workflow
3. If no workflow matches, use `fallback` workflow
4. If `autoSelect: false`, present user with workflow picker

#### Custom Workflows

Users can add custom workflows by:

1. Creating a new `.md` file in `.ralph/workflows/`
2. Adding configuration for it in `settings.json` under `workflows.available`
3. Defining appropriate conditions for when it should be selected

```json
{
  "workflows": {
    "available": {
      "hotfix": {
        "enabled": true,
        "file": "custom-hotfix.md",
        "displayName": "Emergency Hotfix",
        "description": "Fast-track critical bug fix to production",
        "priority": 0,
        "conditions": {
          "branchPattern": "^hotfix/.*"
        }
      }
    }
  }
}
```

### Prompt Customization

Prompts can be customized at multiple levels:

1. **Override files** (`.ralph/prompts/`):
   - Non-empty `plan.md` overrides the "plan" step prompt
   - Non-empty `execute.md` overrides the "execute" step prompt
   - This is the recommended approach for project-level customization

2. **Inline in settings.json**:
   ```json
   { "sequence": { "prompts": { "plan": "My custom plan prompt..." } } }
   ```

3. **External file references** (from settings):
   ```json
   { "sequence": { "prompts": { "plan": "@file:prompts/plan.md" } } }
   ```

### Local Overrides Pattern

`.ralph/settings.local.json` enables per-developer customization:

```json
{
  "agent": {
    "name": "codex-cli"
  },
  "ui": {
    "theme": "dark"
  }
}
```

This file should be added to `.gitignore` to avoid conflicts.

## NPM Package Vision

### Package Name
`ralph` - simple, memorable, and aligns with the "Ralph Wiggum Method"

### Installation
```bash
npm install -g ralph
# or
pnpm add -g ralph
# or
npx ralph
```

### Usage
```bash
# Start monitoring in current directory (auto-detects agent)
ralph

# Start with specific agent
ralph --agent codex-cli

# Start monitoring with specific log file
ralph -f path/to/output.jsonl

# Initialize Ralph in current project
ralph init

# Start with sidebar visible
ralph -s
```

### Project Detection
Ralph automatically finds the project root by walking up from `cwd` looking for:
1. A `.ralph/` directory (existing Ralph setup)
2. Agent-specific directories (`.claude/`, `.codex/`, etc.)
3. Configuration files (package.json, etc.)

### Zero-Config Experience

For first-time users, Ralph should "just work":

1. `npx ralph` in any directory with a supported agent
2. Auto-detects installed agent (prefers Claude Code if multiple found)
3. Uses built-in defaults for everything
4. Creates `.ralph/` on first session for logs/archives
5. No configuration required unless customization is desired

## Key Differentiators

1. **Multi-agent support**: Works with Claude Code, Codex CLI, OpenCode, Kiro CLI, and custom agents
2. **True cross-platform**: Native Windows support without WSL dependency
3. **Control, not just monitoring**: Can start, stop, and resume sessions with feedback injection
4. **Flexible sequences**: Configurable agent phases, not hard-coded workflows
5. **Progressive configuration**: Zero-config to start, infinitely customizable
6. **Session continuity**: Archives and session picker preserve work history
7. **Minimal footprint**: Single package, no server, runs entirely in the terminal

## Success Metrics

1. **Adoption**: Downloads and active users of the npm package
2. **Multi-agent usage**: Distribution of usage across supported agents
3. **Cross-platform installs**: Balanced adoption across Mac, Windows, Linux
4. **Session visibility**: Users can identify issues faster with the TUI than raw logs
5. **Interrupt utility**: Users successfully use interrupt mode to guide sessions
6. **Developer productivity**: Reduced time debugging autonomous agent issues

## Future Roadmap

### Phase 1: Multi-Agent Foundation (Current)
- Implement agent adapter architecture
- Support Claude Code, Codex CLI, OpenCode, Kiro CLI
- Cross-platform testing (Mac, Windows native, Linux)
- Configuration system with settings.json
- Publish to npm as `ralph`

### Phase 2: Enhanced Monitoring
- Cost estimation (token-to-dollar conversion per agent)
- Session comparison and diff views
- Alert on specific patterns (errors, high token usage)
- Export sessions to markdown/HTML
- Per-agent statistics normalization

### Phase 3: Advanced Control
- Approval mode for tool calls
- Branching sessions (save state, try different prompts)
- Multi-session dashboard
- Remote session monitoring
- Agent-switching mid-session

## Out of Scope (For Now)

- Web UI (terminal-only)
- Multi-agent orchestration (single agent per session)
- Direct API integration (relies on agent CLIs)
- Team collaboration features
- Agent marketplace/registry

## Design Principles

### 1. Zero Friction by Default
- Work out of the box with no configuration
- Auto-detect the user's preferred agent
- Sensible defaults that cover 90% of use cases

### 2. Progressive Disclosure
- Simple things stay simple
- Advanced features available when needed
- Configuration complexity matches user needs

### 3. Platform Parity
- Features work identically across Mac, Windows, Linux
- No "second-class" platform experience
- Native performance on all platforms

### 4. Agent Agnosticism
- Core UI works regardless of agent
- Agent-specific features gracefully degrade
- Easy to add new agent adapters

## Open Questions

1. ~~Should we support other AI agent tools?~~ **Resolved: Yes, multi-agent support is a core feature**
2. How do we handle agents with very different output formats? (adapter complexity)
3. Should agent adapters be plugins or built into core?
4. What's the story for agents that don't support JSONL output?
5. How do we handle agent-specific features (e.g., Claude Code's subagent Task tool)?

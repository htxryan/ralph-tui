# Ralph Configuration

Ralph uses a layered configuration system that loads settings from multiple sources. This allows you to set global defaults, per-project settings, and local overrides that aren't committed to version control.

## Configuration Precedence

Settings are loaded and merged in the following order (lowest to highest priority):

1. **Built-in defaults** - Sensible defaults shipped with Ralph
2. **Global user config** - Your personal defaults across all projects
3. **Project settings** - Shared team configuration checked into the repo
4. **Local overrides** - Personal overrides not committed to git
5. **CLI arguments** - Flags passed when running Ralph

Higher priority sources override lower ones. Nested objects are merged recursively, while arrays are replaced entirely.

## Configuration Files

### Global User Config

Platform-specific location for your personal defaults:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/ralph/settings.json` |
| Linux | `~/.config/ralph/settings.json` (or `$XDG_CONFIG_HOME/ralph/settings.json`) |
| Windows | `%APPDATA%\ralph\settings.json` |

### Project Settings

Shared configuration for your team, checked into version control:

```
.ralph/settings.json
```

### Local Overrides

Personal overrides that should NOT be committed (add to `.gitignore`):

```
.ralph/settings.local.json
```

## Configuration Schema

```json
{
  "agent": {
    "type": "claude-code",
    "binaryPath": "/custom/path/to/agent",
    "args": ["--verbose"],
    "env": {
      "CUSTOM_VAR": "value"
    }
  },
  "display": {
    "showSidebar": false,
    "defaultTab": "messages",
    "defaultFilters": ["user", "assistant", "tool", "thinking", "subagent", "system", "result", "initial-prompt"],
    "theme": "default"
  },
  "process": {
    "jsonlPath": ".ralph/claude_output.jsonl",
    "lockPath": ".ralph/claude.lock",
    "startupTimeout": 30000,
    "shutdownTimeout": 5000
  },
  "paths": {
    "archiveDir": ".ralph/archive",
    "promptsDir": ".ralph/prompts",
    "planningDir": ".ralph/planning"
  },
  "taskManagement": {
    "provider": "vibe-kanban",
    "autoInstall": true,
    "providerConfig": {}
  }
}
```

### Agent Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `"claude-code"` | Agent type: `claude-code`, `codex`, `opencode`, `kiro`, or `custom` |
| `binaryPath` | string | (auto) | Path to agent CLI binary if not in PATH |
| `args` | string[] | `[]` | Additional CLI arguments to pass to the agent |
| `env` | object | `{}` | Environment variables to set when spawning the agent |

### Display Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showSidebar` | boolean | `false` | Show sidebar on startup |
| `defaultTab` | string | `"messages"` | Default tab: `messages`, `task`, `todos`, `errors`, or `stats` |
| `defaultFilters` | string[] | (all) | Message types to show by default |
| `theme` | string | `"default"` | Color theme: `default`, `minimal`, or `colorblind` |

### Process Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `jsonlPath` | string | `".ralph/claude_output.jsonl"` | Path to JSONL output file (relative to project root) |
| `lockPath` | string | `".ralph/claude.lock"` | Path to lock file (relative to project root) |
| `startupTimeout` | number | `30000` | Timeout in ms for agent startup |
| `shutdownTimeout` | number | `5000` | Timeout in ms for graceful shutdown before SIGKILL |

### Paths Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `archiveDir` | string | `".ralph/archive"` | Directory for archived sessions |
| `promptsDir` | string | `".ralph/prompts"` | Directory for prompt templates |
| `planningDir` | string | `".ralph/planning"` | Directory for planning files |

### Task Management Configuration

Ralph supports pluggable task management backends through adapters. Configure which system to use for tracking tasks displayed in the Task tab.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"vibe-kanban"` | Task backend: `vibe-kanban`, `jira`, `linear`, `beads`, or `github-issues` |
| `autoInstall` | boolean | `true` | Auto-install Vibe Kanban if not available (only applies to vibe-kanban) |
| `providerConfig` | object | `{}` | Provider-specific configuration (see below) |

#### Supported Providers

| Provider | Status | Description |
|----------|--------|-------------|
| `vibe-kanban` | **Implemented** | MCP-based local task management (default) |
| `jira` | Planned | Atlassian Jira integration |
| `linear` | Planned | Linear.app integration |
| `beads` | Planned | Git-native CLI tool (bd) |
| `github-issues` | Planned | GitHub Issues integration |

#### Provider-Specific Configuration

Each provider may have additional configuration options in `providerConfig`:

**Vibe Kanban:**
```json
{
  "taskManagement": {
    "provider": "vibe-kanban",
    "providerConfig": {
      "vibeKanbanProjectId": "uuid-of-project"
    }
  }
}
```

**Jira** (planned):
```json
{
  "taskManagement": {
    "provider": "jira",
    "providerConfig": {
      "jiraHost": "https://yourcompany.atlassian.net",
      "jiraProject": "PROJ",
      "jiraApiToken": "your-api-token"
    }
  }
}
```

**Linear** (planned):
```json
{
  "taskManagement": {
    "provider": "linear",
    "providerConfig": {
      "linearTeam": "team-id",
      "linearApiKey": "your-api-key"
    }
  }
}
```

**GitHub Issues** (planned):
```json
{
  "taskManagement": {
    "provider": "github-issues",
    "providerConfig": {
      "githubRepo": "owner/repo",
      "githubToken": "your-github-token"
    }
  }
}
```

## CLI Options

CLI flags override all configuration files:

```bash
ralph [options]

Options:
  -f, --file <path>      Path to JSONL file to monitor (overrides config)
  -i, --issue <id>       Task ID to display
  -s, --sidebar          Show the sidebar on startup
  -S, --no-sidebar       Hide the sidebar on startup
  -a, --agent <type>     Agent type (claude-code, codex, opencode, kiro, custom)
  -w, --watch            Continue watching for new entries (default: true)
  -h, --help             Display help
  -V, --version          Display version
```

## Examples

### Example: Global Defaults

Create `~/Library/Application Support/ralph/settings.json` (macOS):

```json
{
  "display": {
    "showSidebar": true,
    "defaultTab": "todos"
  }
}
```

Now Ralph will always start with the sidebar visible and the todos tab selected.

### Example: Project Configuration

Create `.ralph/settings.json` in your project:

```json
{
  "agent": {
    "type": "claude-code",
    "args": ["--model", "claude-sonnet-4-20250514"]
  },
  "process": {
    "startupTimeout": 60000
  }
}
```

This sets a longer startup timeout and passes extra args to the agent for everyone on the team.

### Example: Local Overrides

Create `.ralph/settings.local.json` (don't commit this):

```json
{
  "agent": {
    "binaryPath": "/opt/homebrew/bin/claude"
  },
  "display": {
    "theme": "minimal"
  }
}
```

This points to a custom agent binary and uses a different theme, without affecting team settings.

### Example: .gitignore

Add to your `.gitignore`:

```
# Ralph local overrides (personal settings)
.ralph/settings.local.json

# Ralph runtime files
.ralph/claude_output.jsonl
.ralph/claude.lock
.ralph/archive/
```

## Deep Merge Behavior

Configuration objects are merged recursively:

```json
// Global config
{
  "agent": {
    "type": "claude-code",
    "args": ["--verbose"]
  }
}

// Project config
{
  "agent": {
    "args": ["--model", "opus"]
  }
}

// Result (project overrides agent.args entirely, not merged)
{
  "agent": {
    "type": "claude-code",
    "args": ["--model", "opus"]
  }
}
```

**Key rule**: Arrays are replaced, not merged. If you want to add to an array, you must include all values.

## Error Handling

If a configuration file contains invalid JSON, Ralph will:
1. Log a warning to stderr
2. Continue loading other configuration sources
3. Use defaults for the invalid source

If the final merged configuration fails validation, Ralph will:
1. Display a helpful error message with the invalid field
2. Exit with code 1

Example error:
```
Error: Configuration validation failed: Invalid configuration for 'agent.type': must be one of: claude-code, codex, opencode, kiro, custom
Check your config files or CLI options for invalid values.
```

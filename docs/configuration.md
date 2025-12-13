# Ralph Configuration

Ralph uses a layered configuration system that loads settings from multiple sources. This allows you to set global defaults, per-project settings, active project overrides, and local settings that aren't committed to version control.

## Configuration Precedence

Settings are loaded and merged in the following order (lowest to highest priority):

1. **Built-in defaults** - Sensible defaults shipped with Ralph
2. **Global user config** - Your personal defaults across all projects
3. **Project settings** - Shared team configuration (`.ralph/settings.json`)
4. **Active project settings** - Settings for the currently selected project (`.ralph/projects/<name>/settings.json`)
5. **Local overrides** - Personal overrides not committed to git
6. **CLI arguments** - Flags passed when running Ralph

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

### Active Project Settings

Configuration specific to the selected project (execution mode):

```
.ralph/projects/<name>/settings.json
```

See [Projects](./projects.md) for details on creating and managing projects.

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
    "promptsDir": ".ralph/prompts"
  },
  "task_management": {
    "provider": "github-issues",
    "auto_install": true,
    "provider_config": {
      "label_filter": "ralph"
    }
  },
  "variables": {
    "target_branch": "main"
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

### Template Variables

The `variables` field defines key-value pairs that are substituted into prompt templates at runtime.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `variables` | object | `{}` | Key-value pairs for template substitution |

Variables can be defined at both the global level (`.ralph/settings.json`) and project level (`.ralph/projects/<name>/settings.json`). Project-level variables override global ones.

**Example:**

```json
{
  "variables": {
    "target_branch": "main",
    "require_tests": "true"
  }
}
```

Use variables in `execute.md` with `{{variable_name}}` syntax:

```markdown
### 3. Implement

3.1. Create a feature branch from `{{target_branch}}`
```

**Built-in variables:**

| Variable | Description |
|----------|-------------|
| `{{execute_path}}` | Path to the active project's execute.md file |
| `{{assignment_path}}` | Path to the active project's assignment.json file |

### Task Management Configuration

Ralph supports pluggable task management backends through adapters. Configure which system to use for tracking tasks displayed in the Task tab.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"github-issues"` | Task backend: `github-issues`, `vibe-kanban`, `jira`, `linear`, or `beads` |
| `auto_install` | boolean | `true` | Auto-install Vibe Kanban if not available (only applies to vibe-kanban) |
| `provider_config` | object | `{}` | Provider-specific configuration (see below) |

#### Supported Providers

| Provider | Status | Description |
|----------|--------|-------------|
| `github-issues` | **Implemented** | GitHub Issues integration (default) |
| `vibe-kanban` | **Implemented** | MCP-based local task management |
| `jira` | Planned | Atlassian Jira integration |
| `linear` | Planned | Linear.app integration |
| `beads` | Planned | Git-native CLI tool (bd) |

#### Provider-Specific Configuration

Each provider may have additional configuration options in `provider_config`:

**GitHub Issues:**
```json
{
  "task_management": {
    "provider": "github-issues",
    "provider_config": {
      "github_repo": "owner/repo",
      "label_filter": "ralph"
    }
  }
}
```

**Vibe Kanban:**
```json
{
  "task_management": {
    "provider": "vibe-kanban",
    "provider_config": {
      "vibe_kanban_project_id": "uuid-of-project"
    }
  }
}
```

**Jira** (planned):
```json
{
  "task_management": {
    "provider": "jira",
    "provider_config": {
      "jira_host": "https://yourcompany.atlassian.net",
      "jira_project": "PROJ",
      "jira_api_token": "your-api-token"
    }
  }
}
```

**Linear** (planned):
```json
{
  "task_management": {
    "provider": "linear",
    "provider_config": {
      "linear_team": "team-id",
      "linear_api_key": "your-api-key"
    }
  }
}
```

## Project-Specific Configuration

Each project in `.ralph/projects/<name>/` can have its own `settings.json`:

```json
{
  "displayName": "Bug Fix",
  "description": "Quick bug fixes with minimal ceremony",
  "variables": {
    "target_branch": "main",
    "skip_tests": "false"
  }
}
```

### Project Settings Fields

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Human-readable name shown in project picker |
| `description` | string | Brief description of the project's purpose |
| `variables` | object | Template variables (overrides global variables) |

Project settings merge with global settings, with project values taking precedence.

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
  "task_management": {
    "provider": "github-issues",
    "provider_config": {
      "label_filter": "ralph"
    }
  },
  "variables": {
    "target_branch": "main"
  }
}
```

This configures the agent, task management, and sets a default target branch for everyone on the team.

### Example: Project-Specific Variables

Create `.ralph/projects/hotfix/settings.json`:

```json
{
  "displayName": "Hotfix",
  "description": "Emergency fixes targeting production",
  "variables": {
    "target_branch": "production",
    "skip_review": "true"
  }
}
```

When the "Hotfix" project is selected, these variables override global ones.

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

# Ralph project assignment files (runtime, per-project)
.ralph/projects/*/assignment.json
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

## See Also

- [Projects](./projects.md) - Creating and managing projects
- [Task Adapters](./task-adapters.md) - Task management providers
- [ralph init](./commands/init.md) - Initialize Ralph in a project

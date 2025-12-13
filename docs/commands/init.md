# ralph init

Initialize Ralph in a project directory.

## Synopsis

```bash
ralph init [options]
```

## Description

The `init` command creates the `.ralph/` directory structure in your project, setting up the configuration files and execution templates needed for Ralph to operate.

This is typically the first command you run when setting up Ralph in a new project.

## What Gets Created

```
.ralph/
├── settings.json                              # Configuration file
└── projects/
    └── default/
        ├── settings.json                      # Project-specific settings
        └── execute.md                         # Execution workflow
```

### settings.json

The main configuration file for Ralph. Created with default task management settings:

```json
{
  "task_management": {
    "provider": "github-issues",
    "provider_config": {
      "label_filter": "ralph"
    }
  },
  "variables": {}
}
```

You can customize this file to:

- Configure which AI agent to use
- Set task management provider (GitHub Issues, Linear, Jira, etc.)
- Define template variables for prompt substitution
- Adjust display settings and custom paths

See [Configuration](../configuration.md) for details.

### Projects Directory

Ralph uses a **project-based** approach where each "project" represents a different execution mode or workflow:

- **projects/default/** - The default project created by `ralph init`
  - **execute.md** - The execution workflow that defines how tasks are completed
  - **settings.json** - Project-specific settings and variables

You can create additional projects for different workflows (e.g., `bug-fix`, `refactor`, `docs`) by copying the `default` directory.

### Bundled Orchestration

The orchestration prompt (`orchestrate.md`) is bundled with the Ralph package and **not copied** to your project. This ensures you always get the latest orchestration logic when upgrading Ralph. Template variables like `{{execute_path}}` are substituted at runtime.

## Options

### `-a, --agent <name>`

Pre-configure a specific AI agent in `settings.json`.

Valid agent names:
- `claude-code` - Anthropic's Claude Code CLI
- `codex` - OpenAI's Codex CLI
- `opencode` - OpenCode CLI
- `kiro` - AWS Kiro CLI
- `custom` - Custom agent configuration

**Example:**

```bash
ralph init --agent claude-code
```

This creates `settings.json` with:

```json
{
  "agent": {
    "type": "claude-code"
  },
  "task_management": {
    "provider": "github-issues",
    "provider_config": {
      "label_filter": "ralph"
    }
  },
  "variables": {}
}
```

### `-n, --dry-run`

Show what would be created without actually creating any files.

**Example:**

```bash
ralph init --dry-run
```

Output:

```
Dry run - no files will be created

Initializing Ralph in /path/to/project

Would create:
  .ralph/settings.json
  .ralph/projects/default/settings.json
  .ralph/projects/default/execute.md

Suggested .gitignore additions:
  # Ralph - Local settings (user-specific overrides)
  .ralph/settings.local.json

  # Ralph - Session outputs (regenerated each session)
  .ralph/claude_output.jsonl
  .ralph/claude.lock

Next steps:
  1. Review and customize .ralph/projects/default/execute.md
  2. Configure variables in .ralph/settings.json or .ralph/projects/default/settings.json
  3. Add the suggested entries to your .gitignore
  4. Run `ralph` to start monitoring

Ralph initialized successfully!
```

### `-f, --force`

Overwrite existing files. By default, `ralph init` will skip files that already exist.

**Example:**

```bash
ralph init --force
```

## Behavior

### Idempotent

Running `ralph init` multiple times is safe. On subsequent runs:

- Existing files are **skipped** (not overwritten)
- Missing files are created
- The command reports which files were skipped

To reset to defaults, use `--force`.

### Gitignore Suggestions

After initialization, Ralph suggests entries to add to your `.gitignore`:

```gitignore
# Ralph - Local settings (user-specific overrides)
.ralph/settings.local.json

# Ralph - Session outputs (regenerated each session)
.ralph/claude_output.jsonl
.ralph/claude.lock

# Ralph - Archives (optional, can be large)
# .ralph/archive/
```

**Recommended:** Add at least `settings.local.json` and `claude_output.jsonl` to avoid committing user-specific settings and session data.

## Examples

### Basic Initialization

```bash
cd my-project
ralph init
```

### Initialize with Claude Code

```bash
ralph init --agent claude-code
```

### Preview What Would Be Created

```bash
ralph init --dry-run
```

### Reset to Defaults

```bash
ralph init --force
```

### Initialize with Codex and Preview

```bash
ralph init --agent codex --dry-run
```

## Next Steps

After running `ralph init`:

1. **Review the execution workflow** in `.ralph/projects/default/execute.md`
2. **Configure variables** in `.ralph/settings.json` (e.g., `target_branch`)
3. **Update .gitignore** with the suggested entries
4. **Start Ralph** by running `ralph` in your project directory
5. **Select a project** by pressing `J` in the TUI to open the project picker

## Creating Additional Projects

To create a new project (execution mode):

1. Copy the `default` directory:
   ```bash
   cp -r .ralph/projects/default .ralph/projects/bug-fix
   ```

2. Edit `.ralph/projects/bug-fix/settings.json` to customize:
   ```json
   {
     "displayName": "Bug Fix",
     "description": "Workflow optimized for bug fixes",
     "variables": {
       "target_branch": "main"
     }
   }
   ```

3. Customize `.ralph/projects/bug-fix/execute.md` for your bug-fix workflow

4. Select the project in the TUI using `J`

## See Also

- [Configuration](../configuration.md) - Detailed configuration options
- [Projects](../projects.md) - Project structure and customization
- [Getting Started](../getting-started.md) - Quick start guide

# ralph init

Initialize Ralph in a project directory.

## Synopsis

```bash
ralph init [options]
```

## Description

The `init` command creates the `.ralph/` directory structure in your project, setting up the configuration files and prompt templates needed for Ralph to operate.

This is typically the first command you run when setting up Ralph in a new project.

## What Gets Created

```
.ralph/
├── settings.json                              # Configuration file (empty by default)
├── orchestrate.example.md                     # Example orchestration prompt
└── workflows/
    ├── 01-feature-branch-incomplete.example.md
    ├── 02-feature-branch-pr-ready.example.md
    ├── 03-pr-pipeline-fix.example.md
    ├── 04-cd-pipeline-fix.example.md
    ├── 05-resume-in-progress.example.md
    └── 06-new-work.example.md
```

### settings.json

The main configuration file for Ralph. Created as an empty JSON object `{}` by default, which means Ralph will use its built-in defaults. You can customize this file to:

- Configure which AI agent to use
- Adjust display settings
- Set custom paths
- Configure process timeouts

See [Configuration](../configuration.md) for details.

### Orchestration & Workflow Files

Ralph uses an orchestration-based approach with multiple workflow paths:

- **orchestrate.example.md**: Example orchestration prompt that determines which workflow to execute based on project state (branch, PRs, pipelines, tasks).
- **workflows/*.example.md**: Example workflow files for different scenarios:
  - Feature branch with incomplete work
  - Feature branch ready to merge
  - PR pipeline fixes
  - CD pipeline fixes
  - Resuming in-progress work
  - Starting new work

To customize, copy the `.example.md` files and remove the `.example` suffix (e.g., `orchestrate.example.md` → `orchestrate.md`). Your custom files will override the examples.

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
  }
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
  .ralph/orchestrate.example.md
  .ralph/workflows/01-feature-branch-incomplete.example.md
  .ralph/workflows/02-feature-branch-pr-ready.example.md
  .ralph/workflows/03-pr-pipeline-fix.example.md
  .ralph/workflows/04-cd-pipeline-fix.example.md
  .ralph/workflows/05-resume-in-progress.example.md
  .ralph/workflows/06-new-work.example.md

Suggested .gitignore additions:
  # Ralph - Local settings (user-specific overrides)
  .ralph/settings.local.json

  # Ralph - Session outputs (regenerated each session)
  .ralph/claude_output.jsonl
  .ralph/claude.lock

Next steps:
  1. Review the example files in .ralph/*.example.md and .ralph/workflows/
  2. Copy and customize: orchestrate.example.md -> orchestrate.md
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

1. **Review the example files** in `.ralph/*.example.md` and `.ralph/workflows/`
2. **Customize orchestration** by copying `orchestrate.example.md` to `orchestrate.md` and editing
3. **Customize workflows** by copying workflow files and removing the `.example` suffix
4. **Update .gitignore** with the suggested entries
5. **Start Ralph** by running `ralph` in your project directory

## See Also

- [Configuration](../configuration.md) - Detailed configuration options
- [Getting Started](../getting-started.md) - Quick start guide

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
├── settings.json           # Configuration file (empty by default)
└── prompts/
    ├── plan.md             # Your custom planning prompt (blank)
    ├── plan.example.md     # Example planning prompt template
    ├── execute.md          # Your custom execution prompt (blank)
    └── execute.example.md  # Example execution prompt template
```

### settings.json

The main configuration file for Ralph. Created as an empty JSON object `{}` by default, which means Ralph will use its built-in defaults. You can customize this file to:

- Configure which AI agent to use
- Adjust display settings
- Set custom paths
- Configure process timeouts

See [Configuration](../configuration.md) for details.

### Prompt Files

Ralph uses a two-phase approach: **planning** and **execution**. Each phase has its own prompt template.

- **plan.md** / **execute.md**: Your custom prompts. These are blank by default. When non-empty, they override the built-in defaults.
- **plan.example.md** / **execute.example.md**: Reference templates showing the recommended structure and available variables. These are never used by Ralph directly.

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
  .ralph/prompts/plan.md
  .ralph/prompts/plan.example.md
  .ralph/prompts/execute.md
  .ralph/prompts/execute.example.md

Suggested .gitignore additions:
  # Ralph - Local settings (user-specific overrides)
  .ralph/settings.local.json

  # Ralph - Session outputs (regenerated each session)
  .ralph/claude_output.jsonl
  .ralph/claude.lock

Next steps:
  1. Review and customize .ralph/prompts/*.md
  2. Add the suggested entries to your .gitignore
  3. Run `ralph` to start monitoring

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

1. **Review the example prompts** in `.ralph/prompts/*.example.md`
2. **Customize your prompts** by editing `.ralph/prompts/plan.md` and `execute.md`
3. **Update .gitignore** with the suggested entries
4. **Start Ralph** by running `ralph` in your project directory

## See Also

- [Configuration](../configuration.md) - Detailed configuration options
- [Prompts](../prompts.md) - How to customize prompts
- [Getting Started](../getting-started.md) - Quick start guide

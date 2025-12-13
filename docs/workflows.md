# Workflows (Deprecated)

> **Note:** The workflow-based system has been replaced by the **project-based** system.
> See [Projects](./projects.md) for the current documentation.

## Migration Guide

The old workflow files (`.ralph/workflows/*.md`) have been replaced by projects (`.ralph/projects/<name>/`).

### Key Changes

| Old System | New System |
|------------|------------|
| `.ralph/workflows/01-feature-branch.md` | `.ralph/projects/default/execute.md` |
| `.ralph/orchestrate.md` (copied) | Bundled with package (not copied) |
| YAML frontmatter in workflows | `settings.json` in each project |
| Fixed set of 6 workflows | Unlimited custom projects |
| Workflow selected by orchestrator | Project selected by user in TUI |

### Migration Steps

1. **Create a project for each workflow you need:**
   ```bash
   mkdir -p .ralph/projects/my-workflow
   ```

2. **Convert workflow content to execute.md:**
   - Remove YAML frontmatter
   - Keep the markdown body as execution instructions
   - Save as `.ralph/projects/my-workflow/execute.md`

3. **Move frontmatter to settings.json:**
   ```json
   {
     "displayName": "My Workflow",
     "description": "Description from frontmatter",
     "variables": {}
   }
   ```

4. **Delete old files:**
   ```bash
   rm -rf .ralph/workflows/
   rm -f .ralph/orchestrate.md
   ```

5. **Run `ralph init` to ensure proper structure:**
   ```bash
   ralph init
   ```

## See Also

- [Projects](./projects.md) - Current project-based system
- [ralph init](./commands/init.md) - Initialize Ralph

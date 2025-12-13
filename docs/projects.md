# Projects

Ralph uses a project-based system to define different execution modes for autonomous AI agents. Each project represents a distinct workflow configuration that can be selected at runtime.

## Overview

Projects are stored in `.ralph/projects/` and contain:

- **execute.md** - The execution workflow that defines how tasks are completed
- **settings.json** - Project-specific configuration and variables

When you start Ralph, you can select which project to use via the project picker (press `J`).

## Directory Structure

```
.ralph/
├── settings.json              # Global settings
└── projects/
    ├── default/
    │   ├── settings.json      # Project settings
    │   ├── execute.md         # Execution workflow
    │   └── assignment.json    # Current task assignment (runtime)
    ├── bug-fix/
    │   ├── settings.json
    │   ├── execute.md
    │   └── assignment.json
    └── refactor/
        ├── settings.json
        ├── execute.md
        └── assignment.json
```

Each project has its own `assignment.json` file to track the current task assignment, allowing you to work on different tasks in different projects simultaneously.

## The Default Project

When you run `ralph init`, a `default` project is created with a general-purpose execution workflow:

```
.ralph/projects/default/
├── settings.json
└── execute.md
```

The default `execute.md` includes phases for:

1. **Orient** - Read README, review git history
2. **Plan** - Read task, create todo list
3. **Implement** - Create branch, build feature, run tests
4. **Submit** - Create PR, monitor CI, merge
5. **Close** - Update task status, pull latest

## Project Settings (settings.json)

Each project has its own `settings.json` that can override global settings:

```json
{
  "displayName": "Bug Fix",
  "description": "Workflow optimized for quick bug fixes",
  "variables": {
    "target_branch": "main",
    "skip_tests": "false"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Human-readable name shown in project picker |
| `description` | string | Brief description of the project's purpose |
| `variables` | object | Template variables for prompt substitution |

### Variable Substitution

Variables defined in `settings.json` are substituted into `execute.md` at runtime. Use `{{variable_name}}` syntax:

```markdown
### 3. Implement

3.1. Create a feature branch from `{{target_branch}}`
```

Built-in variables:

| Variable | Value |
|----------|-------|
| `{{execute_path}}` | Path to the project's execute.md (e.g., `.ralph/projects/default/execute.md`) |

## Execution Workflow (execute.md)

The `execute.md` file defines the step-by-step workflow for completing tasks. It's a markdown file with:

- Clear phase structure (numbered sections)
- Specific action items
- References to subagents when needed

### Example Structure

```markdown
# Execution Workflow

Your job is to complete the assigned task following this execution workflow.

## Workflow

### 1. Orient

Get your bearings and understand the project.

1.1. Read `./README.md` if it exists
1.2. Review recent git history using the `git-operator` subagent

### 2. Plan

2.1. Read the issue or task you have been assigned
2.2. Create a todo list of the steps needed

### 3. Implement

3.1. Create a feature branch from `{{target_branch}}`
3.2. Implement your plan to completion
3.3. Ensure all tests pass

### 4. Submit

4.1. Create a Pull Request using the `github-operator` subagent
4.2. Monitor CI pipelines; fix any failures
4.3. Merge the PR when CI passes

### 5. Close

5.1. Update the task's status to "closed"
5.2. Checkout `{{target_branch}}` and pull latest
```

## Creating a New Project

1. **Copy an existing project:**
   ```bash
   cp -r .ralph/projects/default .ralph/projects/bug-fix
   ```

2. **Edit the project settings:**
   ```bash
   # Edit .ralph/projects/bug-fix/settings.json
   ```
   ```json
   {
     "displayName": "Bug Fix",
     "description": "Quick bug fixes with minimal ceremony",
     "variables": {
       "target_branch": "main"
     }
   }
   ```

3. **Customize the execution workflow:**
   Edit `.ralph/projects/bug-fix/execute.md` to match your desired workflow.

4. **Select the project:**
   Press `J` in the Ralph TUI to open the project picker and select your new project.

## Project Selection

### In the TUI

Press `J` to open the project picker. Use arrow keys to navigate and Enter to select.

The currently active project is displayed in the header.

### Via Environment Variable

Set `RALPH_PROJECT` before starting Ralph:

```bash
RALPH_PROJECT=bug-fix ralph
```

### Default Behavior

If no project is specified, Ralph uses the `default` project.

## Configuration Precedence

Settings are merged in this order (later overrides earlier):

1. Built-in defaults
2. `.ralph/settings.json` (global)
3. `.ralph/projects/<name>/settings.json` (project-specific)
4. CLI options

## Example Projects

### Bug Fix Project

Optimized for quick bug fixes with minimal process:

```json
{
  "displayName": "Bug Fix",
  "description": "Quick fixes with streamlined workflow",
  "variables": {
    "target_branch": "main",
    "create_pr": "true"
  }
}
```

### Documentation Project

For documentation-only changes:

```json
{
  "displayName": "Documentation",
  "description": "Documentation updates only",
  "variables": {
    "target_branch": "main",
    "run_tests": "false"
  }
}
```

### Refactoring Project

For larger refactoring efforts:

```json
{
  "displayName": "Refactor",
  "description": "Code refactoring with thorough testing",
  "variables": {
    "target_branch": "develop",
    "require_review": "true"
  }
}
```

## Migration from Workflows

If you previously used the workflow-based system (`.ralph/workflows/*.md`), migrate to projects:

1. Create a project directory for each workflow you want to keep
2. Convert the workflow markdown to an `execute.md` file
3. Extract any frontmatter metadata into `settings.json`
4. Delete the old `.ralph/workflows/` directory

The new project-based system is more flexible and allows runtime selection.

## See Also

- [Configuration](./configuration.md) - Global and project configuration
- [ralph init](./commands/init.md) - Initialize Ralph in a project

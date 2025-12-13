# Refine Single Task

You are tasked with running the full refinement workflow for a single task: research, planning, and capture to GitHub Issues.

## Arguments

This command accepts a required argument:

- **$ARGUMENTS**: A task description (e.g., "Add dark mode toggle to settings")

If no arguments are provided or the input is empty, respond:
```
Error: Task description required.

Usage: /refine:single <task-description>

Examples:
  /refine:single Add dark mode toggle to the settings page
  /refine:single Fix memory leak in JSONL parser
  /refine:single Implement keyboard shortcut help overlay

The task description will be:
1. Converted to a task ID (lowercase, hyphenated, max 50 chars)
2. Saved to .ai-docs/thoughts/plans/<task-id>/task.md
3. Researched via /refine:research_codebase
4. Planned via /refine:create_plan
5. Captured to a GitHub Issue via /refine:capture
```
Then stop and wait for correct input.

@.claude/.partials/autonomous-execution.md

## Process Overview

1. Parse the input to extract the task description
2. Generate a unique task ID from the description
3. Execute the refine.sh script for this task
4. Track success/failure status
5. Report the result with the GitHub Issue reference

## Step 1: Parse Input

Extract the task description from `$ARGUMENTS`:
- Trim leading/trailing whitespace
- Remove any leading list markers (`-`, `*`, `1.`, `1)`, etc.) if present
- The remaining text is the task description

@.claude/.partials/task-id-generation.md

## Step 2: Execute Refinement Workflow

@.claude/.partials/refine-script-phases.md

Run the script:

```bash
# Get repo root
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Run the refinement script
"${REPO_ROOT}/.claude/tools/refine.sh" "<task-id>" "<task-description>"
```

## Step 3: Track Result

After the script completes, determine the outcome:

1. **Success**: The task completed all steps and was captured to a GitHub Issue
2. **Failure**: The task failed at some step - capture the error from the script output

## Step 4: Generate Final Report

Present a summary of the result:

### On Success:

```markdown
## Refinement Complete

**Task ID**: `<task-id>`
**Description**: <task-description>
**Status**: Refined

### Artifacts Created

| File | Description |
|------|-------------|
| `.ai-docs/thoughts/plans/<task-id>/task.md` | Task definition |
| `.ai-docs/thoughts/plans/<task-id>/research.md` | Codebase research |
| `.ai-docs/thoughts/plans/<task-id>/plan.md` | Implementation plan |

### GitHub Issue

The task has been captured to GitHub Issues. Check the output above for the issue URL.

### Next Steps

To implement this task, run:
```
/implement <task-id>
```
Or assign the GitHub Issue and work on it manually.
```

### On Failure:

```markdown
## Refinement Failed

**Task ID**: `<task-id>`
**Description**: <task-description>
**Status**: Failed
**Error**: <error message from script output>

### Troubleshooting

1. Check if the task files were partially created:
   - `.ai-docs/thoughts/plans/<task-id>/task.md`
   - `.ai-docs/thoughts/plans/<task-id>/research.md`
   - `.ai-docs/thoughts/plans/<task-id>/plan.md`

2. If research failed, try running manually:
   ```
   /refine:research_codebase <task-id>
   ```

3. If planning failed, try running manually:
   ```
   /refine:create_plan <task-id>
   ```

4. If capture failed, try running manually:
   ```
   /refine:capture <task-id>
   ```
```

## Example Execution

**Input:**
```
/refine:single Add splash screen with ASCII art animation
```

**Expected behavior:**
1. Parse description: "Add splash screen with ASCII art animation"
2. Generate ID: `add-splash-screen-with-ascii-art-animation`
3. Run: `.claude/tools/refine.sh add-splash-screen-with-ascii-art-animation "Add splash screen with ASCII art animation"`
4. Wait for completion (research → plan → capture)
5. Report result with artifacts table and GitHub Issue URL

@.claude/.partials/workflow-commands.md

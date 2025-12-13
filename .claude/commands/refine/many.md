# Refine Many Tasks

You are tasked with running the refinement workflow for multiple tasks in parallel, with controlled concurrency.

## Arguments

This command accepts a required argument:

- **$ARGUMENTS**: A bullet list or numbered list of task descriptions

If no arguments are provided or the input is empty, respond:
```
Error: Task list required.

Usage: /refine:many
- First task description here
- Second task description here
- Third task description here

Or with numbered list:
1. First task description
2. Second task description
3. Third task description

Each item will be refined in parallel (max 5 concurrent) using the refine.sh workflow.
```
Then stop and wait for correct input.

@.claude/.partials/autonomous-execution.md

**Additional rules for batch processing:**
- If task ID generation produces duplicates, append `-2`, `-3`, etc.
- Parse the input list and proceed with ALL tasks
- Produce a comprehensive results summary at the end

## Process Overview

1. Parse the input list to extract individual task descriptions
2. Generate a unique task ID for each description
3. Execute refine.sh for each task with **max 5 concurrent** processes
4. Track success/failure status for each task
5. Report final results with GitHub Issue references

## Step 1: Parse Input List

Parse `$ARGUMENTS` to extract task descriptions. Support these formats:

**Bullet lists:**
```
- Task description here
* Task description here
```

**Numbered lists:**
```
1. Task description here
2) Task description here
```

**Mixed or plain lines:**
```
Task one
Task two
```

For each line, strip the list marker (if present) and trim whitespace.

@.claude/.partials/task-id-generation.md

## Step 2: Execute with Concurrency Control

@.claude/.partials/refine-script-phases.md

For batch processing, use the `refine-many.sh` script at `.claude/tools/refine-many.sh`.

**Create a tasks file** with one task per line in the format: `task-id|Task description here`

```bash
# Create temp directory
RESULTS_DIR=$(mktemp -d)

# Write tasks file
cat > "${RESULTS_DIR}/tasks.txt" << 'EOF'
task-id-1|First task description here
task-id-2|Second task description here
task-id-3|Third task description here
EOF

# Run the parallel refinement script
"${REPO_ROOT}/.claude/tools/refine-many.sh" "${RESULTS_DIR}/tasks.txt"
```

The `refine-many.sh` script handles:
- Max 5 concurrent processes
- Per-task logging in a temp results directory
- Success/failure tracking for each task
- Summary output when complete

## Step 3: Collect Results

After all tasks complete, read each result file to determine:

1. **Success**: The task completed and was captured to a GitHub Issue
2. **Failure**: The task failed at some step - capture the error reason

For successful tasks, check the GitHub Issue URL in the output to view full task details.

## Step 4: Generate Final Report

Present a comprehensive summary:

```markdown
## Refinement Results

**Total Tasks**: X
**Successful**: Y
**Failed**: Z

### Successful Tasks

| Task ID | Description | Status |
|---------|-------------|--------|
| `task-id-1` | Description here | Refined |
| `task-id-2` | Description here | Refined |

### Failed Tasks

| Task ID | Description | Error |
|---------|-------------|-------|
| `task-id-3` | Description here | Error message summary |

### Output Locations

Successful task artifacts are located at:
- `.ai-docs/thoughts/plans/<task-id>/task.md`
- `.ai-docs/thoughts/plans/<task-id>/research.md`
- `.ai-docs/thoughts/plans/<task-id>/plan.md`
```

## Implementation Notes

### Using the refine-many.sh Script

The `refine-many.sh` script at `.claude/tools/refine-many.sh` handles all the complexity of parallel execution:

1. **Create a tasks file**: One `task_id|description` per line
2. **Run the script**: `./refine-many.sh /path/to/tasks.txt`
3. **The script outputs**:
   - Per-task timestamps as jobs start/complete
   - Final summary with success/failure counts
   - Results directory path containing logs

### Handling Long-Running Tasks

Each refine.sh execution can take several minutes (it runs 3 Claude sessions). The script:
- Prints status updates as tasks complete
- Runs up to 5 concurrent tasks
- Waits for all tasks before generating summary

### Error Recovery

If a task fails:
- Log the error details to `<results-dir>/<task-id>.log`
- Continue with remaining tasks
- Include failure in final report
- Do NOT retry automatically (user can re-run individual tasks with `/refine:single` or `/refine:many` on just the failed items)

## Example Execution

**Input:**
```
/refine:many
- Add splash screen with ASCII art animation
- Implement keyboard shortcut help overlay
- Add dark mode toggle to settings
- Fix memory leak in JSONL parser
- Add export functionality for session logs
```

**Expected behavior:**
1. Parse 5 task descriptions
2. Generate IDs: `add-splash-screen-with-ascii-art-animation`, `implement-keyboard-shortcut-help-overlay`, etc.
3. Start 5 concurrent refine.sh processes
4. Wait for all to complete
5. Report results:
   ```
   ## Refinement Results

   **Total Tasks**: 5
   **Successful**: 4
   **Failed**: 1

   ### Successful Tasks
   | Task ID | Description | Status |
   |---------|-------------|--------|
   | `add-splash-screen-with-ascii-art-animation` | Add splash screen with ASCII art animation | Refined |
   | `implement-keyboard-shortcut-help-overlay` | Implement keyboard shortcut help overlay | Refined |
   | `add-dark-mode-toggle-to-settings` | Add dark mode toggle to settings | Refined |
   | `add-export-functionality-for-session-logs` | Add export functionality for session logs | Refined |

   ### Failed Tasks
   | Task ID | Description | Error |
   |---------|-------------|-------|
   | `fix-memory-leak-in-jsonl-parser` | Fix memory leak in JSONL parser | Research phase timed out |
   ```

@.claude/.partials/workflow-commands.md

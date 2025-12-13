# Task

Your job is to determine the place to pick up work for a work item according to an execution workflow. It is possible that no work has been done, and it is possible that work is in-progress and should be resumed where it left off.

You will use the `assignment.json` file (located in the same directory as the `{{execute_path}}` workflow) to track the work item that is in progress. The assignment file path is: `{{assignment_path}}`. If this file does not exist, it means that no work has been done. If this file exists, it means that work MIGHT be in-progress, and you must assess where to pick up work from.

## Orchestration Workflow

### 1. Assess Current State

1.1. Check if the assignment file (`{{assignment_path}}`) exists.

1.2. If it exists, assess whether work is truly in progress or already completed. Gather evidence from:
   - Current git branch (is there a feature branch?)
   - Git history (recent commits related to the task?)
   - Pull request status (open, merged, or closed?)
   - CI pipeline status (passing, failing, or pending?)
   - Task manager status (still marked as in-progress?)

1.3. Based on your assessment, determine the current state:
   - **Work In Progress**: Assignment exists AND the task is actively being worked on (e.g., feature branch exists, PR is open, task is marked in-progress)
   - **Work Complete**: Assignment exists BUT the work appears finished (e.g., PR merged, task is closed/done)
   - **No Work Started**: Assignment does not exist

### 2. Handle: Work In Progress

If work is in progress, resume where you left off:

2.1. Read the existing assignment file to get the `task_id` and current `next_step`.

2.2. Read the execution workflow stored in `{{execute_path}}` to understand the full workflow.

2.3. Assess progress against the execution workflow steps. Consider:
   - Has the feature branch been created? (Step 3.1)
   - Has implementation begun? (Step 3.2)
   - Have tests been run? (Step 3.3)
   - Has a PR been created? (Step 4.1)
   - What is the CI status? (Step 4.2)
   - Is the PR ready to merge? (Step 4.3)

2.4. Determine the next logical step for resuming work. Be specific (e.g., "4.2: Fix failing CI - the lint check is failing due to unused imports in src/lib/parser.ts").

2.5. Update the assignment file (`{{assignment_path}}`) with your decision in the `next_step` field.

### 3. Handle: Work Complete

If the previous work was completed:

3.1. Delete the existing assignment file to clean up.

3.2. Proceed to section 4 (Handle: No Work Started) to pick up a new task.

### 4. Handle: No Work Started

If no work is in progress, start fresh:

4.1. Use the task manager (see instructions below) to list available tasks.

4.2. Select the next most important task to work on. Consider:
   - Task priority or urgency indicators
   - Dependencies (tasks that unblock other work)
   - Task age (older unfinished tasks may need attention)

4.3. Set the selected task's status to `{{in_progress_status}}` in the task manager.

4.4. Read the execution workflow stored in `{{execute_path}}` to understand the steps.

4.5. Determine the first step. This is typically "1.1: Read README.md to orient yourself with the project."

4.6. Create the assignment file at `{{assignment_path}}` with the following structure:

```json
{
  "task_id": "<task-identifier>",
  "next_step": "<first step to execute>",
  "pull_request_url": null
}
```

---

## Decision Diagram

```mermaid
flowchart TD
    A[Start Orchestration] --> B{Does assignment.json exist?}

    B -->|No| NO_WORK[No Work Started]
    B -->|Yes| ASSESS{Assess work status}

    ASSESS -->|"Check: git branch,<br/>PR status, CI status,<br/>task manager status"| DECIDE{Is work truly<br/>in progress?}

    DECIDE -->|Yes| WIP[Work In Progress]
    DECIDE -->|"No - work is complete"| COMPLETE[Work Complete]

    subgraph resume ["Resume Work (Section 2)"]
        WIP --> R1[Read existing assignment]
        R1 --> R2[Read execution workflow]
        R2 --> R3[Assess progress against steps]
        R3 --> R4[Determine next logical step]
        R4 --> R5[Update assignment.json<br/>with next_step]
    end

    subgraph cleanup ["Cleanup (Section 3)"]
        COMPLETE --> C1[Delete assignment file]
        C1 --> NO_WORK
    end

    subgraph newwork ["Start New Work (Section 4)"]
        NO_WORK --> N1[List available tasks]
        N1 --> N2[Select most important task]
        N2 --> N3[Set task status to<br/>'{{in_progress_status}}']
        N3 --> N4[Read execution workflow]
        N4 --> N5[Determine first step]
        N5 --> N6[Create assignment.json]
    end

    R5 --> DONE[Ready to Execute]
    N6 --> DONE

    style resume fill:#e8f5e9,stroke:#2e7d32
    style cleanup fill:#fff3e0,stroke:#e65100
    style newwork fill:#e1f5fe,stroke:#01579b
```

{{!TASK_MANAGER_INSTRUCTIONS}}

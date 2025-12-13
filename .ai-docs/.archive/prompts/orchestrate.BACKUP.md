# Task

Your job is to determine the place to pick up work for a work item according to an execution workflow. It is possible that no work has been done, and it is possible that work is in-progress and should be resumed where it left off.

You will use the `assignment.json` file (located in the same directory as the `execute.md` workflow) to track the work item that is in progress. The assignment file path is: `{{assignment_path}}`. If this file does not exist, it means that no work has been done. If this file exists, it means that work MIGHT be in-progress, and you must assess where to pick up work from.

## Orchestration Workflow

1. Determine if the assignment file (`{{assignment_path}}`) exists. If it exists, determine if the work is truly in-progress or if it was already completed. Use the current git branch, git history (with the `git-operator` subagent), outstanding PR status, outstanding PR CI pipelines statuses, the task manager work item status (see instructions below), and other contextual clues to determine the current state.

### 2. IFF Work Is In Progress

If work is in progress, you should:

2.1. Read the execution workflow stored in `{{execute_path}}` and determine the next logical step for resuming work.

2.2. Write your decision (in detail) to the assignment file (`{{assignment_path}}`) in the `next_step` field (overwriting the existing `next_step` value).

### 3. IFF Work Is Not In Progress

If work is not in progress, you should:

3.1. Use the task manager (see instructions below) to pick the next most important work item to work on.

3.2. Set the status of the work item to `{{in_progress_status}}` in the task manager.

3.3. Read the execution workflow stored in `{{execute_path}}` and determine the first logical step for starting work.

3.4. Create (overwriting any existing) the assignment file at `{{assignment_path}}` with the following structure:
   
   ```json
   {
     "task_id": "<task-identifier>",
     "next_step": "<next_step>",
     "pull_request_url": null
   }
   ```

## Orchestration Workflow Diagram

```mermaid
flowchart TD
    A[Start] --> B{Does assignment.json exist?}

    B -->|No| C[Work Not In Progress]
    B -->|Yes| D{Assess work status}

    D -->|"Check git branch, history,<br/>PR status, CI pipelines,<br/>task manager status"| E{Is work truly in progress?}

    E -->|Yes| F[Work In Progress]
    E -->|No| C

    subgraph WIP ["Work In Progress Path"]
        F --> G[Read execution workflow<br/>from execute_path]
        G --> H[Determine next logical step<br/>for resuming work]
        H --> I[Write decision to<br/>assignment.json<br/>next_step field]
    end

    subgraph NWP ["Work Not In Progress Path"]
        C --> J[Use task manager to pick<br/>next most important work item]
        J --> K[Set work item status<br/>to '{{in_progress_status}}']
        K --> L[Read execution workflow<br/>from execute_path]
        L --> M[Determine first logical step<br/>for starting work]
        M --> N[Create assignment.json<br/>with task_id, next_step,<br/>pull_request_url]
    end

    I --> O[End: Ready to Execute]
    N --> O
```

{{!TASK_MANAGER_INSTRUCTIONS}}

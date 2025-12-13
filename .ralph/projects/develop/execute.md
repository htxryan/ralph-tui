# Development Workflow

**Trigger**: You are in develop mode with a task to implement

---

## CRITICAL CONSTRAINT

> **ONLY work with issues that have the `ralph` label.**
>
> - You MUST verify the issue has the `ralph` label before ANY action
> - NEVER read, modify, or interact with issues without the `ralph` label
> - If an assigned issue lacks the `ralph` label, STOP and EXIT immediately
> - This constraint applies to ALL operations: reading, commenting, status changes, etc.

---

## Status Flow

Use the "Ralph TUI" GitHub Project for tracking issue status.

```
Refined → In Progress → Done
```

- **Refined**: Issues that have been refined and are ready for development (source)
- **In Progress**: Issue currently being implemented (work-in-progress)
- **Done**: Issue completed with PR merged (complete)

## Path Overview

```mermaid
flowchart LR
    START([Start]) --> CHECK{Has 'ralph' label?}
    CHECK -->|No| ABORT([STOP - EXIT immediately])
    CHECK -->|Yes| orient

    subgraph orient[1. Orient]
        A1[Read docs]
        A2[Review git history]
        A1 --> A2
    end

    subgraph plan[2. Plan]
        B0[Move to In Progress]
        B1[Read issue]
        B2[Create todo list]
        B0 --> B1 --> B2
    end

    subgraph implement[3. Implement]
        C1[Create feature branch]
        C2[Build feature]
        C3[Run tests]
        C4[Manual testing]
        C1 --> C2 --> C3 --> C4
    end

    subgraph submit[4. Submit]
        D1[Create PR]
        D2[Fix CI failures]
        D3[Merge to {{target_branch}}]
        D1 --> D2 --> D3
    end

    subgraph validate[5. Validate]
        E1[Monitor CD]
        E2[Verify deployment]
        E1 --> E2
    end

    subgraph close[6. Close]
        F1[Move to Done]
        F2[Pull latest {{target_branch}}]
        F1 --> F2
    end

    orient --> plan --> implement --> submit --> validate --> close --> FINISH([EXIT])

    style orient fill:#e1f5fe,stroke:#01579b
    style plan fill:#fff3e0,stroke:#e65100
    style implement fill:#e8f5e9,stroke:#2e7d32
    style submit fill:#fce4ec,stroke:#880e4f
    style validate fill:#f3e5f5,stroke:#4a148c
    style close fill:#fff8e1,stroke:#ff8f00
    style ABORT fill:#ffcdd2,stroke:#b71c1c
    style CHECK fill:#fff9c4,stroke:#f57f17
    style FINISH fill:#c8e6c9,stroke:#2e7d32
```

## Steps

### 0. Verify Label (MANDATORY)

0.1. **Verify `ralph` Label**
   - Check that the assigned issue has the `ralph` label
   - If the label is NOT present: **STOP immediately and EXIT**
   - Do NOT proceed with any other steps if the label is missing
   - This check is non-negotiable and must be performed first

### 1. Orient

Get your bearings and understand the project.

1.1. Read `./README.md`

1.2. Read {{docs}}

1.3. Review recent git history using the `git-operator` subagent to understand what's been done

### 2. Plan

2.1. **Move to In Progress Status**
   - Update the issue status from "Refined" to "In Progress"
   - This signals that development work has begun
   - **Do NOT remove the `ralph` label** - it must remain on the issue

2.2. Read the issue you have been assigned

2.3. Create a todo list of the steps you need to take to complete the issue

### 3. Implement

Build the feature or fix.

3.1. Create a feature branch from `{{target_branch}}`

3.2. Implement your plan to completion

3.3. Ensure all tests pass

3.4. Manually test the application in a web browser using the Chrome DevTools MCP tools

### 4. Submit

Get your work merged.

4.1. Create a Pull Request using the `github-operator` subagent

4.2. Monitor CI pipelines; fix any failures

4.3. When all CI pipelines pass, merge the PR into `{{target_branch}}`

### 5. Validate

Confirm successful deployment.

5.1. Monitor CD pipelines for the `{{target_branch}}` branch

5.2. Verify the app is successfully deployed to the dev environment on Vercel

### 6. Close

Wrap up the task.

6.1. **Move to Done Status**
   - Update the issue status from "In Progress" to "Done"
   - This signals the issue is complete with PR merged
   - **Do NOT remove the `ralph` label** - it must remain on the issue

6.2. Checkout `{{target_branch}}` and pull the latest changes

6.3. EXIT

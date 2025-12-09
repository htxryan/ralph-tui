# Task

Your job is to complete the implementation of the MVP of the Background Assassins web application.

## Workflow

### 1. Orient

Get your bearings and understand the project.

1.1. Read `./README.md`

1.2. Read {{docs}}

1.3. Review recent git history using the `git-operator` subagent to understand what's been done

### 2. Plan

2.1. Update the task's status to "in_progress"

2.2. Read the issue you have been assigned.

2.3. Create a todo list of the steps you need to take to complete the issue.

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

6.1. Update the task's status to "closed" with reason "finished"

6.2. Checkout `{{target_branch}}` and pull the latest changes

---

```mermaid
flowchart LR
    subgraph orient[1. Orient]
        A1[Read docs]
        A2[Review git history]
        A1 --> A2
    end

    subgraph plan[2. Plan]
        B1[Mark in_progress]
        B2[Read issue]
        B3[Create todo list]
        B1 --> B2 --> B3
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
        F1[Close task]
        F2[Pull latest {{target_branch}}]
        F1 --> F2
    end

    orient --> plan --> implement --> submit --> validate --> close

    style orient fill:#e1f5fe,stroke:#01579b
    style plan fill:#fff3e0,stroke:#e65100
    style implement fill:#e8f5e9,stroke:#2e7d32
    style submit fill:#fce4ec,stroke:#880e4f
    style validate fill:#f3e5f5,stroke:#4a148c
    style close fill:#fff8e1,stroke:#ff8f00
```

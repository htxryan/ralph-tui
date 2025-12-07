---
name: New Work
condition: |
  You are on the develop branch AND all of the following are true:
  - There are NO unmerged PRs with failing pipelines
  - The CD pipeline for develop is passing (app is deployed successfully)
  - There are NO tasks with status "in_progress" (no existing work to resume)

  This is the "clean slate" workflow - all blockers are resolved and you're ready to
  start fresh work.

  Decision tree path: START → On develop branch? YES → Unmerged PRs with failing pipelines? NO →
  CD pipeline status? PASSING → Any tasks in_progress? NO
description: |
  Plan and implement the next feature, change, or fix from scratch.

  Review the product brief and relevant documentation, pick the next most important feature
  or fix to implement, create an implementation plan, update the task status to "in_progress",
  implement with tests and manual browser testing, create a Pull Request, verify CI pipelines
  pass for your specific PR, merge the PR, validate CD pipelines succeed and the app deploys
  to the dev environment, close the task with status "finished", then checkout develop and
  pull latest changes.
priority: 6
goal: Start new feature/fix
---

# New Work

**Trigger**: You are on the develop branch with no in_progress issues and all pipelines passing

## Path Overview

```mermaid
flowchart TD
    subgraph orientation[1. Orientation]
        A1[1.1 Read README]
        A2[1.2 Read product-brief]
        A3[1.3 Check current branch]
        A4[1.4 Review git history]
        A5[1.5 Read ./.ai-docs/prompts/PLANS.md]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    A5 --> B{On develop branch?}
    B -->|Yes| D1{Any unmerged PRs targeting develop?}
    D1 -->|No or passing| E1{Latest CD pipeline succeeded?}
    E1 -->|Yes| F1{Any tasks in_progress?}
    F1 -->|No| C1

    subgraph newWork[3. Plan New Work]
        C1[3.1 Review product brief and game rules]
        C2[3.2 Pick next feature, create plan]
        C3[3.3 Update issue status to in_progress]
    end

    C3 --> D1a

    subgraph implementation[4. Implementation]
        D1a[4.1 Implement with tests & manual browser testing]
        D2[4.2 Create Pull Request]
        D3[4.3 Verify CI for THIS SPECIFIC PR]
        D4[4.4 Merge PR after verification]
        D5[4.5 Validate CD and deployment]
        D6[4.6 Close task with reason finished]
        D7[4.7 Checkout develop and pull]
        D1a --> D2 --> D3 --> D4 --> D5 --> D6 --> D7
    end

    D7 --> FINISH([5. EXIT])

    style orientation fill:#e1f5fe,stroke:#01579b
    style newWork fill:#fff8e1,stroke:#ff8f00
    style implementation fill:#e8f5e9,stroke:#2e7d32
    style FINISH fill:#ffebee,stroke:#c62828
```

## Steps

### 1. Orientation (Always First)

1.1. Read `./README.md`

1.2. Read `./.ai-docs/design/product-brief.md`

1.3. Check the branch you have checked out currently

1.4. Review git history

1.5. Read `././.ai-docs/prompts/PLANS.md` to understand the planning for this project.

### 2. Verify Conditions

2.1. Confirm you ARE in the `develop` branch

2.2. Verify there are no failing PR pipelines

2.3. Verify the CD pipeline for develop is passing

2.4. Verify there are NO tasks with status "in_progress"

### 3. Plan New Work

3.1. Review the product brief in `./.ai-docs/design/product-brief.md` and the game rules in `./.ai-docs/design/game-rules.md` to understand the product and the game rules.

3.2. Pick a next most important feature, change, or fix to implement. Use `./.ai-docs/prompts/PLANS.md` to create a new implementation plan for your chosen task.

3.3. Update your issue's status to "in_progress" if it has not already been updated.

### 4. Implementation

4.1. Implement your plan to completion. All tests should be passing, and you should have manually tested the application in a web browser using the Chrome DevTools MCP tools.

4.2. Create a Pull Request (using the `github-operator` subagent) for your work.

4.3. **Verify CI pipelines have passed FOR YOUR SPECIFIC PR**:

   ⚠️ **CRITICAL**: You must verify that the CI results belong to YOUR PR, not a different PR from the same branch.

   Use the `github-operator` subagent with explicit instructions to follow the **PR Merge Validation Protocol**:
   - Check `gh pr view <your-pr-number> --json number,headRefName,statusCheckRollup`
   - Verify `gh pr checks <your-pr-number>` shows ALL checks passing
   - Cross-validate that any CI run IDs belong to YOUR PR number (not a different PR)

   **DO NOT** merge if:
   - Any check is failing, pending, or skipped
   - The CI run output references a different PR number than the one you're merging

4.4. **Merge PR** using the `github-operator` subagent only AFTER completing 4.3 verification.

4.5. Validate that all CD pipelines run successfully after your PR is merged, and that the app is successfully deployed to Vercel (`develop` will deploy to the dev environment).

4.6. Update your task's status to "closed" with a reason of "finished".

4.7. Checkout `develop` locally and pull the latest changes from `develop`.

### 5. Exit

EXIT.

# Resume In-Progress Work

**Trigger**: You are on the develop branch and there are `bd` issues with status "in_progress"

## Path Overview

```mermaid
flowchart TD
    subgraph orientation[1. Orientation]
        A1[1.1 Read README]
        A2[1.2 Read product-brief]
        A3[1.3 Check current branch]
        A4[1.4 Review git history]
        A5[1.5 Read specs/PLANS.md]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    A5 --> B{On develop branch?}
    B -->|Yes| D1{Any unmerged PRs targeting develop?}
    D1 -->|No or passing| E1{Latest CD pipeline succeeded?}
    E1 -->|Yes| F1{Any bd issues in_progress?}
    F1 -->|Yes| F2[3.1 Pick first highest priority in_progress issue]
    F2 --> C1

    subgraph implementation[4. Implementation]
        C1[4.1 Implement with tests & manual browser testing]
        C2[4.2 Create Pull Request]
        C3[4.3 Verify CI for THIS SPECIFIC PR]
        C4[4.4 Merge PR after verification]
        C5[4.5 Validate CD and deployment]
        C6[4.6 Close bd issue with reason finished]
        C7[4.7 Checkout develop and pull]
        C1 --> C2 --> C3 --> C4 --> C5 --> C6 --> C7
    end

    C7 --> FINISH([5. EXIT])

    style orientation fill:#e1f5fe,stroke:#01579b
    style implementation fill:#e8f5e9,stroke:#2e7d32
    style FINISH fill:#ffebee,stroke:#c62828
```

## Steps

### 1. Orientation (Always First)

1.1. Read `./README.md`

1.2. Read `./.ai-docs/design/product-brief.md`

1.3. Check the branch you have checked out currently

1.4. Review git history

1.5. Read `./specs/PLANS.md` to understand the planning for this project.

### 2. Verify Conditions

2.1. Confirm you ARE in the `develop` branch

2.2. Verify there are no failing PR pipelines

2.3. Verify the CD pipeline for develop is passing

### 3. Find In-Progress Issue

3.1. Check for `bd` issues with a status of "in_progress".

3.2. Pick the first highest priority issue you find that has a status of "in_progress". This is now the issue you're working on.

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

4.6. Update your `bd` issue's status to "closed" with a reason of "finished", and push that change (this will NOT trigger a new CI pipeline run).

4.7. Checkout `develop` locally and pull the latest changes from `develop`.

### 5. Exit

EXIT.

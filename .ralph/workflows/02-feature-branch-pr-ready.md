# Feature Branch - PR Ready to Merge

**Trigger**: You are on a feature/bugfix branch with complete work and an existing unmerged Pull Request

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
    B -->|No| B1[2.1 Review git history & specs docs]
    B1 --> B2{Work status?}
    B2 -->|Complete with unmerged PR| C1

    subgraph mergePhase[3. Merge & Validate]
        C1[3.1 Verify CI for THIS SPECIFIC PR]
        C2[3.2 Merge PR after verification]
        C3[3.3 Validate CD and deployment]
        C4[3.4 Close task with reason finished]
        C5[3.5 Checkout develop and pull]
        C1 --> C2 --> C3 --> C4 --> C5
    end

    C5 --> FINISH([4. EXIT])

    style orientation fill:#e1f5fe,stroke:#01579b
    style mergePhase fill:#e8f5e9,stroke:#2e7d32
    style FINISH fill:#ffebee,stroke:#c62828
```

## Steps

### 1. Orientation (Always First)

1.1. Read `./README.md`

1.2. Read `./.ai-docs/design/product-brief.md`

1.3. Check the branch you have checked out currently

1.4. Review git history

1.5. Read `././.ai-docs/prompts/PLANS.md` to understand the planning for this project.

### 2. Feature Branch Assessment

2.1. Look through recent git history and the relevant document(s) in `./specs/background-assassins/` to understand the status of your current work item.

2.2. Confirm work is complete and there is an existing Pull Request created but NOT merged.

### 3. Merge and Validate

3.1. **Verify CI pipelines have passed FOR YOUR SPECIFIC PR**:

   ⚠️ **CRITICAL**: You must verify that the CI results belong to YOUR PR, not a different PR from the same branch.

   Use the `github-operator` subagent with explicit instructions to:
   - Check `gh pr view <your-pr-number> --json number,headRefName,statusCheckRollup`
   - Verify `gh pr checks <your-pr-number>` shows ALL checks passing
   - Cross-validate that any CI run IDs belong to YOUR PR number (not a different PR)

   **DO NOT** merge if:
   - Any check is failing, pending, or skipped
   - The CI run output references a different PR number than the one you're merging

3.2. **Merge PR** using the `github-operator` subagent only AFTER completing 3.1 verification.

3.3. Validate that all CD pipelines run successfully after your PR is merged, and that the app is successfully deployed to Vercel (`develop` will deploy to the dev environment).

3.4. Update your task's status to "closed" with a reason of "finished".

3.5. Checkout `develop` locally and pull the latest changes from `develop`.

### 4. Exit

EXIT.

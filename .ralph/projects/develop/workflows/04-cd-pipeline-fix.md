---
name: CD Pipeline Fix
condition: |
  You are on the develop branch AND all of the following are true:
  - There are NO unmerged PRs with failing pipelines (or no unmerged PRs at all)
  - The CD (Continuous Deployment) pipeline for the develop branch has failed
  - The application is not successfully deployed to the dev environment

  This workflow takes priority over in-progress tasks or new work because a failing
  deployment blocks validation of any completed work.

  Decision tree path: START → On develop branch? YES → Unmerged PRs with failing pipelines? NO →
  CD pipeline status? FAILED
description: |
  PRIME DIRECTIVE: Fix the CD pipeline so that the application will be deployed.

  Diagnose why the CD pipeline failed, implement the necessary fixes, wait for the pipeline
  to re-run, and verify that the dev environment is successfully deployed. Only proceed to
  other work after deployment is confirmed working.
priority: 4
goal: Fix deployment pipeline
---

# CD Pipeline Fix

**Trigger**: You are on the develop branch and the CD pipeline for develop has failed

**Prime Directive**: Fix the pipeline so that the application will be deployed

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
    D1 -->|No| E1
    D1 -->|Yes, but passing| E1

    subgraph cdCheck[3. CD Pipeline Check]
        E1{Latest CD pipeline for develop succeeded?}
        E2[3.1 Wait if still running]
        E3[3.2 Fix CD pipeline until Dev environment deploys]
        E1 -->|Running| E2
        E2 --> E1
        E1 -->|Failed| E3
    end

    E3 --> FINISH([4. EXIT])

    style orientation fill:#e1f5fe,stroke:#01579b
    style cdCheck fill:#f3e5f5,stroke:#4a148c
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

2.2. Verify there are NO unmerged and open PRs targeting develop (or they all have passing pipelines)

### 3. Check and Fix CD Pipeline

3.1. Verify that the latest CD pipeline targeting the `develop` branch has succeeded.

3.2. If the latest CD pipeline is still running, **wait for it to finish**.

3.3. If the CD pipeline has **failed**, your **PRIME DIRECTIVE** is to fix the pipeline so that the application will be deployed.

3.4. Once the Dev environment is successfully deployed, proceed to exit.

### 4. Exit

EXIT.

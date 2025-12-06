# Workflow Index

Quick reference for selecting the appropriate workflow based on current conditions.

## Decision Matrix

| Condition | Workflow |
|-----------|----------|
| On feature/bugfix branch + work incomplete | [01-feature-branch-incomplete](./01-feature-branch-incomplete.md) |
| On feature/bugfix branch + PR exists but unmerged | [02-feature-branch-pr-ready](./02-feature-branch-pr-ready.md) |
| On develop + unmerged PR with failing CI/CD | [03-pr-pipeline-fix](./03-pr-pipeline-fix.md) |
| On develop + CD pipeline failed | [04-cd-pipeline-fix](./04-cd-pipeline-fix.md) |
| On develop + has in_progress bd issues | [05-resume-in-progress](./05-resume-in-progress.md) |
| On develop + no in_progress issues + all pipelines passing | [06-new-work](./06-new-work.md) |

## Decision Tree

```
START
│
├─ On feature/bugfix branch?
│  ├─ YES → Work status?
│  │        ├─ Incomplete/No PR → 01-feature-branch-incomplete
│  │        └─ Complete with unmerged PR → 02-feature-branch-pr-ready
│  │
│  └─ NO (on develop) → Any unmerged PRs targeting develop?
│           ├─ YES with failing pipelines → 03-pr-pipeline-fix
│           └─ NO or passing → CD pipeline status?
│                    ├─ Failed → 04-cd-pipeline-fix
│                    └─ Passing → Any bd issues in_progress?
│                             ├─ YES → 05-resume-in-progress
│                             └─ NO → 06-new-work
```

## Workflow Summaries

### 01-feature-branch-incomplete
**When**: On a feature/bugfix branch with incomplete work
**Goal**: Complete implementation, create PR, merge, validate deployment, close issue

### 02-feature-branch-pr-ready
**When**: On a feature/bugfix branch with an existing unmerged PR
**Goal**: Merge PR, validate deployment, close issue

### 03-pr-pipeline-fix
**When**: On develop with unmerged PRs that have failing CI/CD pipelines
**Goal**: Fix pipelines so PR can be merged (PRIME DIRECTIVE)

### 04-cd-pipeline-fix
**When**: On develop with failing CD pipeline
**Goal**: Fix CD pipeline so app deploys to dev environment (PRIME DIRECTIVE)

### 05-resume-in-progress
**When**: On develop with existing in_progress bd issues
**Goal**: Continue working on highest priority in_progress issue through completion

### 06-new-work
**When**: On develop with no blockers and no in_progress work
**Goal**: Plan and implement next feature/fix from scratch

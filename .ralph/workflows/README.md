# Workflow Paths

This directory contains the distinct workflow paths extracted from the main workflow in `../prompt.md`. Each file represents a complete path through the decision tree based on the initial conditions.

## Decision Tree Summary

```mermaid
flowchart TD
    START([Start]) --> ORI[1. Orientation]
    ORI --> DEV{On develop branch?}

    DEV -->|No| FB{Feature Branch Work Status?}
    FB -->|Incomplete/No PR| W1[01-feature-branch-incomplete]
    FB -->|Complete with PR| W2[02-feature-branch-pr-ready]

    DEV -->|Yes| PR{Unmerged PRs with failing pipelines?}
    PR -->|Yes, failing| W3[03-pr-pipeline-fix]
    PR -->|No/Passing| CD{CD pipeline status?}

    CD -->|Failed| W4[04-cd-pipeline-fix]
    CD -->|Passing| IP{In-progress tasks?}

    IP -->|Yes| W5[05-resume-in-progress]
    IP -->|No| W6[06-new-work]

    style W1 fill:#fff3e0,stroke:#e65100
    style W2 fill:#fff3e0,stroke:#e65100
    style W3 fill:#fce4ec,stroke:#880e4f
    style W4 fill:#f3e5f5,stroke:#4a148c
    style W5 fill:#fff8e1,stroke:#ff8f00
    style W6 fill:#e8f5e9,stroke:#2e7d32
```

## Workflow Files

| # | File | Trigger | Main Concern |
|---|------|---------|--------------|
| 01 | [feature-branch-incomplete](./01-feature-branch-incomplete.md) | On feature branch with incomplete work | Continue implementation |
| 02 | [feature-branch-pr-ready](./02-feature-branch-pr-ready.md) | On feature branch with complete work & unmerged PR | Merge PR |
| 03 | [pr-pipeline-fix](./03-pr-pipeline-fix.md) | On develop with failing PR pipelines | Fix CI/CD to unblock merge |
| 04 | [cd-pipeline-fix](./04-cd-pipeline-fix.md) | On develop with failing CD pipeline | Fix deployment |
| 05 | [resume-in-progress](./05-resume-in-progress.md) | On develop with in_progress tasks | Continue existing work |
| 06 | [new-work](./06-new-work.md) | On develop with nothing in progress | Start new feature/fix |

## Quick Reference

**If you're NOT on develop branch:**
- Incomplete work → [01-feature-branch-incomplete](./01-feature-branch-incomplete.md)
- Ready to merge → [02-feature-branch-pr-ready](./02-feature-branch-pr-ready.md)

**If you ARE on develop branch:**
- PR pipelines failing → [03-pr-pipeline-fix](./03-pr-pipeline-fix.md)
- CD pipeline failing → [04-cd-pipeline-fix](./04-cd-pipeline-fix.md)
- Has in_progress issues → [05-resume-in-progress](./05-resume-in-progress.md)
- Ready for new work → [06-new-work](./06-new-work.md)

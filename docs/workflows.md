# Workflows

Ralph uses workflow files to define decision-based execution paths for autonomous AI agents. Each workflow represents a distinct path through a decision tree based on the current state of the repository.

## Overview

Workflow files are stored in `.ralph/workflows/` and are selected based on conditions like:

- Current git branch (feature branch vs develop)
- PR status (exists, merged, CI passing/failing)
- CD pipeline status
- Task status in the task management system

## Workflow Files

| File | When Used |
|------|-----------|
| `01-feature-branch-incomplete.md` | On feature/bugfix branch with incomplete work |
| `02-feature-branch-pr-ready.md` | On feature/bugfix branch with existing unmerged PR |
| `03-pr-pipeline-fix.md` | On develop with failing PR pipelines |
| `04-cd-pipeline-fix.md` | On develop with failing CD pipeline |
| `05-resume-in-progress.md` | On develop with in_progress tasks |
| `06-new-work.md` | On develop with no blockers, ready for new work |

## Frontmatter Schema

Each workflow file uses YAML frontmatter to define metadata that can be parsed programmatically for workflow selection and display.

```yaml
---
name: Human-readable workflow name
condition: |
  Full description of when this workflow applies.
  Can be multi-line for complex conditions.
  Should include the decision tree path for clarity.
description: |
  Detailed explanation of what the workflow does.
  Describes the steps and expected outcomes.
  Can reference specific tools, subagents, or protocols.
priority: 1
goal: Concise one-liner objective
---
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the workflow, displayed in UI and logs |
| `condition` | string | Yes | Full trigger conditions describing when this workflow should be selected. Should include logical conditions (AND/OR), prerequisites, and optionally the decision tree path |
| `description` | string | Yes | Detailed explanation of workflow steps, expected outcomes, and any protocols to follow (e.g., PR validation). Can reference subagents and tools |
| `priority` | number | Yes | Numeric priority (1-6) for workflow selection when multiple conditions match. Lower numbers = higher priority |
| `goal` | string | Yes | Concise one-liner describing the primary objective (e.g., "Fix CI/CD to unblock merge") |

### Example

```yaml
---
name: PR Pipeline Fix
condition: |
  You are on the develop branch AND all of the following are true:
  - There are unmerged Pull Requests targeting the develop branch
  - One or more of these PRs have failing CI/CD pipelines

  This workflow takes priority over CD pipeline issues, in-progress tasks, or new work
  because failing PR pipelines block the merge process.

  Decision tree path: START → On develop branch? YES → Unmerged PRs with failing pipelines? YES
description: |
  PRIME DIRECTIVE: Fix the failing CI/CD pipeline(s) so that the PR can be merged.

  Identify the specific PR with failing pipelines, diagnose and fix the pipeline failures,
  wait for the new CI run to complete and verify it passed, perform mandatory PR validation
  to confirm the passing CI results belong to YOUR specific PR (not a different PR from the
  same branch), then merge the PR.
priority: 3
goal: Fix CI/CD to unblock merge
---
```

## Decision Tree

The workflow selection follows this decision tree:

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
│                    └─ Passing → Any tasks in_progress?
│                             ├─ YES → 05-resume-in-progress
│                             └─ NO → 06-new-work
```

## Parsing Frontmatter

Workflow frontmatter can be parsed programmatically using any YAML parser. In JavaScript/TypeScript:

```typescript
import { readFileSync } from 'fs';
import matter from 'gray-matter';

const file = readFileSync('.ralph/workflows/03-pr-pipeline-fix.md', 'utf-8');
const { data, content } = matter(file);

console.log(data.name);        // "PR Pipeline Fix"
console.log(data.condition);   // Full condition text
console.log(data.description); // Full description text
console.log(data.priority);    // 3
console.log(data.goal);        // "Fix CI/CD to unblock merge"
```

## Adding New Workflows

To add a new workflow:

1. Create a new markdown file in `.ralph/workflows/` with the naming convention `NN-descriptive-name.md`
2. Add YAML frontmatter with all required fields (`name`, `condition`, `description`, `priority`, `goal`)
3. Document the trigger conditions clearly in `condition`
4. Write the step-by-step instructions in the markdown body
5. Update the decision tree if adding a new branch point

# Task Planning with bd (beads)

This document describes how to plan and execute work using `bd` (beads), the project's issue tracking system. All task management happens through bd issues rather than markdown files on disk. This approach keeps plans version-controlled alongside code, enables dependency tracking, and prevents stale documentation from accumulating.

## Philosophy

Every piece of work should be tracked in bd. The issue description serves as the execution plan—a self-contained document that enables any agent or contributor to complete the work without prior context. Think of bd issues as living documents that evolve as work progresses.

## When to Create Issues

Create a bd issue when:
- Starting any non-trivial feature, bug fix, or task
- Breaking down a large piece of work into smaller steps
- Discovering new work while implementing something else (use `discovered-from` dependency)
- Capturing ideas or requirements for future work

Do NOT create issues for:
- Trivial one-line fixes that can be completed immediately
- Pure research or exploration (unless it will inform future work)

## Issue Structure

Every bd issue should contain a well-structured description. The description is the plan—treat it as a self-contained document that enables a novice to complete the work.

### Required Elements for Non-Trivial Issues

**Purpose (required)**: In 2-3 sentences, explain what someone gains after this change and how they can see it working. State the user-visible behavior you will enable. Begin with "After this change..." to focus on outcomes.

**Context (required for complex work)**: Describe the current state relevant to this task. Name key files and modules by full path. Define any non-obvious terms. Do not refer to prior issues without summarizing the relevant context.

**Plan of Work (required)**: Describe the sequence of edits and additions. For each edit, name the file and location (function, module) and what to change. Keep it concrete and minimal.

**Validation (required)**: Describe how to verify the work is complete. Phrase acceptance as observable behavior: "after starting the server, navigating to /health returns HTTP 200" rather than "added a HealthCheck struct."

**Dependencies (when applicable)**: Use bd's dependency system to express blockers and relationships. Create child issues for milestones if the work is large.

### Example Issue Description

```
After this change, players will receive haptic feedback on mobile devices when
eliminations occur, making the game more engaging on phones and tablets.

## Context
The app already has a sound notification system in `/lib/services/sound-service.ts`
that triggers on game events. Haptic feedback will follow the same pattern, using
the Navigator.vibrate() API available in modern mobile browsers.

## Plan
1. Create `/lib/services/haptic-service.ts` with a singleton HapticService class
2. Add haptic triggers to GameStateProvider alongside existing sound triggers
3. Add haptic toggle to NotificationControls component
4. Store preference in localStorage (key: 'haptic-enabled')

## Validation
- On mobile Chrome/Safari, eliminations produce a short vibration
- Toggle in settings enables/disables haptic feedback
- Preference persists across page reloads
- No errors on desktop browsers (graceful degradation)
```

## Working with bd

### Creating Issues

```bash
# Simple issue
bd create --title="Add haptic feedback for eliminations" --type=feature --priority=3

# With description (preferred for non-trivial work)
bd create --title="Add haptic feedback for eliminations" --type=feature --priority=2 \
  --description="After this change, players receive haptic feedback on mobile..."

# Discovered while working on another issue
bd create --title="Fix vibration API compatibility" --type=bug --priority=1 \
  --deps discovered-from:bd-xyz
```

### Issue Types
- `feature` - New user-facing functionality
- `bug` - Something broken that needs fixing
- `task` - Technical work (refactoring, tests, docs, infrastructure)
- `epic` - Large feature broken into subtasks (use dependencies to link)
- `chore` - Maintenance (dependency updates, tooling)

### Priorities
- `0` - Critical (security issues, data loss, broken builds)
- `1` - High (major features, blocking bugs)
- `2` - Medium (standard work, default priority)
- `3` - Low (polish, optimization, nice-to-have)
- `4` - Backlog (future ideas, not yet scheduled)

### Workflow

```bash
# Find work to do
bd ready                    # Show unblocked issues
bd list --status=open       # All open issues

# Claim and start work
bd update bd-xyz --status=in_progress

# Update description as you work (add discoveries, refine plan)
bd update bd-xyz --description="Updated plan with new findings..."

# Complete work
bd close bd-xyz --reason="Implemented and tested"

# If blocked, create the blocking issue and link it
bd create --title="Blocking issue" --type=bug
bd dep bd-new bd-xyz        # new blocks xyz
```

## Writing Good Plans

### Self-Containment

The issue description must be fully self-contained. A novice with only the issue and the current codebase should be able to complete the work. Do not say "as discussed" or "per the architecture doc"—include the relevant context directly.

### Observable Outcomes

Anchor every plan with observable outcomes. State what the user can do after implementation, the commands to run, and the outputs they should see. Acceptance criteria should be behavior a human can verify, not internal implementation details.

### Explicit Context

Name files with full repository-relative paths. Name functions and modules precisely. When touching multiple areas, include a brief orientation explaining how they fit together. When running commands, show the working directory and exact command line.

### Idempotence

Write steps so they can be run multiple times without causing damage. If a step can fail halfway, describe how to retry. Prefer additive, testable changes that can be validated incrementally.

## Milestones and Large Work

For large features, create an epic issue and break work into milestone issues linked via dependencies:

```bash
# Create epic
bd create --title="Implement real-time activity feed" --type=epic --priority=2

# Create milestones
bd create --title="Add GameEvent model and migration" --type=task
bd create --title="Create events API endpoint" --type=task
bd create --title="Build ActivityFeed component" --type=task
bd create --title="Integrate feed into game views" --type=task

# Link dependencies (each milestone blocks the epic)
bd dep bd-milestone1 bd-epic
bd dep bd-milestone2 bd-epic
# Or chain milestones if sequential
bd dep bd-milestone1 bd-milestone2  # milestone1 blocks milestone2
```

Each milestone should be independently verifiable and incrementally implement the overall goal.

## Discoveries and Decisions

When you discover unexpected behavior, performance issues, or make design decisions during implementation:

1. Update the issue description with your findings
2. For significant discoveries, consider creating a memory file: `bd write-memory "discovery-name" "What we learned..."`
3. If the discovery changes the plan substantially, document both what changed and why

## Prototyping

For work with significant unknowns, create explicit prototyping issues:

```bash
bd create --title="[SPIKE] Evaluate WebSocket vs SSE for real-time updates" \
  --type=task --priority=2 \
  --description="Prototype both approaches and measure performance..."
```

Label spikes clearly. Document findings in the issue before closing. The spike's outcome should inform the actual implementation issue.

## Closing Issues

When closing an issue, include a brief summary of what was accomplished:

```bash
bd close bd-xyz --reason="Implemented haptic feedback with Navigator.vibrate() API.
Added toggle to settings. Tested on iOS Safari and Android Chrome."
```

If work remains or follow-up is needed, create new issues before closing:

```bash
bd create --title="Add haptic feedback intensity settings" --type=feature --priority=4 \
  --deps discovered-from:bd-xyz
bd close bd-xyz --reason="Core feature complete. Created bd-abc for intensity settings."
```

## Summary

- Use bd for ALL task tracking—no markdown TODO files
- Issue descriptions ARE the execution plans
- Keep descriptions self-contained and outcome-focused
- Update issues as work progresses (living documents)
- Use dependencies to express relationships and blockers
- Close issues with meaningful summaries
- Create new issues for discovered work

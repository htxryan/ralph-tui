# Task Planning with Vibe Kanban

This document describes how to plan and execute work using Vibe Kanban MCP, the project's task tracking system. All task management happens through tasks rather than markdown files on disk. This approach keeps plans version-controlled alongside code, enables dependency tracking, and prevents stale documentation from accumulating.

## Philosophy

Every piece of work should be tracked in Vibe Kanban. The task description serves as the execution plan—a self-contained document that enables any agent or contributor to complete the work without prior context. Think of tasks as living documents that evolve as work progresses.

## When to Create Tasks

Create a task when:
- Starting any non-trivial feature, bug fix, or task
- Breaking down a large piece of work into smaller steps
- Discovering new work while implementing something else
- Capturing ideas or requirements for future work

Do NOT create tasks for:
- Trivial one-line fixes that can be completed immediately
- Pure research or exploration (unless it will inform future work)

## Task Structure

Every task should contain a well-structured description. The description is the plan—treat it as a self-contained document that enables a novice to complete the work.

### Required Elements for Non-Trivial Tasks

**Purpose (required)**: In 2-3 sentences, explain what someone gains after this change and how they can see it working. State the user-visible behavior you will enable. Begin with "After this change..." to focus on outcomes.

**Context (required for complex work)**: Describe the current state relevant to this task. Name key files and modules by full path. Define any non-obvious terms. Do not refer to prior tasks without summarizing the relevant context.

**Plan of Work (required)**: Describe the sequence of edits and additions. For each edit, name the file and location (function, module) and what to change. Keep it concrete and minimal.

**Validation (required)**: Describe how to verify the work is complete. Phrase acceptance as observable behavior: "after starting the server, navigating to /health returns HTTP 200" rather than "added a HealthCheck struct."

### Example Task Description

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

## Working with Vibe Kanban MCP

Vibe Kanban is accessed through MCP (Model Context Protocol) tools. The following operations are available:

### Listing Projects and Tasks

```
# List all available projects
mcp__vibe_kanban__list_projects

# List all tasks in a project
mcp__vibe_kanban__list_tasks(project_id=<uuid>)

# List tasks with status filter
mcp__vibe_kanban__list_tasks(project_id=<uuid>, status="todo")
mcp__vibe_kanban__list_tasks(project_id=<uuid>, status="inprogress")
mcp__vibe_kanban__list_tasks(project_id=<uuid>, status="done")
```

### Creating Tasks

```
# Create a new task
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Add haptic feedback for eliminations",
    description="After this change, players receive haptic feedback on mobile..."
)
```

### Task Workflow

```
# Get detailed task information
mcp__vibe_kanban__get_task(task_id=<uuid>)

# Start working on a task
mcp__vibe_kanban__start_task_attempt(
    task_id=<uuid>,
    executor="CLAUDE_CODE",
    base_branch="main"
)

# Update task status
mcp__vibe_kanban__update_task(task_id=<uuid>, status="inprogress")
mcp__vibe_kanban__update_task(task_id=<uuid>, status="done")

# Update task description as you work
mcp__vibe_kanban__update_task(
    task_id=<uuid>,
    description="Updated plan with new findings..."
)
```

### Task Statuses
- `todo` - Not yet started
- `inprogress` - Currently being worked on
- `inreview` - Work complete, awaiting review
- `done` - Completed
- `cancelled` - No longer needed

## Writing Good Plans

### Self-Containment

The task description must be fully self-contained. A novice with only the task and the current codebase should be able to complete the work. Do not say "as discussed" or "per the architecture doc"—include the relevant context directly.

### Observable Outcomes

Anchor every plan with observable outcomes. State what the user can do after implementation, the commands to run, and the outputs they should see. Acceptance criteria should be behavior a human can verify, not internal implementation details.

### Explicit Context

Name files with full repository-relative paths. Name functions and modules precisely. When touching multiple areas, include a brief orientation explaining how they fit together. When running commands, show the working directory and exact command line.

### Idempotence

Write steps so they can be run multiple times without causing damage. If a step can fail halfway, describe how to retry. Prefer additive, testable changes that can be validated incrementally.

## Milestones and Large Work

For large features, create a parent task and break work into milestone tasks:

```
# Create parent feature task
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Implement real-time activity feed",
    description="Epic: Complete activity feed system with API and UI"
)

# Create milestone tasks
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Add GameEvent model and migration"
)

mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Create events API endpoint"
)

mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Build ActivityFeed component"
)

mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Integrate feed into game views"
)
```

Each milestone should be independently verifiable and incrementally implement the overall goal.

## Discoveries and Decisions

When you discover unexpected behavior, performance issues, or make design decisions during implementation:

1. Update the task description with your findings
2. If the discovery changes the plan substantially, document both what changed and why
3. Consider creating new tasks for significant discovered work

## Prototyping

For work with significant unknowns, create explicit prototyping tasks:

```
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="[SPIKE] Evaluate WebSocket vs SSE for real-time updates",
    description="Prototype both approaches and measure performance..."
)
```

Label spikes clearly. Document findings in the task before completing. The spike's outcome should inform the actual implementation task.

## Completing Tasks

When completing a task, update it with a brief summary of what was accomplished:

```
mcp__vibe_kanban__update_task(
    task_id=<uuid>,
    status="done",
    description="Original description...\n\n## Completion Notes\nImplemented haptic feedback with Navigator.vibrate() API. Added toggle to settings. Tested on iOS Safari and Android Chrome."
)
```

If follow-up work is needed, create new tasks before marking complete:

```
# Create follow-up task
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Add haptic feedback intensity settings",
    description="Follow-up from haptic feedback implementation..."
)

# Mark original task done
mcp__vibe_kanban__update_task(task_id=<uuid>, status="done")
```

## Summary

- Use Vibe Kanban MCP for ALL task tracking—no markdown TODO files
- Task descriptions ARE the execution plans
- Keep descriptions self-contained and outcome-focused
- Update tasks as work progresses (living documents)
- Complete tasks with meaningful summaries
- Create new tasks for discovered work

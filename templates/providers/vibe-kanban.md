## Task Manager: Vibe Kanban

Use the Vibe Kanban MCP tools for all task management operations.

### Commands Reference

| Operation | Command |
|-----------|---------|
| List Projects | `mcp__vibe_kanban__list_projects()` |
| List Tasks | `mcp__vibe_kanban__list_tasks(project_id=<uuid>, status="todo"\|"inprogress"\|"done")` |
| Get Task | `mcp__vibe_kanban__get_task(task_id=<uuid>)` |
| Create Task | `mcp__vibe_kanban__create_task(project_id=<uuid>, title="...", description="...")` |
| Update Task | `mcp__vibe_kanban__update_task(task_id=<uuid>, status="todo"\|"inprogress"\|"inreview"\|"done"\|"cancelled")` |

### Project Discovery

Call `mcp__vibe_kanban__list_projects()` and find the project matching this git repository path. Note the `project_id` for subsequent operations.

### Status Values

- `todo` - Task is ready to be worked on
- `inprogress` - Task is currently being worked on
- `inreview` - Task is complete and awaiting review
- `done` - Task is complete
- `cancelled` - Task was cancelled

### Task ID Format

Vibe Kanban uses UUIDs for task IDs (e.g., `"ac7f8755-3ba5-4aaf-a514-8aef29b7d447"`).

### Checking for In-Progress Tasks

```
mcp__vibe_kanban__list_tasks(project_id=<uuid>, status="inprogress")
```

### Creating a New Task

```
mcp__vibe_kanban__create_task(
    project_id=<uuid>,
    title="Task title here",
    description="Optional description"
)
```
Then update status to in-progress:
```
mcp__vibe_kanban__update_task(task_id=<uuid>, status="inprogress")
```

### Closing a Task

```
mcp__vibe_kanban__update_task(task_id=<uuid>, status="done")
```

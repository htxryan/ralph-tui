## Task Manager: GitHub Issues

Use the `gh` CLI for all task management operations. Issues are filtered by the label specified in `.ralph/settings.json` under `task_management.provider_config.label_filter` (default: `"ralph"`).

### Commands Reference

| Operation | Command |
|-----------|---------|
| List Issues | `gh issue list --state open --label "<label>" --json number,title,state,labels` |
| Get Issue | `gh issue view <number> --json number,title,body,state,labels` |
| Create Issue | `gh issue create --title "..." --body "..." --label "<label>"` |
| Close Issue | `gh issue close <number>` |
| Reopen Issue | `gh issue reopen <number>` |
| Add Comment | `gh issue comment <number> --body "..."` |
| Add Label | `gh issue edit <number> --add-label "<label>"` |
| Remove Label | `gh issue edit <number> --remove-label "<label>"` |

### Repository Discovery

The `gh` CLI auto-detects the repository from the git remote. If `task_management.provider_config.github_repo` is set in settings.json, use that `owner/repo` explicitly with `--repo owner/repo`.

### Status Mapping

GitHub Issues has simpler states than other task managers:

| Logical Status | GitHub State | How to Identify/Set |
|----------------|--------------|---------------------|
| `todo` | open | Open issues without "in-progress" label |
| `inprogress` | open | Add "in-progress" label: `gh issue edit <n> --add-label "in-progress"` |
| `done` | closed | Close the issue: `gh issue close <n>` |

### Task ID Format

GitHub Issues uses issue numbers as strings (e.g., `"42"`).

### Checking for In-Progress Tasks

```bash
gh issue list --state open --label "<label>" --label "in-progress" --json number,title,state,labels
```

If no "in-progress" label convention is used, check open issues and infer status from context.

### Creating a New Task

```bash
gh issue create --title "Task title here" --body "Description" --label "<label>"
```

To mark as in-progress:
```bash
gh issue edit <number> --add-label "in-progress"
```

### Closing a Task

```bash
gh issue close <number>
```

Optionally add a completion comment:
```bash
gh issue comment <number> --body "Completed via Ralph automation"
gh issue close <number>
```

### Label Configuration

The default label filter is `"ralph"`. To use all issues without filtering, set `label_filter` to `null` or `""` in settings.json:

```json
{
  "task_management": {
    "provider": "github-issues",
    "provider_config": {
      "label_filter": null
    }
  }
}
```

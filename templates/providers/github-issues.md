## Task Manager: GitHub Issues

Use the `gh` CLI for all task management operations. Issues are filtered by the label specified in `.ralph/settings.json` under `task_management.provider_config.label_filter` (default: `"ralph"`).

> ⚠️ **IMPORTANT**: This section provides GENERIC commands. Your execution workflow may define additional filtering requirements (e.g., GitHub Project column status). Always check the execution workflow first and use its filtering criteria.

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

---

## GitHub Projects Integration

> **When to use this section**: If the execution workflow defines statuses using GitHub Project columns (e.g., "Idea", "Refining", "Refined"), you MUST use these commands instead of or in addition to the basic `gh issue list` commands above.

### Why This Matters

`gh issue list` only filters by:
- Open/closed state
- Labels

It does NOT filter by GitHub Project column status. If your workflow uses project columns for status tracking, you need to query the project directly.

### Discovering the Project

```bash
# List projects for the repository owner
gh project list --owner "$(gh repo view --json owner -q .owner.login)" --format json

# This returns project numbers and titles
```

### Listing Items by Project Status

```bash
# Get all items in a project (replace PROJECT_NUMBER with the actual number)
gh project item-list <PROJECT_NUMBER> --owner "<OWNER>" --format json

# Filter by status using jq
gh project item-list <PROJECT_NUMBER> --owner "<OWNER>" --format json | \
  jq -r '.items[] | select(.status == "<STATUS_NAME>") | .content.number'
```

### Common Patterns

**Find issues in a specific project column:**
```bash
# Example: Find issues in "Idea" status
gh project item-list 3 --owner "htxryan" --format json | \
  jq -r '.items[] | select(.status == "Idea") | "\(.content.number) - \(.content.title)"'
```

**Find issues with a specific label AND in a specific project status:**
```bash
# Get issues in "Idea" status, then verify they have the required label
gh project item-list 3 --owner "htxryan" --format json | \
  jq -r '.items[] | select(.status == "Idea") | select(.labels[]?.name == "ralph") | .content.number'
```

**Get full issue details after finding the number:**
```bash
gh issue view <NUMBER> --json number,title,body,state,labels,projectItems
```

### Updating Project Item Status

To move an issue to a different column in a GitHub Project:

```bash
# First, get the project field ID for "Status" and the option ID for the target status
gh project field-list <PROJECT_NUMBER> --owner "<OWNER>" --format json

# Then update the item (requires the item ID from project item-list)
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <FIELD_ID> --single-select-option-id <OPTION_ID>
```

### Important Notes

1. **Project numbers are NOT issue numbers**: A project might be number 3, while issues are numbered 20, 21, etc.

2. **The `--format json` flag is required**: Use `--format json` (not `--json`) for project commands.

3. **Status is a string, not an object**: When filtering with jq, use `.status == "Idea"` not `.status.name`.

4. **Labels might be in different formats**: Check the actual JSON structure with `jq '.'` first before writing complex filters.

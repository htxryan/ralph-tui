---
description: Capture research and plan to Vibe Kanban issue with full detail
model: sonnet
---

# Capture to Vibe Kanban

You are tasked with capturing the research and implementation plan from a task's output directory and creating a comprehensive Vibe Kanban issue with ALL the detail preserved.

## Arguments

This command accepts a required argument:

- **$ARGUMENTS**: The task ID (e.g., "my-task") used to locate the outputs

Parse the arguments to extract:
- **task_id**: The task identifier (required) - used to find the research and plan documents

If no task_id is provided, respond:
```
Error: Task ID required.

Usage: /refine/capture <task-id>

Example: /refine/capture my-feature

This will:
1. Read: .ai-docs/thoughts/plans/<task-id>/research.md
2. Read: .ai-docs/thoughts/plans/<task-id>/plan.md
3. Create a Vibe Kanban issue with full Research and Plan content
```
Then stop and wait for correct input.

## Process

### Step 1: Validate Input Files Exist

Check that the required files exist:
- `.ai-docs/thoughts/plans/<task_id>/research.md`
- `.ai-docs/thoughts/plans/<task_id>/plan.md`

If either file is missing, report which files are missing and suggest running the appropriate commands first:
```
Error: Missing required files for task: <task_id>

Missing files:
- .ai-docs/thoughts/plans/<task_id>/research.md (run /refine/research_codebase <task_id>)
- .ai-docs/thoughts/plans/<task_id>/plan.md (run /refine/create_plan <task_id>)

Please run the missing commands first.
```

### Step 2: Read the Documents FULLY

1. **Read research.md completely**:
   - Read `.ai-docs/thoughts/plans/<task_id>/research.md` without any limit/offset
   - Capture the ENTIRE content - do not truncate

2. **Read plan.md completely**:
   - Read `.ai-docs/thoughts/plans/<task_id>/plan.md` without any limit/offset
   - Capture the ENTIRE content - do not truncate

### Step 3: Extract Metadata

From the frontmatter of the documents, extract:
- **topic**: The topic/title from either document
- **date**: The date from the documents
- **tags**: Any tags from the documents

Construct an issue title:
- Format: `[<task_id>] <topic>`
- Example: `[my-feature] Add dark mode support`

### Step 4: Create Vibe Kanban Issue

Use the Vibe Kanban MCP tools to create a new issue.

**CRITICAL**: Do NOT truncate ANY content. The entire research and plan must be captured in the issue.

Construct the issue body with this structure:

```markdown
# <topic>

**Task ID**: <task_id>
**Date**: <date>
**Tags**: <tags>

---

## Research

<FULL CONTENT OF research.md - DO NOT TRUNCATE>

---

## Plan

<FULL CONTENT OF plan.md - DO NOT TRUNCATE>

---

## References

- Research source: `.ai-docs/thoughts/plans/<task_id>/research.md`
- Plan source: `.ai-docs/thoughts/plans/<task_id>/plan.md`
```

**Using Vibe Kanban MCP Tools:**

Use the appropriate Vibe Kanban MCP tool to create the issue. The tool should be something like:
- `mcp_vibekanban_create_issue` or similar
- `mcp_vibe_create_task` or similar

Call the tool with:
- **title**: `[<task_id>] <topic>`
- **description/body**: The full markdown content constructed above
- **labels/tags**: Any relevant tags from the documents

If you're unsure which Vibe Kanban MCP tool to use, list available MCP tools first to find the correct one.

### Step 5: Confirm Success

After creating the issue, respond with:
```
Successfully captured task to Vibe Kanban!

Issue: [<task_id>] <topic>
Source files:
- .ai-docs/thoughts/plans/<task_id>/research.md
- .ai-docs/thoughts/plans/<task_id>/plan.md

The full research and plan content has been preserved in the Vibe Kanban issue.
```

Include any link or identifier for the created issue if available from the tool response.

## Important Guidelines

1. **NEVER TRUNCATE CONTENT**:
   - The entire research document must be included
   - The entire plan document must be included
   - If the content is large, that's fine - include it all
   - Do not summarize or abbreviate

2. **Preserve Formatting**:
   - Keep all markdown formatting intact
   - Preserve code blocks, lists, and headers
   - Maintain the document structure

3. **Error Handling**:
   - If MCP tool call fails, report the error clearly
   - Suggest troubleshooting steps (check MCP server is running, etc.)

4. **Read Files First**:
   - Always read both files completely before constructing the issue
   - Don't attempt to create the issue if files are missing

## Workflow Context

This command is part of the refinement workflow:
1. `/refine/research_codebase <task-id>` - Research and document (creates research.md)
2. `/refine/create_plan <task-id>` - Create implementation plan (creates plan.md)
3. **`/refine/capture <task-id>`** - Capture to Vibe Kanban issue (this command)

The capture step is the final step that takes all the detailed work from research and planning and creates a trackable issue in Vibe Kanban for implementation tracking.

## Example

```
User: /refine/capture my-feature

Assistant: Reading research and plan files for task my-feature...

[Reads .ai-docs/thoughts/plans/my-feature/research.md]
[Reads .ai-docs/thoughts/plans/my-feature/plan.md]

Creating Vibe Kanban issue with full content...

[Calls Vibe Kanban MCP tool to create issue]

Successfully captured task to Vibe Kanban!

Issue: [my-feature] Add dark mode support
Source files:
- .ai-docs/thoughts/plans/my-feature/research.md
- .ai-docs/thoughts/plans/my-feature/plan.md

The full research and plan content has been preserved in the Vibe Kanban issue.
```

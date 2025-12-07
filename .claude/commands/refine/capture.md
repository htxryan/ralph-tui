---
description: Capture research and plan to Vibe Kanban issue with full detail
model: sonnet
---

# Capture to Vibe Kanban

You are tasked with capturing the task definition, research, and implementation plan from a task's directory and creating a comprehensive Vibe Kanban issue with ALL the detail preserved.

## Arguments

This command accepts a required argument:

- **$ARGUMENTS**: The task ID (e.g., "my-task") used to locate the outputs

Parse the arguments to extract:
- **task_id**: The task identifier (required) - used to find the task documents

If no task_id is provided, respond:
```
Error: Task ID required.

Usage: /refine/capture <task-id>

Example: /refine/capture my-feature

This will:
1. Read: .ai-docs/plans/<task-id>/task.md (required - the task definition)
2. Read: .ai-docs/plans/<task-id>/research.md (optional - codebase research)
3. Read: .ai-docs/plans/<task-id>/plan.md (required - implementation plan)
4. Create a Vibe Kanban issue with full content
```
Then stop and wait for correct input.

## Process

### Step 1: Validate Input Files Exist

Check that the required files exist:
- `.ai-docs/plans/<task_id>/task.md` (REQUIRED)
- `.ai-docs/plans/<task_id>/plan.md` (REQUIRED)
- `.ai-docs/plans/<task_id>/research.md` (OPTIONAL)

If required files are missing, report which files are missing and suggest running the appropriate commands first:
```
Error: Missing required files for task: <task_id>

Missing files:
- .ai-docs/plans/<task_id>/task.md (create this file with your task definition)
- .ai-docs/plans/<task_id>/plan.md (run /refine/create_plan <task_id>)

Please create/run the missing items first.
```

### Step 2: Read the Documents FULLY

1. **Read task.md completely** (REQUIRED):
   - Read `.ai-docs/plans/<task_id>/task.md` without any limit/offset
   - Capture the ENTIRE content - do not truncate

2. **Read research.md completely** (if exists):
   - Read `.ai-docs/plans/<task_id>/research.md` without any limit/offset
   - Capture the ENTIRE content - do not truncate
   - If it doesn't exist, note this but continue

3. **Read plan.md completely** (REQUIRED):
   - Read `.ai-docs/plans/<task_id>/plan.md` without any limit/offset
   - Capture the ENTIRE content - do not truncate

### Step 3: Extract Metadata

From the frontmatter of the documents, extract:
- **topic**: The topic/title from task.md or plan.md frontmatter
- **date**: The date from the documents
- **tags**: Any tags from the documents

**IMPORTANT - Issue Title Format:**
- The issue title should be ONLY the task_id string
- No brackets, no topic text, no prefixes - just the raw task_id
- Example: `my-feature` (NOT `[my-feature]` or `[my-feature] Add dark mode support`)

The topic and other details belong in the issue body.

### Step 4: Create Vibe Kanban Issue

Use the Vibe Kanban MCP tools to create a new issue following the template below.

**CRITICAL**: Do NOT truncate ANY content. The entire task, research, and plan must be captured in the issue.

---

## Issue Template

Use this exact structure when creating the Vibe Kanban issue:

**Issue Title**: `<task_id>`
- Just the raw task_id string
- No brackets, no topic, no other text
- Example: `my-feature`

**Issue Body**:

```markdown
# <topic>

**Task ID**: <task_id>
**Source**: `.ai-docs/plans/<task_id>/`
**Date**: <date>
**Tags**: <tags>

---

## Task

<CONTENT OF task.md with headers normalized - see Header Normalization below>

---

## Research

<CONTENT OF research.md with headers normalized>
<OR if research.md doesn't exist: "No research document was generated for this task.">

---

## Plan

<CONTENT OF plan.md with headers normalized>

---

## References

- Task: `.ai-docs/plans/<task_id>/task.md`
- Research: `.ai-docs/plans/<task_id>/research.md`
- Plan: `.ai-docs/plans/<task_id>/plan.md`
```

---

### Header Normalization

When inserting content from source files into the issue body, normalize headers to create logical nesting:

1. **Remove redundant top-level headers** that duplicate the section name:
   - `# Research: ...` → remove (already under `## Research`)
   - `# ... Implementation Plan` → remove (already under `## Plan`)
   - `# Task: ...` → remove (already under `## Task`)

2. **Shift remaining headers down by 2 levels** so they nest under the H2 section:
   - `# Heading` → `### Heading`
   - `## Heading` → `#### Heading`
   - `### Heading` → `##### Heading`

3. **Strip YAML frontmatter** from source files (the metadata is already captured above)

4. **Preserve everything else**: code blocks, lists, bold, links, etc.

**Example transformation for research.md:**
```markdown
# Before (in research.md):
---
date: 2025-01-15
topic: "Add dark mode"
---

# Research: Add dark mode

## Summary
Found relevant code...

## Detailed Findings
...
```

```markdown
# After (in issue body under ## Research):

### Summary
Found relevant code...

### Detailed Findings
...
```

---

**Using Vibe Kanban MCP Tools:**

Use the appropriate Vibe Kanban MCP tool to create the issue. The tool should be something like:
- `mcp_vibekanban_create_issue` or similar
- `mcp_vibe_create_task` or similar

Call the tool with:
- **title**: `<task_id>` (just the raw task_id string - no brackets, no topic)
- **description/body**: The full markdown content constructed above (topic is the heading in the body)
- **labels/tags**: Any relevant tags from the documents

If you're unsure which Vibe Kanban MCP tool to use, list available MCP tools first to find the correct one.

### Step 5: Confirm Success

After creating the issue, respond with:
```
Successfully captured task to Vibe Kanban!

Issue: <task_id>
Topic: <topic>
Source files:
- .ai-docs/plans/<task_id>/task.md
- .ai-docs/plans/<task_id>/research.md (if present)
- .ai-docs/plans/<task_id>/plan.md

The full task definition, research, and plan content has been preserved in the Vibe Kanban issue.
```

Include any link or identifier for the created issue if available from the tool response.

## Important Guidelines

1. **NEVER TRUNCATE CONTENT**:
   - The entire task document must be included
   - The entire research document must be included (if it exists)
   - The entire plan document must be included
   - If the content is large, that's fine - include it all
   - Do not summarize or abbreviate
   - Note: Removing redundant H1s, frontmatter, and shifting header levels is normalization, not truncation

2. **Normalize Headers**:
   - The issue template uses H1 for topic and H2 for sections (Task, Research, Plan)
   - Content from source files must have headers adjusted to fit logically within H2 sections
   - **Remove redundant top-level H1s** from source files if they duplicate the section header
     - e.g., Remove `# Research: Topic` from research.md since it's under `## Research`
     - e.g., Remove `# Implementation Plan` from plan.md since it's under `## Plan`
   - **Shift remaining headers down** so they nest properly under the H2 section:
     - H1 → H3, H2 → H4, H3 → H5, etc.
   - Preserve all other formatting: code blocks, lists, bold, etc.

3. **Error Handling**:
   - If MCP tool call fails, report the error clearly
   - Suggest troubleshooting steps (check MCP server is running, etc.)

4. **Read Files First**:
   - Always read all files completely before constructing the issue
   - Don't attempt to create the issue if required files are missing

5. **task.md is Primary**:
   - The task.md file is the source of truth for what needs to be done
   - Research and plan documents support and detail the task
   - Include task.md content in the "Task" section at the top of the issue body

6. **Title Format**:
   - Issue title is ONLY the task_id string (e.g., `my-feature`)
   - No brackets, no topic text, no other content in the title
   - The topic appears as a heading in the issue body

## Workflow Context

This command is part of the refinement workflow:
1. `/refine/research_codebase <task-id>` - Research and document (reads task.md, creates research.md)
2. `/refine/create_plan <task-id>` - Create implementation plan (reads task.md + research.md, creates plan.md)
3. **`/refine/capture <task-id>`** - Capture to Vibe Kanban issue (this command)

The capture step is the final step that takes all the detailed work from task definition, research, and planning and creates a trackable issue in Vibe Kanban for implementation tracking.

## Example

```
User: /refine/capture my-feature
Assistant: Reading task, research, and plan files for task my-feature...

[Reads .ai-docs/plans/my-feature/task.md]
[Reads .ai-docs/plans/my-feature/research.md]
[Reads .ai-docs/plans/my-feature/plan.md]

Creating Vibe Kanban issue with full content...

[Calls Vibe Kanban MCP tool to create issue with:]
  - title: "my-feature"
  - body: [full content with "# Add dark mode support" as heading]

Successfully captured task to Vibe Kanban!

Issue: my-feature
Topic: Add dark mode support
Source files:
- .ai-docs/plans/my-feature/task.md
- .ai-docs/plans/my-feature/research.md
- .ai-docs/plans/my-feature/plan.md

The full task definition, research, and plan content has been preserved in the Vibe Kanban issue.
```

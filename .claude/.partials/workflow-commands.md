## Refinement Workflow Commands

The refinement workflow consists of these commands:

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/refine:research_codebase <task-id>` | Research the codebase | `task.md` | `research.md` |
| `/refine:create_plan <task-id>` | Create implementation plan | `task.md` + `research.md` | `plan.md` |
| `/refine:capture <task-id>` | Capture to GitHub Issue | All artifacts | GitHub Issue |
| `/refine:single <description>` | Complete workflow for one task | Description | All artifacts + Issue |
| `/refine:many` | Batch process multiple tasks | List of descriptions | All artifacts + Issues |

**Individual commands** take a `task-id` and assume prior steps are complete.

**Batch commands** (`single`, `many`) take descriptions and run the entire workflow via `refine.sh`.

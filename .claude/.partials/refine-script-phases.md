## The refine.sh Script

The `refine.sh` script at `.claude/tools/refine.sh` orchestrates the full refinement workflow for a single task.

**Usage:** `.claude/tools/refine.sh <task-id> "<task-description>"`

**Phases:**
1. **Task Creation** - Creates `.ai-docs/thoughts/plans/<task-id>/task.md`
2. **Research** - Runs `/refine:research_codebase <task-id>` to explore the codebase
3. **Planning** - Runs `/refine:create_plan <task-id>` to create implementation plan
4. **Capture** - Runs `/refine:capture <task-id>` to create a GitHub Issue

**Behavior:**
- Runs 3 Claude sessions sequentially (research, plan, capture)
- Prints status messages as each step completes
- Exits with code 0 on success, non-zero on failure
- Outputs the GitHub Issue URL on successful capture
- Each phase may take several minutes

**Artifacts created:**
- `.ai-docs/thoughts/plans/<task-id>/task.md` - Task definition
- `.ai-docs/thoughts/plans/<task-id>/research.md` - Codebase research
- `.ai-docs/thoughts/plans/<task-id>/plan.md` - Implementation plan

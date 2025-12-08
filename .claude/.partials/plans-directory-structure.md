## Plans Directory Structure

Task-based refinement artifacts are stored in `.ai-docs/thoughts/plans/`:

```
.ai-docs/thoughts/plans/
└── <task-id>/
    ├── task.md       # Task definition (input - created by user or refine.sh)
    ├── research.md   # Codebase research (created by /refine:research_codebase)
    └── plan.md       # Implementation plan (created by /refine:create_plan)
```

**File purposes:**
- **task.md** - Defines what needs to be done (the task/feature description)
- **research.md** - Documents relevant code, patterns, and architecture found in the codebase
- **plan.md** - Detailed implementation plan with phases, file changes, and success criteria

**Related directories:**
- `.ai-docs/thoughts/research/` - General research documents (not task-specific)
- `.ai-docs/thoughts/notes/` - General notes and explorations
- `.ai-docs/design/` - Product design documents
- `.ai-docs/adr/` - Architecture Decision Records

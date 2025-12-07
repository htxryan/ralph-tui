# Thoughts Directory

This directory stores research, notes, decisions, and plans related to the Ralph TUI project. It serves as historical context for AI agents and developers working on the codebase.

## Structure

```
.ai-docs/thoughts/
├── research/        # Comprehensive research documents
├── notes/           # Quick notes and explorations
├── decisions/       # Decision records with rationale
├── plans/           # Implementation plans and designs
└── README.md        # This file
```

## Naming Conventions

- **Research documents**: `YYYY-MM-DD-topic-description.md`
- **Notes**: Descriptive names like `stream-processing-exploration.md`
- **Decisions**: `topic-decision.md` or `YYYY-MM-DD-topic-decision.md`
- **Plans**: `feature-name-plan.md` or `feature-name-design.md`

## Usage

Documents here are referenced by AI agents during research tasks. When investigating how something works or why a decision was made, agents will search this directory for historical context.

### Creating Documents

When documenting research, include YAML frontmatter:

```markdown
---
date: 2025-01-08
topic: "Brief topic description"
tags: [relevant, tags, here]
status: complete
---

# Document Title

Content here...
```

### When to Add Documents

- After completing significant research on a topic
- When making architectural or design decisions
- Before implementing complex features (planning)
- When exploring options or trade-offs


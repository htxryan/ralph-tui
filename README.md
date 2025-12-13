# Ralph TUI

A terminal user interface for monitoring and controlling autonomous AI coding agent sessions. Ralph provides real-time visibility into long-running AI agent workflows, enabling you to observe, interrupt, and guide autonomous coding sessions.

## Quick Start

```bash
# Install dependencies and link globally (for development)
pnpm install && pnpm link

# Initialize Ralph in your project directory
cd /path/to/your/project
ralph init

# Start Ralph TUI
ralph
```

### First Run

1. **Initialize**: `ralph init` creates the `.ralph/` directory with default configuration
2. **Select a Project**: Press `J` to open the project picker and select an execution workflow
3. **Start a Session**: Press `S` to start the autonomous agent loop
4. **Monitor Progress**: Watch the agent work in real-time across tabs (Messages, Task, Todos, Errors, Stats)
5. **Interrupt if Needed**: Press `K` to stop the agent, or `Q` to quit

### Key Shortcuts

| Key | Action |
|-----|--------|
| `S` | Start a new session |
| `K` | Kill running session |
| `J` | Open project picker |
| `P` | Browse past sessions |
| `Tab` | Switch tabs |
| `Q` | Quit |

## Projects

Ralph uses a **project-based** system where each project represents a different execution workflow:

```
.ralph/
├── settings.json              # Global configuration
└── projects/
    ├── default/               # Default project (created by `ralph init`)
    │   ├── settings.json      # Project-specific settings
    │   └── execute.md         # Execution workflow
    └── bug-fix/               # Custom project (you create these)
        ├── settings.json
        └── execute.md
```

To create a new project, copy an existing one and customize the `execute.md` workflow:

```bash
cp -r .ralph/projects/default .ralph/projects/bug-fix
# Edit .ralph/projects/bug-fix/execute.md to define your workflow
```

See [docs/projects.md](docs/projects.md) for detailed documentation.

## Development

```bash
pnpm install    # Install dependencies
pnpm link       # Create global symlink for 'ralph' command
pnpm dev        # Run with hot reload (tsx)
pnpm build      # Compile TypeScript
pnpm test       # Run tests
pnpm typecheck  # Type check only
```

## Repo Organization

- `.ai-docs/`: AI-native documentation for the project
- `.ai-docs/design/`: Design documentation for the project
- `.ai-docs/thoughts/decisions/`: Architecture Decision Records for the project
- `.ai-docs/thoughts/research/`: Research documents for the project
- `.ai-docs/thoughts/notes/`: Notes for the project
- `.ai-docs/thoughts/plans/`: Implementation plans for the project
- `.ai-docs/prompts/`: Prompts for the project

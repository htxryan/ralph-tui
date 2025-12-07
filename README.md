# Ralph TUI

Run an agent in a long-running loop, with a rich TUI.

## Quick Start

```bash
# Install dependencies and link globally (for development)
pnpm install && pnpm link

# Now 'ralph' command is available globally and reflects local code changes
ralph --help
```

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

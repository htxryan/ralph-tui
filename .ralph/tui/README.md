# Ralph

A terminal user interface for monitoring and controlling autonomous AI coding agent sessions.

Ralph provides real-time visibility into long-running AI agent workflows, enabling developers to observe, interrupt, and guide autonomous coding sessions.

## Features

- **Real-time message streaming** - Watch agent output with syntax highlighting
- **Subagent tracking** - Drill into nested agent conversations
- **Session management** - Start, stop, and resume sessions with human feedback
- **Multi-tab interface** - Messages, todos, errors, and stats views
- **Keyboard-driven** - Vim-style navigation and shortcuts
- **Multi-agent support** - Works with Claude Code, Codex CLI, OpenCode, and more

## Installation

```bash
npm install -g ralph
# or
pnpm add -g ralph
# or use directly with npx
npx ralph
```

## Quick Start

```bash
# Start monitoring in current directory (auto-detects agent)
ralph

# Initialize Ralph in your project
ralph init

# Start with specific log file
ralph -f path/to/output.jsonl

# Start with sidebar visible
ralph -s
```

## Usage

Ralph automatically detects your project root by looking for:
1. A `.ralph/` directory (existing Ralph setup)
2. Agent-specific directories (`.claude/`, `.codex/`, etc.)
3. Common project markers (`package.json`, `.git`, etc.)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-5` | Switch tabs |
| `j/k` or `↓/↑` | Scroll messages |
| `g/G` | Jump to top/bottom |
| `Enter` | Expand message details |
| `Esc` | Close detail view |
| `s` | Start session |
| `x` | Stop session |
| `i` | Interrupt with feedback |
| `?` | Show help |
| `q` | Quit |

### Tabs

1. **Messages** - Main conversation stream
2. **BD Issue** - Current work item (if using Beads)
3. **Todos** - Agent's task list
4. **Errors** - Aggregated tool errors
5. **Stats** - Token usage and metrics

## Configuration

Ralph uses a layered configuration system:

1. Built-in defaults
2. Global config (`~/.config/ralph/settings.json`)
3. Project settings (`.ralph/settings.json`)
4. Local overrides (`.ralph/settings.local.json`)
5. CLI arguments

### Example settings.json

```json
{
  "agent": {
    "name": "claude-code"
  },
  "ui": {
    "theme": "auto",
    "showSidebar": false
  }
}
```

## Supported Agents

| Agent | Status |
|-------|--------|
| Claude Code | Supported |
| Codex CLI | Planned |
| OpenCode | Planned |
| Kiro CLI | Planned |

## Requirements

- Node.js >= 18

## License

MIT

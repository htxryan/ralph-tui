# Tech Stack

## Overview

Ralph TUI is built as a modern TypeScript CLI application using React-based terminal rendering. This document outlines the technology choices, their rationale, and considerations for NPM package distribution.

## Core Technologies

### Runtime & Language

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >= 18 | Runtime environment |
| **TypeScript** | ^5.7 | Type-safe development |
| **ES Modules** | - | Modern module system (`"type": "module"`) |

**Rationale**: Node.js 18+ provides native ES module support, stable fetch API, and long-term support. TypeScript ensures type safety across the codebase and better IDE tooling.

### UI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Ink** | ^5.2 | React renderer for CLIs |
| **React** | ^18.3 | Component model and state management |
| **@inkjs/ui** | ^2.0 | Pre-built Ink components (Select, TextInput, etc.) |

**Rationale**: Ink brings React's declarative component model to terminal UIs. This enables:
- Familiar development patterns for React developers
- Component composition and reuse
- React hooks for state management
- Efficient terminal re-rendering

### CLI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Commander** | ^12.1 | Command-line argument parsing |

**Rationale**: Commander is the de-facto standard for Node.js CLI argument parsing. It provides:
- Declarative option definition
- Auto-generated help text
- Subcommand support (future)
- Wide ecosystem compatibility

### File System & Process

| Technology | Version | Purpose |
|------------|---------|---------|
| **chokidar** | ^3.6 | Cross-platform file watching |
| **execa** | ^9.5 | Process spawning and management |

**Rationale**:
- **chokidar**: Reliable file watching with polling support for NFS/network drives. Used for real-time JSONL monitoring.
- **execa**: Modern process management with promise-based API, proper signal handling, and stream support.

### Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **chalk** | ^5.3 | Terminal string styling |
| **ink-spinner** | ^5.0 | Loading spinners |

**Rationale**: Chalk provides ANSI color support with automatic color detection. Ink-spinner integrates seamlessly with Ink for loading states.

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | ^2.1 | Test runner |
| **ink-testing-library** | ^4.0 | Ink component testing |
| **@testing-library/react** | ^16.3 | React testing utilities |
| **cli-testing-library** | ^3.0 | CLI integration testing |

**Rationale**: Vitest provides fast, ESM-native testing with Jest-compatible API. The testing libraries enable proper component and CLI testing.

### Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **tsx** | ^4.21 | TypeScript execution for development |
| **tsc** | (via typescript) | Production builds |

**Rationale**: tsx enables rapid development iteration without compilation. Production builds use tsc for optimal output.

## Architecture

### Directory Structure (Current)

```
.ralph/tui/
├── src/
│   ├── cli.tsx           # Entry point, argument parsing
│   ├── app.tsx           # Main React app component
│   ├── components/       # React components
│   │   ├── common/       # Reusable UI components
│   │   ├── messages/     # Message display components
│   │   ├── errors/       # Error view components
│   │   ├── todos/        # Todo list components
│   │   ├── stats/        # Statistics display
│   │   ├── subagent/     # Subagent detail views
│   │   └── bd-issue/     # Beads issue integration
│   ├── hooks/            # React hooks
│   │   ├── use-jsonl-stream.ts
│   │   ├── use-ralph-process.ts
│   │   ├── use-keyboard.ts
│   │   └── ...
│   ├── lib/              # Utilities and types
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── colors.ts
│   │   └── ...
│   └── test/             # Test files
├── dist/                 # Compiled output
├── package.json
└── tsconfig.json
```

### Proposed Structure (NPM Package)

```
ralph/
├── src/
│   ├── cli.tsx           # Entry point
│   ├── app.tsx           # Main app
│   ├── components/       # UI components
│   ├── hooks/            # React hooks
│   ├── lib/              # Utilities
│   └── test/             # Tests
├── dist/                 # Compiled output
├── bin/
│   └── ralph.js          # Shim for npx/global install
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### Key Architectural Patterns

#### 1. Stream Processing
```
JSONL File → chokidar watch → parse lines → processEvent → React state
```
The `useJSONLStream` hook implements efficient tail-following with:
- Position tracking to read only new content
- File truncation detection for log rotation
- Debounced updates to prevent excessive re-renders

#### 2. Subagent Tracking
```
ToolCall (Task) → parent_tool_use_id tracking → nested message collection
```
Messages with `parent_tool_use_id` are collected into the parent ToolCall's `subagentMessages` array, enabling nested conversation views.

#### 3. Process Management
```
Lock file (/path/.ralph/claude.lock) → PID tracking → signal-based control
```
The `useRalphProcess` hook manages process lifecycle via lock files, enabling Start/Stop/Resume without race conditions.

## NPM Package Configuration

### package.json (Proposed)

```json
{
  "name": "ralph",
  "version": "1.0.0",
  "description": "Terminal UI for monitoring Claude Code autonomous sessions",
  "type": "module",
  "bin": {
    "ralph": "./dist/cli.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.tsx",
    "start": "node dist/cli.js",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": [
    "claude",
    "cli",
    "tui",
    "terminal",
    "ai",
    "autonomous",
    "agent",
    "monitoring"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/user/ralph.git"
  },
  "license": "MIT"
}
```

### CLI Shim

The `dist/cli.js` file should include a shebang for direct execution:

```javascript
#!/usr/bin/env node
// ... compiled CLI code
```

TypeScript config should preserve the shebang in output.

### tsconfig.json (Key Settings)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

## Dependencies Analysis

### Production Dependencies

| Package | Size | Purpose | Essential? |
|---------|------|---------|-----------|
| ink | ~50KB | Core UI framework | Yes |
| react | ~140KB | Component model | Yes |
| @inkjs/ui | ~30KB | Pre-built components | Yes |
| chalk | ~20KB | Terminal colors | Yes |
| chokidar | ~60KB | File watching | Yes |
| commander | ~50KB | CLI parsing | Yes |
| execa | ~30KB | Process management | Yes |
| ink-spinner | ~5KB | Loading indicators | Optional |

**Total estimated size**: ~400KB (before bundling)

### Bundling Considerations

For optimal npm package size, consider:
1. **Tree-shaking**: ES modules enable dead code elimination
2. **No bundler needed**: Node.js handles ES modules natively
3. **Selective imports**: Import only needed chalk methods
4. **Optional dependencies**: ink-spinner could be optional

## Platform Support

### Primary Targets
- macOS (development focus)
- Linux (server/CI environments)
- Windows (WSL primarily, native Windows secondary)

### Terminal Requirements
- 256-color support recommended
- Minimum 80x24 terminal size
- UTF-8 encoding
- Interactive terminal (not piped)

### Known Platform Differences
- **File watching**: chokidar uses native fsevents on macOS, polling on Linux
- **Process signals**: SIGTERM handling differs on Windows
- **Path separators**: Use `path` module consistently
- **stat command**: Different flags between macOS/Linux (handled in ralph.sh)

## Security Considerations

### npm Package
- No postinstall scripts (transparent install)
- No network calls during runtime (local files only)
- Lock file prevents concurrent process conflicts
- No credentials or secrets in package

### Process Management
- Uses SIGTERM for graceful shutdown
- PID-based process tracking
- Validates lock file PIDs before trusting

## Performance Targets

| Metric | Target |
|--------|--------|
| Startup time | < 500ms |
| Memory usage (idle) | < 50MB |
| Memory usage (active) | < 150MB |
| File watch latency | < 500ms |
| Re-render time | < 16ms |

## Future Technical Considerations

### Potential Enhancements
1. **esbuild bundling**: Faster builds, smaller output
2. **WebSocket support**: Remote session monitoring
3. **SQLite caching**: Faster archived session loading
4. **Worker threads**: Offload JSONL parsing

### Technical Debt
1. Shell scripts (`ralph.sh`, `sync.sh`) are project-specific
2. Beads integration (`use-bd-issue`, `use-assignment`) is tightly coupled
3. Some hardcoded paths assume `.ralph/` structure
4. Limited configuration system

## Development Workflow

### Local Development
```bash
cd .ralph/tui
pnpm install
pnpm dev:tsx   # Run with tsx (hot reload)
```

### Building
```bash
pnpm build     # Compile TypeScript
pnpm start     # Run compiled version
```

### Testing
```bash
pnpm test          # Watch mode
pnpm test:run      # Single run
pnpm test:coverage # With coverage
```

### Publishing (Future)
```bash
npm version patch|minor|major
npm publish
```

## References

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Commander.js](https://github.com/tj/commander.js)
- [chokidar](https://github.com/paulmillr/chokidar)
- [execa](https://github.com/sindresorhus/execa)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

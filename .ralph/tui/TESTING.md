# Ralph TUI Testing Infrastructure

## Overview

This document describes the testing infrastructure for the Ralph TUI application, which includes component tests, integration tests, and CI/CD integration.

## Testing Stack

- **Test Runner**: Vitest
- **Component Testing**: ink-testing-library
- **Integration Testing**: cli-testing-library
- **Coverage**: Vitest coverage

## Test Structure

```
src/
├── components/
│   ├── common/
│   │   ├── progress-bar.test.tsx  # Component unit tests
│   │   └── spinner.test.tsx
│   ├── header.test.tsx            # Header component tests
│   ├── footer.test.tsx            # Footer component tests
│   ├── tab-bar.test.tsx           # TabBar component tests
│   └── messages/
│       └── messages-view.test.tsx # Messages view tests
└── test/
    ├── archive.test.ts             # Archive functionality tests
    ├── parser.test.ts              # Parser unit tests  
    └── integration.test.tsx        # App-level integration tests
```

## Running Tests

### Local Development

```bash
# Run all tests in watch mode
pnpm test

# Run all tests once
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Run tests in CI mode (verbose output)
pnpm test:ci

# Type checking
pnpm typecheck
```

### CI/CD

Tests are automatically run in GitHub Actions when:
- Code is pushed to branches containing changes in `.ralph/tui/`
- Pull requests modify Ralph TUI code

The CI pipeline:
1. Sets up Node.js 20 and pnpm
2. Installs dependencies with lockfile
3. Runs TypeScript type checking
4. Executes all tests
5. Reports results

## Test Categories

### Component Tests (70% coverage target)

Component tests use `ink-testing-library` to test individual UI components in isolation:

- **Header**: Status display, token counts, issue info
- **Footer**: Shortcut display, responsive behavior
- **TabBar**: Tab switching, counts, responsive hiding
- **ProgressBar**: Progress calculation, clamping
- **Spinner**: Loading states, custom labels
- **MessagesView**: Message list, filtering, navigation

### Integration Tests (25% coverage target)

Integration tests verify complete user workflows:

- App initialization and rendering
- Tab navigation with keyboard
- Ralph process control (start/stop)
- Session management (picker, archiving)
- Error handling and recovery
- File system interactions

### Parser Tests

Unit tests for parsing logic:

- JSONL line parsing
- Content extraction
- Tool call detection
- Statistics calculation
- Duration formatting
- Workflow name extraction

## Writing Tests

### Component Test Example

```tsx
import { render } from 'ink-testing-library';
import { MyComponent } from './my-component.js';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { lastFrame } = render(
      <MyComponent prop="value" />
    );
    
    expect(lastFrame()).toContain('expected text');
  });
});
```

### Integration Test Example

```tsx
import { render } from 'ink-testing-library';
import { App } from '../app.js';

describe('App Integration', () => {
  it('handles user input', () => {
    const { stdin, lastFrame } = render(
      <App jsonlPath="/test.jsonl" />
    );
    
    stdin.write('q'); // Simulate key press
    expect(lastFrame()).toContain('Quit');
  });
});
```

## Mocking

The integration tests mock:
- File system operations (`fs`)
- File watching (`chokidar`)
- Child processes (`child_process`)

This allows testing without actual file I/O or process spawning.

## Known Issues

1. Some Ink components don't render perfectly in test environment
2. Terminal width/height simulation has limitations
3. Async state updates may require `waitFor` patterns

## Future Improvements

- [ ] Add visual regression tests with snapshot testing
- [ ] Implement E2E tests with actual terminal emulation
- [ ] Add performance benchmarks for large JSONL files
- [ ] Increase test coverage to 80%+

## CI Badge

Add to README:
```markdown
![Ralph TUI Tests](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/ralph-tui-tests.yml/badge.svg)
```
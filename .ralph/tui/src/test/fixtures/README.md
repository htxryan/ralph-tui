# Test Fixtures

This directory contains test fixture data for Ralph TUI tests.

## Directory Structure

```
fixtures/
├── claude-code/           # Claude Code agent output fixtures
│   ├── simple-conversation.jsonl
│   ├── tool-calls.jsonl
│   ├── subagent-task.jsonl
│   ├── errors.jsonl
│   └── session-resume.jsonl
├── config/                # Configuration file fixtures
│   ├── minimal.json
│   ├── full.json
│   └── invalid.json
└── prompts/               # Prompt template fixtures
    ├── plan.md
    └── execute.md
```

## Fixture Utilities

Load fixtures using the helper utilities:

```typescript
import { loadFixture, streamFixture } from '../fixtures/index.js';

// Load a fixture as a string
const content = loadFixture('claude-code/simple-conversation.jsonl');

// Stream fixture lines one by one (for async tests)
for await (const line of streamFixture('claude-code/tool-calls.jsonl')) {
  // Process each line
}
```

## Creating New Fixtures

When adding new fixtures:

1. Use realistic data captured from actual agent sessions
2. Anonymize any sensitive information
3. Include both success and error scenarios
4. Document the fixture purpose in comments or README

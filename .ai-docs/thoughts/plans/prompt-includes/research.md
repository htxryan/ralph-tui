---
date: 2025-12-07
task_id: "prompt-includes"
researcher: claude
git_commit: 4139fd5
branch: spike/ralph
topic: "Generic Prompt Inclusion Functionality"
tags: [research, codebase, prompts, templates, file-loading, error-handling]
status: complete
---

# Research: Generic Prompt Inclusion Functionality

**Task ID**: prompt-includes
**Date**: 2025-12-07
**Git Commit**: 4139fd5
**Branch**: spike/ralph

## Task Assignment
Implement generic prompt inclusion functionality that allows orchestrate.md and workflow files to include other markdown files via @-references (like "@my-file.md"), with paths evaluated relative to the source file, hard errors for missing files that kill the ralph process, and live file reading without caching.

## Summary
The ralph-tui codebase currently loads prompts through a multi-layered template system where orchestrate.md and workflow files are copied from bundled templates to `.ralph/` during initialization. The system uses a single placeholder replacement mechanism (`{{TASK_MANAGER_INSTRUCTIONS}}`) but lacks generic include functionality. File reading is consistently synchronous with `fs.readFileSync()`, error handling displays failures in the UI without terminating the TUI process, and the ralph subprocess lifecycle is managed through lock files and process management hooks.

## Detailed Findings

### Current Prompt Loading Architecture
The prompt system operates through three distinct layers:

**Template Bundling** (`templates/` directory):
- Source templates are bundled with the npm package at `templates/orchestrate.md` and `templates/workflows/*.md`
- Package root resolution uses `fileURLToPath(import.meta.url)` pattern for ES module compatibility (`src/commands/init.ts:16-21`)
- Templates loaded via `loadTemplate()` function that reads files synchronously with UTF-8 encoding (`src/commands/init.ts:72-82`)

**Runtime Initialization** (`ralph init` command):
- Templates copied to project's `.ralph/` directory during initialization (`src/commands/init.ts:196-209`)
- Creates user-editable copies that persist across sessions
- Settings.json created with default provider configuration

**Runtime Processing** (`scripts/sync2.sh` and `scripts/process-prompt.js`):
- `sync2.sh:66` defines `process_orchestrate_prompt()` function that invokes Node.js processor
- `process-prompt.js:70-92` performs placeholder replacement for `{{TASK_MANAGER_INSTRUCTIONS}}`
- Provider-specific instructions loaded from `templates/providers/*.md` based on settings.json

### Existing Include Mechanism
The codebase has one hardcoded include mechanism:

**Placeholder Pattern** (`scripts/process-prompt.js:31-44`):
- Only supports `{{TASK_MANAGER_INSTRUCTIONS}}` placeholder in orchestrate.md
- Loads provider instructions from `templates/providers/{provider}.md`
- Falls back to empty string if provider template missing
- No generic include syntax exists

**Settings.json File References** (`.ai-docs/thoughts/plans/prompt-includes/research.md`):
- Documentation indicates settings.json supports `"@file:prompts/plan.md"` syntax
- This pattern exists but is not used in the current prompt loading flow

### File Reading Patterns
The codebase uses consistent patterns for file operations:

**Synchronous Reading** (`fs.readFileSync`):
- All template and configuration files use synchronous reading
- Always wrapped in try-catch blocks with graceful fallbacks
- UTF-8 encoding specified explicitly
- Example: `src/commands/init.ts:76` for template loading

**Existence Checks** (`fs.existsSync`):
- Every file read preceded by existence check
- Non-existent files handled gracefully (return empty/null)
- Example: `src/hooks/use-ralph-process.ts:87` for lock file checking

**Path Resolution**:
- `path.join()` for constructing paths within known directories
- `path.resolve()` for absolute path resolution
- Cross-platform compatibility maintained throughout

### Error Handling Implementation

**UI Error Display** (`src/components/errors/`):
- `ErrorsView` component displays scrollable list of errors (`errors-view.tsx:45-212`)
- `ErrorItem` shows individual errors with timestamp and tool name (`error-item.tsx:20-70`)
- Errors tab integrated into main navigation (`src/app.tsx:583-591`)
- Error count shown in header when > 0

**Process Error Management** (`src/hooks/use-ralph-process.ts`):
- Process errors set in hook state but don't terminate TUI
- Exit codes 143 (SIGTERM) and 130 (SIGINT) treated as normal
- Other exit codes generate error messages displayed in UI
- TUI remains running for user recovery after errors

**Current Philosophy**:
- Non-fatal errors: TUI continues running, displays errors
- User can stop failed processes and restart
- No mechanism currently exists for hard errors that kill ralph process

### Process Lifecycle Management

**Starting Sessions** (`src/hooks/use-ralph-process.ts:106-193`):
- Pre-flight checks ensure ralph.sh exists, .ralph directory exists, orchestrate.md exists
- Spawns ralph.sh in detached mode with `stdio: 'ignore'`
- Process writes PID to `.ralph/claude.lock` file
- 's' key in TUI triggers new session after archiving current

**Stopping Sessions** (`src/hooks/use-ralph-process.ts:195-262`):
- Reads PID from lock file and sends SIGTERM
- Comprehensive cleanup using pkill for child processes
- Removes lock file to indicate stopped state
- 'k' key in TUI triggers stop

**Lock File Coordination**:
- Lock file at `.ralph/claude.lock` prevents concurrent processes
- Contains PID of running ralph.sh process
- Periodic health checks every 5 seconds verify process alive
- Stale locks automatically cleaned

### Workflow File Processing

**Current Implementation** (`scripts/sync2.sh:388-408`):
- Workflow files contain YAML frontmatter but it's not parsed
- Entire file content (including frontmatter) passed to Claude as markdown
- No programmatic extraction of YAML metadata
- Workflow names extracted from file paths, not frontmatter (`src/lib/parser.ts:383-402`)

**File Structure**:
```yaml
---
name: Human-readable workflow name
condition: Multi-line trigger conditions
description: Detailed workflow explanation
priority: 1-6
goal: One-line objective
---
[Markdown content with instructions]
```

### Path Resolution and Relative Paths

**Current Patterns**:
- Template paths resolved relative to package root (`src/commands/init.ts:21`)
- User files resolved relative to `.ralph/` directory
- No existing relative path resolution for includes

**Package Root Discovery**:
```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
```

## Code References
- `src/commands/init.ts:72` - loadTemplate() function for reading template files
- `src/commands/init.ts:196-209` - Template copying during ralph init
- `scripts/sync2.sh:66` - process_orchestrate_prompt() function
- `scripts/process-prompt.js:70-92` - Template processing with placeholder replacement
- `scripts/process-prompt.js:31-44` - Provider instruction loading
- `src/hooks/use-ralph-process.ts:106-193` - Ralph process starting logic
- `src/hooks/use-ralph-process.ts:195-262` - Ralph process stopping logic
- `src/components/errors/errors-view.tsx:45-212` - Error display component
- `src/app.tsx:458` - 's' key handler for starting sessions
- `scripts/sync2.sh:403` - Workflow file content reading
- `src/lib/parser.ts:383-402` - extractWorkflowName() from file paths

## Architecture Documentation

### Template System Architecture
The template system operates in three phases:
1. **Bundle Phase**: Templates stored in npm package at `templates/` directory
2. **Initialization Phase**: `ralph init` copies templates to user's `.ralph/` directory
3. **Runtime Phase**: Scripts read from `.ralph/` and process with placeholder replacement

### File Reading Conventions
- Synchronous reading used throughout for non-log files
- Existence checks precede all file operations
- UTF-8 encoding explicitly specified
- Graceful fallbacks for missing optional files
- Hard exits only in CLI scripts for missing required files

### Error Propagation Pattern
- Tool errors captured in JSONL stream with `isError: true` flag
- Process errors captured via exit codes
- Errors aggregated and displayed in UI
- TUI process continues running despite errors
- No current mechanism for errors that terminate ralph subprocess

### Process Management Pattern
- Detached subprocess spawning allows TUI independence
- Lock file prevents concurrent ralph processes
- PID tracking enables targeted process termination
- Comprehensive cleanup ensures all child processes terminated
- Session archiving preserves history before new sessions

## Historical Context (from .ai-docs/thoughts/)
The task definition at `.ai-docs/thoughts/plans/prompt-includes/task.md` specifies:
- Include syntax should be `@my-file.md` format (with or without quotes)
- Paths evaluated relative to the file being read
- Missing files should cause hard errors that kill the ralph process
- Prompt files should always be read live from disk, not cached

Documentation indicates existing `@file:` pattern in settings.json for file references, suggesting some file reference capability already exists but is not used in the prompt loading flow.

## Related Documentation
- `.ai-docs/thoughts/plans/prompt-includes/task.md` - Task definition for this feature
- `templates/orchestrate.md` - Main orchestration template with placeholder
- `templates/providers/` - Provider-specific instruction templates

## Open Questions
1. Should the include mechanism support recursive includes (files including other files)?
2. How should circular reference detection work if recursive includes are allowed?
3. Should the existing `@file:` pattern in settings.json be unified with the new include syntax?
4. What is the exact mechanism for killing the ralph subprocess on include errors while keeping TUI running?
5. Should included files be validated during `ralph init` or only at runtime?
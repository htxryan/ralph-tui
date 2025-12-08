---
date: 2025-12-08
task_id: "prompt-includes"
topic: "Generic Prompt Inclusion Functionality"
tags: [plan, implementation, prompts, templates, file-processing, error-handling]
status: draft
---

# Generic Prompt Inclusion Functionality Implementation Plan

**Task ID**: prompt-includes

## Overview

Implement a generic file inclusion mechanism that allows orchestrate.md and workflow files to reference and include other markdown files using `@file.md` syntax, with relative path resolution, hard error handling for missing files, and live file reading without caching.

## Task Definition

Add generic prompt inclusion functionality where orchestrate.md and workflow files can contain strings like `@my-file.md`, `@../other-file.md`, or `@mydir/myfile.md` (with or without quotes), and these strings are replaced with the contents of the referenced files. Paths are evaluated relative to the source file, missing files cause hard errors that kill the ralph process, and prompt files are always read live from disk.

## Current State Analysis

The codebase currently has:
- A single hardcoded placeholder mechanism (`{{TASK_MANAGER_INSTRUCTIONS}}`) in scripts/process-prompt.js
- Synchronous file reading patterns with fs.readFileSync throughout
- Process management via lock files and PID tracking in src/hooks/use-ralph-process.ts
- Error display in TUI without process termination
- Shell scripts (ralph.sh, sync2.sh) that run the orchestration loop
- Node.js script (process-prompt.js) that processes templates before passing to claude

## Desired End State

After implementation:
- Any markdown file can include other files using `@file.md` syntax
- Includes work recursively (included files can include other files)
- Paths are resolved relative to the containing file
- Missing include files cause the ralph subprocess to exit with error code
- Circular references are detected and reported as errors
- Files are always read fresh from disk without caching
- The TUI displays include errors clearly and allows restart

### Key Discoveries:
- Template processing happens in scripts/process-prompt.js:70-92
- The TUI spawns ralph.sh detached, allowing independent lifecycle (src/hooks/use-ralph-process.ts:141)
- Non-zero exit codes from subprocess are captured and displayed (src/hooks/use-ralph-process.ts:166)
- Shell scripts can exit with specific codes that TUI interprets (scripts/sync2.sh:384)

## What We're NOT Doing

- NOT modifying the existing `{{TASK_MANAGER_INSTRUCTIONS}}` placeholder mechanism
- NOT adding include syntax to non-prompt files (configs, settings, etc.)
- NOT implementing conditional includes or template logic
- NOT caching processed templates in memory
- NOT supporting remote file includes (URLs)
- NOT processing includes in JSONL log files
- NOT adding include syntax to the TUI components

## Implementation Approach

Create a new `process-includes.js` module that recursively processes `@file` references before the existing placeholder replacement. Integrate it into the prompt processing pipeline in process-prompt.js. For missing files, exit with a specific error code that the TUI recognizes as a fatal include error. Use a visited set to detect circular references.

## Phase 1: Core Include Processing Module

### Overview
Create the include processing engine that can recursively resolve and substitute `@file` references with proper error handling and circular reference detection.

### Changes Required:

#### 1. Create Include Processor Module
**File**: `scripts/process-includes.js`
**Changes**: New file with include resolution logic

```javascript
#!/usr/bin/env node
/**
 * Process @file includes in markdown templates
 * Handles recursive includes with circular reference detection
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve, isAbsolute } from 'path';

const INCLUDE_PATTERN = /@(['"]?)([^'"]+)\1/g;
const MAX_DEPTH = 10; // Prevent infinite recursion

class IncludeError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.name = 'IncludeError';
    this.code = code;
  }
}

/**
 * Process includes in content recursively
 * @param {string} content - File content to process
 * @param {string} basePath - Directory path for relative resolution
 * @param {Set<string>} visited - Set of visited file paths (for circular detection)
 * @param {number} depth - Current recursion depth
 * @returns {string} Content with includes resolved
 */
function processIncludes(content, basePath, visited = new Set(), depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new IncludeError(`Maximum include depth (${MAX_DEPTH}) exceeded`);
  }

  return content.replace(INCLUDE_PATTERN, (match, quote, filePath) => {
    // Resolve the include path relative to the current file's directory
    const resolvedPath = isAbsolute(filePath) 
      ? filePath 
      : resolve(basePath, filePath);

    // Check for circular reference
    if (visited.has(resolvedPath)) {
      throw new IncludeError(
        `Circular reference detected: ${resolvedPath}\n` +
        `Include chain: ${Array.from(visited).join(' → ')}`
      );
    }

    // Check if file exists
    if (!existsSync(resolvedPath)) {
      throw new IncludeError(
        `Include file not found: ${filePath}\n` +
        `Resolved to: ${resolvedPath}\n` +
        `Referenced from: ${basePath}`,
        2 // Special exit code for missing includes
      );
    }

    // Read the file
    let includeContent;
    try {
      includeContent = readFileSync(resolvedPath, 'utf-8');
    } catch (err) {
      throw new IncludeError(
        `Failed to read include file: ${resolvedPath}\n` +
        `Error: ${err.message}`,
        3
      );
    }

    // Process nested includes
    const newVisited = new Set(visited);
    newVisited.add(resolvedPath);
    const processedContent = processIncludes(
      includeContent,
      dirname(resolvedPath),
      newVisited,
      depth + 1
    );

    return processedContent;
  });
}

/**
 * Process a template file and resolve all includes
 * @param {string} templatePath - Path to template file
 * @returns {string} Processed content
 */
export function processTemplateIncludes(templatePath) {
  if (!existsSync(templatePath)) {
    throw new IncludeError(`Template file not found: ${templatePath}`);
  }

  const content = readFileSync(templatePath, 'utf-8');
  const basePath = dirname(templatePath);
  
  return processIncludes(content, basePath);
}

// Export for use as module
export { processIncludes, IncludeError };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: process-includes.js <template-path>');
    process.exit(1);
  }

  try {
    const result = processTemplateIncludes(args[0]);
    process.stdout.write(result);
  } catch (err) {
    if (err instanceof IncludeError) {
      console.error(`Include Error: ${err.message}`);
      process.exit(err.code || 1);
    } else {
      console.error(`Unexpected error: ${err.message}`);
      process.exit(1);
    }
  }
}
```

#### 2. Update Main Prompt Processor
**File**: `scripts/process-prompt.js`
**Changes**: Integrate include processing before placeholder replacement

```javascript
import { processTemplateIncludes, IncludeError } from './process-includes.js';

// In processTemplate function, after reading the template:
function processTemplate(templatePath, settingsPath) {
  // Read and process includes first
  let template;
  try {
    template = processTemplateIncludes(templatePath);
  } catch (err) {
    if (err instanceof IncludeError) {
      console.error(`Include Error: ${err.message}`);
      process.exit(err.code || 2); // Exit code 2 for include errors
    }
    // Fallback to reading without includes if module not available
    if (!existsSync(templatePath)) {
      console.error(`Template not found: ${templatePath}`);
      process.exit(1);
    }
    template = readFileSync(templatePath, 'utf-8');
  }

  // Continue with existing placeholder processing...
  if (!template.includes('{{TASK_MANAGER_INSTRUCTIONS}}')) {
    return template;
  }

  const provider = determineProvider(settingsPath);
  const providerInstructions = loadProviderInstructions(provider);
  return template.replace('{{TASK_MANAGER_INSTRUCTIONS}}', providerInstructions);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Include processing script executable: `node scripts/process-includes.js`
- [ ] Integration with process-prompt.js works: `node scripts/process-prompt.js`

#### Manual Verification:
- [ ] Basic include works: Create test file with `@test.md` and verify substitution
- [ ] Nested includes work: Test file A includes B which includes C
- [ ] Relative paths work: Test `@../other/file.md` syntax
- [ ] Missing file causes subprocess exit with error code 2
- [ ] Circular reference detected and reported with clear error
- [ ] Error message shows include chain for debugging

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Shell Script Integration

### Overview
Integrate the include processing into the shell scripts that invoke the prompt processor, ensuring errors are properly propagated and the ralph subprocess exits on include failures.

### Changes Required:

#### 1. Update sync2.sh to Handle Include Errors
**File**: `scripts/sync2.sh`
**Changes**: Modify process_orchestrate_prompt to detect and handle include errors

```bash
# Update the process_orchestrate_prompt function
process_orchestrate_prompt() {
    if [ -f "$PROCESS_PROMPT_SCRIPT" ]; then
        # Run processor and capture exit code
        local output
        local exit_code
        
        output=$(node "$PROCESS_PROMPT_SCRIPT" "$ORCHESTRATE_PROMPT" "$ORCHESTRATE_SETTINGS" 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 2 ]; then
            # Include error - this is fatal
            error "Failed to process template includes:"
            error "$output"
            error ""
            error "Fix the missing include file and restart ralph."
            exit 2
        elif [ $exit_code -ne 0 ]; then
            error "Template processing failed:"
            error "$output"
            exit $exit_code
        fi
        
        echo "$output"
    else
        # Fallback to raw template if processor not available
        cat "$ORCHESTRATE_PROMPT"
    fi
}
```

#### 2. Update Workflow Processing
**File**: `scripts/sync2.sh`
**Changes**: Process includes for workflow files too

```bash
# Add new function to process workflow includes
process_workflow_includes() {
    local workflow_path="$1"
    
    if [ -f "$PROCESS_INCLUDES_SCRIPT" ]; then
        local output
        local exit_code
        
        output=$(node "$PROCESS_INCLUDES_SCRIPT" "$workflow_path" 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 2 ]; then
            error "Failed to process workflow includes:"
            error "$output"
            error ""
            error "Fix the missing include file and restart ralph."
            exit 2
        elif [ $exit_code -ne 0 ]; then
            error "Workflow processing failed:"
            error "$output"
            exit $exit_code
        fi
        
        echo "$output"
    else
        cat "$workflow_path"
    fi
}

# Update line 403 where workflow content is read:
WORKFLOW_CONTENT=$(process_workflow_includes "$WORKFLOW_PATH")
```

#### 3. Add Include Script Path
**File**: `scripts/sync2.sh`
**Changes**: Define path to include processor

```bash
# Add near top of file with other script paths (after line 23)
PROCESS_INCLUDES_SCRIPT="$SCRIPT_DIR/process-includes.js"
```

### Success Criteria:

#### Automated Verification:
- [ ] Shell script syntax valid: `bash -n scripts/sync2.sh`
- [ ] Include errors cause subprocess exit code 2
- [ ] Regular errors still handled appropriately

#### Manual Verification:
- [ ] Start ralph with valid includes - works normally
- [ ] Add invalid include to orchestrate.md - ralph exits, TUI shows error
- [ ] Fix include file - can restart with 's' key successfully
- [ ] Add invalid include to workflow - ralph exits during workflow phase
- [ ] Include errors show clear file paths and error messages

---

## Phase 3: TUI Error Display Enhancement

### Overview
Enhance the TUI to recognize and clearly display include errors, making it easy for users to understand what file is missing and where it was referenced.

### Changes Required:

#### 1. Add Include Error Detection
**File**: `src/hooks/use-ralph-process.ts`
**Changes**: Recognize exit code 2 as include error

```typescript
// In the process completion handler (around line 164):
child.then((result) => {
  const isNormalTermination =
    result.exitCode === 143 ||
    result.exitCode === 130 ||
    result.exitCode === 0 ||
    result.signal === 'SIGTERM' ||
    result.signal === 'SIGINT';

  if (!isNormalTermination) {
    // Check for specific error codes
    let errorMessage = `Ralph exited with code ${result.exitCode}`;
    
    if (result.exitCode === 2) {
      errorMessage = 'Ralph failed: Missing include file\n' +
        'Check the terminal output for details.\n' +
        'Fix the missing file and press "s" to restart.';
    }
    
    setError(new Error(errorMessage));
  }

  setIsRunning(false);
  setIsStarting(false);
});
```

#### 2. Create Include Error Parser
**File**: `src/lib/parser.ts`
**Changes**: Add function to parse include errors from JSONL

```typescript
export interface IncludeError {
  type: 'include_error';
  missingFile: string;
  referencedFrom: string;
  resolvedPath: string;
  timestamp: Date;
}

export function parseIncludeError(message: string): IncludeError | null {
  const includeErrorPattern = /Include file not found: (.+)\nResolved to: (.+)\nReferenced from: (.+)/;
  const match = message.match(includeErrorPattern);
  
  if (match) {
    return {
      type: 'include_error',
      missingFile: match[1],
      resolvedPath: match[2],
      referencedFrom: match[3],
      timestamp: new Date(),
    };
  }
  
  return null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm build`
- [ ] Tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Include errors display with clear messaging in TUI
- [ ] Error message indicates it's an include error
- [ ] User can press 's' to restart after fixing
- [ ] Error clears when ralph restarts successfully

---

## Phase 4: Testing and Documentation

### Overview
Add comprehensive tests for the include functionality and update documentation.

### Changes Required:

#### 1. Add Include Processor Tests
**File**: `scripts/process-includes.test.js`
**Changes**: Create test suite for include processing

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { processTemplateIncludes, IncludeError } from './process-includes.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('process-includes', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true });
  });

  it('processes basic include', () => {
    const includeFile = path.join(tempDir, 'include.md');
    const mainFile = path.join(tempDir, 'main.md');
    
    fs.writeFileSync(includeFile, '# Included Content');
    fs.writeFileSync(mainFile, 'Before\n@include.md\nAfter');
    
    const result = processTemplateIncludes(mainFile);
    expect(result).toBe('Before\n# Included Content\nAfter');
  });

  it('processes nested includes', () => {
    const deepFile = path.join(tempDir, 'deep.md');
    const middleFile = path.join(tempDir, 'middle.md');
    const mainFile = path.join(tempDir, 'main.md');
    
    fs.writeFileSync(deepFile, 'Deep content');
    fs.writeFileSync(middleFile, 'Middle\n@deep.md');
    fs.writeFileSync(mainFile, 'Main\n@middle.md');
    
    const result = processTemplateIncludes(mainFile);
    expect(result).toBe('Main\nMiddle\nDeep content');
  });

  it('handles quoted paths', () => {
    const includeFile = path.join(tempDir, 'my file.md');
    const mainFile = path.join(tempDir, 'main.md');
    
    fs.writeFileSync(includeFile, 'Content');
    fs.writeFileSync(mainFile, '@"my file.md"');
    
    const result = processTemplateIncludes(mainFile);
    expect(result).toBe('Content');
  });

  it('detects circular references', () => {
    const fileA = path.join(tempDir, 'a.md');
    const fileB = path.join(tempDir, 'b.md');
    
    fs.writeFileSync(fileA, '@b.md');
    fs.writeFileSync(fileB, '@a.md');
    
    expect(() => processTemplateIncludes(fileA)).toThrow(IncludeError);
    expect(() => processTemplateIncludes(fileA)).toThrow(/Circular reference/);
  });

  it('throws on missing file', () => {
    const mainFile = path.join(tempDir, 'main.md');
    fs.writeFileSync(mainFile, '@missing.md');
    
    expect(() => processTemplateIncludes(mainFile)).toThrow(IncludeError);
    expect(() => processTemplateIncludes(mainFile)).toThrow(/not found/);
  });
});
```

#### 2. Add Example Templates
**File**: `templates/examples/modular-prompt.md`
**Changes**: Create example showing include usage

```markdown
# Modular Orchestration Prompt

This prompt demonstrates the include functionality.

## Base Instructions
@../orchestrate-base.md

## Project-Specific Context
@./project-context.md

## Custom Workflows
@./workflows-custom.md

{{TASK_MANAGER_INSTRUCTIONS}}
```

### Success Criteria:

#### Automated Verification:
- [ ] All tests pass: `pnpm test:run`
- [ ] Include processor tests cover all cases
- [ ] Integration tests verify end-to-end functionality

#### Manual Verification:
- [ ] Example templates work when copied to .ralph/
- [ ] Documentation clearly explains include syntax
- [ ] Error messages are helpful for debugging

---

## Testing Strategy

### Unit Tests:
- Include pattern matching with various quote styles
- Recursive include processing
- Circular reference detection
- Path resolution (relative, absolute)
- Error generation and codes

### Integration Tests:
- Full prompt processing pipeline with includes
- Shell script error propagation
- TUI error display for include failures
- Process lifecycle with include errors

### Manual Testing Steps:
1. Create test orchestrate.md with `@test-include.md`
2. Start ralph - verify include processed
3. Delete test-include.md while ralph running
4. Start new session - verify error and subprocess exit
5. Create the missing file
6. Press 's' to restart - verify success
7. Test nested includes (3+ levels deep)
8. Test circular reference detection
9. Test relative paths (`@../prompts/base.md`)
10. Test quoted paths for files with spaces

## Performance Considerations

- File reads are synchronous but only happen at session start
- No caching means files are always fresh but may impact startup time with many includes
- Circular reference detection uses Set for O(1) lookup performance
- Maximum depth limit prevents stack overflow from deep recursion

## Assumptions Made

1. **Include Syntax**: Using `@file` syntax as specified, with optional quotes for paths with spaces
2. **Exit Code 2**: Chosen for include errors to distinguish from other failures
3. **No Caching**: Files always read fresh as specified, accepting potential performance impact
4. **Recursive Includes**: Assumed desirable based on modular prompt use cases
5. **Error Display**: TUI continues running but subprocess exits, matching current error handling patterns

## References

- Task definition: `.ai-docs/thoughts/plans/prompt-includes/task.md`
- Research doc: `.ai-docs/thoughts/plans/prompt-includes/research.md`
- Current template processor: `scripts/process-prompt.js:70`
- Process management: `src/hooks/use-ralph-process.ts:154`
- Shell orchestration: `scripts/sync2.sh:66`
- Similar include pattern: Settings.json `@file:` syntax (not currently used)
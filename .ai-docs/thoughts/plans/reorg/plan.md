# Repository Reorganization Plan

## Problem Statement

The current repository structure places the TUI source code inside `.ralph/tui/`. This creates a conflict:

1. **For end users**: When users run `ralph init` in their projects, Ralph creates a `.ralph/` directory for runtime artifacts (logs, lock files, prompts, workflows)
2. **For this repo**: The source code lives in `.ralph/tui/`, which means if we develop Ralph TUI using Ralph itself (dogfooding), the runtime `.ralph/` would conflict with the source code location

This is confusing and architecturally unsound. The source code should be at a top-level location, and `.ralph/` should be reserved purely for runtime artifacts.

---

## Current Structure

```
ralph-tui/
├── .ai-docs/                    # AI-native documentation
│   ├── adr/                     # Architecture Decision Records
│   ├── design/                  # Product brief, tech stack
│   ├── prompts/                 # AI prompt templates
│   └── thoughts/                # Research, notes, plans
│
├── .claude/                     # Claude Code configuration
├── .github/                     # GitHub Actions workflows
├── docs/                        # User documentation
│
├── .ralph/                      # PROBLEMATIC: Mixed source + runtime
│   ├── tui/                     # TUI SOURCE CODE
│   │   ├── src/                 # TypeScript source
│   │   ├── dist/                # Compiled output
│   │   ├── defaults/            # Files copied during `ralph init`
│   │   │   └── prompts/         # Default prompts (execute.md, plan.md)
│   │   ├── templates/           # Example templates
│   │   ├── node_modules/
│   │   ├── package.json
│   │   ├── install.sh
│   │   └── ...
│   │
│   ├── workflows/               # Workflow definitions (6 workflows)
│   │   ├── 01-feature-branch-incomplete.md
│   │   ├── 02-feature-branch-pr-ready.md
│   │   ├── 03-pr-pipeline-fix.md
│   │   ├── 04-cd-pipeline-fix.md
│   │   ├── 05-resume-in-progress.md
│   │   ├── 06-new-work.md
│   │   ├── index.md
│   │   └── README.md
│   │
│   ├── archive/                 # Archived logs (gitignored)
│   ├── planning/                # Assignment files (gitignored)
│   │
│   ├── orchestrate.md           # Orchestration prompt
│   ├── resume.md                # Resume prompt
│   ├── prompt.md                # (DEPRECATED - no longer used)
│   │
│   ├── ralph.sh                 # Main loop script
│   ├── ralph-mock.sh            # Mock script for testing
│   ├── sync2.sh                 # Current sync script
│   ├── kill.sh                  # Process kill helper
│   ├── visualize.py             # Python log visualizer
│   │
│   ├── README.md                # Ralph usage documentation
│   ├── claude_output.jsonl      # Runtime log (gitignored)
│   └── *.jsonl.gz               # Compressed logs (gitignored)
│
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
├── package.json                 # Root pnpm shortcuts
└── README.md
```

### Files by Category

| Category | Files | Purpose |
|----------|-------|---------|
| **TUI Source** | `.ralph/tui/*` | The npm package source code |
| **Default Workflows** | `.ralph/workflows/*.md` | Templates copied to user projects |
| **Default Prompts** | `orchestrate.md`, `resume.md` | Templates for autonomous execution |
| **Unused Prompts** | `.ralph/tui/defaults/prompts/*` | **DEPRECATED** - plan.md, execute.md never used |
| **Runtime Scripts** | `ralph.sh`, `sync2.sh`, `kill.sh` | Scripts for running autonomous loops |
| **Utilities** | `visualize.py` | Development/debugging tools |
| **Runtime Artifacts** | `claude_output.jsonl`, `archive/`, `planning/` | Gitignored runtime files |

> **Note**: `prompt.md` has been removed and is no longer used.

---

## Proposed Structure (Flattened)

Since this repo IS the ralph npm package, we flatten the structure - no nested `tui/` folder. This eliminates duplicate `package.json`, `LICENSE`, and `README.md` files.

```
ralph-tui/
├── src/                         # TUI SOURCE CODE (moved from .ralph/tui/src/)
│   ├── cli.tsx                  # Entry point
│   ├── app.tsx                  # Main React app
│   ├── components/              # React components
│   ├── hooks/                   # React hooks
│   ├── lib/                     # Utilities
│   └── test/                    # Test files
│
├── dist/                        # Compiled output (gitignored)
├── node_modules/                # Dependencies (gitignored)
│
├── templates/                   # Example templates for reference
│   ├── execute.example.md
│   └── plan.example.md
│
├── workflows/                   # DEFAULT WORKFLOWS - AUTHORITATIVE SOURCE
│   ├── 01-feature-branch-incomplete.md
│   ├── 02-feature-branch-pr-ready.md
│   ├── 03-pr-pipeline-fix.md
│   ├── 04-cd-pipeline-fix.md
│   ├── 05-resume-in-progress.md
│   ├── 06-new-work.md
│   ├── index.md
│   └── README.md
│
├── prompts/                     # DEFAULT PROMPTS - AUTHORITATIVE SOURCE
│   ├── orchestrate.md           # Orchestration prompt (can be overridden by user)
│   └── resume.md                # Resume prompt (can be overridden by user)
│
├── scripts/                     # RUNTIME SCRIPTS
│   ├── ralph.sh                 # Main autonomous loop
│   ├── ralph-mock.sh            # Mock for testing
│   ├── sync2.sh                 # Current two-phase sync
│   ├── kill.sh                  # Process cleanup helper
│   └── visualize.py             # Log visualization tool
│
├── .ai-docs/                    # AI-native documentation (unchanged)
│   ├── adr/
│   ├── design/
│   ├── prompts/
│   └── thoughts/
│
├── .claude/                     # Claude Code configuration (unchanged)
├── .github/                     # GitHub Actions (unchanged)
├── docs/                        # User documentation (unchanged)
│
├── .ralph/                      # RUNTIME ONLY (gitignored, created at runtime)
│   ├── claude_output.jsonl      # Session logs
│   ├── claude.lock              # Lock file
│   ├── archive/                 # Compressed log archives
│   └── planning/                # Assignment files
│
├── package.json                 # THE npm package (single source of truth)
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── vitest.workspace.ts
├── postcss.config.mjs           # PostCSS configuration
├── install.sh
├── test-ci.sh
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
├── README.md
└── TESTING.md
```

### Benefits of Flattened Structure

1. **Single package.json** - no duplication, no "shortcut" scripts
2. **Single LICENSE/README** - clear ownership
3. **Standard npm layout** - `src/` at root is conventional
4. **Cleaner navigation** - no extra nesting level
5. **The repo IS the package** - what you clone is what you publish

### Default File Hierarchy

The root-level directories are the **authoritative default sources**:

| Directory | Purpose | User Override |
|-----------|---------|---------------|
| `workflows/` | Default workflow definitions | Users can create custom workflows in their project |
| `prompts/` | Orchestration and resume prompts | Users can override by placing files in their `.ralph/prompts/` |

**Key principle**: End users can optionally override any default by placing their own version in the appropriate location in their project.

### IMPORTANT: Runtime vs Source Path References

Some files intentionally reference `.ralph/` paths because they describe **end-user project structure**, not this source repo. **DO NOT update these references**:

| File | Reference | Purpose |
|------|-----------|---------|
| `orchestrate.md` | `.ralph/workflows/` | Tells the agent where to find workflows in USER projects |
| `sync2.sh` | `.ralph/workflows/` | Validates workflows exist in USER projects |
| `config.ts` | `promptsDir: '.ralph/prompts'` | Default config for USER projects |
| `parser.ts` | `.ralph/workflows/` docstrings | Documents parsing of USER project paths |

These paths are **correct** - they define the runtime structure for end users, not this source repository.

---

## Migration Steps

### Phase 1: Move TUI Source Code to Root (Flatten)

1. **Move TUI source and config files to root**
   ```bash
   # Move source code
   git mv .ralph/tui/src src

   # Move config files
   git mv .ralph/tui/package.json package.json
   git mv .ralph/tui/pnpm-lock.yaml pnpm-lock.yaml
   git mv .ralph/tui/tsconfig.json tsconfig.json
   git mv .ralph/tui/vitest.config.ts vitest.config.ts
   git mv .ralph/tui/vitest.workspace.ts vitest.workspace.ts

   # Move templates
   git mv .ralph/tui/templates templates

   # Delete unused defaults (plan.md and execute.md are vestigial)
   rm -rf .ralph/tui/defaults

   # Move scripts and docs
   git mv .ralph/tui/install.sh install.sh
   git mv .ralph/tui/test-ci.sh test-ci.sh
   git mv .ralph/tui/TESTING.md TESTING.md

   # Move additional config files
   git mv .ralph/tui/postcss.config.mjs postcss.config.mjs

   # Delete duplicate lock file (use pnpm only)
   rm .ralph/tui/package-lock.json
   ```

2. **Delete the temporary root package.json** (the one with shortcuts)
   ```bash
   # The .ralph/tui/package.json becomes the new root package.json
   # Delete the old shortcut package.json if it exists
   ```

3. **Merge LICENSE and README.md**
   - Keep root `LICENSE` (or use `.ralph/tui/LICENSE` if more complete)
   - Merge `.ralph/tui/README.md` content into root `README.md`
   ```bash
   rm .ralph/tui/LICENSE  # Use root LICENSE
   # Manually merge README content, then:
   rm .ralph/tui/README.md
   ```

4. **Clean up empty tui directory**
   ```bash
   rmdir .ralph/tui  # Should be empty now (except node_modules, dist, coverage)
   # Or: rm -rf .ralph/tui  # If gitignored artifacts remain
   ```

5. **Update AGENTS.md** - change all references from `.ralph/tui/` to root paths

6. **Update README.md** - update development instructions

### Phase 2: Move Workflows

1. **Move workflows directory**
   ```bash
   git mv .ralph/workflows workflows
   ```

2. **Update TUI init command** to copy from new location (if applicable)

3. **Update any scripts** that reference `.ralph/workflows/`

### Phase 3: Move Prompts

1. **Create prompts directory and move files**
   ```bash
   mkdir prompts
   git mv .ralph/orchestrate.md prompts/
   git mv .ralph/resume.md prompts/
   ```

2. **Update sync2.sh** - change `ORCHESTRATE_PROMPT` path

3. **Update any documentation** referencing prompt locations

### Phase 4: Move Scripts

1. **Create scripts directory and move files**
   ```bash
   mkdir scripts
   git mv .ralph/ralph.sh scripts/
   git mv .ralph/ralph-mock.sh scripts/
   git mv .ralph/sync2.sh scripts/
   git mv .ralph/kill.sh scripts/
   git mv .ralph/visualize.py scripts/

   # Delete deprecated sync.sh (old script that references removed prompt.md)
   rm .ralph/sync.sh
   ```

2. **Update internal references** in scripts:
   - `ralph.sh` references `sync2.sh` → update path
   - `sync2.sh` references `visualize.py` → update path
   - `kill.sh` references `.ralph/` → update patterns

3. **Make scripts location-aware** - scripts should work from repo root

### Phase 5: <REMOVED>

### Phase 6: Handle Runtime Artifacts

1. **Delete runtime artifacts** (they're gitignored anyway)
   ```bash
   rm -rf .ralph/archive
   rm -rf .ralph/planning
   rm -f .ralph/claude_output.jsonl
   rm -f .ralph/claude.lock
   rm -f .ralph/*.jsonl.gz
   ```

2. **Delete .ralph README** (will be replaced by docs)
   ```bash
   rm .ralph/README.md
   ```

3. **Remove empty .ralph directory**
   ```bash
   rmdir .ralph
   ```

### Phase 7: Update .gitignore

The current `.gitignore` has TUI-specific entries (lines 53-59) that need updating:

**Remove these entries** (no longer applicable):
```gitignore
# OLD - Remove these
.ralph/tui/node_modules/
.ralph/tui/dist/
.ralph/tui/.ralph/
.ralph/test_output.jsonl
.ralph/tui/debug-*.js
```

**Replace with**:
```gitignore
# Dependencies and build output
node_modules/
dist/
coverage/

# Ralph runtime artifacts (created during autonomous execution)
.ralph/

# Debug files
debug-*.js
```

This simplifies the gitignore since source is at root and `.ralph/` is purely runtime.

### Phase 8: Update Documentation

**IMPORTANT**: Documentation updates are extensive. Many files contain outdated paths and references to deprecated prompts.

#### 8.1 Core Project Documentation

1. **Update `AGENTS.md`**:
   - Repository Structure section (lines 9-16): Change `.ralph/tui/` → root paths
   - Development Commands section (lines 18-39): Remove `cd .ralph/tui` prefix
   - Component Structure section (lines 59-80): Update `src/` paths

2. **Update `README.md`** (root):
   - Merge comprehensive content from `.ralph/tui/README.md`
   - Update "Repo Organization" section to reflect new structure:
     - `src/` - TUI source code
     - `workflows/` - Default workflow definitions
     - `prompts/` - Default prompts (orchestrate.md, resume.md)
     - `scripts/` - Runtime scripts
     - `docs/` - User documentation
   - Update development commands (remove `.ralph/tui` references)

3. **`CLAUDE.md`**: No changes needed (just references `@AGENTS.md`)

#### 8.2 Design Documentation

4. **Update `.ai-docs/design/tech-stack.md`**:
   - "Directory Structure (Current)" section (lines 87-116): Replace with new flattened structure
   - "Development Workflow" section (lines 321-341): Remove `cd .ralph/tui` commands
   - "Technical Debt" section (line 317): Update shell script paths

5. **Update `.ai-docs/design/product-brief.md`** (MAJOR):
   - "What `ralph init` Creates" section (lines 119-141): Remove `plan.md`, `execute.md` references
   - "Generated Files" section (lines 143-326): Remove entire plan.md/execute.md documentation
   - "Prompt Override Behavior" section (lines 314-326): Simplify to only orchestrate.md/resume.md
   - "Configuration Files" structure (lines 369-395): Update to reflect new prompts only
   - All workflow configuration sections: Update directory paths
   - Consider marking this document for comprehensive rewrite post-migration

#### 8.3 User Documentation

6. **Update `docs/commands/init.md`** (COMPLETE REWRITE):
   - "What Gets Created" section: Remove plan.md, execute.md, example files
   - Update to show only: settings.json, orchestrate.md, resume.md (copied from defaults)
   - Remove "Prompt Files" subsection describing plan/execute
   - Update all example outputs
   - Update "Next steps" section

7. **Update `docs/configuration.md`**:
   - Line 71, 114: `promptsDir` references still valid (for user projects)
   - Add note clarifying prompts are now only orchestrate.md and resume.md
   - Update example paths if any reference old structure

8. **`docs/task-adapters.md`**: No changes needed (no path references)

#### 8.4 ADRs and Thoughts

9. **Check `.ai-docs/adr/`** for any path references to update
10. **Note**: `.ai-docs/thoughts/plans/reorg/plan.md` (this file) documents the migration itself

### Phase 9: Update TUI Init Command

The `ralph init` command needs to know where to find default files.

**Approach: Root directories are authoritative, bundled in npm package**

The npm package will include:
- `workflows/` - default workflow definitions
- `prompts/` - orchestrate.md and resume.md only
- `scripts/` - runtime scripts

During `ralph init`:
1. Copy `workflows/` → user's `.ralph/workflows/`
2. Copy `prompts/` → user's `.ralph/prompts/` (orchestrate.md, resume.md)
3. Copy `scripts/` → user's `.ralph/` (ralph.sh, sync2.sh, etc.)

**User overrides**: Users can modify any of these files in their project. The defaults serve as starting points.

### Phase 10: Update CI Pipelines

**CRITICAL**: Both CI workflows use `working-directory: .ralph/tui` which must change.

1. **Update `.github/workflows/pr.yml`**:
   ```yaml
   # BEFORE (in all jobs)
   defaults:
     run:
       working-directory: .ralph/tui
   cache-dependency-path: .ralph/tui/pnpm-lock.yaml

   # AFTER (flattened - remove working-directory, update cache path)
   # Remove 'defaults.run.working-directory' entirely (now at root)
   cache-dependency-path: pnpm-lock.yaml
   ```

   Jobs to update:
   - `typecheck` (lines 14-17, 29)
   - `unit-tests` (lines 40-42, 54)
   - `integration-tests` (lines 66-68, 80)
   - `e2e-tests` (lines 95-97, 109)
   - `build` (lines 124-126, 138)

2. **Update `.github/workflows/release.yml`**:
   ```yaml
   # Same changes as pr.yml
   ```

   Jobs to update:
   - `validate` (lines 16-18, 30)
   - `publish` (lines 49-51, 64)

3. **Verify after changes**:
   - `pnpm install` works at root
   - `pnpm typecheck` works at root
   - `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` all work
   - `pnpm build` produces `dist/cli.js`

### Phase 11: Update Test Files

Tests are affected in two ways:
1. **Path changes** - tests that reference old paths need updating
2. **Deprecated files** - tests for plan.md/execute.md need removal

#### Tests Affected by Deprecated Prompts

**`src/commands/init.test.ts`** - Remove/update these test cases:
- `'creates plan.md as empty file'` (line 64)
- `'creates execute.md as empty file'` (line 85)
- All `expect().toContain('.ralph/prompts/plan.md')` assertions
- All `expect().toContain('.ralph/prompts/execute.md')` assertions
- All `expect().toContain('.ralph/prompts/plan.example.md')` assertions
- All `expect().toContain('.ralph/prompts/execute.example.md')` assertions

**`src/test/init.test.ts`** - Remove/update:
- `'creates plan.md file'` (line 73)
- `'creates execute.md file'` (line 79)
- `'preserves existing plan.md content'` (line 121)
- Related assertions

**`src/test/e2e/workflows.test.tsx`** - Remove/update:
- Assertions expecting plan.md/execute.md creation (lines 321-322)

#### Tests with Workflow Path References

**`src/test/parser.test.ts`** - Update workflow path expectations:
- `extractWorkflowName('.ralph/workflows/01-feature-branch-incomplete.md')` (line 297)
- `extractWorkflowName('.ralph/workflows/06-new-work.md')` (line 302)
- `extractWorkflowName('.ralph/workflows/02-feature-branch-pr-ready.md')` (line 307)
- Note: These test the parsing function, paths may stay as-is since they parse USER project paths

**`src/components/header.test.tsx`** - Update workflow path:
- Line 45: `workflow: '.ralph/workflows/01-new-work.md'`
- Note: This tests display of user project paths, may not need change

#### Tests That May Need Path Updates

If any tests reference paths like `.ralph/tui/`, they need updating:
- Check all test files for hardcoded paths
- Update `PACKAGE_ROOT` calculations if any exist in tests
- **`src/lib/config.test.ts`** - verify default path references

#### Test Configuration Files

**`vitest.workspace.ts`** - verify paths still work:
```typescript
// These relative paths should still work since they're relative to package root
include: ['src/components/**/*.test.{ts,tsx}', ...]
```

**`vitest.config.ts`** - verify no path changes needed

### Phase 12: Deprecate Unused Prompts (plan.md, execute.md)

These files are **vestigial** - created by `ralph init` but never actually used at runtime.

1. **Update `src/commands/init.ts`** - remove creation of:
   - `.ralph/prompts/plan.md`
   - `.ralph/prompts/plan.example.md`
   - `.ralph/prompts/execute.md`
   - `.ralph/prompts/execute.example.md`

2. **Delete template files**:
   ```bash
   rm templates/plan.example.md
   rm templates/execute.example.md
   ```

3. **Update documentation**:
   - `docs/commands/init.md` - remove references
   - `.ai-docs/design/product-brief.md` - remove plan/execute prompt sections

---

## Script Updates Required

### ralph.sh

```bash
# OLD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync2.sh"

# NEW - scripts are in scripts/, need to reference each other
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync2.sh"
# (still works if both are in scripts/)
```

### sync2.sh

```bash
# OLD
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ORCHESTRATE_PROMPT="$SCRIPT_DIR/orchestrate.md"
uv run --no-project "$SCRIPT_DIR/visualize.py"

# NEW
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ORCHESTRATE_PROMPT="$REPO_ROOT/prompts/orchestrate.md"
uv run --no-project "$SCRIPT_DIR/visualize.py"
```

### kill.sh

```bash
# OLD - kills processes in .ralph/
RALPH_DIR_PIDS=$(pgrep -f '\.ralph/' 2>/dev/null)

# NEW - update patterns for new structure
SCRIPT_DIR_PIDS=$(pgrep -f 'scripts/' 2>/dev/null)
```

---

## File Reference Updates

### Files that reference `.ralph/tui/`

| File | References | Update To |
|------|------------|-----------|
| `AGENTS.md` | Multiple | Root paths (`src/`, `package.json`, etc.) |
| `README.md` | Development section | Root paths |
| `package.json` | N/A (becomes root package.json) | N/A |
| `.gitignore` | Ignore patterns | `dist/`, `node_modules/`, `.ralph/` |

### Files that reference `.ralph/workflows/`

| File | References | Update To |
|------|------------|-----------|
| `sync2.sh` | Workflow validation | `workflows/` |
| `orchestrate.md` | Workflow paths | `workflows/` |
| Workflow files themselves | Cross-references | `workflows/` |

### Files that reference `.ralph/*.md` prompts

| File | References | Update To |
|------|------------|-----------|
| `sync2.sh` | `ORCHESTRATE_PROMPT` | `prompts/orchestrate.md` |

> **Note**: `prompt.md` has been removed and is no longer used. `resume.md` is now standalone.

---

## Validation Checklist

After migration, verify:

### Local Development
- [ ] `pnpm install` works from root
- [ ] `pnpm build` compiles TUI successfully
- [ ] `pnpm typecheck` passes
- [ ] `pnpm link` creates global `ralph` command
- [ ] `ralph --help` works
- [ ] `ralph init` copies files to a test project correctly (without plan.md/execute.md)

### Tests
- [ ] `pnpm test:unit` passes all unit tests
- [ ] `pnpm test:integration` passes all integration tests
- [ ] `pnpm test:e2e` passes all E2E tests
- [ ] No tests reference deprecated plan.md/execute.md files
- [ ] No tests reference old `.ralph/tui/` paths

### CI Pipeline
- [ ] Push to a PR branch triggers pr.yml successfully
- [ ] All CI jobs pass: typecheck, unit-tests, integration-tests, e2e-tests, build
- [ ] CI uses correct paths (root, not .ralph/tui/)
- [ ] Cache dependency path is correct (pnpm-lock.yaml at root)

### Runtime Scripts
- [ ] `scripts/ralph.sh` runs without errors
- [ ] `scripts/sync2.sh` finds `prompts/orchestrate.md` correctly
- [ ] Workflow validation in sync2.sh finds `workflows/` correctly

### Documentation & History
- [ ] All documentation links are valid
- [ ] Git history is preserved for moved files
- [ ] No references to deprecated prompts in docs
- [ ] `AGENTS.md` updated with new paths
- [ ] `README.md` updated with new structure and merged TUI readme content
- [ ] `.ai-docs/design/tech-stack.md` directory structure updated
- [ ] `.ai-docs/design/product-brief.md` init section rewritten
- [ ] `docs/commands/init.md` rewritten (no plan.md/execute.md)
- [ ] `docs/configuration.md` prompts section updated

---

## Rollback Plan

If issues arise, revert with:

```bash
git revert HEAD~<n>  # Revert the migration commits
```

Or restore from backup:

```bash
git checkout <pre-migration-commit> -- .ralph/
```

---

## Benefits of New Structure

1. **Clear separation**: Source code (root-level `src/`) vs runtime artifacts (`.ralph/`)
2. **Dogfooding works**: Can develop Ralph using Ralph without conflicts
3. **Intuitive layout**: Top-level folders match their purpose
4. **Easier navigation**: No digging into hidden directories for source
5. **Standard conventions**: Follows typical monorepo/package layouts

---

## Open Questions

(None)

---

## Resolved Decisions

1. **Root directories are authoritative**: `workflows/` and `prompts/` at root are the authoritative default sources, not copies. They ship with the npm package and are copied to user projects during `ralph init`.

2. **`prompt.md` removed**: This file is no longer used and should not be migrated.

3. **Only two prompts needed**: `orchestrate.md` and `resume.md`. The `plan.md` and `execute.md` files are vestigial (created by init but never used) and should be deprecated.

4. **Flattened structure**: No nested `tui/` folder. The repo IS the npm package. This eliminates duplicate `package.json`, `LICENSE`, and `README.md` files.

5. **No defaults/ directory**: All prompts live in `prompts/`. The `defaults/` folder is eliminated entirely.

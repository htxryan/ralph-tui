# Template Reorganization Plan

**Issue**: [#32 - Reorg templates](https://github.com/htxryan/ralph-tui/issues/32)
**Branch**: `spike/ralph`
**Status**: Planning

---

## Executive Summary

This plan addresses a significant reorganization of Ralph's template and configuration structure to support a project-based workflow model. The key changes include:

1. Moving bundled prompts out of user-copied templates
2. Introducing a project selection UI at startup
3. Restructuring the `.ralph/` directory to support multiple "projects" (execution modes)
4. Simplifying the assignment.json schema and location
5. Adding template variable substitution at runtime

---

## Current State Analysis

### Directory Structure (Current)

```
ralph-tui/
├── templates/
│   └── providers/                    # Task manager instructions
│       ├── github-issues.md
│       └── vibe-kanban.md
├── prompts/
│   ├── orchestrate.md                # Main orchestration prompt (exists)
│   └── resume.md                     # Resume prompt (exists)
└── .ralph/                           # Example project config (gitignored in prod)
    ├── settings.json
    └── projects/
        ├── develop/
        │   ├── execute.md
        │   └── settings.json
        └── refine/
            ├── execute.md
            └── settings.json
```

### Current Issues

1. **`ralph init` copies orchestrate.md** - This file should be bundled, not copied
2. **No project selection UI** - Ralph doesn't know which project to use
3. **Assignment file path** - Currently `.ralph/planning/assignment.json`, should be `.ralph/assignment.json`
4. **Assignment schema outdated** - Needs `next_step` and `pull_request_url` fields
5. **No `{{execute_path}}` substitution** - Orchestrate.md references this placeholder but it's never replaced
6. **Workflow templates removed but init.ts still references them** - The 01-06 workflow files are gone but code expects them

---

## Target State

### Directory Structure (After Implementation)

```
ralph-tui/
├── .ralph-templates/                 # SOURCE for ralph init (bundled)
│   ├── settings.json                 # Template settings
│   └── projects/
│       └── default/                  # Example project
│           ├── execute.md
│           └── settings.json
├── prompts/                          # Bundled prompts (read at runtime, NOT copied)
│   ├── orchestrate.md
│   └── resume.md
├── templates/
│   └── providers/                    # Task manager instructions (unchanged)
│       ├── github-issues.md
│       └── vibe-kanban.md
└── package.json                      # files: [..., ".ralph-templates"]
```

### User's `.ralph/` Structure (After `ralph init`)

```
.ralph/
├── settings.json                     # Root configuration
├── settings.local.json               # Local overrides (gitignored)
├── assignment.json                   # Current task assignment (NEW LOCATION)
├── claude_output.jsonl               # Session logs
├── claude.lock                       # Lock file
├── archive/                          # Archived sessions
└── projects/                         # Project configurations
    ├── develop/
    │   ├── execute.md               # Execution workflow
    │   ├── settings.json            # Project-specific settings
    │   └── settings.local.json      # Project-specific local overrides
    └── refine/
        ├── execute.md
        ├── settings.json
        └── settings.local.json
```

### New Assignment Schema

```json
{
  "task_id": "<task-identifier>",
  "next_step": "<next_step>",
  "pull_request_url": null
}
```

---

## Implementation Tasks

### Phase 1: Template Structure Reorganization

#### 1.1 Create `.ralph-templates/` Directory

**Files to create:**
- `.ralph-templates/settings.json` - Template with default task management config
- `.ralph-templates/projects/default/execute.md` - Example execution workflow
- `.ralph-templates/projects/default/settings.json` - Example project settings

**Actions:**
1. Create `.ralph-templates/` directory structure
2. Create template files with placeholder content
3. Add `.ralph-templates` to package.json `files` array

#### 1.2 Update `init.ts` Command

**File:** `src/commands/init.ts`

**Changes:**
1. Change template source from `templates/` to `.ralph-templates/`
2. Remove orchestrate.md from files to copy (it's bundled)
3. Remove workflow files from files to copy (replaced by projects)
4. Update `loadTemplate()` to use new path
5. Add new helper `getTemplatesDir()` to return `.ralph-templates` path
6. Update `getFilesToCreate()` to copy the new structure:
   - `.ralph/settings.json`
   - `.ralph/projects/default/execute.md`
   - `.ralph/projects/default/settings.json`

#### 1.3 Update Package Bundling

**File:** `package.json`

**Changes:**
```json
{
  "files": [
    "dist",
    "prompts",
    "scripts",
    "templates",
    ".ralph-templates",  // NEW
    "README.md",
    "LICENSE"
  ]
}
```

---

### Phase 2: Project Selection UI

#### 2.1 Create Project Picker Component

**File:** `src/components/project-picker.tsx` (NEW)

**Features:**
1. List available projects from `.ralph/projects/`
2. Display project name and description (from settings or execute.md header)
3. Allow keyboard navigation (↑/↓, Enter to select)
4. Handle case when no projects exist (prompt to run `ralph init`)
5. Visual design similar to `SessionPicker` component

**Props:**
```typescript
interface ProjectPickerProps {
  projects: ProjectInfo[];
  onSelectProject: (project: ProjectInfo) => void;
  onClose: () => void;
  width?: number;
  maxHeight?: number;
}

interface ProjectInfo {
  name: string;           // Directory name (e.g., "develop")
  path: string;           // Full path to project dir
  displayName?: string;   // Human-readable name from settings
  description?: string;   // Description from settings
}
```

#### 2.2 Create `useProjects` Hook

**File:** `src/hooks/use-projects.ts` (NEW)

**Features:**
1. Scan `.ralph/projects/` directory for project subdirectories
2. Load each project's `settings.json` to get display metadata
3. Watch for changes to project directory
4. Return list of available projects

**Interface:**
```typescript
interface UseProjectsResult {
  projects: ProjectInfo[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}
```

#### 2.3 Add Project State to App

**File:** `src/app.tsx`

**Changes:**
1. Add `activeProject: ProjectInfo | null` state
2. Show `ProjectPicker` on startup when no project is active
3. Pass active project to header for display
4. Store selected project in session (localStorage or file)
5. Add ability to switch projects (new shortcut key)

#### 2.4 Update Header Component

**File:** `src/components/header.tsx`

**Changes:**
1. Display active project name
2. Show project-specific label filter if configured

---

### Phase 3: Configuration Merging

#### 3.1 Update Config Loading System

**File:** `src/lib/config.ts`

**Changes:**
1. Add `loadProjectConfig(projectPath: string)` function
2. Implement config merging order:
   1. Built-in defaults
   2. Global user config
   3. Project settings (`.ralph/settings.json`)
   4. Project local settings (`.ralph/settings.local.json`)
   5. Active project settings (`.ralph/projects/<name>/settings.json`)
   6. Active project local settings (`.ralph/projects/<name>/settings.local.json`)
   7. CLI arguments
3. Add support for `variables` field in settings (for template substitution)

**New Types:**
```typescript
interface ProjectConfig {
  taskManagement?: Partial<TaskManagementConfig>;
  variables?: Record<string, string>;  // NEW: Template variables
  displayName?: string;                 // Human-readable project name
  description?: string;                 // Project description
}
```

#### 3.2 Add Template Variable Substitution

**File:** `src/lib/template.ts` (NEW)

**Features:**
1. `substituteVariables(template: string, variables: Record<string, string>): string`
2. Replace `{{variable_name}}` patterns with values from config
3. Handle missing variables (log warning, leave placeholder)
4. Special variable `{{execute_path}}` resolves to active project's execute.md path

---

### Phase 4: Assignment File Changes

#### 4.1 Update Assignment Type

**File:** `src/lib/types.ts`

**Changes:**
```typescript
// OLD
export interface Assignment {
  workflow?: string;
  task_id?: string;
}

// NEW
export interface Assignment {
  task_id: string;
  next_step: string;
  pull_request_url: string | null;
}
```

#### 4.2 Update Assignment Hook

**File:** `src/hooks/use-assignment.ts`

**Changes:**
1. Change path from `.ralph/planning/assignment.json` to `.ralph/assignment.json`
2. Update parsing to handle new schema
3. Add backwards compatibility for old schema during transition

#### 4.3 Update sync2.sh

**File:** `scripts/sync2.sh`

**Changes:**
1. Update `ASSIGNMENT_FILE` from `.ralph/planning/assignment.json` to `.ralph/assignment.json`
2. Update validation logic for new schema
3. Remove `workflow` field validation, add `next_step` validation

#### 4.4 Update orchestrate.md Schema Reference

**File:** `prompts/orchestrate.md`

**Changes:**
1. Update the documented schema in the prompt
2. Change path reference from `.ralph/planning/assignment.json` to `.ralph/assignment.json`
3. Ensure `{{execute_path}}` placeholder is documented and explained

---

### Phase 5: Script Updates

#### 5.1 Update sync2.sh for Project Support

**File:** `scripts/sync2.sh`

**Changes:**
1. Accept `RALPH_PROJECT` environment variable to specify active project
2. Load orchestrate.md from package's `prompts/` directory (not `.ralph/`)
3. Add `{{execute_path}}` substitution before running orchestrate.md
4. Merge project-specific settings

**Flow:**
```
1. Read RALPH_PROJECT env var or .ralph/active-project file
2. Load prompts/orchestrate.md from package
3. Substitute {{execute_path}} with .ralph/projects/<project>/execute.md
4. Inject task manager instructions (existing logic)
5. Run orchestration
```

#### 5.2 Update process-prompt.js

**File:** `scripts/process-prompt.js`

**Changes:**
1. Add parameter for active project path
2. Load project-specific settings and merge with root settings
3. Add template variable substitution (beyond just task manager instructions)
4. Handle `{{execute_path}}` substitution

---

### Phase 6: TUI Integration

#### 6.1 Update Start Screen

**File:** `src/components/start-screen.tsx`

**Changes:**
1. Show active project name if one is selected
2. Add hint for project switching shortcut
3. Consider: Show project picker instead of start screen when no project is active

#### 6.2 Add Keyboard Shortcut for Project Switching

**File:** `src/app.tsx`

**Changes:**
1. Add 'j' key handler (or similar) to open project picker
2. When project changes, update state and reload configuration
3. Show project name in footer shortcuts

#### 6.3 Update useRalphProcess Hook

**File:** `src/hooks/use-ralph-process.ts`

**Changes:**
1. Pass active project to ralph.sh via environment variable
2. Ensure `RALPH_PROJECT` env var is set when spawning process

---

## Testing Requirements

### Unit Tests

#### 1. init.ts Tests (`src/commands/init.test.ts`)

**Update existing tests:**
- Test that `.ralph-templates/` is used as source
- Test that `orchestrate.md` is NOT copied
- Test that `projects/default/` structure is created
- Test that old workflow files are NOT created

**Add new tests:**
- Test project directory creation
- Test template variable handling in copied files

#### 2. config.ts Tests (`src/lib/config.test.ts`)

**Add new tests:**
- Test project config loading
- Test config merging order with project settings
- Test `variables` field handling
- Test missing project config gracefully handled

#### 3. Template Tests (`src/lib/template.test.ts`) (NEW)

**New test file:**
- Test basic variable substitution
- Test `{{execute_path}}` special variable
- Test missing variable handling
- Test nested/escaped braces

#### 4. use-assignment.ts Tests

**Update existing tests:**
- Test new file path (`.ralph/assignment.json`)
- Test new schema validation
- Test backwards compatibility with old schema

#### 5. use-projects.ts Tests (NEW)

**New test file:**
- Test project discovery from directory
- Test project metadata loading
- Test empty projects directory
- Test invalid project structures

### Integration Tests

#### 1. Project Selection Flow (`src/test/integration.test.tsx`)

**Add new tests:**
- Test project picker appears on startup when no project active
- Test project selection persists across sessions
- Test configuration merging with active project
- Test assignment file is read from new location

#### 2. sync2.sh Integration

**Add new tests (shell or e2e):**
- Test `RALPH_PROJECT` environment variable is respected
- Test `{{execute_path}}` substitution works
- Test orchestrate.md is read from package, not .ralph/

### E2E Tests

#### 1. Full Workflow Test (`src/test/e2e/workflows.test.tsx`)

**Update/add tests:**
- Test starting Ralph with project selection
- Test switching projects mid-session
- Test assignment.json is created in new location with new schema

---

## Documentation Updates

### 1. docs/commands/init.md

**Changes:**
- Update "What Gets Created" section to show new structure
- Remove references to workflow files
- Add section about projects directory
- Update examples

### 2. docs/configuration.md

**Changes:**
- Add section about project-specific configuration
- Document `variables` field
- Update paths configuration section
- Add project config merging explanation

### 3. docs/workflows.md

**Changes:**
- Rename or deprecate this doc (workflows replaced by projects)
- OR: Update to describe the new project/execute.md structure
- Explain how execute.md relates to the old workflow concept

### 4. AGENTS.md

**Changes:**
- Update Repository Structure section
- Update architecture description
- Add note about project selection

### 5. README.md

**Changes:**
- Update quick start to include project selection
- Update examples

---

## Migration Guide

### For Existing Users

1. **Manual migration required:**
   - Move assignment.json: `mv .ralph/planning/assignment.json .ralph/assignment.json`
   - Create projects directory structure
   - Convert existing workflows to execute.md format

2. **Backwards compatibility:**
   - Old assignment.json location will be checked as fallback for 2 versions
   - Old schema fields will be accepted with deprecation warning

### Breaking Changes

1. `ralph init` creates different structure (projects instead of workflows)
2. Assignment file location changed
3. Assignment schema changed
4. `orchestrate.md` no longer copied to `.ralph/`
5. Project selection required at startup

---

## Implementation Order

### Sprint 1: Core Infrastructure
1. Phase 1: Template Structure Reorganization
2. Phase 4: Assignment File Changes
3. Update tests for above changes

### Sprint 2: Project System
1. Phase 2: Project Selection UI
2. Phase 3: Configuration Merging
3. Update tests for above changes

### Sprint 3: Script Integration
1. Phase 5: Script Updates
2. Phase 6: TUI Integration
3. E2E testing

### Sprint 4: Documentation & Polish
1. Documentation updates
2. Migration guide
3. Final testing pass

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing user setups | High | Provide migration guide, backwards compat for 2 versions |
| Bundled prompts not found at runtime | High | Test npm pack/install flow thoroughly |
| Config merging order confusion | Medium | Clear documentation, debug logging |
| Project picker UX issues | Medium | User testing, simple keyboard nav |
| sync2.sh integration bugs | High | Extensive shell script testing |

---

## Success Criteria

1. `ralph init` creates new structure with projects/default
2. Ralph starts with project picker when no project is active
3. Selected project's execute.md is used in orchestration loop
4. Assignment.json is created at `.ralph/assignment.json` with new schema
5. `{{execute_path}}` is correctly substituted in orchestrate.md
6. Project-specific settings are merged correctly
7. All existing tests pass
8. New tests cover all new functionality
9. Documentation is updated and accurate

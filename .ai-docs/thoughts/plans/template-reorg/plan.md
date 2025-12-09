# Template Reorganization Plan

**Issue**: [#32 - Reorg templates](https://github.com/htxryan/ralph-tui/issues/32)
**Branch**: `spike/ralph`
**Created**: 2025-12-08

---

## 1. Executive Summary

This plan addresses the reorganization of Ralph's template and configuration system to support multi-project workflows. The key changes are:

1. **Templates**: Use `.ralph-template/` folder (with projects structure) for `ralph init` instead of flat `templates/`
2. **Orchestrate prompt**: Move to bundled `prompts/` folder, read at runtime (not copied during init)
3. **Project selection**: Present users with a project picker when Ralph launches
4. **Settings merging**: Merge project-specific settings with root `.ralph/settings.json`

---

## 2. Current State Analysis

### 2.1 Current Directory Structure

```
ralph-tui/
├── templates/                    # OLD - currently used by init
│   ├── orchestrate.md           # Copied to .ralph/orchestrate.md
│   ├── providers/               # Provider-specific prompts
│   │   ├── github-issues.md
│   │   └── vibe-kanban.md
│   └── workflows/               # MISSING - should exist here based on code
│
├── prompts/                      # NEW location for runtime prompts
│   ├── orchestrate.md           # Already exists here!
│   └── resume.md
│
├── .ralph-template/              # NEW template structure (already created)
│   ├── settings.json            # Root settings template
│   └── projects/
│       ├── develop/
│       │   ├── settings.json    # Project-specific settings
│       │   └── workflows/       # Project-specific workflows
│       │       ├── 01-feature-branch-incomplete.md
│       │       ├── 02-feature-branch-pr-ready.md
│       │       └── ...
│       └── refine/
│           ├── settings.json
│           └── workflows/
│               └── refine-issue.md
```

### 2.2 Current `ralph init` Behavior

**File**: `src/commands/init.ts`

Current implementation:
- Loads templates from `templates/` directory in the package
- Copies `orchestrate.md` to `.ralph/orchestrate.md`
- Copies workflow files to `.ralph/workflows/`
- Creates `settings.json` with task management config

**Key functions**:
- `loadTemplate(templateName)` - Loads from `templates/` directory
- `getFilesToCreate()` - Returns list of files to create
- `runInit()` - Main init logic

### 2.3 Current Config Loading

**File**: `src/lib/config.ts`

Current precedence (highest to lowest):
1. CLI arguments
2. Local overrides (`.ralph/settings.local.json`)
3. Project settings (`.ralph/settings.json`)
4. Global user config (`~/.config/ralph/settings.json`)
5. Built-in defaults

**Missing**: No project-level (`.ralph/projects/<project>/settings.json`) merging.

### 2.4 Current Workflow Loading

**File**: `src/hooks/use-ralph-process.ts`

Current behavior:
- Checks for `orchestrate.md` in `.ralph/` directory (user's project)
- Runs `scripts/ralph.sh` which uses the orchestrate prompt
- No project-specific workflow loading

---

## 3. Target State

### 3.1 Target Directory Structure

After `ralph init`:
```
user-project/
└── .ralph/
    ├── settings.json            # Root settings (from template)
    ├── settings.local.json      # User-specific overrides (gitignored)
    ├── claude_output.jsonl      # Session log (gitignored)
    ├── claude.lock              # Lock file (gitignored)
    ├── archive/                 # Archived sessions
    ├── planning/                # Planning artifacts
    │   └── assignment.json
    └── projects/                # Multiple project configurations
        ├── develop/
        │   ├── settings.json    # Project-specific settings
        │   └── workflows/
        │       └── *.md
        └── refine/
            ├── settings.json
            └── workflows/
                └── *.md
```

**Key changes**:
- `orchestrate.md` is **NOT** in user's `.ralph/` - read from package's `prompts/` at runtime
- `projects/` folder contains multiple project configurations
- Each project has its own `settings.json` and `workflows/`

### 3.2 New Config Precedence

1. CLI arguments
2. Local overrides (`.ralph/settings.local.json`)
3. **Active project settings** (`.ralph/projects/<active>/settings.json`) **← NEW**
4. Root project settings (`.ralph/settings.json`)
5. Global user config (`~/.config/ralph/settings.json`)
6. Built-in defaults

### 3.3 New Workflow Selection

When Ralph launches:
1. Scan `.ralph/projects/` for available projects
2. If multiple projects exist, present a selection UI
3. If only one project, auto-select it (or prompt for confirmation)
4. Load selected project's workflows and settings
5. Read `orchestrate.md` from package's `prompts/` directory

---

## 4. Implementation Plan

### Phase 1: Template Reorganization

#### 4.1.1 Remove Old Template Files

**Files to modify/remove**:
- Delete `templates/orchestrate.md` (already in `prompts/`)
- Delete `templates/workflows/` (if exists, move to `.ralph-template/`)
- Keep `templates/providers/` for provider-specific prompt includes

**Rationale**: Consolidate all init templates in `.ralph-template/`, runtime prompts in `prompts/`

#### 4.1.2 Finalize `.ralph-template/` Structure

**Current state**: `.ralph-template/` already exists with projects structure

**Actions**:
- Verify all workflow files are present in `projects/develop/workflows/`
- Ensure `projects/refine/workflows/refine-issue.md` has content (currently 0 bytes)
- Add any missing files from old `templates/workflows/` location

**Files to verify**:
```
.ralph-template/
├── settings.json                            ✅ Exists
└── projects/
    ├── develop/
    │   ├── settings.json                    ✅ Exists
    │   └── workflows/
    │       ├── 01-feature-branch-incomplete.md  ✅ Exists
    │       ├── 02-feature-branch-pr-ready.md    ✅ Exists
    │       ├── 03-pr-pipeline-fix.md            ✅ Exists
    │       ├── 04-cd-pipeline-fix.md            ✅ Exists
    │       ├── 05-resume-in-progress.md         ✅ Exists
    │       └── 06-new-work.md                   ✅ Exists
    └── refine/
        ├── settings.json                    ✅ Exists
        └── workflows/
            └── refine-issue.md              ⚠️ Empty (0 bytes)
```

#### 4.1.3 Update `package.json` Files Array

**File**: `package.json`

**Current**:
```json
"files": [
  "dist",
  "prompts",
  "scripts",
  "templates",
  "README.md",
  "LICENSE"
]
```

**Target**:
```json
"files": [
  "dist",
  "prompts",
  "scripts",
  "templates",        // Keep for providers/
  ".ralph-template",  // ADD for init
  "README.md",
  "LICENSE"
]
```

---

### Phase 2: Update `ralph init` Command

#### 4.2.1 Modify Template Loading

**File**: `src/commands/init.ts`

**Changes**:

1. **New function**: `copyTemplateDirectory()`
   ```typescript
   /**
    * Recursively copy the .ralph-template directory to user's .ralph/
    * Preserves directory structure and file contents
    */
   function copyTemplateDirectory(
     sourceDir: string,
     destDir: string,
     options: { force?: boolean; dryRun?: boolean }
   ): { created: string[]; skipped: string[] }
   ```

2. **Update `getFilesToCreate()`**:
   - Remove orchestrate.md from the list (no longer copied)
   - Change workflow source from `templates/workflows/` to `.ralph-template/projects/develop/workflows/`
   - Actually, replace this function entirely with `copyTemplateDirectory()` logic

3. **Update `runInit()`**:
   - Use `.ralph-template/` as source instead of individual template files
   - Skip `orchestrate.md` entirely (read from `prompts/` at runtime)
   - Copy entire `projects/` structure

4. **Add `getTemplateDir()` function**:
   ```typescript
   function getTemplateDir(): string {
     return path.join(PACKAGE_ROOT, '.ralph-template');
   }
   ```

#### 4.2.2 Update Init Output Messages

**Changes**:
- Update "Next steps" to reference projects instead of orchestrate.md
- Add note about project selection
- Update file list to reflect new structure

**Example output**:
```
Initializing Ralph in /path/to/project

Created:
  .ralph/settings.json
  .ralph/projects/develop/settings.json
  .ralph/projects/develop/workflows/01-feature-branch-incomplete.md
  .ralph/projects/develop/workflows/02-feature-branch-pr-ready.md
  ...
  .ralph/projects/refine/settings.json
  .ralph/projects/refine/workflows/refine-issue.md

Suggested .gitignore additions:
  .ralph/settings.local.json
  .ralph/claude_output.jsonl
  .ralph/claude.lock

Next steps:
  1. Review projects in .ralph/projects/
  2. Customize workflows for your project's needs
  3. Add the suggested entries to your .gitignore
  4. Run `ralph` to start monitoring

Ralph initialized successfully!
```

---

### Phase 3: Orchestrate Prompt Runtime Loading

#### 4.3.1 Update `use-ralph-process.ts`

**File**: `src/hooks/use-ralph-process.ts`

**Current behavior**:
```typescript
const orchestratePath = path.join(userDataDir, 'orchestrate.md');
if (!fs.existsSync(orchestratePath)) {
  setError(new Error(`Orchestration prompt not found: ${orchestratePath}`));
  // ...
}
```

**New behavior**:
```typescript
// Get orchestrate.md from package's prompts/ directory, not user's .ralph/
const packagePromptsDir = path.join(packageDir, 'prompts');
const orchestratePath = path.join(packagePromptsDir, 'orchestrate.md');
if (!fs.existsSync(orchestratePath)) {
  setError(new Error(`Orchestration prompt not found in package: ${orchestratePath}`));
  // ...
}
```

#### 4.3.2 Update `scripts/ralph.sh`

**File**: `scripts/ralph.sh`

The script needs to read `orchestrate.md` from the package's `prompts/` directory, not the user's `.ralph/` directory.

**Changes**:
- Add `RALPH_PACKAGE_DIR` environment variable (set by the hook)
- Update orchestrate path: `$RALPH_PACKAGE_DIR/prompts/orchestrate.md`
- Keep workflow paths pointing to user's `.ralph/projects/<active>/workflows/`

#### 4.3.3 Update `scripts/sync2.sh` (if used)

Similar changes to read orchestrate.md from package prompts directory.

---

### Phase 4: Project Selection UI

#### 4.4.1 Create Project Picker Component

**New file**: `src/components/project-picker.tsx`

```typescript
interface ProjectPickerProps {
  projects: ProjectInfo[];
  onSelect: (project: ProjectInfo) => void;
  onClose: () => void;
  width?: number;
  maxHeight?: number;
}

interface ProjectInfo {
  name: string;           // e.g., "develop", "refine"
  path: string;           // Full path to project directory
  hasSettings: boolean;   // Whether settings.json exists
  workflowCount: number;  // Number of workflow files
}
```

**Component features**:
- List available projects from `.ralph/projects/`
- Show project name, workflow count
- Keyboard navigation (up/down arrows)
- Enter to select, Escape to cancel
- Similar styling to existing `SessionPicker` component

#### 4.4.2 Create `useProjectSelection` Hook

**New file**: `src/hooks/use-project-selection.ts`

```typescript
interface UseProjectSelectionResult {
  projects: ProjectInfo[];
  activeProject: ProjectInfo | null;
  isLoading: boolean;
  error: Error | null;
  selectProject: (project: ProjectInfo) => void;
  refresh: () => void;
}

export function useProjectSelection(options?: {
  basePath?: string;
  autoSelect?: boolean;  // Auto-select if only one project
}): UseProjectSelectionResult
```

**Features**:
- Scan `.ralph/projects/` for available projects
- Track currently active project
- Persist active project selection (in `.ralph/active-project` or similar)
- Load project-specific config when selected

#### 4.4.3 Integrate Project Selection into App Launch

**File**: `src/app.tsx`

**Changes**:

1. Add state for project selection:
   ```typescript
   const [activeProject, setActiveProject] = useState<ProjectInfo | null>(null);
   const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
   ```

2. Add project selection logic on mount:
   ```typescript
   useEffect(() => {
     const projects = scanProjects(projectRoot);
     if (projects.length === 0) {
       // No projects - show error or prompt to init
     } else if (projects.length === 1) {
       // Single project - auto-select
       setActiveProject(projects[0]);
     } else {
       // Multiple projects - show picker
       setIsProjectPickerOpen(true);
     }
   }, [projectRoot]);
   ```

3. Block main UI until project is selected:
   ```typescript
   if (!activeProject) {
     return <ProjectPicker ... />;
   }
   ```

4. Add keyboard shortcut (e.g., 'P') to switch projects during session

#### 4.4.4 Pass Active Project to Process Hook

**Changes**:
- Update `useRalphProcess` to accept active project
- Update workflow paths to use active project's workflows
- Update config merging to include active project's settings

---

### Phase 5: Settings Merging with Projects

#### 4.5.1 Update Config Loading

**File**: `src/lib/config.ts`

**Add new function**:
```typescript
/**
 * Get the path to the active project settings file
 */
export function getProjectConfigPath(
  projectRoot: string,
  projectName: string
): string {
  return path.join(projectRoot, '.ralph', 'projects', projectName, 'settings.json');
}
```

**Update `getConfig()`**:
```typescript
export function getConfig(
  projectRoot: string,
  cliOptions: CLIOptions = {},
  activeProject?: string  // NEW parameter
): GetConfigResult {
  // ... existing loading ...

  // NEW: Load active project config
  let projectConfigResult: ConfigLoadResult = { loaded: false, config: {}, path: '' };
  if (activeProject) {
    projectConfigResult = loadConfigFile(getProjectConfigPath(projectRoot, activeProject));
    if (projectConfigResult.error) {
      warnings.push(`Failed to parse project config (${projectConfigResult.path}): ${projectConfigResult.error}`);
    }
  }

  // Updated merge order:
  // 1. Defaults
  let merged: RalphConfig = { ...DEFAULT_CONFIG };
  // 2. Global config
  if (globalResult.loaded && !globalResult.error) {
    merged = deepMerge(merged, globalResult.config);
  }
  // 3. Root project config
  if (projectResult.loaded && !projectResult.error) {
    merged = deepMerge(merged, projectResult.config);
  }
  // 4. Active project config (NEW)
  if (projectConfigResult.loaded && !projectConfigResult.error) {
    merged = deepMerge(merged, projectConfigResult.config);
  }
  // 5. Local overrides
  if (localResult.loaded && !localResult.error) {
    merged = deepMerge(merged, localResult.config);
  }
  // 6. CLI options
  merged = deepMerge(merged, cliConfig);

  // ...
}
```

#### 4.5.2 Update CLI to Pass Active Project

**File**: `src/cli.tsx`

**Changes**:
- Read active project from persisted state or environment variable
- Pass active project to `loadConfig()`
- Handle case where no project is selected (defer to TUI selection)

---

### Phase 6: Workflow Loading Updates

#### 4.6.1 Update Workflow Path Resolution

**New file**: `src/lib/project.ts`

```typescript
/**
 * Get available projects from the .ralph/projects directory
 */
export function getAvailableProjects(projectRoot: string): ProjectInfo[] {
  const projectsDir = path.join(projectRoot, '.ralph', 'projects');
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name,
      path: path.join(projectsDir, entry.name),
      hasSettings: fs.existsSync(path.join(projectsDir, entry.name, 'settings.json')),
      workflowCount: countWorkflows(path.join(projectsDir, entry.name, 'workflows')),
    }));
}

/**
 * Get the workflows directory for the active project
 */
export function getWorkflowsDir(projectRoot: string, projectName: string): string {
  return path.join(projectRoot, '.ralph', 'projects', projectName, 'workflows');
}

/**
 * Get the orchestrate prompt from the package
 */
export function getOrchestratePromptPath(): string {
  // Returns path within the installed package, not user's directory
  const packageDir = getPackageDir();
  return path.join(packageDir, 'prompts', 'orchestrate.md');
}
```

#### 4.6.2 Update Script Environment Variables

When Ralph starts a process, pass these environment variables:
- `RALPH_PROJECT_DIR` - User's project root (existing)
- `RALPH_PACKAGE_DIR` - Package installation directory (NEW)
- `RALPH_ACTIVE_PROJECT` - Name of active project (NEW)
- `RALPH_WORKFLOWS_DIR` - Path to active project's workflows (NEW)

---

## 5. Test Updates

### 5.1 Unit Tests

#### 5.1.1 `src/commands/init.test.ts`

**Changes**:
- Update tests to expect new `.ralph/projects/` structure
- Remove tests for `orchestrate.md` creation (no longer created)
- Add tests for recursive directory copying
- Update file count expectations

**New tests to add**:
```typescript
describe('project structure', () => {
  it('creates projects directory with develop project', () => {
    const result = runInit(tempDir);
    expect(fs.existsSync(path.join(tempDir, '.ralph/projects/develop'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.ralph/projects/develop/settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.ralph/projects/develop/workflows'))).toBe(true);
  });

  it('creates projects directory with refine project', () => {
    const result = runInit(tempDir);
    expect(fs.existsSync(path.join(tempDir, '.ralph/projects/refine'))).toBe(true);
  });

  it('does not create orchestrate.md in user directory', () => {
    runInit(tempDir);
    expect(fs.existsSync(path.join(tempDir, '.ralph/orchestrate.md'))).toBe(false);
  });
});
```

**Tests to update**:
```typescript
// OLD
it('creates orchestrate.md with content', () => {
  runInit(tempDir);
  const filePath = path.join(tempDir, '.ralph/orchestrate.md');
  expect(fs.existsSync(filePath)).toBe(true);
});

// REMOVE - no longer applicable
```

#### 5.1.2 `src/lib/config.test.ts`

**New tests to add**:
```typescript
describe('project config loading', () => {
  it('merges active project settings with root settings', () => {
    // Setup root settings
    writeConfigFile(getProjectConfigPath(projectRoot), {
      taskManagement: { provider: 'github-issues' }
    });

    // Setup project settings
    fs.mkdirSync(path.join(projectRoot, '.ralph/projects/develop'), { recursive: true });
    writeConfigFile(
      path.join(projectRoot, '.ralph/projects/develop/settings.json'),
      { taskManagement: { providerConfig: { labelFilter: 'dev' } } }
    );

    const result = getConfig(projectRoot, {}, 'develop');

    expect(result.config.taskManagement.provider).toBe('github-issues');
    expect(result.config.taskManagement.providerConfig?.labelFilter).toBe('dev');
  });

  it('project settings override root settings', () => {
    // ... test that project-level settings take precedence
  });
});
```

#### 5.1.3 New: `src/lib/project.test.ts`

**New test file** for project scanning and management:
```typescript
describe('project utilities', () => {
  describe('getAvailableProjects', () => {
    it('returns empty array when no projects directory', () => {});
    it('returns all project directories', () => {});
    it('includes workflow count for each project', () => {});
    it('detects settings.json presence', () => {});
  });

  describe('getWorkflowsDir', () => {
    it('returns correct path for project', () => {});
  });

  describe('getOrchestratePromptPath', () => {
    it('returns path within package, not user directory', () => {});
  });
});
```

### 5.2 Integration Tests

#### 5.2.1 `src/test/e2e/workflows.test.tsx`

**Changes**:
- Update mocks to reflect new directory structure
- Add tests for project selection flow
- Update init workflow tests

**New tests to add**:
```typescript
describe('Project Selection Workflow', () => {
  it('shows project picker when multiple projects exist', () => {
    // Mock multiple projects in .ralph/projects/
    // Verify picker is displayed
  });

  it('auto-selects when only one project exists', () => {
    // Mock single project
    // Verify no picker, project is auto-selected
  });

  it('loads correct workflows after project selection', () => {
    // Select a project
    // Verify its workflows are used
  });

  it('applies project settings after selection', () => {
    // Select project with specific settings
    // Verify settings are merged
  });
});
```

### 5.3 Component Tests

#### 5.3.1 New: `src/components/project-picker.test.tsx`

```typescript
describe('ProjectPicker', () => {
  it('renders list of projects', () => {});
  it('highlights selected project', () => {});
  it('navigates with arrow keys', () => {});
  it('selects project on Enter', () => {});
  it('closes on Escape', () => {});
  it('shows workflow count for each project', () => {});
});
```

#### 5.3.2 New: `src/hooks/use-project-selection.test.ts`

```typescript
describe('useProjectSelection', () => {
  it('scans for available projects', () => {});
  it('auto-selects when only one project', () => {});
  it('persists selected project', () => {});
  it('loads project after selection', () => {});
});
```

---

## 6. Documentation Updates

### 6.1 `docs/commands/init.md`

**Changes**:
- Update "What Gets Created" section to show new structure
- Remove `orchestrate.md` from file list
- Add `projects/` directory explanation
- Update examples and output samples
- Add section on project structure

**New sections to add**:
```markdown
### Projects

Ralph supports multiple project configurations within a single repository.
Each project has its own workflows and settings.

Default projects created by `ralph init`:
- **develop** - Standard development workflows (feature branches, PRs, pipelines)
- **refine** - Issue refinement workflows

You can create additional projects by adding directories to `.ralph/projects/`.
```

### 6.2 `docs/configuration.md`

**Changes**:
- Add section on project-level settings
- Update precedence documentation
- Add examples of project settings overrides

**New sections**:
```markdown
## Project-Level Settings

Each project in `.ralph/projects/<name>/` can have its own `settings.json`
that overrides root settings.

### Precedence (highest to lowest)
1. CLI arguments
2. `.ralph/settings.local.json`
3. `.ralph/projects/<active>/settings.json`  ← NEW
4. `.ralph/settings.json`
5. Global user config
6. Built-in defaults

### Example: Different label filters per project

Root settings (`.ralph/settings.json`):
```json
{
  "taskManagement": {
    "provider": "github-issues"
  }
}
```

Develop project (`.ralph/projects/develop/settings.json`):
```json
{
  "taskManagement": {
    "providerConfig": {
      "labelFilter": "ralph-dev"
    }
  }
}
```

Refine project (`.ralph/projects/refine/settings.json`):
```json
{
  "taskManagement": {
    "providerConfig": {
      "labelFilter": "ralph-refine"
    }
  }
}
```
```

### 6.3 `docs/workflows.md`

**Changes**:
- Update path references from `.ralph/workflows/` to `.ralph/projects/<project>/workflows/`
- Add section on project-specific workflows
- Explain how orchestrate.md is now bundled (not user-editable)

### 6.4 `AGENTS.md`

**Changes**:
- Update Repository Structure section
- Update `.ralph/` directory description
- Add note about project selection

### 6.5 `README.md`

**Changes** (if applicable):
- Update quick start to mention project selection
- Update directory structure diagram

---

## 7. Migration Considerations

### 7.1 Existing Users

Users who have already run `ralph init` will have the old structure:
```
.ralph/
├── settings.json
├── orchestrate.md        # Will be ignored
└── workflows/            # Will be ignored
```

**Migration path**:
1. Run `ralph init --force` to get new structure
2. Or manually create `projects/` directory and move workflows

**Recommendation**: Add a migration check/warning:
```typescript
// In cli.tsx or app.tsx
if (fs.existsSync(path.join(projectRoot, '.ralph/workflows'))) {
  console.warn('Warning: Old .ralph structure detected. Run `ralph init --force` to migrate.');
}
```

### 7.2 Backwards Compatibility

For a transitional period, consider:
- If `.ralph/projects/` doesn't exist but `.ralph/workflows/` does, use legacy mode
- Show deprecation warning encouraging migration
- Eventually remove legacy support in a major version

---

## 8. Implementation Order

### Recommended Sequence

1. **Phase 1**: Template Reorganization
   - Verify `.ralph-template/` contents
   - Update `package.json` files array
   - Remove old template references

2. **Phase 2**: Update `ralph init`
   - Implement new template copying logic
   - Update output messages
   - Update tests

3. **Phase 3**: Orchestrate Runtime Loading
   - Update `use-ralph-process.ts`
   - Update shell scripts
   - Test runtime loading

4. **Phase 4**: Project Selection UI
   - Create `ProjectPicker` component
   - Create `useProjectSelection` hook
   - Integrate into `App` component
   - Add tests

5. **Phase 5**: Settings Merging
   - Update config loading
   - Pass active project through
   - Update tests

6. **Phase 6**: Documentation
   - Update all doc files
   - Add migration notes

### Dependencies

```
Phase 1 ─────┐
             ├──→ Phase 2 ──→ Phase 3 ──┐
Phase 4 ─────┘                          ├──→ Phase 6
                                        │
Phase 5 ────────────────────────────────┘
```

Phases 1, 4 can run in parallel.
Phases 2, 3 depend on Phase 1.
Phase 6 depends on all others.

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing installations | High | Add migration warning, support legacy mode temporarily |
| Shell script path issues | Medium | Use environment variables, test on multiple platforms |
| Project picker UX confusion | Low | Auto-select single project, clear UI messaging |
| Settings merge conflicts | Low | Document precedence clearly, add debug logging |

---

## 10. Acceptance Criteria

- [ ] `ralph init` creates `.ralph/projects/` structure with develop and refine projects
- [ ] `ralph init` does NOT create `orchestrate.md` in user's directory
- [ ] Running `ralph` prompts for project selection when multiple projects exist
- [ ] Running `ralph` auto-selects when only one project exists
- [ ] Selected project's settings are merged with root settings
- [ ] Selected project's workflows are used by the orchestration
- [ ] `orchestrate.md` is read from package's `prompts/` directory at runtime
- [ ] All existing tests pass with updates
- [ ] New tests cover project selection and settings merging
- [ ] Documentation is updated to reflect new structure
- [ ] Package includes `.ralph-template/` in distribution

---

## 11. Files to Create/Modify Summary

### New Files
- `src/components/project-picker.tsx`
- `src/hooks/use-project-selection.ts`
- `src/lib/project.ts`
- `src/lib/project.test.ts`
- `src/components/project-picker.test.tsx`
- `src/hooks/use-project-selection.test.ts`

### Modified Files
- `src/commands/init.ts`
- `src/commands/init.test.ts`
- `src/lib/config.ts`
- `src/lib/config.test.ts`
- `src/hooks/use-ralph-process.ts`
- `src/app.tsx`
- `src/cli.tsx`
- `src/test/e2e/workflows.test.tsx`
- `scripts/ralph.sh`
- `scripts/sync2.sh`
- `package.json`
- `docs/commands/init.md`
- `docs/configuration.md`
- `docs/workflows.md`
- `AGENTS.md`

### Files to Delete/Clean Up
- `templates/orchestrate.md` (if exists separately from prompts/)
- `templates/workflows/` (move contents to `.ralph-template/`)

---

## 12. Open Questions

1. **Project persistence**: How should the active project selection be persisted between sessions?
   - Option A: `.ralph/active-project` file
   - Option B: Environment variable
   - Option C: CLI flag `--project <name>`
   - **Recommendation**: Use `.ralph/active-project` file + CLI flag override

2. **Default project**: When a user runs `ralph` without prior selection, which project should be default?
   - Option A: Always show picker
   - Option B: Default to first alphabetically
   - Option C: Default to "develop"
   - **Recommendation**: Auto-select if only one, otherwise show picker

3. **Orchestrate customization**: Should users be able to override the bundled orchestrate.md?
   - Option A: No, always use bundled version
   - Option B: Yes, check for `.ralph/orchestrate.md` first
   - **Recommendation**: Option B for power users, with warning that updates won't apply

---

*Plan created: 2025-12-08*
*Last updated: 2025-12-08*

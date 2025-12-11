# Task Adapters

Ralph TUI supports pluggable task management backends through a task adapter architecture. This allows you to integrate with various task tracking systems like Vibe Kanban, Jira, Linear, GitHub Issues, and more.

## Overview

The task adapter system provides:

- **Unified Interface**: All task backends implement the same `TaskAdapter` interface
- **Configuration-Driven**: Switch between backends via configuration, no code changes needed
- **Graceful Fallbacks**: If a backend is unavailable, Ralph continues to function
- **Extensibility**: Add new backends by implementing the adapter interface

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ralph TUI                             │
│                                                              │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │   useTask    │───▶│         TaskAdapter               │  │
│  │    Hook      │    │         Interface                 │  │
│  └──────────────┘    └───────────────────────────────────┘  │
│                                    │                         │
│                      ┌─────────────┼─────────────┐          │
│                      ▼             ▼             ▼          │
│               ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│               │  Vibe    │  │   Jira   │  │  Linear  │ ...  │
│               │  Kanban  │  │ Adapter  │  │ Adapter  │      │
│               │ Adapter  │  │ (stub)   │  │ (stub)   │      │
│               └──────────┘  └──────────┘  └──────────┘      │
│                      │                                       │
└──────────────────────│───────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  External API   │
              │  (HTTP/CLI/MCP) │
              └─────────────────┘
```

## File Structure

```
src/lib/task-adapters/
├── types.ts              # Interface definitions
├── base-adapter.ts       # Abstract base class with common helpers
├── factory.ts            # Adapter factory and utilities
├── vibe-kanban-adapter.ts # Vibe Kanban implementation
├── index.ts              # Module exports
└── task-adapters.test.ts # Test suite
```

## TaskAdapter Interface

All adapters implement this interface:

```typescript
interface TaskAdapter {
  /** Provider name for display/debugging */
  readonly name: TaskProvider;

  // Lifecycle
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;

  // Core operations (required)
  getTask(taskId: string): Promise<KanbanTask | null>;
  listTasks(options?: ListTasksOptions): Promise<KanbanTask[]>;

  // Optional operations
  createTask?(input: CreateTaskInput): Promise<KanbanTask>;
  updateTask?(taskId: string, updates: UpdateTaskInput): Promise<KanbanTask>;
  detectProject?(): Promise<string | null>;
}
```

### KanbanTask Type

All adapters return tasks in this normalized format:

```typescript
interface KanbanTask {
  id: string;
  title: string;
  type: 'task' | 'bug' | 'feature';
  status: 'open' | 'in_progress' | 'closed';
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
  blockers?: string[];
  blocks?: string[];
  comments?: TaskComment[];
}
```

## Using Adapters

### In Configuration

Set the provider in your Ralph configuration (`.ralph/settings.json` or `.ralph/projects/<name>/settings.json`):

```json
{
  "taskManagement": {
    "provider": "github-issues",
    "providerConfig": {
      "labelFilter": "ralph"
    }
  }
}
```

The default provider is `github-issues`. For Vibe Kanban:

```json
{
  "taskManagement": {
    "provider": "vibe-kanban",
    "autoInstall": true
  }
}
```

### In Code

The `useTask` hook handles adapter creation automatically:

```typescript
import { useTask } from './hooks/use-task.js';

function MyComponent() {
  const { task, isLoading, error, refresh, adapter, adapterReady } = useTask({
    taskId: 'task-123',
    taskConfig: {
      provider: 'vibe-kanban',
      autoInstall: true,
    },
  });

  if (!adapterReady) return <Text>Initializing...</Text>;
  if (isLoading) return <Text>Loading task...</Text>;
  if (error) return <Text color="red">{error.message}</Text>;
  if (!task) return <Text>No task found</Text>;

  return <Text>{task.title}</Text>;
}
```

### Direct Adapter Usage

For programmatic access outside React:

```typescript
import { createTaskAdapter } from './lib/task-adapters/index.js';

const result = await createTaskAdapter({
  provider: 'vibe-kanban',
  autoInstall: false,
});

if (result.adapter) {
  const task = await result.adapter.getTask('task-123');
  const tasks = await result.adapter.listTasks({ status: 'inprogress' });
}
```

## Implementing a New Adapter

### 1. Create the Adapter Class

Extend `BaseTaskAdapter` to get common helper methods:

```typescript
// src/lib/task-adapters/my-adapter.ts
import { BaseTaskAdapter } from './base-adapter.js';
import { KanbanTask } from '../types.js';
import { TaskProvider, TaskManagementConfig, ListTasksOptions } from './types.js';

export class MyAdapter extends BaseTaskAdapter {
  readonly name: TaskProvider = 'my-provider'; // Add to TaskProvider type first

  constructor(config: TaskManagementConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // Validate config, establish connections
    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    // Check if the backend is reachable
    try {
      // ... health check
      return true;
    } catch {
      return false;
    }
  }

  async getTask(taskId: string): Promise<KanbanTask | null> {
    this.ensureInitialized();

    // Fetch from your backend
    const rawTask = await this.fetchFromBackend(taskId);

    // Use base class helpers to normalize
    return this.normalizeTask({
      id: rawTask.id,
      title: rawTask.name,
      status: this.mapStatus(rawTask.state),
      type: this.mapType(rawTask.kind),
      priority: this.mapPriority(rawTask.priority),
      // ... other fields
    });
  }

  async listTasks(options?: ListTasksOptions): Promise<KanbanTask[]> {
    this.ensureInitialized();
    // ... implementation
  }
}
```

### 2. Add to Types

Update `src/lib/task-adapters/types.ts`:

```typescript
export type TaskProvider =
  | 'vibe-kanban'
  | 'jira'
  | 'linear'
  | 'beads'
  | 'github-issues'
  | 'my-provider';  // Add your provider
```

### 3. Register in Factory

Update `src/lib/task-adapters/factory.ts`:

```typescript
import { MyAdapter } from './my-adapter.js';

function instantiateAdapter(config: TaskManagementConfig): TaskAdapter {
  switch (config.provider) {
    case 'vibe-kanban':
      return new VibeKanbanAdapter(config);
    case 'my-provider':
      return new MyAdapter(config);
    // ... other cases
  }
}

export function isProviderImplemented(provider: TaskProvider): boolean {
  return provider === 'vibe-kanban' || provider === 'my-provider';
}
```

### 4. Update Config Validation

Update `src/lib/config.ts` to include your provider in validation:

```typescript
const VALID_TASK_PROVIDERS: TaskProvider[] = [
  'vibe-kanban',
  'jira',
  'linear',
  'beads',
  'github-issues',
  'my-provider',  // Add here
];
```

### 5. Add Tests

Create tests in `task-adapters.test.ts` or a separate test file.

## BaseTaskAdapter Helpers

The base class provides useful helpers for normalizing data from different backends:

### `mapStatus(status: string)`

Maps common status strings to our normalized status:

```typescript
mapStatus('todo')       // → 'open'
mapStatus('in_progress') // → 'in_progress'
mapStatus('done')        // → 'closed'
mapStatus('backlog')     // → 'open'
mapStatus('inreview')    // → 'in_progress'
```

### `mapType(type: string)`

Maps task type strings:

```typescript
mapType('bug')          // → 'bug'
mapType('defect')       // → 'bug'
mapType('feature')      // → 'feature'
mapType('enhancement')  // → 'feature'
mapType('story')        // → 'feature'
mapType('chore')        // → 'task'
```

### `mapPriority(priority: string | null)`

Maps priority strings:

```typescript
mapPriority('high')     // → 'high'
mapPriority('critical') // → 'high'
mapPriority('P0')       // → 'high'
mapPriority('low')      // → 'low'
mapPriority('minor')    // → 'low'
mapPriority('normal')   // → 'medium'
mapPriority(null)       // → undefined
```

### `normalizeTask(partial: Partial<KanbanTask>)`

Fills in missing required fields with defaults:

```typescript
normalizeTask({ id: '123', title: 'My Task' })
// → { id: '123', title: 'My Task', type: 'task', status: 'open', ... }
```

### `ensureInitialized()`

Guard method that throws if adapter hasn't been initialized:

```typescript
async getTask(taskId: string) {
  this.ensureInitialized(); // Throws if not initialized
  // ... proceed with fetch
}
```

## Vibe Kanban Adapter

The default adapter communicates with the Vibe Kanban MCP server via HTTP:

- **Default Port**: 3456
- **API Endpoints**:
  - `GET /api/health` - Health check
  - `GET /api/tasks/:id` - Get single task
  - `GET /api/tasks?project_id=...` - List tasks
  - `POST /api/tasks` - Create task
  - `PUT /api/tasks/:id` - Update task
  - `GET /api/context` - Get current context (for project detection)
  - `GET /api/projects` - List projects

### Project Detection

The Vibe Kanban adapter can auto-detect the project:

1. Checks `/api/context` for current project
2. Falls back to matching the current directory against known project paths
3. Uses the only project if exactly one exists

## Error Handling

Adapters should handle errors gracefully:

- **Network errors**: Return `null` for getTask, empty array for listTasks
- **Not found**: Return `null` (don't throw)
- **Auth errors**: Throw with descriptive message
- **Validation errors**: Throw with field-specific message

The factory wraps adapter creation in try/catch and returns an `AdapterCreateResult`:

```typescript
interface AdapterCreateResult {
  adapter: TaskAdapter | null;
  error?: string;
  autoInstallAttempted?: boolean;
}
```

## Testing

Mock the adapter in tests:

```typescript
import { vi } from 'vitest';

// Mock fetch for HTTP-based adapters
const fetchMock = vi.fn();
global.fetch = fetchMock;

fetchMock.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({ id: '123', title: 'Test' }),
});

// Or create a mock adapter directly
const mockAdapter: TaskAdapter = {
  name: 'vibe-kanban',
  initialize: vi.fn(),
  isAvailable: vi.fn().mockResolvedValue(true),
  getTask: vi.fn().mockResolvedValue({ id: '123', title: 'Test' }),
  listTasks: vi.fn().mockResolvedValue([]),
};
```

/**
 * Task Adapters Module
 *
 * Pluggable adapter system for connecting to various task management backends.
 * Currently supports Vibe Kanban, with planned support for Jira, Linear,
 * GitHub Issues, and Beads.
 *
 * Usage:
 *
 *   import { createTaskAdapter, TaskManagementConfig } from './task-adapters';
 *
 *   const config: TaskManagementConfig = {
 *     provider: 'vibe-kanban',
 *     auto_install: true,
 *   };
 *
 *   const { adapter, error } = await createTaskAdapter(config);
 *   if (adapter) {
 *     const task = await adapter.getTask(taskId);
 *   }
 */

// Types
export type {
  TaskAdapter,
  TaskProvider,
  TaskManagementConfig,
  ProviderConfig,
  ListTasksOptions,
  CreateTaskInput,
  UpdateTaskInput,
  AdapterCreateResult,
} from './types.js';

export { DEFAULT_TASK_MANAGEMENT_CONFIG } from './types.js';

// Factory
export {
  createTaskAdapter,
  getSupportedProviders,
  isProviderImplemented,
  getProviderDisplayName,
} from './factory.js';

// Base class (for extending with custom adapters)
export { BaseTaskAdapter } from './base-adapter.js';

// Concrete adapters
export { VibeKanbanAdapter } from './vibe-kanban-adapter.js';
export { GitHubIssuesAdapter } from './github-issues-adapter.js';

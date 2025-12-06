/**
 * Base Task Adapter
 *
 * Abstract base class providing common functionality for task adapters.
 * Concrete adapters should extend this class and implement the abstract methods.
 */

import { KanbanTask } from '../types.js';
import {
  TaskAdapter,
  TaskProvider,
  TaskManagementConfig,
  ListTasksOptions,
  CreateTaskInput,
  UpdateTaskInput,
} from './types.js';

/**
 * Abstract base class for task adapters
 *
 * Provides common functionality and enforces the adapter interface.
 * Subclasses must implement the abstract methods for their specific backend.
 */
export abstract class BaseTaskAdapter implements TaskAdapter {
  abstract readonly name: TaskProvider;

  protected config: TaskManagementConfig;
  protected initialized: boolean = false;

  constructor(config: TaskManagementConfig) {
    this.config = config;
  }

  // -------------------------------------------------------------------------
  // Abstract Methods (must be implemented by subclasses)
  // -------------------------------------------------------------------------

  /**
   * Initialize the adapter
   *
   * Called once when the adapter is created. Subclasses should:
   * - Validate their specific configuration
   * - Establish any necessary connections
   * - Set this.initialized = true when done
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if the adapter is available and functional
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get a single task by ID
   */
  abstract getTask(taskId: string): Promise<KanbanTask | null>;

  /**
   * List tasks with optional filtering
   */
  abstract listTasks(options?: ListTasksOptions): Promise<KanbanTask[]>;

  // -------------------------------------------------------------------------
  // Optional Methods (can be overridden by subclasses)
  // -------------------------------------------------------------------------

  /**
   * Create a new task (optional)
   *
   * Default implementation throws an error indicating the adapter
   * doesn't support task creation.
   */
  async createTask?(input: CreateTaskInput): Promise<KanbanTask>;

  /**
   * Update an existing task (optional)
   *
   * Default implementation throws an error indicating the adapter
   * doesn't support task updates.
   */
  async updateTask?(taskId: string, updates: UpdateTaskInput): Promise<KanbanTask>;

  /**
   * Detect the current project/context (optional)
   *
   * Default implementation returns null (no auto-detection).
   */
  async detectProject?(): Promise<string | null>;

  // -------------------------------------------------------------------------
  // Helper Methods (available to subclasses)
  // -------------------------------------------------------------------------

  /**
   * Ensure the adapter has been initialized
   *
   * Call this at the start of methods that require initialization.
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `${this.name} adapter not initialized. Call initialize() first.`
      );
    }
  }

  /**
   * Normalize a task to ensure required fields
   *
   * Fills in missing optional fields with sensible defaults.
   */
  protected normalizeTask(task: Partial<KanbanTask>): KanbanTask {
    const now = new Date().toISOString();

    return {
      id: task.id || '',
      title: task.title || 'Untitled Task',
      type: task.type || 'task',
      status: task.status || 'open',
      priority: task.priority,
      description: task.description,
      created_at: task.created_at || now,
      updated_at: task.updated_at || now,
      assignee: task.assignee,
      labels: task.labels,
      blockers: task.blockers,
      blocks: task.blocks,
      comments: task.comments,
    };
  }

  /**
   * Map a generic status string to our status type
   */
  protected mapStatus(status: string): 'open' | 'in_progress' | 'closed' {
    const normalizedStatus = status.toLowerCase().replace(/[^a-z]/g, '');

    // Map common status names
    const statusMap: Record<string, 'open' | 'in_progress' | 'closed'> = {
      // Open states
      open: 'open',
      todo: 'open',
      new: 'open',
      backlog: 'open',
      pending: 'open',
      created: 'open',

      // In progress states
      inprogress: 'in_progress',
      inreview: 'in_progress',
      doing: 'in_progress',
      active: 'in_progress',
      started: 'in_progress',
      working: 'in_progress',

      // Closed states
      closed: 'closed',
      done: 'closed',
      complete: 'closed',
      completed: 'closed',
      resolved: 'closed',
      finished: 'closed',
      cancelled: 'closed',
      canceled: 'closed',
    };

    return statusMap[normalizedStatus] || 'open';
  }

  /**
   * Map a generic type string to our type type
   */
  protected mapType(type: string): 'task' | 'bug' | 'feature' {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes('bug') || normalizedType.includes('defect')) {
      return 'bug';
    }

    if (
      normalizedType.includes('feature') ||
      normalizedType.includes('enhancement') ||
      normalizedType.includes('story')
    ) {
      return 'feature';
    }

    return 'task';
  }

  /**
   * Map a generic priority string to our priority type
   */
  protected mapPriority(priority: string | null | undefined): 'high' | 'medium' | 'low' | undefined {
    if (!priority) return undefined;

    const normalizedPriority = priority.toLowerCase();

    if (
      normalizedPriority.includes('high') ||
      normalizedPriority.includes('critical') ||
      normalizedPriority.includes('urgent') ||
      normalizedPriority === 'p0' ||
      normalizedPriority === 'p1'
    ) {
      return 'high';
    }

    if (
      normalizedPriority.includes('low') ||
      normalizedPriority.includes('minor') ||
      normalizedPriority === 'p3' ||
      normalizedPriority === 'p4'
    ) {
      return 'low';
    }

    return 'medium';
  }
}

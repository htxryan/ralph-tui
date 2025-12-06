/**
 * Task Adapter Interface Definitions
 *
 * This module defines the interface for pluggable task management adapters.
 * Each adapter connects Ralph TUI to a different task management backend
 * (Vibe Kanban, Jira, Linear, GitHub Issues, etc.)
 */

import { KanbanTask } from '../types.js';

// ============================================================================
// Task Provider Types
// ============================================================================

/**
 * Supported task management providers
 */
export type TaskProvider =
  | 'vibe-kanban'
  | 'jira'
  | 'linear'
  | 'beads'
  | 'github-issues';

// ============================================================================
// Adapter Options & Inputs
// ============================================================================

/**
 * Options for listing tasks
 */
export interface ListTasksOptions {
  /** Filter by status */
  status?: 'todo' | 'inprogress' | 'done' | 'all';
  /** Filter by assignee */
  assignee?: string;
  /** Maximum number of tasks to return */
  limit?: number;
  /** Project/board identifier (provider-specific) */
  projectId?: string;
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: 'task' | 'bug' | 'feature';
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  labels?: string[];
  /** Project/board identifier (provider-specific) */
  projectId?: string;
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'closed';
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  labels?: string[];
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * Task adapter interface
 *
 * Each task management backend implements this interface to provide
 * a consistent API for the Ralph TUI to interact with tasks.
 */
export interface TaskAdapter {
  /** Provider name for display/debugging */
  readonly name: TaskProvider;

  // -------------------------------------------------------------------------
  // Lifecycle Methods
  // -------------------------------------------------------------------------

  /**
   * Initialize the adapter
   *
   * Called once when the adapter is created. Use this to:
   * - Validate configuration
   * - Establish connections
   * - Cache initial data
   */
  initialize(): Promise<void>;

  /**
   * Check if the adapter is available and functional
   *
   * Returns true if the backend is accessible and the adapter
   * is properly configured. Used for fallback logic.
   */
  isAvailable(): Promise<boolean>;

  // -------------------------------------------------------------------------
  // Core Read Operations
  // -------------------------------------------------------------------------

  /**
   * Get a single task by ID
   *
   * @param taskId - The task identifier (format varies by provider)
   * @returns The task, or null if not found
   */
  getTask(taskId: string): Promise<KanbanTask | null>;

  /**
   * List tasks with optional filtering
   *
   * @param options - Filtering and pagination options
   * @returns Array of tasks matching the criteria
   */
  listTasks(options?: ListTasksOptions): Promise<KanbanTask[]>;

  // -------------------------------------------------------------------------
  // Optional Write Operations
  // -------------------------------------------------------------------------

  /**
   * Create a new task
   *
   * Not all providers support task creation from the TUI.
   * Check if this method exists before calling.
   */
  createTask?(input: CreateTaskInput): Promise<KanbanTask>;

  /**
   * Update an existing task
   *
   * Not all providers support task updates from the TUI.
   * Check if this method exists before calling.
   */
  updateTask?(taskId: string, updates: UpdateTaskInput): Promise<KanbanTask>;

  // -------------------------------------------------------------------------
  // Optional Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Detect the current project/context
   *
   * Some providers can auto-detect the project based on:
   * - Git remote URL
   * - Current directory
   * - Environment variables
   *
   * Returns a project identifier or null if detection fails.
   */
  detectProject?(): Promise<string | null>;
}

// ============================================================================
// Adapter Factory Types
// ============================================================================

/**
 * Configuration for task management
 */
export interface TaskManagementConfig {
  /** Which task system to use */
  provider: TaskProvider;

  /** Auto-install Vibe Kanban if no provider configured and it's not available */
  autoInstall: boolean;

  /** Provider-specific configuration */
  providerConfig?: ProviderConfig;
}

/**
 * Provider-specific configuration options
 */
export interface ProviderConfig {
  // Vibe Kanban
  vibeKanbanProjectId?: string;

  // Jira
  jiraHost?: string;
  jiraProject?: string;
  jiraApiToken?: string;

  // Linear
  linearTeam?: string;
  linearApiKey?: string;

  // GitHub Issues
  githubRepo?: string;
  githubToken?: string;

  // Beads (bd CLI)
  beadsBinaryPath?: string;
}

/**
 * Default task management configuration
 */
export const DEFAULT_TASK_MANAGEMENT_CONFIG: TaskManagementConfig = {
  provider: 'vibe-kanban',
  autoInstall: true,
};

// ============================================================================
// Adapter Creation Result
// ============================================================================

/**
 * Result of creating a task adapter
 */
export interface AdapterCreateResult {
  /** The created adapter (null if creation failed) */
  adapter: TaskAdapter | null;
  /** Error message if creation failed */
  error?: string;
  /** Whether auto-install was attempted */
  autoInstallAttempted?: boolean;
}

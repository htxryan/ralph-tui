/**
 * Vibe Kanban Task Adapter
 *
 * Integrates with the Vibe Kanban MCP server for task management.
 * This adapter communicates with the Vibe Kanban server via HTTP API.
 */

import { KanbanTask } from '../types.js';
import { BaseTaskAdapter } from './base-adapter.js';
import {
  TaskProvider,
  TaskManagementConfig,
  ListTasksOptions,
  CreateTaskInput,
  UpdateTaskInput,
} from './types.js';

/**
 * Default port for the Vibe Kanban MCP server
 */
const DEFAULT_VIBE_KANBAN_PORT = 3456;

/**
 * Task response from Vibe Kanban API
 */
interface VibeKanbanTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
}

/**
 * Project response from Vibe Kanban API
 */
interface VibeKanbanProject {
  id: string;
  name: string;
  path?: string;
  created_at: string;
}

/**
 * Vibe Kanban Task Adapter
 *
 * Connects to the Vibe Kanban MCP server to manage tasks.
 * The server is expected to be running on localhost at the configured port.
 */
export class VibeKanbanAdapter extends BaseTaskAdapter {
  readonly name: TaskProvider = 'vibe-kanban';

  private baseUrl: string;
  private projectId: string | null = null;

  constructor(config: TaskManagementConfig) {
    super(config);
    const port = DEFAULT_VIBE_KANBAN_PORT;
    this.baseUrl = `http://localhost:${port}`;

    // Get project ID from config if provided
    if (config.provider_config?.vibe_kanban_project_id) {
      this.projectId = config.provider_config.vibe_kanban_project_id;
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle Methods
  // -------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try to detect project if not provided
    if (!this.projectId) {
      const detectedProject = await this.detectProject();
      if (detectedProject) {
        this.projectId = detectedProject;
      }
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/health', 'GET');
      return response !== null;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Core Read Operations
  // -------------------------------------------------------------------------

  async getTask(taskId: string): Promise<KanbanTask | null> {
    this.ensureInitialized();

    try {
      const task = await this.makeRequest<VibeKanbanTask>(
        `/api/tasks/${taskId}`,
        'GET'
      );

      if (!task) return null;

      return this.mapVibeKanbanTask(task);
    } catch (error) {
      // Task not found or other error
      console.error(`Failed to fetch task ${taskId}:`, error);
      return null;
    }
  }

  async listTasks(options?: ListTasksOptions): Promise<KanbanTask[]> {
    this.ensureInitialized();

    try {
      const projectId = options?.projectId || this.projectId;
      if (!projectId) {
        console.warn('No project ID available for listing tasks');
        return [];
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.set('project_id', projectId);

      if (options?.status && options.status !== 'all') {
        params.set('status', this.mapStatusToVibeKanban(options.status));
      }

      if (options?.limit) {
        params.set('limit', String(options.limit));
      }

      const tasks = await this.makeRequest<VibeKanbanTask[]>(
        `/api/tasks?${params.toString()}`,
        'GET'
      );

      if (!tasks) return [];

      return tasks.map(task => this.mapVibeKanbanTask(task));
    } catch (error) {
      console.error('Failed to list tasks:', error);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  async createTask(input: CreateTaskInput): Promise<KanbanTask> {
    this.ensureInitialized();

    const projectId = input.projectId || this.projectId;
    if (!projectId) {
      throw new Error('No project ID available for creating task');
    }

    const body = {
      project_id: projectId,
      title: input.title,
      description: input.description,
    };

    const task = await this.makeRequest<VibeKanbanTask>(
      '/api/tasks',
      'POST',
      body
    );

    if (!task) {
      throw new Error('Failed to create task');
    }

    return this.mapVibeKanbanTask(task);
  }

  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<KanbanTask> {
    this.ensureInitialized();

    const body: Record<string, unknown> = {
      task_id: taskId,
    };

    if (updates.title !== undefined) {
      body.title = updates.title;
    }

    if (updates.description !== undefined) {
      body.description = updates.description;
    }

    if (updates.status !== undefined) {
      body.status = this.mapStatusToVibeKanban(
        updates.status === 'open' ? 'todo' : updates.status === 'closed' ? 'done' : 'inprogress'
      );
    }

    const task = await this.makeRequest<VibeKanbanTask>(
      `/api/tasks/${taskId}`,
      'PUT',
      body
    );

    if (!task) {
      throw new Error('Failed to update task');
    }

    return this.mapVibeKanbanTask(task);
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  async detectProject(): Promise<string | null> {
    try {
      // Try to get context from Vibe Kanban
      const context = await this.makeRequest<{
        project?: { id: string };
      }>('/api/context', 'GET');

      if (context?.project?.id) {
        return context.project.id;
      }

      // Fallback: try to find project by current directory
      const cwd = process.cwd();
      const projects = await this.makeRequest<VibeKanbanProject[]>(
        '/api/projects',
        'GET'
      );

      if (projects) {
        // Look for a project whose path matches our current directory
        const matchingProject = projects.find(p =>
          p.path && cwd.includes(p.path)
        );

        if (matchingProject) {
          return matchingProject.id;
        }

        // If only one project exists, use it
        if (projects.length === 1) {
          return projects[0].id;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Make an HTTP request to the Vibe Kanban server
   */
  private async makeRequest<T>(
    path: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const url = `${this.baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Connection refused or other network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Vibe Kanban server not available');
      }
      throw error;
    }
  }

  /**
   * Map Vibe Kanban task to our KanbanTask type
   */
  private mapVibeKanbanTask(task: VibeKanbanTask): KanbanTask {
    return this.normalizeTask({
      id: task.id,
      title: task.title,
      description: task.description,
      status: this.mapStatus(task.status),
      type: 'task',
      created_at: task.created_at,
      updated_at: task.updated_at,
    });
  }

  /**
   * Map our status type to Vibe Kanban status
   */
  private mapStatusToVibeKanban(
    status: string
  ): 'todo' | 'inprogress' | 'done' {
    const normalized = status.toLowerCase().replace(/[^a-z]/g, '');

    if (normalized === 'todo' || normalized === 'open' || normalized === 'pending') {
      return 'todo';
    }

    if (normalized === 'done' || normalized === 'closed' || normalized === 'completed') {
      return 'done';
    }

    return 'inprogress';
  }
}

/**
 * Tests for task adapter system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TaskAdapter,
  TaskProvider,
  TaskManagementConfig,
  DEFAULT_TASK_MANAGEMENT_CONFIG,
  ListTasksOptions,
  CreateTaskInput,
  UpdateTaskInput,
} from './types.js';
import { BaseTaskAdapter } from './base-adapter.js';
import { VibeKanbanAdapter } from './vibe-kanban-adapter.js';
import {
  createTaskAdapter,
  getSupportedProviders,
  isProviderImplemented,
  getProviderDisplayName,
} from './factory.js';
import { KanbanTask } from '../types.js';
import {
  validateConfig,
  DEFAULT_CONFIG,
  ConfigValidationError,
} from '../config.js';

// =============================================================================
// Types Tests
// =============================================================================

describe('task-adapters/types', () => {
  describe('DEFAULT_TASK_MANAGEMENT_CONFIG', () => {
    it('has vibe-kanban as the default provider', () => {
      expect(DEFAULT_TASK_MANAGEMENT_CONFIG.provider).toBe('vibe-kanban');
    });

    it('has autoInstall enabled by default', () => {
      expect(DEFAULT_TASK_MANAGEMENT_CONFIG.autoInstall).toBe(true);
    });
  });
});

// =============================================================================
// Base Adapter Tests
// =============================================================================

describe('task-adapters/base-adapter', () => {
  // Create a concrete implementation for testing
  class TestAdapter extends BaseTaskAdapter {
    readonly name: TaskProvider = 'vibe-kanban';
    private tasks: Map<string, KanbanTask> = new Map();

    async initialize(): Promise<void> {
      this.initialized = true;
    }

    async isAvailable(): Promise<boolean> {
      return true;
    }

    async getTask(taskId: string): Promise<KanbanTask | null> {
      this.ensureInitialized();
      return this.tasks.get(taskId) || null;
    }

    async listTasks(): Promise<KanbanTask[]> {
      this.ensureInitialized();
      return Array.from(this.tasks.values());
    }

    // Expose protected methods for testing
    public testNormalizeTask(task: Partial<KanbanTask>): KanbanTask {
      return this.normalizeTask(task);
    }

    public testMapStatus(status: string): 'open' | 'in_progress' | 'closed' {
      return this.mapStatus(status);
    }

    public testMapType(type: string): 'task' | 'bug' | 'feature' {
      return this.mapType(type);
    }

    public testMapPriority(priority: string | null | undefined): 'high' | 'medium' | 'low' | undefined {
      return this.mapPriority(priority);
    }

    public addTask(task: KanbanTask): void {
      this.tasks.set(task.id, task);
    }
  }

  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(DEFAULT_TASK_MANAGEMENT_CONFIG);
  });

  describe('initialization', () => {
    it('throws error if methods called before initialization', async () => {
      await expect(adapter.getTask('test')).rejects.toThrow('not initialized');
    });

    it('works after initialization', async () => {
      await adapter.initialize();
      const task = await adapter.getTask('nonexistent');
      expect(task).toBeNull();
    });
  });

  describe('normalizeTask', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('fills in missing required fields', () => {
      const normalized = adapter.testNormalizeTask({});
      expect(normalized.id).toBe('');
      expect(normalized.title).toBe('Untitled Task');
      expect(normalized.type).toBe('task');
      expect(normalized.status).toBe('open');
      expect(normalized.created_at).toBeDefined();
      expect(normalized.updated_at).toBeDefined();
    });

    it('preserves provided fields', () => {
      const normalized = adapter.testNormalizeTask({
        id: 'test-123',
        title: 'My Task',
        type: 'bug',
        status: 'closed',
        priority: 'high',
      });
      expect(normalized.id).toBe('test-123');
      expect(normalized.title).toBe('My Task');
      expect(normalized.type).toBe('bug');
      expect(normalized.status).toBe('closed');
      expect(normalized.priority).toBe('high');
    });
  });

  describe('mapStatus', () => {
    it('maps open states correctly', () => {
      expect(adapter.testMapStatus('open')).toBe('open');
      expect(adapter.testMapStatus('todo')).toBe('open');
      expect(adapter.testMapStatus('new')).toBe('open');
      expect(adapter.testMapStatus('backlog')).toBe('open');
      expect(adapter.testMapStatus('pending')).toBe('open');
    });

    it('maps in_progress states correctly', () => {
      expect(adapter.testMapStatus('in_progress')).toBe('in_progress');
      expect(adapter.testMapStatus('inprogress')).toBe('in_progress');
      expect(adapter.testMapStatus('in-progress')).toBe('in_progress');
      expect(adapter.testMapStatus('doing')).toBe('in_progress');
      expect(adapter.testMapStatus('active')).toBe('in_progress');
      expect(adapter.testMapStatus('inreview')).toBe('in_progress');
    });

    it('maps closed states correctly', () => {
      expect(adapter.testMapStatus('closed')).toBe('closed');
      expect(adapter.testMapStatus('done')).toBe('closed');
      expect(adapter.testMapStatus('complete')).toBe('closed');
      expect(adapter.testMapStatus('completed')).toBe('closed');
      expect(adapter.testMapStatus('resolved')).toBe('closed');
      expect(adapter.testMapStatus('cancelled')).toBe('closed');
    });

    it('defaults unknown statuses to open', () => {
      expect(adapter.testMapStatus('unknown')).toBe('open');
      expect(adapter.testMapStatus('random')).toBe('open');
    });
  });

  describe('mapType', () => {
    it('maps bug types correctly', () => {
      expect(adapter.testMapType('bug')).toBe('bug');
      expect(adapter.testMapType('defect')).toBe('bug');
      expect(adapter.testMapType('Bug Report')).toBe('bug');
    });

    it('maps feature types correctly', () => {
      expect(adapter.testMapType('feature')).toBe('feature');
      expect(adapter.testMapType('enhancement')).toBe('feature');
      expect(adapter.testMapType('story')).toBe('feature');
      expect(adapter.testMapType('Feature Request')).toBe('feature');
    });

    it('defaults unknown types to task', () => {
      expect(adapter.testMapType('task')).toBe('task');
      expect(adapter.testMapType('chore')).toBe('task');
      expect(adapter.testMapType('unknown')).toBe('task');
    });
  });

  describe('mapPriority', () => {
    it('maps high priority correctly', () => {
      expect(adapter.testMapPriority('high')).toBe('high');
      expect(adapter.testMapPriority('critical')).toBe('high');
      expect(adapter.testMapPriority('urgent')).toBe('high');
      expect(adapter.testMapPriority('P0')).toBe('high');
      expect(adapter.testMapPriority('P1')).toBe('high');
    });

    it('maps low priority correctly', () => {
      expect(adapter.testMapPriority('low')).toBe('low');
      expect(adapter.testMapPriority('minor')).toBe('low');
      expect(adapter.testMapPriority('P3')).toBe('low');
      expect(adapter.testMapPriority('P4')).toBe('low');
    });

    it('defaults to medium priority', () => {
      expect(adapter.testMapPriority('medium')).toBe('medium');
      expect(adapter.testMapPriority('normal')).toBe('medium');
      expect(adapter.testMapPriority('P2')).toBe('medium');
    });

    it('returns undefined for null/undefined', () => {
      expect(adapter.testMapPriority(null)).toBeUndefined();
      expect(adapter.testMapPriority(undefined)).toBeUndefined();
    });
  });
});

// =============================================================================
// Factory Tests
// =============================================================================

describe('task-adapters/factory', () => {
  describe('getSupportedProviders', () => {
    it('returns all supported providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toContain('vibe-kanban');
      expect(providers).toContain('jira');
      expect(providers).toContain('linear');
      expect(providers).toContain('beads');
      expect(providers).toContain('github-issues');
      expect(providers).toHaveLength(5);
    });
  });

  describe('isProviderImplemented', () => {
    it('returns true for vibe-kanban', () => {
      expect(isProviderImplemented('vibe-kanban')).toBe(true);
    });

    it('returns false for stub adapters', () => {
      expect(isProviderImplemented('jira')).toBe(false);
      expect(isProviderImplemented('linear')).toBe(false);
      expect(isProviderImplemented('beads')).toBe(false);
      expect(isProviderImplemented('github-issues')).toBe(false);
    });
  });

  describe('getProviderDisplayName', () => {
    it('returns human-readable names', () => {
      expect(getProviderDisplayName('vibe-kanban')).toBe('Vibe Kanban');
      expect(getProviderDisplayName('jira')).toBe('Jira');
      expect(getProviderDisplayName('linear')).toBe('Linear');
      expect(getProviderDisplayName('beads')).toBe('Beads (BD)');
      expect(getProviderDisplayName('github-issues')).toBe('GitHub Issues');
    });
  });

  describe('createTaskAdapter', () => {
    it('creates a vibe-kanban adapter by default', async () => {
      const result = await createTaskAdapter();
      // Since the server isn't running, adapter should be null
      expect(result.adapter).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('returns error for unavailable adapter', async () => {
      const result = await createTaskAdapter({
        provider: 'vibe-kanban',
        autoInstall: false,
      });
      expect(result.adapter).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('creates stub adapters for unimplemented providers', async () => {
      const jiraResult = await createTaskAdapter({
        provider: 'jira',
        autoInstall: false,
      });
      expect(jiraResult.adapter).toBeNull();
      expect(jiraResult.error).toContain('not available');

      const linearResult = await createTaskAdapter({
        provider: 'linear',
        autoInstall: false,
      });
      expect(linearResult.adapter).toBeNull();
      expect(linearResult.error).toContain('not available');
    });
  });
});

// =============================================================================
// Vibe Kanban Adapter Tests
// =============================================================================

describe('task-adapters/vibe-kanban-adapter', () => {
  let adapter: VibeKanbanAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    adapter = new VibeKanbanAdapter({
      provider: 'vibe-kanban',
      autoInstall: false,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('has correct name', () => {
      expect(adapter.name).toBe('vibe-kanban');
    });

    it('initializes successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      await adapter.initialize();
      // Should not throw
    });
  });

  describe('isAvailable', () => {
    it('returns true when server responds', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });

    it('returns false when server is unavailable', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      const available = await adapter.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('getTask', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      await adapter.initialize();
    });

    it('returns task when found', async () => {
      const mockTask = {
        id: 'test-123',
        title: 'Test Task',
        description: 'A test task',
        status: 'todo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTask),
      });

      const task = await adapter.getTask('test-123');
      expect(task).not.toBeNull();
      expect(task?.id).toBe('test-123');
      expect(task?.title).toBe('Test Task');
      expect(task?.status).toBe('open');
    });

    it('returns null when task not found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const task = await adapter.getTask('nonexistent');
      expect(task).toBeNull();
    });
  });

  describe('listTasks', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      await adapter.initialize();
    });

    it('returns empty array when no project ID', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tasks = await adapter.listTasks();
      expect(tasks).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('No project ID available for listing tasks');
      warnSpy.mockRestore();
    });

    it('returns tasks when project ID is set in options', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'todo',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'done',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks),
      });

      const tasks = await adapter.listTasks({ projectId: 'project-123' });
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('task-1');
      expect(tasks[1].id).toBe('task-2');
    });
  });

  describe('createTask', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      await adapter.initialize();
    });

    it('throws error when no project ID', async () => {
      await expect(
        adapter.createTask({ title: 'New Task' })
      ).rejects.toThrow('No project ID');
    });

    it('creates task when project ID provided', async () => {
      const mockTask = {
        id: 'new-task',
        title: 'New Task',
        status: 'todo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTask),
      });

      const task = await adapter.createTask({
        title: 'New Task',
        projectId: 'project-123',
      });
      expect(task.id).toBe('new-task');
      expect(task.title).toBe('New Task');
    });
  });

  describe('updateTask', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      await adapter.initialize();
    });

    it('updates task', async () => {
      const mockTask = {
        id: 'task-123',
        title: 'Updated Task',
        status: 'inprogress',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTask),
      });

      const task = await adapter.updateTask('task-123', {
        title: 'Updated Task',
        status: 'in_progress',
      });
      expect(task.title).toBe('Updated Task');
      expect(task.status).toBe('in_progress');
    });
  });
});

// =============================================================================
// Config Integration Tests
// =============================================================================

describe('config/taskManagement', () => {

  describe('validateConfig with taskManagement', () => {
    it('accepts valid taskManagement config', () => {
      const config = {
        ...DEFAULT_CONFIG,
        taskManagement: {
          provider: 'vibe-kanban' as TaskProvider,
          autoInstall: true,
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('accepts all valid providers', () => {
      const providers: TaskProvider[] = [
        'vibe-kanban',
        'jira',
        'linear',
        'beads',
        'github-issues',
      ];

      for (const provider of providers) {
        const config = {
          ...DEFAULT_CONFIG,
          taskManagement: {
            provider,
            autoInstall: false,
          },
        };
        expect(() => validateConfig(config)).not.toThrow();
      }
    });

    it('rejects invalid provider', () => {
      const config = {
        ...DEFAULT_CONFIG,
        taskManagement: {
          provider: 'invalid-provider' as TaskProvider,
          autoInstall: true,
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('rejects non-boolean autoInstall', () => {
      const config = {
        ...DEFAULT_CONFIG,
        taskManagement: {
          provider: 'vibe-kanban' as TaskProvider,
          autoInstall: 'yes' as unknown as boolean,
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });
  });

  describe('DEFAULT_CONFIG includes taskManagement', () => {
    it('has taskManagement with default values', () => {
      expect(DEFAULT_CONFIG.taskManagement).toBeDefined();
      expect(DEFAULT_CONFIG.taskManagement.provider).toBe('vibe-kanban');
      expect(DEFAULT_CONFIG.taskManagement.autoInstall).toBe(true);
    });
  });
});

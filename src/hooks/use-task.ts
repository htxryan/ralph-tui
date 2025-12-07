import { useState, useEffect, useCallback, useRef } from 'react';
import { KanbanTask } from '../lib/types.js';
import {
  TaskAdapter,
  TaskManagementConfig,
  createTaskAdapter,
  DEFAULT_TASK_MANAGEMENT_CONFIG,
} from '../lib/task-adapters/index.js';

export interface UseTaskOptions {
  taskId: string | null;
  refreshInterval?: number;
  /** Optional task management config (defaults to vibe-kanban) */
  taskConfig?: TaskManagementConfig;
}

export interface UseTaskResult {
  task: KanbanTask | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  /** The active adapter (null if initialization failed) */
  adapter: TaskAdapter | null;
  /** Whether the adapter is ready */
  adapterReady: boolean;
}

export function useTask(options: UseTaskOptions): UseTaskResult {
  const {
    taskId,
    refreshInterval = 30000,
    taskConfig = DEFAULT_TASK_MANAGEMENT_CONFIG,
  } = options;

  const [task, setTask] = useState<KanbanTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [adapter, setAdapter] = useState<TaskAdapter | null>(null);
  const [adapterReady, setAdapterReady] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const adapterRef = useRef<TaskAdapter | null>(null);

  // Initialize the adapter
  useEffect(() => {
    let cancelled = false;

    async function initAdapter() {
      try {
        const result = await createTaskAdapter(taskConfig);

        if (cancelled) return;

        if (result.adapter) {
          adapterRef.current = result.adapter;
          setAdapter(result.adapter);
          setAdapterReady(true);
          setError(null);
        } else {
          setAdapter(null);
          setAdapterReady(false);
          setError(new Error(result.error || 'Failed to create task adapter'));
        }
      } catch (err) {
        if (cancelled) return;
        setAdapter(null);
        setAdapterReady(false);
        setError(err instanceof Error ? err : new Error('Failed to initialize adapter'));
      }
    }

    initAdapter();

    return () => {
      cancelled = true;
    };
  }, [taskConfig]);

  // Fetch task using the adapter
  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    const currentAdapter = adapterRef.current;
    if (!currentAdapter) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const fetchedTask = await currentAdapter.getTask(taskId);

      // Validate that we got a real task with required fields
      if (!fetchedTask || !fetchedTask.id || !fetchedTask.title) {
        setTask(null);
        setError(null);
      } else {
        setTask(fetchedTask);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Failed to fetch task'));
      }
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  const refresh = useCallback(() => {
    fetchTask();
  }, [fetchTask]);

  // Fetch task when adapter becomes ready or taskId changes
  useEffect(() => {
    if (!adapterReady) return;

    fetchTask();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTask, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTask, refreshInterval, adapterReady]);

  return {
    task,
    isLoading,
    error,
    refresh,
    adapter,
    adapterReady,
  };
}

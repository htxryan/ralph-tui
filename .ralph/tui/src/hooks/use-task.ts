import { useState, useEffect, useCallback, useRef } from 'react';
import { execa } from 'execa';
import { KanbanTask } from '../lib/types.js';

export interface UseTaskOptions {
  taskId: string | null;
  refreshInterval?: number;
}

export interface UseTaskResult {
  task: KanbanTask | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useTask(options: UseTaskOptions): UseTaskResult {
  const { taskId, refreshInterval = 30000 } = options;

  const [task, setTask] = useState<KanbanTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { stdout } = await execa('bd', ['show', taskId, '--json']);
      const parsed = JSON.parse(stdout) as KanbanTask;
      // Validate that we got a real task with required fields
      if (!parsed || !parsed.id || !parsed.title) {
        setTask(null);
        setError(null);
      } else {
        setTask(parsed);
        setError(null);
      }
    } catch (err) {
      // Try to extract error message
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

  useEffect(() => {
    fetchTask();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTask, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTask, refreshInterval]);

  return {
    task,
    isLoading,
    error,
    refresh,
  };
}

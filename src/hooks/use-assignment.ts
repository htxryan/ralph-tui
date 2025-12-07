import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { Assignment } from '../lib/types.js';

export interface UseAssignmentOptions {
  basePath?: string;
}

export interface UseAssignmentResult {
  assignment: Assignment | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useAssignment(options: UseAssignmentOptions = {}): UseAssignmentResult {
  const { basePath = process.cwd() } = options;
  const assignmentPath = path.join(basePath, '.ralph', 'planning', 'assignment.json');

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);

  const readAssignment = useCallback(() => {
    try {
      if (!fs.existsSync(assignmentPath)) {
        setAssignment(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const content = fs.readFileSync(assignmentPath, 'utf-8');
      const parsed = JSON.parse(content) as Assignment;
      setAssignment(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setAssignment(null);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentPath]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    readAssignment();
  }, [readAssignment]);

  useEffect(() => {
    readAssignment();

    // Watch for changes
    const dirPath = path.dirname(assignmentPath);
    if (fs.existsSync(dirPath)) {
      watcherRef.current = chokidar.watch(assignmentPath, {
        persistent: true,
        ignoreInitial: true,
      });

      watcherRef.current.on('change', readAssignment);
      watcherRef.current.on('add', readAssignment);
      watcherRef.current.on('unlink', () => {
        setAssignment(null);
      });
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [assignmentPath, readAssignment]);

  return {
    assignment,
    isLoading,
    error,
    refresh,
  };
}

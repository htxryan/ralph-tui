import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { Assignment, LegacyAssignment } from '../lib/types.js';

export interface UseAssignmentOptions {
  basePath?: string;
}

export interface UseAssignmentResult {
  assignment: Assignment | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Check if a parsed object matches the legacy assignment schema
 */
function isLegacyAssignment(obj: unknown): obj is LegacyAssignment {
  if (typeof obj !== 'object' || obj === null) return false;
  const legacy = obj as Record<string, unknown>;
  // Legacy schema has 'workflow' field and optional 'task_id'
  return 'workflow' in legacy || (Object.keys(legacy).length <= 2 && !('next_step' in legacy));
}

/**
 * Convert legacy assignment to new format
 */
function convertLegacyAssignment(legacy: LegacyAssignment): Assignment | null {
  // Can't convert without at least a task_id
  if (!legacy.task_id) return null;

  return {
    task_id: legacy.task_id,
    next_step: legacy.workflow ? `Continue from workflow: ${legacy.workflow}` : 'Start workflow',
    pull_request_url: null,
  };
}

export function useAssignment(options: UseAssignmentOptions = {}): UseAssignmentResult {
  const { basePath = process.cwd() } = options;
  // New path: .ralph/assignment.json (moved from .ralph/planning/assignment.json)
  const assignmentPath = path.join(basePath, '.ralph', 'assignment.json');
  // Legacy path for backwards compatibility
  const legacyPath = path.join(basePath, '.ralph', 'planning', 'assignment.json');

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);

  const readAssignment = useCallback(() => {
    try {
      // Try new path first
      let filePath = assignmentPath;
      let content: string | null = null;

      if (fs.existsSync(assignmentPath)) {
        content = fs.readFileSync(assignmentPath, 'utf-8');
      } else if (fs.existsSync(legacyPath)) {
        // Fall back to legacy path
        filePath = legacyPath;
        content = fs.readFileSync(legacyPath, 'utf-8');
      }

      if (content === null) {
        setAssignment(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const parsed = JSON.parse(content);

      // Check if it's legacy format and convert if needed
      if (isLegacyAssignment(parsed)) {
        const converted = convertLegacyAssignment(parsed);
        setAssignment(converted);
      } else {
        setAssignment(parsed as Assignment);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setAssignment(null);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentPath, legacyPath]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    readAssignment();
  }, [readAssignment]);

  useEffect(() => {
    readAssignment();

    // Watch both new and legacy paths for changes
    const pathsToWatch: string[] = [];
    const newDirPath = path.dirname(assignmentPath);
    const legacyDirPath = path.dirname(legacyPath);

    if (fs.existsSync(newDirPath)) {
      pathsToWatch.push(assignmentPath);
    }
    if (fs.existsSync(legacyDirPath)) {
      pathsToWatch.push(legacyPath);
    }

    if (pathsToWatch.length > 0) {
      watcherRef.current = chokidar.watch(pathsToWatch, {
        persistent: true,
        ignoreInitial: true,
      });

      watcherRef.current.on('change', readAssignment);
      watcherRef.current.on('add', readAssignment);
      watcherRef.current.on('unlink', () => {
        // Re-read to check if the other path exists
        readAssignment();
      });
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [assignmentPath, legacyPath, readAssignment]);

  return {
    assignment,
    isLoading,
    error,
    refresh,
  };
}

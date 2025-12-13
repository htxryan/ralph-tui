import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { Assignment, LegacyAssignment } from '../lib/types.js';

export interface UseAssignmentOptions {
  basePath?: string;
  /** Active project name - assignment.json is stored per-project */
  activeProjectName?: string;
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
  const { basePath = process.cwd(), activeProjectName } = options;

  // Project-specific path: .ralph/projects/<project>/assignment.json
  // Falls back to 'default' project if no project specified
  const projectName = activeProjectName || 'default';
  const assignmentPath = path.join(basePath, '.ralph', 'projects', projectName, 'assignment.json');

  // Legacy paths for backwards compatibility (checked in order):
  // 1. Old root path: .ralph/assignment.json
  // 2. Very old path: .ralph/planning/assignment.json
  const legacyRootPath = path.join(basePath, '.ralph', 'assignment.json');
  const legacyPlanningPath = path.join(basePath, '.ralph', 'planning', 'assignment.json');

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);

  const readAssignment = useCallback(() => {
    try {
      // Try paths in order of preference:
      // 1. Project-specific path (new)
      // 2. Root .ralph/assignment.json (legacy)
      // 3. .ralph/planning/assignment.json (very old legacy)
      let content: string | null = null;

      if (fs.existsSync(assignmentPath)) {
        content = fs.readFileSync(assignmentPath, 'utf-8');
      } else if (fs.existsSync(legacyRootPath)) {
        // Fall back to old root path
        content = fs.readFileSync(legacyRootPath, 'utf-8');
      } else if (fs.existsSync(legacyPlanningPath)) {
        // Fall back to very old planning path
        content = fs.readFileSync(legacyPlanningPath, 'utf-8');
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
  }, [assignmentPath, legacyRootPath, legacyPlanningPath]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    readAssignment();
  }, [readAssignment]);

  useEffect(() => {
    readAssignment();

    // Watch all assignment paths for changes (new project-specific + legacy paths)
    const pathsToWatch: string[] = [];
    const projectDirPath = path.dirname(assignmentPath);
    const legacyRootDirPath = path.dirname(legacyRootPath);
    const legacyPlanningDirPath = path.dirname(legacyPlanningPath);

    if (fs.existsSync(projectDirPath)) {
      pathsToWatch.push(assignmentPath);
    }
    if (fs.existsSync(legacyRootDirPath)) {
      pathsToWatch.push(legacyRootPath);
    }
    if (fs.existsSync(legacyPlanningDirPath)) {
      pathsToWatch.push(legacyPlanningPath);
    }

    if (pathsToWatch.length > 0) {
      watcherRef.current = chokidar.watch(pathsToWatch, {
        persistent: true,
        ignoreInitial: true,
      });

      watcherRef.current.on('change', readAssignment);
      watcherRef.current.on('add', readAssignment);
      watcherRef.current.on('unlink', () => {
        // Re-read to check if another path exists
        readAssignment();
      });
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [assignmentPath, legacyRootPath, legacyPlanningPath, readAssignment]);

  return {
    assignment,
    isLoading,
    error,
    refresh,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';

/**
 * Information about a project (execution mode)
 */
export interface ProjectInfo {
  /** Directory name (e.g., "develop", "default") */
  name: string;
  /** Full path to project directory */
  path: string;
  /** Human-readable name from settings.json (optional) */
  displayName?: string;
  /** Description from settings.json (optional) */
  description?: string;
  /** Whether execute.md exists in this project */
  hasExecuteFile: boolean;
}

export interface UseProjectsOptions {
  /** Base path where .ralph/ directory is located */
  basePath?: string;
}

export interface UseProjectsResult {
  /** List of available projects */
  projects: ProjectInfo[];
  /** Whether projects are being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refresh the project list */
  refresh: () => void;
}

/**
 * Load project metadata from settings.json
 */
function loadProjectMetadata(
  projectPath: string
): { displayName?: string; description?: string } {
  const settingsPath = path.join(projectPath, 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return {
        displayName: settings.display_name,
        description: settings.description,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

/**
 * Hook to discover and list available projects from .ralph/projects/
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { basePath = process.cwd() } = options;
  const projectsDir = path.join(basePath, '.ralph', 'projects');

  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);

  const scanProjects = useCallback(() => {
    try {
      if (!fs.existsSync(projectsDir)) {
        setProjects([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      const projectList: ProjectInfo[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(projectsDir, entry.name);
          const executePath = path.join(projectPath, 'execute.md');
          const hasExecuteFile = fs.existsSync(executePath);

          const metadata = loadProjectMetadata(projectPath);

          projectList.push({
            name: entry.name,
            path: projectPath,
            displayName: metadata.displayName,
            description: metadata.description,
            hasExecuteFile,
          });
        }
      }

      // Sort projects alphabetically by name, but put "default" first
      projectList.sort((a, b) => {
        if (a.name === 'default') return -1;
        if (b.name === 'default') return 1;
        return a.name.localeCompare(b.name);
      });

      setProjects(projectList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectsDir]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    scanProjects();
  }, [scanProjects]);

  useEffect(() => {
    scanProjects();

    // Watch for changes to the projects directory
    if (fs.existsSync(projectsDir)) {
      watcherRef.current = chokidar.watch(projectsDir, {
        persistent: true,
        ignoreInitial: true,
        depth: 1, // Watch project subdirectories
      });

      watcherRef.current.on('addDir', scanProjects);
      watcherRef.current.on('unlinkDir', scanProjects);
      watcherRef.current.on('add', (filePath) => {
        // Rescan if a settings.json or execute.md is added
        if (filePath.endsWith('settings.json') || filePath.endsWith('execute.md')) {
          scanProjects();
        }
      });
      watcherRef.current.on('change', (filePath) => {
        // Rescan if a settings.json is modified
        if (filePath.endsWith('settings.json')) {
          scanProjects();
        }
      });
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [projectsDir, scanProjects]);

  return {
    projects,
    isLoading,
    error,
    refresh,
  };
}

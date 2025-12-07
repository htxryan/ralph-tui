import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import { Todo } from '../lib/types.js';

export interface UseClaudeCodeTodosOptions {
  sessionId?: string;
  watchDirectory?: string;
}

export interface UseClaudeCodeTodosResult {
  todos: Todo[];
  sessionId: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useClaudeCodeTodos(
  options: UseClaudeCodeTodosOptions = {}
): UseClaudeCodeTodosResult {
  const {
    sessionId: providedSessionId,
    watchDirectory = path.join(os.homedir(), '.claude', 'todos'),
  } = options;

  const [todos, setTodos] = useState<Todo[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(providedSessionId ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);

  const findMostRecentTodoFile = useCallback((): string | null => {
    try {
      if (!fs.existsSync(watchDirectory)) {
        return null;
      }

      const files = fs.readdirSync(watchDirectory)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(watchDirectory, f),
          mtime: fs.statSync(path.join(watchDirectory, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return files.length > 0 ? files[0].path : null;
    } catch {
      return null;
    }
  }, [watchDirectory]);

  const extractSessionId = useCallback((filePath: string): string | null => {
    // Todo files are named like: {session-id}-agent-{agent-id}.json
    const basename = path.basename(filePath, '.json');
    const match = basename.match(/^(.+)-agent-/);
    return match ? match[1] : null;
  }, []);

  const readTodos = useCallback((filePath: string | null) => {
    if (!filePath) {
      setTodos([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      if (!fs.existsSync(filePath)) {
        setTodos([]);
        setSessionId(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Handle both array format and object with todos property
      const todoList = Array.isArray(parsed) ? parsed : (parsed.todos ?? []);
      setTodos(todoList as Todo[]);
      setSessionId(extractSessionId(filePath));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [extractSessionId]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    const todoFile = providedSessionId
      ? fs.readdirSync(watchDirectory).find(f => f.startsWith(providedSessionId))
      : findMostRecentTodoFile();

    const filePath = todoFile && !todoFile.includes('/')
      ? path.join(watchDirectory, todoFile)
      : todoFile;

    readTodos(filePath ?? null);
  }, [providedSessionId, watchDirectory, findMostRecentTodoFile, readTodos]);

  useEffect(() => {
    refresh();

    // Watch the directory for changes
    if (fs.existsSync(watchDirectory)) {
      watcherRef.current = chokidar.watch(watchDirectory, {
        persistent: true,
        ignoreInitial: true,
        depth: 0,
      });

      watcherRef.current.on('add', refresh);
      watcherRef.current.on('change', refresh);
      watcherRef.current.on('unlink', refresh);
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [refresh, watchDirectory]);

  return {
    todos,
    sessionId,
    isLoading,
    error,
    refresh,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { execa } from 'execa';
import { BDIssue } from '../lib/types.js';

export interface UseBDIssueOptions {
  issueId: string | null;
  refreshInterval?: number;
}

export interface UseBDIssueResult {
  issue: BDIssue | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useBDIssue(options: UseBDIssueOptions): UseBDIssueResult {
  const { issueId, refreshInterval = 30000 } = options;

  const [issue, setIssue] = useState<BDIssue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchIssue = useCallback(async () => {
    if (!issueId) {
      setIssue(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { stdout } = await execa('bd', ['show', issueId, '--json']);
      const parsed = JSON.parse(stdout) as BDIssue;
      // Validate that we got a real issue with required fields
      if (!parsed || !parsed.id || !parsed.title) {
        setIssue(null);
        setError(null);
      } else {
        setIssue(parsed);
        setError(null);
      }
    } catch (err) {
      // Try to extract error message
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Failed to fetch BD issue'));
      }
      setIssue(null);
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  const refresh = useCallback(() => {
    fetchIssue();
  }, [fetchIssue]);

  useEffect(() => {
    fetchIssue();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchIssue, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchIssue, refreshInterval]);

  return {
    issue,
    isLoading,
    error,
    refresh,
  };
}

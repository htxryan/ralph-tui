import { useState, useCallback, useEffect, useRef } from 'react';
import { execa, type ResultPromise } from 'execa';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

export interface UseRalphProcessOptions {
  basePath?: string;
  /** Active project name to pass to ralph.sh via RALPH_PROJECT env var */
  activeProjectName?: string;
}

export interface UseRalphProcessResult {
  isStarting: boolean;
  isRunning: boolean;
  isStopping: boolean;
  isResuming: boolean;
  error: Error | null;
  start: () => void;
  stop: () => void;
  resume: (sessionId: string, userFeedback: string) => void;
}

// Get the directory where this module (and the package) is installed
function getPackageDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // This file is in src/hooks/ or dist/hooks/, so go up to package root
  // In dev: src/hooks -> package root
  // In dist: node_modules/ralph/dist/hooks -> node_modules/ralph
  return path.resolve(__dirname, '..', '..');
}

// Find the project root by looking for .ralph directory (user's data)
function findProjectRoot(): string {
  let dir = process.cwd();

  // If we're inside .ralph, go up to project root
  if (dir.endsWith('.ralph') || dir.includes('/.ralph/')) {
    dir = dir.replace(/\.ralph(\/.*)?$/, '');
  }

  // Verify .ralph exists at this location
  const ralphDir = path.join(dir, '.ralph');
  if (fs.existsSync(ralphDir)) {
    return dir;
  }

  // Walk up looking for .ralph directory (user data, not scripts)
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.ralph'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return process.cwd();
}

export function useRalphProcess(
  options: UseRalphProcessOptions = {}
): UseRalphProcessResult {
  const { basePath = findProjectRoot(), activeProjectName } = options;

  // Package scripts directory (bundled with the npm package)
  const packageDir = getPackageDir();
  const scriptsDir = path.join(packageDir, 'scripts');
  const ralphScript = path.join(scriptsDir, 'ralph.sh');

  // User data paths (in user's project)
  const userDataDir = path.join(basePath, '.ralph');
  const lockFile = path.join(userDataDir, 'claude.lock');
  const resumeTemplate = path.join(userDataDir, 'resume.md');
  const logFile = path.join(userDataDir, 'claude_output.jsonl');

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const processRef = useRef<ResultPromise | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Ralph is already running by looking at the lock file
  const checkIfRunning = useCallback(() => {
    try {
      if (fs.existsSync(lockFile)) {
        const pid = fs.readFileSync(lockFile, 'utf-8').trim();
        if (pid) {
          try {
            // Check if process with this PID exists
            process.kill(parseInt(pid), 0);
            return true;
          } catch {
            // Process doesn't exist, stale lock file
            return false;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [lockFile]);

  // Start Ralph process
  const start = useCallback(() => {
    if (isStarting || isRunning) {
      return;
    }

    setIsStarting(true);
    setError(null);

    // Check if script exists (bundled with package)
    if (!fs.existsSync(ralphScript)) {
      setError(new Error(`Ralph script not found: ${ralphScript}\n\nThis may indicate the package was not installed correctly.`));
      setIsStarting(false);
      return;
    }

    // Check if user has initialized their .ralph directory
    if (!fs.existsSync(userDataDir)) {
      setError(new Error(`Ralph data directory not found: ${userDataDir}\n\nRun 'ralph init' to set up your project.`));
      setIsStarting(false);
      return;
    }

    // Check if orchestrate.md exists (bundled with the package, not in user data)
    const orchestratePath = path.join(packageDir, 'prompts', 'orchestrate.md');
    if (!fs.existsSync(orchestratePath)) {
      setError(new Error(`Orchestration prompt not found: ${orchestratePath}\n\nThis may indicate the package was not installed correctly.`));
      setIsStarting(false);
      return;
    }

    try {
      // Spawn Ralph in detached mode so it keeps running after TUI exits
      // Pass RALPH_PROJECT_DIR so scripts know where user data lives
      // Use reject: false to prevent ExecaError from being thrown on process termination
      // We handle all exit codes gracefully in the .then() handler below
      const child = execa(ralphScript, [], {
        cwd: basePath,  // Run from user's project directory
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          RALPH_PROJECT_DIR: basePath,
          RALPH_PROJECT: activeProjectName || 'default',
        },
        reject: false,
      });

      // Handle process completion (both normal and via kill)
      // With reject: false, the promise always resolves (never rejects)
      child.then((result) => {
        // Exit code 143 = SIGTERM (killed by user), which is expected
        // Exit code 130 = SIGINT (Ctrl+C), also expected
        const isNormalTermination =
          result.exitCode === 143 ||
          result.exitCode === 130 ||
          result.exitCode === 0 ||
          result.signal === 'SIGTERM' ||
          result.signal === 'SIGINT';

        if (!isNormalTermination) {
          // Actual error - set error state
          setError(new Error(`Ralph exited with code ${result.exitCode}`));
        }

        // Clean up running state
        setIsRunning(false);
        setIsStarting(false);
      });

      // Unref so the TUI can exit independently
      child.unref();

      processRef.current = child;

      // Wait a moment then check if it's running
      setTimeout(() => {
        const running = checkIfRunning();
        setIsRunning(running);
        setIsStarting(false);

        if (!running) {
          setError(new Error('Ralph failed to start. Check if another instance is running.'));
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsStarting(false);
    }
  }, [isStarting, isRunning, ralphScript, userDataDir, basePath, checkIfRunning, activeProjectName]);

  // Stop Ralph process - comprehensive kill like kill.sh
  const stop = useCallback(async () => {
    if (isStopping) return;

    setIsStopping(true);
    setError(null);

    try {
      // First, try to kill the process from the lock file (most reliable)
      if (fs.existsSync(lockFile)) {
        const pid = fs.readFileSync(lockFile, 'utf-8').trim();
        if (pid) {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
          } catch {
            // Process may already be dead
          }
        }
      }

      // Then do comprehensive cleanup like kill.sh
      // Kill ralph.sh processes
      try {
        await execa('pkill', ['-f', 'ralph\\.sh'], { reject: false });
      } catch {
        // Ignore errors
      }

      // Kill sync.sh processes
      try {
        await execa('pkill', ['-f', 'sync\\.sh'], { reject: false });
      } catch {
        // Ignore errors
      }

      // Kill any child processes spawned from .ralph directory
      try {
        await execa('pkill', ['-f', '\\.ralph/'], { reject: false });
      } catch {
        // Ignore errors
      }

      // Kill any visualize.py processes
      try {
        await execa('pkill', ['-f', 'visualize\\.py'], { reject: false });
      } catch {
        // Ignore errors
      }

      // Clean up lock file
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
      } catch {
        // Ignore errors
      }

      // Wait a moment for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsRunning(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsStopping(false);
    }
  }, [lockFile, isStopping]);

  // Helper to inject a synthetic user event into the JSONL log
  const injectUserEvent = useCallback((promptText: string) => {
    const timestamp = new Date().toISOString();
    const escapedText = JSON.stringify(promptText);
    const event = `{"type":"user","message":{"content":[{"type":"text","text":${escapedText}}]},"timestamp":"${timestamp}"}\n`;
    fs.appendFileSync(logFile, event);
  }, [logFile]);

  // Resume Ralph with a session ID and user feedback
  const resume = useCallback(async (sessionId: string, userFeedback: string) => {
    if (isResuming || isStarting) return;

    setIsResuming(true);
    setError(null);

    try {
      // First, stop any running processes
      await stop();

      // Wait for stop to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Read the resume template
      let resumeContent = '';
      if (fs.existsSync(resumeTemplate)) {
        resumeContent = fs.readFileSync(resumeTemplate, 'utf-8');
      } else {
        resumeContent = '# Resuming Session\n\nYour manager has given you the feedback below. Consider it carefully, then resume your work accordingly.\n\n## Manager\'s Feedback\n\n';
      }

      // Build the full prompt with user feedback appended
      const fullPrompt = `${resumeContent.trim()}\n\n${userFeedback}`;

      // Inject the prompt as a user event so the TUI can display it
      injectUserEvent(fullPrompt);

      // Build the claude command with --resume flag
      // Note: We run claude directly instead of through ralph.sh for resume
      const claudeArgs = [
        '--resume', sessionId,
        '-p',
        '--output-format=stream-json',
        '--verbose',
        '--dangerously-skip-permissions',
        '--add-dir', '.',
      ];

      // Spawn claude in detached mode
      // Use reject: false to prevent ExecaError from being thrown on process termination
      // We handle all exit codes gracefully in the .then() handler below
      const child = execa('claude', claudeArgs, {
        cwd: basePath,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        input: fullPrompt,
        reject: false,
      });

      // Pipe output to log file
      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          fs.appendFileSync(logFile, data);
        });
      }

      // Handle process completion (both normal and via kill)
      // With reject: false, the promise always resolves (never rejects)
      child.then((result) => {
        // Exit code 143 = SIGTERM (killed by user), which is expected
        // Exit code 130 = SIGINT (Ctrl+C), also expected
        // isTerminated = true when process was killed by a signal
        const isNormalTermination =
          result.exitCode === 143 ||
          result.exitCode === 130 ||
          result.exitCode === 0 ||
          result.signal === 'SIGTERM' ||
          result.signal === 'SIGINT';

        if (!isNormalTermination) {
          // Actual error - set error state
          setError(new Error(`Claude exited with code ${result.exitCode}`));
        }
        // Always update running state
        setIsRunning(false);
        setIsResuming(false);
      });

      // Unref so the TUI can exit independently
      child.unref();

      processRef.current = child;

      // Write PID to lock file so we can track it
      if (child.pid) {
        fs.writeFileSync(lockFile, String(child.pid));
      }

      // Wait a moment then check if it's running
      setTimeout(() => {
        const running = checkIfRunning();
        setIsRunning(running);
        setIsResuming(false);

        if (!running) {
          setError(new Error('Resume failed to start. Check the session ID.'));
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsResuming(false);
    }
  }, [isResuming, isStarting, stop, resumeTemplate, injectUserEvent, basePath, logFile, lockFile, checkIfRunning]);

  // Check running status on mount and periodically
  useEffect(() => {
    // Initial check
    setIsRunning(checkIfRunning());

    // Periodic check
    checkIntervalRef.current = setInterval(() => {
      setIsRunning(checkIfRunning());
    }, 5000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkIfRunning]);

  return {
    isStarting,
    isRunning,
    isStopping,
    isResuming,
    error,
    start,
    stop,
    resume,
  };
}

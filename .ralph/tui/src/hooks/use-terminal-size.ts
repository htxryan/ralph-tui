import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

export interface TerminalSize {
  columns: number;
  rows: number;
}

export interface UseTerminalSizeResult extends TerminalSize {
  /** Whether terminal size is available (false if not a TTY) */
  isAvailable: boolean;
}

/**
 * Hook to get and track terminal dimensions.
 * Updates when the terminal is resized.
 */
export function useTerminalSize(): UseTerminalSizeResult {
  const { stdout } = useStdout();

  const getSize = (): TerminalSize => ({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    if (!stdout?.isTTY) return;

    const handleResize = () => {
      setSize(getSize());
    };

    // Listen for resize events
    stdout.on('resize', handleResize);

    // Initial size update
    handleResize();

    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return {
    ...size,
    isAvailable: stdout?.isTTY ?? false,
  };
}

/**
 * Component Render Helpers for Ralph TUI Tests
 *
 * Provides convenience wrappers around ink-testing-library
 * for consistent component testing patterns.
 */

import React, { type ReactElement } from 'react';
import { render as inkRender, type RenderOptions } from 'ink-testing-library';

/**
 * Custom render options extending ink-testing-library options
 */
export interface CustomRenderOptions extends RenderOptions {
  /** Initial stdin input to send */
  initialInput?: string;
  /** Simulated terminal width */
  width?: number;
  /** Simulated terminal height */
  height?: number;
}

/**
 * Result object from custom render function
 */
export interface CustomRenderResult {
  /** Access the last rendered frame */
  lastFrame: () => string | undefined;
  /** Access all rendered frames */
  frames: readonly string[];
  /** Write input to stdin */
  stdin: NodeJS.WriteStream;
  /** Force a re-render */
  rerender: (tree: ReactElement) => void;
  /** Unmount the component */
  unmount: () => void;
  /** Wait for specific text to appear in output */
  waitFor: (predicate: () => boolean, options?: WaitForOptions) => Promise<void>;
  /** Clear all frames */
  clear: () => void;
}

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Enhanced render function for component testing
 *
 * @param element - React element to render
 * @param options - Custom render options
 * @returns Enhanced render result
 *
 * @example
 * ```tsx
 * const { lastFrame, stdin } = renderComponent(<MyComponent />);
 * stdin.write('test input');
 * expect(lastFrame()).toContain('expected output');
 * ```
 */
export function renderComponent(
  element: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const { initialInput, ...inkOptions } = options;

  const result = inkRender(element, inkOptions);

  // Send initial input if provided
  if (initialInput) {
    result.stdin.write(initialInput);
  }

  // Enhanced waitFor utility
  const waitFor = async (
    predicate: () => boolean,
    { timeout = 5000, interval = 50 }: WaitForOptions = {}
  ): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`waitFor timed out after ${timeout}ms`);
  };

  // Clear frames utility
  const clear = () => {
    // Note: ink-testing-library doesn't have native clear
    // This is a workaround using re-render
    result.rerender(element);
  };

  return {
    ...result,
    waitFor,
    clear,
  };
}

/**
 * Render a component and wait for it to stabilize
 *
 * @param element - React element to render
 * @param stableMs - Time in ms to wait for stability (default: 100)
 * @returns Render result after component has stabilized
 */
export async function renderAndWait(
  element: ReactElement,
  stableMs = 100
): Promise<CustomRenderResult> {
  const result = renderComponent(element);

  // Wait for component to stabilize
  await new Promise((resolve) => setTimeout(resolve, stableMs));

  return result;
}

/**
 * Simulate keyboard input sequences
 */
export const KeyCodes = {
  // Navigation
  UP: '\x1B[A',
  DOWN: '\x1B[B',
  RIGHT: '\x1B[C',
  LEFT: '\x1B[D',
  HOME: '\x1B[H',
  END: '\x1B[F',
  PAGE_UP: '\x1B[5~',
  PAGE_DOWN: '\x1B[6~',

  // Control keys
  ENTER: '\r',
  TAB: '\t',
  ESCAPE: '\x1B',
  BACKSPACE: '\x7F',
  DELETE: '\x1B[3~',
  SPACE: ' ',

  // Ctrl combinations
  CTRL_C: '\x03',
  CTRL_D: '\x04',
  CTRL_R: '\x12',
  CTRL_S: '\x13',
  CTRL_A: '\x01',
  CTRL_Q: '\x11',

  // Function keys
  F1: '\x1BOP',
  F2: '\x1BOQ',
  F3: '\x1BOR',
  F4: '\x1BOS',
} as const;

/**
 * Helper to send multiple keystrokes with optional delay
 *
 * @param stdin - Stdin stream from render result
 * @param keys - Array of keys to send
 * @param delayMs - Delay between keystrokes (default: 0)
 */
export async function sendKeys(
  stdin: NodeJS.WriteStream,
  keys: string[],
  delayMs = 0
): Promise<void> {
  for (const key of keys) {
    stdin.write(key);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Re-export ink-testing-library utilities
export { render } from 'ink-testing-library';

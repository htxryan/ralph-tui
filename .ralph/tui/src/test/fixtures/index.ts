/**
 * Test Fixtures Loading Utilities
 *
 * Provides utilities to load and stream test fixture files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load a fixture file as a string
 *
 * @param fixtureName - Relative path to fixture from fixtures directory
 * @returns Fixture content as string
 *
 * @example
 * ```ts
 * const jsonl = loadFixture('claude-code/simple-conversation.jsonl');
 * ```
 */
export function loadFixture(fixtureName: string): string {
  const fixturePath = path.join(__dirname, fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixtureName}`);
  }

  return fs.readFileSync(fixturePath, 'utf-8');
}

/**
 * Load a fixture and parse it as JSON
 *
 * @param fixtureName - Relative path to fixture from fixtures directory
 * @returns Parsed JSON content
 */
export function loadJsonFixture<T = unknown>(fixtureName: string): T {
  const content = loadFixture(fixtureName);
  return JSON.parse(content) as T;
}

/**
 * Load a JSONL fixture and parse each line
 *
 * @param fixtureName - Relative path to JSONL fixture
 * @returns Array of parsed JSON objects
 */
export function loadJsonlFixture<T = unknown>(fixtureName: string): T[] {
  const content = loadFixture(fixtureName);
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

/**
 * Stream fixture lines with configurable delay
 *
 * @param fixtureName - Relative path to fixture
 * @param delayMs - Delay between lines in ms (default: 0)
 * @yields Each line from the fixture
 *
 * @example
 * ```ts
 * for await (const line of streamFixture('claude-code/tool-calls.jsonl', 50)) {
 *   process(line);
 * }
 * ```
 */
export async function* streamFixture(
  fixtureName: string,
  delayMs = 0
): AsyncGenerator<string, void, unknown> {
  const content = loadFixture(fixtureName);
  const lines = content.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    yield line;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Get the absolute path to a fixture file
 *
 * @param fixtureName - Relative path to fixture
 * @returns Absolute path to fixture
 */
export function getFixturePath(fixtureName: string): string {
  return path.join(__dirname, fixtureName);
}

/**
 * Check if a fixture exists
 *
 * @param fixtureName - Relative path to fixture
 * @returns True if fixture exists
 */
export function fixtureExists(fixtureName: string): boolean {
  return fs.existsSync(path.join(__dirname, fixtureName));
}

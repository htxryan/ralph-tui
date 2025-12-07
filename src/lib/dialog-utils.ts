/**
 * Shared utilities for dialog components.
 *
 * These utilities ensure consistent styling across all overlay dialogs
 * with solid backgrounds that prevent content bleed-through in terminal.
 */

/** Background color for solid overlay dialogs */
export const DIALOG_BG_COLOR = '#1a1a1a';

/**
 * Calculate visual width of a string, accounting for emoji widths.
 * Most emojis take 2 terminal columns, but string.length counts them as 1-2 chars.
 */
export function visualWidth(str: string): number {
  // Match common emoji patterns that render as 2-column width in terminals
  // This covers most UI-relevant emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u25B8\u25B6\u25CF\u2728]/gu;
  let width = 0;
  let lastIndex = 0;
  let match;

  while ((match = emojiRegex.exec(str)) !== null) {
    // Add width of characters before this emoji
    width += match.index - lastIndex;
    // Add 2 for the emoji (terminal width)
    width += 2;
    lastIndex = match.index + match[0].length;
  }
  // Add remaining characters
  width += str.length - lastIndex;

  return width;
}

/**
 * Helpers for creating consistently-styled dialog lines.
 *
 * Usage:
 * ```
 * const helpers = createDialogHelpers(width, padding);
 * // Use helpers.emptyLine(), helpers.padLine(), etc.
 * ```
 */
export interface DialogHelpers {
  /** Full inner width (inside the border) */
  fullInnerWidth: number;
  /** Content width (inner width minus padding on both sides) */
  contentWidth: number;
  /** Creates an empty line filled with spaces to full inner width */
  emptyLine: () => string;
  /** Pads content to fill full width with left/right padding */
  padLine: (content: string) => string;
  /** Centers content within the full width */
  centeredLine: (content: string) => string;
  /**
   * Pads content to fill full width, accounting for emoji visual widths.
   * Use this when content contains emojis or other multi-column characters.
   */
  padLineVisual: (content: string) => string;
  /** Creates left padding spaces */
  leftPad: () => string;
  /** Creates right padding to fill remaining space */
  rightPad: (usedWidth: number) => string;
  /** Creates right padding to fill remaining space, accounting for visual width */
  rightPadVisual: (usedVisualWidth: number) => string;
}

/**
 * Creates helper functions for a dialog with specific width and padding.
 *
 * @param width - Total width of the dialog box (including border)
 * @param padding - Horizontal padding on each side (inside the border)
 */
export function createDialogHelpers(width: number, padding: number): DialogHelpers {
  // Border takes 2 chars total (1 left + 1 right)
  const fullInnerWidth = width - 2;
  // Content width is inner width minus padding on both sides
  const contentWidth = fullInnerWidth - (padding * 2);

  const emptyLine = (): string => {
    return ' '.repeat(fullInnerWidth);
  };

  const padLine = (content: string): string => {
    const rightPadding = Math.max(0, contentWidth - content.length);
    return ' '.repeat(padding) + content + ' '.repeat(rightPadding + padding);
  };

  const centeredLine = (content: string): string => {
    const innerPadding = Math.max(0, contentWidth - content.length);
    const leftPad = Math.floor(innerPadding / 2);
    const rightPad = innerPadding - leftPad;
    const centeredContent = ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
    return ' '.repeat(padding) + centeredContent + ' '.repeat(padding);
  };

  const padLineVisual = (content: string): string => {
    const rightPadding = Math.max(0, contentWidth - visualWidth(content));
    return ' '.repeat(padding) + content + ' '.repeat(rightPadding + padding);
  };

  const leftPad = (): string => {
    return ' '.repeat(padding);
  };

  const rightPad = (usedWidth: number): string => {
    const remaining = Math.max(0, contentWidth - usedWidth);
    return ' '.repeat(remaining + padding);
  };

  const rightPadVisual = (usedVisualWidth: number): string => {
    const remaining = Math.max(0, contentWidth - usedVisualWidth);
    return ' '.repeat(remaining + padding);
  };

  return {
    fullInnerWidth,
    contentWidth,
    emptyLine,
    padLine,
    centeredLine,
    padLineVisual,
    leftPad,
    rightPad,
    rightPadVisual,
  };
}

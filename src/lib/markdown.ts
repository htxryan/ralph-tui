/**
 * Simple Markdown Parser for Terminal Rendering
 *
 * Parses markdown text into styled lines for Ink rendering.
 * Supports: headers, bold, italic, code blocks, inline code, lists,
 * blockquotes, links, and horizontal rules.
 */

import { colors } from './colors.js';

export interface StyledSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  dimmed?: boolean;
}

export interface MarkdownLine {
  type:
    | 'text'
    | 'header'
    | 'code-block'
    | 'list-item'
    | 'blockquote'
    | 'hr'
    | 'empty';
  segments: StyledSegment[];
  indent?: number;
  headerLevel?: number;
}

/**
 * Parse markdown text into styled lines for terminal rendering
 */
export function parseMarkdown(markdown: string): MarkdownLine[] {
  const lines = markdown.split('\n');
  const result: MarkdownLine[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        codeBlockLang = line.slice(3).trim();
        // Add code block header if there's a language
        if (codeBlockLang) {
          result.push({
            type: 'code-block',
            segments: [{ text: `[${codeBlockLang}]`, dimmed: true }],
          });
        }
      }
      continue;
    }

    // Inside code block - render as plain code
    if (inCodeBlock) {
      result.push({
        type: 'code-block',
        segments: [{ text: line, color: colors.toolResult }],
      });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      result.push({ type: 'empty', segments: [{ text: '' }] });
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      result.push({
        type: 'hr',
        segments: [{ text: '─'.repeat(40), dimmed: true }],
      });
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      result.push({
        type: 'header',
        headerLevel: level,
        segments: parseInlineMarkdown(text, {
          bold: true,
          color: level <= 2 ? colors.header : colors.assistant,
        }),
      });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const content = line.replace(/^>\s*/, '');
      result.push({
        type: 'blockquote',
        segments: [
          { text: '│ ', color: colors.dimmed },
          ...parseInlineMarkdown(content, { italic: true }),
        ],
      });
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (ulMatch) {
      const indent = Math.floor(ulMatch[1].length / 2);
      const content = ulMatch[3];
      result.push({
        type: 'list-item',
        indent,
        segments: [
          { text: '  '.repeat(indent) + '• ', color: colors.pending },
          ...parseInlineMarkdown(content),
        ],
      });
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const indent = Math.floor(olMatch[1].length / 2);
      const num = olMatch[2];
      const content = olMatch[3];
      result.push({
        type: 'list-item',
        indent,
        segments: [
          { text: '  '.repeat(indent) + `${num}. `, color: colors.pending },
          ...parseInlineMarkdown(content),
        ],
      });
      continue;
    }

    // Task list items (checkboxes)
    const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const indent = Math.floor(taskMatch[1].length / 2);
      const checked = taskMatch[3].toLowerCase() === 'x';
      const content = taskMatch[4];
      result.push({
        type: 'list-item',
        indent,
        segments: [
          {
            text: '  '.repeat(indent) + (checked ? '☑ ' : '☐ '),
            color: checked ? colors.completed : colors.dimmed,
          },
          ...parseInlineMarkdown(content),
        ],
      });
      continue;
    }

    // Regular text with inline markdown
    result.push({
      type: 'text',
      segments: parseInlineMarkdown(line),
    });
  }

  return result;
}

/**
 * Parse inline markdown (bold, italic, code, links) within a line
 */
function parseInlineMarkdown(
  text: string,
  defaultStyle: Partial<StyledSegment> = {}
): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // Regex patterns for inline formatting
  // Order matters - more specific patterns first
  const patterns = [
    // Bold + italic: ***text*** or ___text___
    { regex: /\*\*\*([^*]+)\*\*\*/, bold: true, italic: true },
    { regex: /___([^_]+)___/, bold: true, italic: true },
    // Bold: **text** or __text__
    { regex: /\*\*([^*]+)\*\*/, bold: true },
    { regex: /__([^_]+)__/, bold: true },
    // Italic: *text* or _text_
    { regex: /\*([^*]+)\*/, italic: true },
    { regex: /_([^_]+)_/, italic: true },
    // Inline code: `code`
    { regex: /`([^`]+)`/, color: colors.toolResult },
    // Links: [text](url) - show as "text (url)"
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, isLink: true },
    // Strikethrough: ~~text~~
    { regex: /~~([^~]+)~~/, dimmed: true },
  ];

  let remaining = text;

  while (remaining.length > 0) {
    let earliest: {
      index: number;
      length: number;
      content: string;
      style: Partial<StyledSegment>;
      url?: string;
    } | null = null;

    // Find the earliest pattern match
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        const newEarliest = {
          index: match.index,
          length: match[0].length,
          content: match[1],
          style: {
            bold: pattern.bold,
            italic: pattern.italic,
            color: pattern.color,
            dimmed: pattern.dimmed,
          } as Partial<StyledSegment>,
          url: 'isLink' in pattern && pattern.isLink ? match[2] : undefined,
        };

        if (!earliest || newEarliest.index < earliest.index) {
          earliest = newEarliest;
        }
      }
    }

    if (earliest) {
      // Add text before the match
      if (earliest.index > 0) {
        segments.push({
          text: remaining.slice(0, earliest.index),
          ...defaultStyle,
        });
      }

      // Add the matched content with styling
      if (earliest.url) {
        // For links, show as "text (url)" with styled URL
        segments.push({
          text: earliest.content,
          ...defaultStyle,
          color: colors.subagent,
        });
        segments.push({
          text: ` (${earliest.url})`,
          ...defaultStyle,
          dimmed: true,
        });
      } else {
        segments.push({
          text: earliest.content,
          ...defaultStyle,
          ...earliest.style,
        });
      }

      remaining = remaining.slice(earliest.index + earliest.length);
    } else {
      // No more patterns, add remaining text
      segments.push({ text: remaining, ...defaultStyle });
      break;
    }
  }

  return segments;
}

/**
 * Flatten markdown lines to simple text lines for scrolling
 * Returns array of objects with line text and style info
 */
export interface FlatLine {
  segments: StyledSegment[];
  type: MarkdownLine['type'];
}

export function flattenMarkdownLines(
  parsed: MarkdownLine[],
  maxWidth: number
): FlatLine[] {
  const result: FlatLine[] = [];

  for (const line of parsed) {
    // Get the total text length
    const totalText = line.segments.map(s => s.text).join('');

    if (totalText.length <= maxWidth || line.type === 'hr') {
      result.push({ segments: line.segments, type: line.type });
    } else {
      // Word-wrap long lines
      const wrapped = wrapSegments(line.segments, maxWidth);
      for (const wrappedSegments of wrapped) {
        result.push({ segments: wrappedSegments, type: line.type });
      }
    }
  }

  return result;
}

/**
 * Word-wrap styled segments to fit within maxWidth
 */
function wrapSegments(
  segments: StyledSegment[],
  maxWidth: number
): StyledSegment[][] {
  const result: StyledSegment[][] = [];
  let currentLine: StyledSegment[] = [];
  let currentLength = 0;

  for (const segment of segments) {
    const words = segment.text.split(/(\s+)/);

    for (const word of words) {
      if (word === '') continue;

      const wordLen = word.length;

      // If this word would overflow, start a new line
      if (currentLength + wordLen > maxWidth && currentLength > 0) {
        result.push(currentLine);
        currentLine = [];
        currentLength = 0;

        // Skip leading whitespace on new line
        if (/^\s+$/.test(word)) continue;
      }

      // Add word with same styling as original segment
      currentLine.push({
        ...segment,
        text: word,
      });
      currentLength += wordLen;
    }
  }

  // Add remaining content
  if (currentLine.length > 0) {
    result.push(currentLine);
  }

  return result.length > 0 ? result : [[{ text: '' }]];
}

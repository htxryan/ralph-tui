import { colors, icons } from './colors.js';
import { ToolCall } from './types.js';
import { truncate } from './parser.js';

/**
 * Get color for a subagent type
 */
export function getSubagentColor(subagentType: string | undefined): string {
  if (!subagentType) return colors.subagent;

  const typeMap: Record<string, string> = {
    'Explore': colors.subagentExplore,
    'Plan': colors.subagentPlan,
    'git-operator': colors.subagentGitOperator,
    'github-operator': colors.subagentGithubOperator,
    'vercel-operator': colors.subagentVercelOperator,
    'neon-operator': colors.subagentNeonOperator,
    'web-search-researcher': colors.subagentWebSearchResearcher,
    'product-architect': colors.subagentProductArchitect,
    'claude-code-guide': colors.subagentClaudeCodeGuide,
    'general-purpose': colors.subagentGeneralPurpose,
  };

  return typeMap[subagentType] || colors.subagent;
}

/**
 * Get readable text color (black or white) for a given background color
 * Based on perceived luminance of common terminal colors
 */
export function getReadableTextColor(backgroundColor: string): 'black' | 'white' {
  // Light backgrounds need black text, dark backgrounds need white text
  const lightBackgrounds = new Set([
    'white', 'cyan', 'yellow', 'green', 'greenBright',
    'cyanBright', 'yellowBright', 'whiteBright',
  ]);

  return lightBackgrounds.has(backgroundColor) ? 'black' : 'white';
}

/**
 * Get a preview of tool input for display
 */
export function getToolInputPreview(tc: ToolCall, maxLen: number): string {
  const input = tc.input;
  if (!input) return '';

  let preview = '';

  switch (tc.name) {
    case 'Bash':
      preview = (input.command as string) || '';
      break;
    case 'Read':
    case 'Write':
    case 'Edit':
      preview = (input.file_path as string) || '';
      break;
    case 'Glob':
      preview = (input.pattern as string) || '';
      break;
    case 'Grep':
      preview = (input.pattern as string) || '';
      break;
    case 'WebFetch':
      preview = (input.url as string) || '';
      break;
    case 'WebSearch':
      preview = (input.query as string) || '';
      break;
    case 'Task':
      // For Task, we handle this separately with subagent type
      return '';
    case 'TodoWrite':
      const todos = input.todos as unknown[];
      return todos ? `${todos.length} items` : '';
    default:
      // For MCP tools and others, try common field names
      preview = (input.command as string)
        || (input.query as string)
        || (input.path as string)
        || (input.file_path as string)
        || (input.pattern as string)
        || (input.relative_path as string)
        || (input.name_path as string)
        || (input.description as string)
        || '';
  }

  // Clean up: remove newlines, collapse whitespace
  preview = preview.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  if (preview.length > maxLen) {
    return preview.slice(0, maxLen - 3) + '...';
  }
  return preview;
}

export interface FormattedToolCall {
  text: string;
  color: string;
  /** Pill styling for subagent names */
  pill?: {
    text: string;
    backgroundColor: string;
    textColor: 'black' | 'white';
  };
  /** Additional text after the pill (description) */
  suffix?: string;
  /** Status icon */
  statusIcon: string;
}

/**
 * Format a single tool call for display in a summary line
 */
export function formatToolCall(tc: ToolCall, maxWidth: number): FormattedToolCall {
  const statusIcon = tc.status === 'completed' ? icons.completed
    : tc.status === 'error' ? icons.error
    : icons.pending;

  if (tc.isSubagent) {
    // Task subagent - show agent type as pill with description
    const agentType = tc.subagentType || 'Task';
    const bgColor = getSubagentColor(tc.subagentType);
    const textColor = getReadableTextColor(bgColor);
    const desc = tc.subagentDescription ? truncate(tc.subagentDescription, 30) : '';

    // For backwards compatibility, also include the full text
    const display = desc ? `${agentType} ...${desc}...` : agentType;

    return {
      text: truncate(display, maxWidth - 2),
      color: bgColor,
      pill: {
        text: agentType,
        backgroundColor: bgColor,
        textColor,
      },
      suffix: desc ? ` ...${truncate(desc, maxWidth - agentType.length - 10)}...` : undefined,
      statusIcon,
    };
  }

  // Regular tool - show name with input preview
  const inputPreview = getToolInputPreview(tc, maxWidth - tc.name.length - 5);
  const display = inputPreview ? `${tc.name}(${inputPreview})` : tc.name;

  return {
    text: truncate(display, maxWidth - 2),
    color: colors.toolName,
    statusIcon,
  };
}

/**
 * Get a compact tool summary for displaying in a message preview line
 * Returns something like "Bash(git status)✓, Read(src/app.ts)✓"
 */
export function getToolCallsSummary(
  toolCalls: ToolCall[],
  maxWidth: number,
  maxTools: number = 2
): { parts: Array<{ text: string; color: string }>; hasMore: number } {
  const parts: Array<{ text: string; color: string }> = [];
  const displayed = toolCalls.slice(0, maxTools);
  const remaining = toolCalls.length - displayed.length;

  const widthPerTool = Math.floor(maxWidth / Math.min(maxTools, toolCalls.length));

  for (const tc of displayed) {
    parts.push(formatToolCall(tc, widthPerTool));
  }

  return { parts, hasMore: remaining };
}

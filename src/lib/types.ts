// JSONL Stream Types
export interface ClaudeEvent {
  type: 'system' | 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'result';
  subtype?: string;
  timestamp?: string;
  message?: {
    content: ContentBlock[];
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      /** Tokens read from prompt cache (cost savings) */
      cache_read_input_tokens?: number;
      /** Tokens being written to prompt cache */
      cache_creation_input_tokens?: number;
    };
  };
  result?: string;
  /** Links subagent events to their parent Task tool call (-p mode) */
  parent_tool_use_id?: string | null;
  /** Links events to parent in interactive mode - may reference Task tool call */
  parentUuid?: string | null;
  session_id?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

// Processed types for display
export interface ProcessedMessage {
  id: string;
  type: ClaudeEvent['type'];
  timestamp: Date;
  text: string;
  toolCalls: ToolCall[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    /** Tokens read from prompt cache (cost savings) */
    cache_read_input_tokens?: number;
    /** Tokens being written to prompt cache */
    cache_creation_input_tokens?: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  isError?: boolean;
  isSubagent: boolean;
  subagentType?: string;
  subagentDescription?: string;
  subagentPrompt?: string;
  subagentResult?: string;
  /** Full conversation messages for subagents (captured via parent_tool_use_id) */
  subagentMessages?: ProcessedMessage[];
  timestamp: Date;
  duration?: number;
}

// Kanban Task Types
export interface KanbanTask {
  id: string;
  title: string;
  type: 'task' | 'bug' | 'feature';
  status: 'open' | 'in_progress' | 'closed';
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
  blockers?: string[];
  blocks?: string[];
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

/**
 * Assignment schema - tracks the current work assignment
 *
 * This file is created at .ralph/assignment.json during orchestration
 * and updated throughout the execution workflow.
 */
export interface Assignment {
  /** The task identifier from the task management system */
  task_id: string;
  /** The next step to execute in the workflow */
  next_step: string;
  /** URL of the pull request once created, null otherwise */
  pull_request_url: string | null;
  /** Work log entries (optional) */
  work_log?: string[];
}

/**
 * Legacy assignment schema for backwards compatibility
 * @deprecated Use Assignment instead
 */
export interface LegacyAssignment {
  workflow?: string;
  task_id?: string;
}

// Claude Code Todo Types
export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  id: string;
  priority?: 'high' | 'medium' | 'low';
  activeForm?: string;
}

// App State Types
export type TabName = 'messages' | 'task' | 'todos' | 'errors' | 'stats';
export type ViewMode = 'main' | 'subagent-detail' | 'message-detail' | 'error-detail';

// Message filter types for the filter dialog
export type MessageFilterType =
  | 'initial-prompt'  // First user message in session
  | 'user'           // Regular user messages (tool results)
  | 'thinking'       // Assistant text-only (no tool calls)
  | 'tool'           // Assistant with tool calls (no text)
  | 'assistant'      // Assistant with both text and tools
  | 'subagent'       // Assistant with Task (subagent) tool calls
  | 'system'         // System messages
  | 'result';        // Session result/completion

// All available filter types
export const ALL_MESSAGE_FILTER_TYPES: MessageFilterType[] = [
  'initial-prompt',
  'user',
  'thinking',
  'tool',
  'assistant',
  'subagent',
  'system',
  'result',
];

// Default enabled filters (show all)
export const DEFAULT_MESSAGE_FILTERS: Set<MessageFilterType> = new Set(ALL_MESSAGE_FILTER_TYPES);

// Human-readable labels for filter types
export const MESSAGE_FILTER_LABELS: Record<MessageFilterType, string> = {
  'initial-prompt': 'Initial Prompt',
  'user': 'User',
  'thinking': 'Thinking',
  'tool': 'Tool',
  'assistant': 'Assistant',
  'subagent': 'Task Subagent',
  'system': 'System',
  'result': 'Result',
};

export interface AppState {
  currentTab: TabName;
  currentView: ViewMode;
  selectedSubagent: ToolCall | null;
  sidebarVisible: boolean;
  selectedIndex: number;
}

// Error tracking
export interface ErrorInfo {
  id: string;
  toolCallId: string;
  toolName: string;
  timestamp: Date;
  errorContent: string;
  /** The message index where this error occurred */
  messageIndex: number;
}

// Session Stats
export interface SessionStats {
  totalTokens: {
    input: number;
    output: number;
    /** Tokens read from prompt cache (included in input total) */
    cacheRead: number;
    /** Tokens written to prompt cache (included in input total) */
    cacheCreation: number;
  };
  toolCallCount: number;
  messageCount: number;
  errorCount: number;
  startTime: Date | null;
  endTime: Date | null;
  /** Count of subagent (Task) tool calls */
  subagentCount: number;
}

import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import {
  ClaudeEvent,
  ProcessedMessage,
  ToolCall,
  SessionStats,
} from '../lib/types.js';
import {
  parseJSONLLine,
  processEvent,
  matchToolResults,
  calculateStats,
} from '../lib/parser.js';

export interface UseJSONLStreamOptions {
  filePath: string;
  follow?: boolean;
}

export interface UseJSONLStreamResult {
  messages: ProcessedMessage[];
  toolCalls: ToolCall[];
  stats: SessionStats;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  currentFilePath: string;
}

export function useJSONLStream(options: UseJSONLStreamOptions): UseJSONLStreamResult {
  const { filePath, follow = true } = options;

  const [messages, setMessages] = useState<ProcessedMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalTokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    toolCallCount: 0,
    messageCount: 0,
    errorCount: 0,
    startTime: null,
    endTime: null,
    subagentCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tailPosition = useRef(0);
  const toolCallMap = useRef(new Map<string, ToolCall>());
  // Track subagent messages by parent_tool_use_id
  const subagentMessagesMap = useRef(new Map<string, ProcessedMessage[]>());
  const watcherRef = useRef<chokidar.FSWatcher | null>(null);
  // Track previous file path to detect changes
  const prevFilePathRef = useRef(filePath);

  const processNewContent = useCallback((content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const newMessages: ProcessedMessage[] = [];
    const newToolCalls: ToolCall[] = [];
    let subagentMessagesUpdated = false;

    for (const line of lines) {
      const event = parseJSONLLine(line);
      if (!event) continue;

      // Check if this is a subagent event (has parent_tool_use_id)
      const parentToolUseId = event.parent_tool_use_id;
      const isSubagentEvent = parentToolUseId != null && parentToolUseId !== '';

      // Handle tool results - match them to existing tool calls
      if (event.type === 'tool_result' || (event.message?.content ?? []).some(b => b.type === 'tool_result')) {
        // For standalone tool_result events, the tool_use_id and content are at the event level
        // For tool_result within message content, they're in content blocks
        let content = event.message?.content ?? [];

        // Handle standalone tool_result events (no message.content)
        if (event.type === 'tool_result' && content.length === 0) {
          // Cast event to access top-level tool_result fields
          const toolResultEvent = event as unknown as {
            tool_use_id?: string;
            content?: string;
            is_error?: boolean;
          };
          content = [{
            type: 'tool_result' as const,
            tool_use_id: toolResultEvent.tool_use_id,
            content: toolResultEvent.content,
            is_error: toolResultEvent.is_error,
          }];
        }

        matchToolResults(toolCallMap.current, content);

        // Also match tool results for subagent tool calls
        if (isSubagentEvent) {
          // Get the subagent messages to find tool calls to update
          const subagentMsgs = subagentMessagesMap.current.get(parentToolUseId) || [];
          const subagentToolCallMap = new Map<string, ToolCall>();
          for (const msg of subagentMsgs) {
            for (const tc of msg.toolCalls) {
              subagentToolCallMap.set(tc.id, tc);
            }
          }
          matchToolResults(subagentToolCallMap, content);
        }
      }

      const processed = processEvent(event);
      if (processed) {
        if (isSubagentEvent) {
          // This is a subagent message - add to subagent messages map
          const existingMessages = subagentMessagesMap.current.get(parentToolUseId) || [];
          existingMessages.push(processed);
          subagentMessagesMap.current.set(parentToolUseId, existingMessages);
          subagentMessagesUpdated = true;

          // Update the parent ToolCall's subagentMessages
          const parentToolCall = toolCallMap.current.get(parentToolUseId);
          if (parentToolCall && parentToolCall.isSubagent) {
            parentToolCall.subagentMessages = existingMessages;
          }
        } else {
          // This is a main agent message
          newMessages.push(processed);

          // Track tool calls
          for (const tc of processed.toolCalls) {
            toolCallMap.current.set(tc.id, tc);
            newToolCalls.push(tc);

            // Initialize subagent messages array for Task tools
            if (tc.isSubagent) {
              if (!subagentMessagesMap.current.has(tc.id)) {
                subagentMessagesMap.current.set(tc.id, []);
              }
              tc.subagentMessages = subagentMessagesMap.current.get(tc.id);
            }
          }
        }
      }
    }

    if (newMessages.length > 0 || newToolCalls.length > 0 || subagentMessagesUpdated) {
      if (newMessages.length > 0) {
        setMessages(prev => {
          // Smart deduplication: If the last new message is a 'result' type,
          // check if it duplicates the immediately preceding 'assistant' message.
          // Result events often echo the final assistant text, so we collapse them.
          let messagesToAdd = newMessages;

          if (messagesToAdd.length > 0) {
            const lastNewMsg = messagesToAdd[messagesToAdd.length - 1];

            if (lastNewMsg.type === 'result') {
              // Find the preceding message - could be in newMessages or in prev
              let precedingMsg: ProcessedMessage | undefined;

              if (messagesToAdd.length > 1) {
                precedingMsg = messagesToAdd[messagesToAdd.length - 2];
              } else if (prev.length > 0) {
                precedingMsg = prev[prev.length - 1];
              }

              // If the preceding message is an assistant with identical text, skip the result
              if (precedingMsg?.type === 'assistant' &&
                  precedingMsg.text.trim() === lastNewMsg.text.trim()) {
                messagesToAdd = messagesToAdd.slice(0, -1);
              }
            }
          }

          if (messagesToAdd.length === 0) {
            return prev;
          }

          const updated = [...prev, ...messagesToAdd];
          setStats(calculateStats(updated));
          return updated;
        });
      }

      if (newToolCalls.length > 0 || subagentMessagesUpdated) {
        setToolCalls(Array.from(toolCallMap.current.values()));
      }
    }
  }, []);

  const readFile = useCallback(() => {
    try {
      if (!fs.existsSync(filePath)) {
        setError(new Error(`File not found: ${filePath}`));
        setIsLoading(false);
        return;
      }

      const fd = fs.openSync(filePath, 'r');
      const fileStats = fs.fstatSync(fd);

      // Check for file truncation (rotation)
      if (fileStats.size < tailPosition.current) {
        // File was truncated, reset
        tailPosition.current = 0;
        setMessages([]);
        setToolCalls([]);
        toolCallMap.current.clear();
        subagentMessagesMap.current.clear();
      }

      if (fileStats.size > tailPosition.current) {
        const buffer = Buffer.alloc(fileStats.size - tailPosition.current);
        fs.readSync(fd, buffer, 0, buffer.length, tailPosition.current);
        const newContent = buffer.toString('utf-8');

        processNewContent(newContent);
        tailPosition.current = fileStats.size;
      }

      fs.closeSync(fd);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [filePath, processNewContent]);

  const refresh = useCallback(() => {
    tailPosition.current = 0;
    setMessages([]);
    setToolCalls([]);
    toolCallMap.current.clear();
    subagentMessagesMap.current.clear();
    setIsLoading(true);
    readFile();
  }, [readFile]);

  // Detect file path changes and reset state
  useEffect(() => {
    if (prevFilePathRef.current !== filePath) {
      // File path changed - reset all state
      tailPosition.current = 0;
      setMessages([]);
      setToolCalls([]);
      setStats({
        totalTokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
        toolCallCount: 0,
        messageCount: 0,
        errorCount: 0,
        startTime: null,
        endTime: null,
        subagentCount: 0,
      });
      toolCallMap.current.clear();
      subagentMessagesMap.current.clear();
      setIsLoading(true);
      setError(null);
      prevFilePathRef.current = filePath;
    }
  }, [filePath]);

  useEffect(() => {
    // Initial read
    readFile();

    if (follow) {
      // Set up file watcher
      watcherRef.current = chokidar.watch(filePath, {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 500,
      });

      watcherRef.current.on('change', readFile);
      watcherRef.current.on('add', readFile);
    }

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [filePath, follow, readFile]);

  return {
    messages,
    toolCalls,
    stats,
    isLoading,
    error,
    refresh,
    currentFilePath: filePath,
  };
}

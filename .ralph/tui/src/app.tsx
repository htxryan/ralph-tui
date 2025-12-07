import React, { useState, useCallback, useMemo } from 'react';
import { Box, useApp, useInput } from 'ink';
import * as path from 'path';
import * as fs from 'fs';
import {
  TabName,
  ViewMode,
  ToolCall,
  ProcessedMessage,
  ErrorInfo,
  MessageFilterType,
  ALL_MESSAGE_FILTER_TYPES,
} from './lib/types.js';
import { type RalphConfig } from './lib/config.js';
import { calculateSessionStats, getMessageFilterType } from './lib/parser.js';
import { archiveCurrentSession } from './lib/archive.js';
import { getContextualShortcuts, getAllShortcutsForDialog } from './lib/shortcuts.js';
import { useJSONLStream } from './hooks/use-jsonl-stream.js';
import { useTask } from './hooks/use-task.js';
import { useAssignment } from './hooks/use-assignment.js';
import { useClaudeCodeTodos } from './hooks/use-claude-code-todos.js';
import { useRalphProcess } from './hooks/use-ralph-process.js';
import { useTerminalSize } from './hooks/use-terminal-size.js';
import { Header } from './components/header.js';
import { TabBar } from './components/tab-bar.js';
import { Footer } from './components/footer.js';
import { Sidebar } from './components/sidebar.js';
import { MessagesView } from './components/messages/messages-view.js';
import { MessageDetailView } from './components/messages/message-detail-view.js';
import { SubagentDetailView } from './components/subagent/subagent-detail-view.js';
import { TaskView } from './components/task/task-view.js';
import { TodosView } from './components/todos/todos-view.js';
import { ErrorsView, ErrorDetailView } from './components/errors/index.js';
import { StatsView } from './components/stats/stats-view.js';
import { SessionPicker, SessionInfo } from './components/session-picker.js';
import { ShortcutsDialog } from './components/shortcuts-dialog.js';
import { StartScreen } from './components/start-screen.js';
import { FilterDialog } from './components/messages/filter-dialog.js';

export interface AppProps {
  jsonlPath: string;
  issueId?: string;
  showSidebar?: boolean;
  /** Full Ralph configuration (optional for backwards compatibility) */
  config?: RalphConfig;
}

export function App({
  jsonlPath,
  issueId: providedIssueId,
  showSidebar: initialShowSidebar = false,
  config,
}: AppProps): React.ReactElement {
  const { exit } = useApp();

  // Session state - manage which JSONL file we're viewing
  const [currentJsonlPath, setCurrentJsonlPath] = useState(jsonlPath);
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);

  // Compute session and archive directories from the ORIGINAL jsonlPath prop
  // (not currentJsonlPath). These are the canonical directories that don't change
  // when switching to archived sessions. This ensures the session picker always
  // shows the full archive list, even when viewing an archived session.
  const sessionDir = useMemo(() => path.dirname(jsonlPath), [jsonlPath]);
  // Use config.paths.archiveDir if available, otherwise fall back to default
  const archiveDir = useMemo(() => {
    if (config?.paths?.archiveDir) {
      // archiveDir from config is relative to project root, so use sessionDir's parent
      const projectRoot = path.dirname(sessionDir);
      return path.resolve(projectRoot, config.paths.archiveDir);
    }
    return path.join(sessionDir, 'archive');
  }, [sessionDir, config?.paths?.archiveDir]);

  // App state
  const [currentTab, setCurrentTab] = useState<TabName>('messages');
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [selectedSubagent, setSelectedSubagent] = useState<ToolCall | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ProcessedMessage | null>(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | undefined>(undefined);
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(initialShowSidebar);
  // Track which tab the user came from when viewing subagent detail
  const [sourceTab, setSourceTab] = useState<TabName>('messages');
  // Track the message count when Ralph started - messages before this are "previous session"
  const [sessionStartIndex, setSessionStartIndex] = useState<number | undefined>(undefined);

  // Terminal size for proper full-screen rendering
  const { rows: terminalRows, columns: terminalColumns } = useTerminalSize();

  // Data hooks
  const { assignment } = useAssignment();
  const effectiveTaskId = providedIssueId || assignment?.task_id || null;

  const {
    messages,
    stats,
    isLoading: isLoadingStream,
    error: streamError,
    refresh: refreshStream,
  } = useJSONLStream({ filePath: currentJsonlPath });

  const {
    task,
    isLoading: isLoadingTask,
    error: taskError,
    refresh: refreshTask,
  } = useTask({
    taskId: effectiveTaskId,
    taskConfig: config?.taskManagement,
  });

  const {
    todos,
    sessionId,
    isLoading: isLoadingTodos,
    error: todosError,
    refresh: refreshTodos,
  } = useClaudeCodeTodos();

  const {
    isStarting: isRalphStarting,
    isRunning: isRalphRunning,
    isStopping: isRalphStopping,
    isResuming: isRalphResuming,
    error: ralphError,
    start: startRalph,
    stop: stopRalph,
    resume: resumeRalph,
  } = useRalphProcess();

  // Interrupt mode state
  const [isInterruptMode, setIsInterruptMode] = useState(false);

  // Shortcuts dialog state (for narrow terminals)
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<Set<MessageFilterType>>(
    () => new Set(ALL_MESSAGE_FILTER_TYPES)
  );

  // Handlers
  const handleTabChange = useCallback((tab: TabName) => {
    setCurrentTab(tab);
    setCurrentView('main');
    setSelectedSubagent(null);
  }, []);

  const handleSelectSubagent = useCallback((toolCall: ToolCall, messageIndex?: number) => {
    setSelectedSubagent(toolCall);
    if (messageIndex !== undefined) {
      setSelectedMessageIndex(messageIndex);
    }
    // Track which tab we came from for proper back navigation
    setSourceTab(currentTab);
    setCurrentView('subagent-detail');
  }, [currentTab]);

  const handleSelectMessage = useCallback((message: ProcessedMessage, messageIndex: number) => {
    setSelectedMessage(message);
    setSelectedMessageIndex(messageIndex);
    setCurrentView('message-detail');
  }, []);

  const handleSelectError = useCallback((error: ErrorInfo) => {
    setSelectedError(error);
    setCurrentView('error-detail');
  }, []);

  const handleBack = useCallback(() => {
    // When returning from subagent-detail, go back to the source tab
    if (currentView === 'subagent-detail') {
      setCurrentTab(sourceTab);
    }
    setCurrentView('main');
    setSelectedSubagent(null);
    setSelectedMessage(null);
    setSelectedError(null);
  }, [currentView, sourceTab]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarVisible(v => !v);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshStream();
    refreshTask();
    refreshTodos();
  }, [refreshStream, refreshTask, refreshTodos]);

  // Wrapper for starting Ralph that archives the current session and starts fresh
  const handleStartRalph = useCallback(async () => {
    // Archive current session if it has content, then create fresh file
    // This ensures each Ralph run starts with a clean slate (no "previous session" box)
    const defaultPath = path.join(sessionDir, 'claude_output.jsonl');
    await archiveCurrentSession(defaultPath, archiveDir);

    // Create fresh empty file
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(defaultPath, '', 'utf-8');

    // Update the path (this will trigger useJSONLStream to reset)
    setCurrentJsonlPath(defaultPath);
    setSessionStartIndex(undefined);

    // Start Ralph
    startRalph();
  }, [sessionDir, archiveDir, startRalph]);

  // Interrupt mode handlers
  const handleEnterInterruptMode = useCallback(() => {
    setIsInterruptMode(true);
    // Switch to messages tab if not already there
    if (currentTab !== 'messages') {
      setCurrentTab('messages');
    }
    setCurrentView('main');
  }, [currentTab]);

  const handleInterruptSubmit = useCallback((feedback: string) => {
    setIsInterruptMode(false);
    if (sessionId) {
      // Record new session boundary for the resumed session
      setSessionStartIndex(messages.length);
      resumeRalph(sessionId, feedback);
    }
  }, [sessionId, messages.length, resumeRalph]);

  const handleInterruptCancel = useCallback(() => {
    setIsInterruptMode(false);
  }, []);

  // Kill the current session while in interrupt mode (Ctrl+P)
  // This stops the current Ralph process but keeps interrupt mode active
  // so the user can still submit feedback to start a new session
  const handleInterruptKillSession = useCallback(async () => {
    await stopRalph();
    // Stay in interrupt mode so user can submit feedback to start new session
  }, [stopRalph]);

  // Session picker handlers
  const handleOpenSessionPicker = useCallback(() => {
    setIsSessionPickerOpen(true);
  }, []);

  const handleCloseSessionPicker = useCallback(() => {
    setIsSessionPickerOpen(false);
  }, []);

  // Filter dialog handlers
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true);
  }, []);

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false);
  }, []);

  const handleSelectSession = useCallback(
    async (session: SessionInfo) => {
      setIsSessionPickerOpen(false);

      if (session.type === 'new') {
        // Archive current session if it has content, then create fresh file
        const defaultPath = path.join(sessionDir, 'claude_output.jsonl');
        await archiveCurrentSession(defaultPath, archiveDir);

        // Create fresh empty file
        const dir = path.dirname(defaultPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(defaultPath, '', 'utf-8');

        setCurrentJsonlPath(defaultPath);
        setSessionStartIndex(undefined);
      } else {
        // Load the selected session (current or archived)
        setCurrentJsonlPath(session.filePath);
        setSessionStartIndex(undefined);
      }

      // Reset view state when switching sessions
      setCurrentView('main');
      setSelectedSubagent(null);
      setSelectedMessage(null);
      setSelectedError(null);
    },
    [sessionDir, archiveDir]
  );

  // Calculate session-scoped stats (only current session, not previous sessions)
  const sessionStats = useMemo(() => {
    return calculateSessionStats(messages, sessionStartIndex, isRalphRunning);
  }, [messages, sessionStartIndex, isRalphRunning]);

  // Compute message counts per filter type (for filter dialog display)
  const messageCounts = useMemo(() => {
    const counts: Record<MessageFilterType, number> = {
      'initial-prompt': 0,
      'user': 0,
      'thinking': 0,
      'tool': 0,
      'assistant': 0,
      'subagent': 0,
      'system': 0,
      'result': 0,
    };

    // Find the initial prompt index
    const startFrom = sessionStartIndex ?? 0;
    let initialPromptIndex = -1;
    for (let i = startFrom; i < messages.length; i++) {
      if (messages[i].type === 'user' && messages[i].text.trim()) {
        initialPromptIndex = i;
        break;
      }
    }

    // Count messages by type
    for (let i = 0; i < messages.length; i++) {
      const isInitialPrompt = initialPromptIndex >= 0 && i === initialPromptIndex;
      const filterType = getMessageFilterType(messages[i], isInitialPrompt);
      counts[filterType]++;
    }

    return counts;
  }, [messages, sessionStartIndex]);

  // Compute contextual shortcuts for footer (state-aware)
  const shortcuts = useMemo(
    () =>
      getContextualShortcuts({
        currentView,
        currentTab,
        isRalphRunning,
        isRalphStarting,
        isRalphStopping,
        isRalphResuming,
        hasSessionId: !!sessionId,
      }),
    [currentView, currentTab, isRalphRunning, isRalphStarting, isRalphStopping, isRalphResuming, sessionId]
  );

  // Compute ALL shortcuts for the dialog (includes Start/Kill/Interrupt regardless of state)
  const dialogShortcuts = useMemo(
    () =>
      getAllShortcutsForDialog({
        currentView,
        currentTab,
        isRalphRunning,
        isRalphStarting,
        isRalphStopping,
        isRalphResuming,
        hasSessionId: !!sessionId,
      }),
    [currentView, currentTab, isRalphRunning, isRalphStarting, isRalphStopping, isRalphResuming, sessionId]
  );

  // Global keyboard handling
  const tabs: TabName[] = ['messages', 'task', 'todos', 'errors', 'stats'];

  useInput((input, key) => {
    // Close shortcuts dialog on ANY key, but continue processing the key
    // This allows the key action to execute while dismissing the dialog
    if (isShortcutsDialogOpen) {
      setIsShortcutsDialogOpen(false);
      // If it was ".", just close, don't reopen
      if (input === '.') {
        return;
      }
      // For other keys, continue processing below
    }

    // When in interrupt mode, session picker, or filter dialog is open, don't handle any global shortcuts
    // Those components handle their own input
    if (isInterruptMode || isSessionPickerOpen || isFilterDialogOpen) {
      return;
    }

    // Open shortcuts dialog
    if (input === '.') {
      setIsShortcutsDialogOpen(true);
      return;
    }

    // Quit
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Back navigation
    // Note: Don't handle escape for 'subagent-detail' view - it manages its own
    // nested navigation (detail mode within the subagent view)
    if (key.escape) {
      if (currentView === 'message-detail') {
        setCurrentView('main');
        setSelectedMessage(null);
      }
      if (currentView === 'error-detail') {
        setCurrentView('main');
        setSelectedError(null);
      }
      // subagent-detail handles its own escape via onBack callback
      return;
    }

    // Tab switching with number keys
    // Note: Don't handle in subagent-detail view - it has its own 1/2 tab switching
    const num = parseInt(input);
    if (num >= 1 && num <= 5 && currentView !== 'subagent-detail') {
      handleTabChange(tabs[num - 1]);
      return;
    }

    // Tab cycling
    // Note: Don't handle in subagent-detail view - it has its own tab switching
    if (key.tab && currentView !== 'subagent-detail') {
      const currentIndex = tabs.indexOf(currentTab);
      if (key.shift) {
        const newIndex = (currentIndex - 1 + 5) % 5;
        handleTabChange(tabs[newIndex]);
      } else {
        const newIndex = (currentIndex + 1) % 5;
        handleTabChange(tabs[newIndex]);
      }
      return;
    }

    // Toggle sidebar (changed from 's' to 'b' to free 's' for start)
    if (input === 'b') {
      handleToggleSidebar();
      return;
    }

    // Refresh
    if (input === 'r') {
      handleRefresh();
      return;
    }

    // Start Ralph (when not running)
    if (input === 's' && !isRalphRunning && !isRalphStarting) {
      handleStartRalph();
      return;
    }

    // Kill Ralph (when running)
    if (input === 'k' && isRalphRunning && !isRalphStopping) {
      stopRalph();
      return;
    }

    // Interrupt session (when running)
    if (input === 'i' && isRalphRunning && !isRalphStopping && !isRalphResuming && sessionId) {
      handleEnterInterruptMode();
      return;
    }

    // Open session picker
    if (input === 'p') {
      handleOpenSessionPicker();
      return;
    }

    // Open filter dialog (only on messages tab in main view)
    if (input === 'f' && currentTab === 'messages' && currentView === 'main') {
      handleOpenFilterDialog();
      return;
    }
  });

  // Fixed overhead: Header (~4 lines with border) + TabBar (~1 line, only in main view) + Footer (~2 lines)
  // We use the terminal height to ensure full redraw when switching tabs
  const tabBarHeight = currentView === 'main' ? 1 : 0;
  const fixedOverhead = 6 + tabBarHeight; // Header (4) + Footer (2) + TabBar (0-1)
  const contentHeight = Math.max(10, terminalRows - fixedOverhead);

  // Render content based on current tab and view
  const renderContent = () => {
    if (currentView === 'subagent-detail' && selectedSubagent) {
      return (
        <SubagentDetailView
          toolCall={selectedSubagent}
          onBack={handleBack}
          height={contentHeight}
          width={terminalColumns}
        />
      );
    }

    if (currentView === 'message-detail' && selectedMessage) {
      return (
        <MessageDetailView
          message={selectedMessage}
          onBack={handleBack}
          height={contentHeight}
          width={terminalColumns}
        />
      );
    }

    if (currentView === 'error-detail' && selectedError) {
      return (
        <ErrorDetailView
          error={selectedError}
          onBack={handleBack}
          height={contentHeight}
          width={terminalColumns}
        />
      );
    }

    switch (currentTab) {
      case 'messages':
        // Show the start screen when there are no messages and Ralph isn't running
        if (messages.length === 0 && !isRalphRunning && !isRalphStarting) {
          return (
            <StartScreen
              height={contentHeight}
              width={terminalColumns}
            />
          );
        }
        return (
          <MessagesView
            messages={messages}
            onSelectSubagent={handleSelectSubagent}
            onSelectMessage={handleSelectMessage}
            height={contentHeight}
            width={terminalColumns}
            initialSelectedIndex={selectedMessageIndex}
            sessionStartIndex={sessionStartIndex}
            isRalphRunning={isRalphRunning}
            isRalphStarting={isRalphStarting}
            isInterruptMode={isInterruptMode}
            onInterruptSubmit={handleInterruptSubmit}
            onInterruptCancel={handleInterruptCancel}
            onInterruptKillSession={isRalphRunning ? handleInterruptKillSession : undefined}
            isSessionPickerOpen={isSessionPickerOpen}
            enabledFilters={enabledFilters}
            onFiltersChange={setEnabledFilters}
            isFilterDialogOpen={isFilterDialogOpen}
          />
        );
      case 'task':
        return (
          <TaskView
            task={task}
            isLoading={isLoadingTask}
            error={taskError}
            onRefresh={refreshTask}
            height={contentHeight}
          />
        );
      case 'todos':
        return (
          <TodosView
            todos={todos}
            sessionId={sessionId}
            isLoading={isLoadingTodos}
            error={todosError}
            onRefresh={refreshTodos}
            height={contentHeight}
          />
        );
      case 'errors':
        return (
          <ErrorsView
            messages={messages}
            onSelectError={handleSelectError}
            height={contentHeight}
            width={terminalColumns}
          />
        );
      case 'stats':
        return (
          <StatsView
            sessionStats={sessionStats}
            isRalphRunning={isRalphRunning}
            cwd={process.cwd()}
            height={contentHeight}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" width="100%" height={terminalRows}>
      {/* Header */}
      <Header
        task={task}
        stats={sessionStats}
        isLoading={isLoadingStream}
        error={streamError}
        isRalphRunning={isRalphRunning}
        assignment={assignment}
      />

      {/* Tab Bar - hide when in detail views */}
      {currentView === 'main' && (
        <TabBar currentTab={currentTab} onTabChange={handleTabChange} />
      )}

      {/* Main content area with optional sidebar */}
      <Box flexDirection="row" flexGrow={1} height={contentHeight}>
        {/* Main content */}
        <Box flexDirection="column" flexGrow={1} height={contentHeight}>
          {renderContent()}
        </Box>

        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            todos={todos}
            task={task}
            stats={sessionStats}
            isRalphRunning={isRalphRunning}
          />
        )}
      </Box>

      {/* Footer */}
      <Footer
        shortcuts={shortcuts}
        width={terminalColumns}
        isInterruptMode={isInterruptMode}
        isSessionPickerOpen={isSessionPickerOpen}
      />

      {/* Session Picker Overlay */}
      {isSessionPickerOpen && (
        <Box
          position="absolute"
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <SessionPicker
            currentFilePath={currentJsonlPath}
            sessionDir={sessionDir}
            archiveDir={archiveDir}
            onSelectSession={handleSelectSession}
            onClose={handleCloseSessionPicker}
            width={Math.min(60, terminalColumns - 4)}
            maxHeight={Math.min(20, terminalRows - 4)}
          />
        </Box>
      )}

      {/* Shortcuts Dialog Overlay */}
      {isShortcutsDialogOpen && (
        <Box
          position="absolute"
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <ShortcutsDialog
            shortcuts={dialogShortcuts}
            width={Math.min(45, terminalColumns - 4)}
          />
        </Box>
      )}

      {/* Filter Dialog Overlay */}
      {isFilterDialogOpen && (
        <Box
          position="absolute"
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <FilterDialog
            enabledFilters={enabledFilters}
            onFiltersChange={setEnabledFilters}
            onClose={handleCloseFilterDialog}
            width={Math.min(60, terminalColumns - 4)}
            messageCounts={messageCounts}
          />
        </Box>
      )}
    </Box>
  );
}

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import { colors } from '../lib/colors.js';
import { listArchivedSessions } from '../lib/archive.js';
import { DIALOG_BG_COLOR, createDialogHelpers, visualWidth } from '../lib/dialog-utils.js';

export interface SessionInfo {
  type: 'new' | 'current' | 'archived';
  filePath: string;
  displayName: string;
  timestamp?: Date;
  sizeBytes?: number;
}

export interface SessionPickerProps {
  /** Current active JSONL file path */
  currentFilePath: string;
  /** Directory containing the active session file */
  sessionDir: string;
  /** Archive directory path */
  archiveDir: string;
  /** Callback when a session is selected */
  onSelectSession: (session: SessionInfo) => void;
  /** Callback to close the picker */
  onClose: () => void;
  /** Width of the dialog */
  width?: number;
  /** Maximum height for the session list */
  maxHeight?: number;
}

// Padding on each side
const PADDING = 1;

/**
 * Parse a session filename to extract timestamp
 * Format: claude_output.YYYYMMDD_HHMMSS_mmm.jsonl
 */
function parseSessionTimestamp(filename: string): Date | null {
  const match = filename.match(/\.(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d{3})\.jsonl$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds, millis] = match;
  return new Date(
    Date.UTC(
      parseInt(year!, 10),
      parseInt(month!, 10) - 1,
      parseInt(day!, 10),
      parseInt(hours!, 10),
      parseInt(minutes!, 10),
      parseInt(seconds!, 10),
      parseInt(millis!, 10)
    )
  );
}

/**
 * Format a date for display
 */
function formatSessionDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (sessionDay.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  } else if (sessionDay.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} ${timeStr}`;
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function SessionPicker({
  currentFilePath,
  sessionDir,
  archiveDir,
  onSelectSession,
  onClose,
  width = 60,
  maxHeight = 20,
}: SessionPickerProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  const helpers = useMemo(() => createDialogHelpers(width, PADDING), [width]);
  const { emptyLine, padLine, contentWidth, rightPadVisual } = helpers;

  // Build the list of sessions
  const sessions = useMemo((): SessionInfo[] => {
    const result: SessionInfo[] = [];

    // The live session file path (not necessarily what we're viewing)
    const liveSessionPath = path.join(sessionDir, 'claude_output.jsonl');

    // Option 1: NEW SESSION (creates fresh empty session)
    result.push({
      type: 'new',
      filePath: liveSessionPath,
      displayName: '+ NEW SESSION',
    });

    // Option 2: Live session (if it exists and has content)
    // Only show this if we're not currently viewing it AND it has content
    // (avoids confusing duplicate when viewing an archived session)
    const liveExists = fs.existsSync(liveSessionPath);
    if (liveExists) {
      const stats = fs.statSync(liveSessionPath);
      if (stats.size > 0) {
        result.push({
          type: 'current',
          filePath: liveSessionPath,
          displayName: 'Live Session',
          sizeBytes: stats.size,
        });
      }
    }

    // Archived sessions
    const archivedFiles = listArchivedSessions(archiveDir);
    for (const filename of archivedFiles) {
      const filePath = path.join(archiveDir, filename);
      const timestamp = parseSessionTimestamp(filename);
      let sizeBytes: number | undefined;

      try {
        const stats = fs.statSync(filePath);
        sizeBytes = stats.size;
      } catch {
        // Ignore errors reading file stats
      }

      result.push({
        type: 'archived',
        filePath,
        displayName: timestamp ? formatSessionDate(timestamp) : filename,
        timestamp: timestamp ?? undefined,
        sizeBytes,
      });
    }

    return result;
  }, [sessionDir, archiveDir]);

  // Visible window of sessions
  const visibleWindowSize = Math.min(maxHeight - 6, sessions.length); // Reserve space for header/footer
  const visibleSessions = sessions.slice(windowStart, windowStart + visibleWindowSize);

  // Update window when selection changes
  const updateWindow = useCallback(
    (newIndex: number) => {
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      } else if (newIndex >= windowStart + visibleWindowSize) {
        setWindowStart(newIndex - visibleWindowSize + 1);
      }
    },
    [windowStart, visibleWindowSize]
  );

  useInput((input, key) => {
    // Close dialog
    if (key.escape || input === 'p') {
      onClose();
      return;
    }

    // Navigate up
    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      updateWindow(newIndex);
      return;
    }

    // Navigate down
    if (key.downArrow) {
      const newIndex = Math.min(sessions.length - 1, selectedIndex + 1);
      setSelectedIndex(newIndex);
      updateWindow(newIndex);
      return;
    }

    // Page up
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - visibleWindowSize);
      setSelectedIndex(newIndex);
      setWindowStart(Math.max(0, windowStart - visibleWindowSize));
      return;
    }

    // Page down
    if (key.pageDown) {
      const newIndex = Math.min(sessions.length - 1, selectedIndex + visibleWindowSize);
      setSelectedIndex(newIndex);
      setWindowStart(
        Math.min(Math.max(0, sessions.length - visibleWindowSize), windowStart + visibleWindowSize)
      );
      return;
    }

    // Select session
    if (key.return) {
      const session = sessions[selectedIndex];
      if (session) {
        onSelectSession(session);
      }
      return;
    }
  });

  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + visibleWindowSize < sessions.length;

  // Build header line content
  const headerLeft = 'Pick Session';
  const headerRight = `${sessions.length} sessions`;
  const headerSpacing = Math.max(1, contentWidth - headerLeft.length - headerRight.length);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.selected}
      width={width}
    >
      {/* Header */}
      <Text backgroundColor={DIALOG_BG_COLOR}>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
        <Text bold color={colors.header} backgroundColor={DIALOG_BG_COLOR}>
          {headerLeft}
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(headerSpacing)}</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
          {headerRight}
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
      </Text>

      {/* Empty line after header */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Scroll indicator - up */}
      {showScrollUp && (
        <Text backgroundColor={DIALOG_BG_COLOR}>
          {padLine(`↑ ${windowStart} more above`)}
        </Text>
      )}

      {/* Session list */}
      {visibleSessions.map((session, visibleIndex) => {
        const actualIndex = windowStart + visibleIndex;
        const isSelected = actualIndex === selectedIndex;
        // Check if this session is the one currently being viewed
        const isCurrentlyViewed = session.filePath === currentFilePath;

        let typeIndicator: string;

        switch (session.type) {
          case 'new':
            typeIndicator = '+';
            break;
          case 'current':
            typeIndicator = isCurrentlyViewed ? '▶' : '○';
            break;
          case 'archived':
            // Show "▶" for currently viewed archived session, otherwise folder icon
            typeIndicator = isCurrentlyViewed ? '▶' : '📁';
            break;
        }

        // Build the full line content for width calculation
        const selector = isSelected ? '▸ ' : '  ';
        const viewing = (isCurrentlyViewed && session.type === 'archived') ? ' (viewing)' : '';
        const size = session.sizeBytes !== undefined ? ` (${formatFileSize(session.sizeBytes)})` : '';
        const lineContent = `${selector}${typeIndicator} ${session.displayName}${viewing}${size}`;
        // Use visualWidth to account for emoji widths in terminal
        const lineVisualWidth = visualWidth(lineContent);

        return (
          <Text key={session.filePath} backgroundColor={DIALOG_BG_COLOR}>
            <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
            <Text color={isSelected ? colors.selected : colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {selector}
            </Text>
            <Text backgroundColor={DIALOG_BG_COLOR}>{typeIndicator} </Text>
            <Text
              color={
                session.type === 'new'
                  ? colors.success
                  : isCurrentlyViewed
                    ? colors.selected
                    : colors.header
              }
              bold={session.type === 'new' || isCurrentlyViewed}
              backgroundColor={DIALOG_BG_COLOR}
            >
              {session.displayName}
            </Text>
            {isCurrentlyViewed && session.type === 'archived' && (
              <Text color={colors.selected} backgroundColor={DIALOG_BG_COLOR}> (viewing)</Text>
            )}
            {session.sizeBytes !== undefined && (
              <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}> ({formatFileSize(session.sizeBytes)})</Text>
            )}
            <Text backgroundColor={DIALOG_BG_COLOR}>{rightPadVisual(lineVisualWidth)}</Text>
          </Text>
        );
      })}

      {/* Scroll indicator - down */}
      {showScrollDown && (
        <Text backgroundColor={DIALOG_BG_COLOR}>
          {padLine(`↓ ${sessions.length - windowStart - visibleWindowSize} more below`)}
        </Text>
      )}

      {/* Empty line before footer */}
      <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

      {/* Footer */}
      <Text backgroundColor={DIALOG_BG_COLOR}>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
          ↑↓: Navigate
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{'  '}</Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>Enter</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>: Select  </Text>
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>P/Esc</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>: Close</Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
      </Text>
    </Box>
  );
}

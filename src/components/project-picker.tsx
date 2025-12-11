import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../lib/colors.js';
import { DIALOG_BG_COLOR, createDialogHelpers, visualWidth } from '../lib/dialog-utils.js';
import { ProjectInfo } from '../hooks/use-projects.js';

export interface ProjectPickerProps {
  /** List of available projects */
  projects: ProjectInfo[];
  /** Currently active project (if any) */
  activeProject?: ProjectInfo | null;
  /** Callback when a project is selected */
  onSelectProject: (project: ProjectInfo) => void;
  /** Callback to close the picker */
  onClose: () => void;
  /** Width of the dialog */
  width?: number;
  /** Maximum height for the project list */
  maxHeight?: number;
}

// Padding on each side
const PADDING = 1;

export function ProjectPicker({
  projects,
  activeProject,
  onSelectProject,
  onClose,
  width = 60,
  maxHeight = 20,
}: ProjectPickerProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  const helpers = useMemo(() => createDialogHelpers(width, PADDING), [width]);
  const { emptyLine, padLine, contentWidth, rightPadVisual } = helpers;

  // Visible window of projects
  const visibleWindowSize = Math.min(maxHeight - 6, projects.length); // Reserve space for header/footer
  const visibleProjects = projects.slice(windowStart, windowStart + visibleWindowSize);

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
    if (key.escape || input === 'j') {
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
      const newIndex = Math.min(projects.length - 1, selectedIndex + 1);
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
      const newIndex = Math.min(projects.length - 1, selectedIndex + visibleWindowSize);
      setSelectedIndex(newIndex);
      setWindowStart(
        Math.min(Math.max(0, projects.length - visibleWindowSize), windowStart + visibleWindowSize)
      );
      return;
    }

    // Select project
    if (key.return) {
      const project = projects[selectedIndex];
      if (project) {
        onSelectProject(project);
      }
      return;
    }
  });

  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + visibleWindowSize < projects.length;

  // Build header line content
  const headerLeft = 'Select Project';
  const headerRight = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
  const headerSpacing = Math.max(1, contentWidth - headerLeft.length - headerRight.length);

  // Handle empty projects list
  if (projects.length === 0) {
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

        <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

        {/* No projects message */}
        <Text backgroundColor={DIALOG_BG_COLOR}>
          {padLine('No projects found.')}
        </Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>
          {padLine('Run `ralph init` to create one.')}
        </Text>

        <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>

        {/* Footer */}
        <Text backgroundColor={DIALOG_BG_COLOR}>
          <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
          <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>J/Esc</Text>
          <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>: Close</Text>
          <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
        </Text>
      </Box>
    );
  }

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

      {/* Project list */}
      {visibleProjects.map((project, visibleIndex) => {
        const actualIndex = windowStart + visibleIndex;
        const isSelected = actualIndex === selectedIndex;
        const isActive = activeProject?.name === project.name;

        // Icon based on state
        const icon = isActive ? '▶' : project.hasExecuteFile ? '📁' : '⚠️';

        // Display name
        const displayName = project.displayName || project.name;

        // Build the full line content for width calculation
        const selector = isSelected ? '▸ ' : '  ';
        const activeIndicator = isActive ? ' (active)' : '';
        const noExecuteWarning = !project.hasExecuteFile ? ' (missing execute.md)' : '';
        const lineContent = `${selector}${icon} ${displayName}${activeIndicator}${noExecuteWarning}`;
        const lineVisualWidth = visualWidth(lineContent);

        return (
          <Text key={project.name} backgroundColor={DIALOG_BG_COLOR}>
            <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
            <Text color={isSelected ? colors.selected : colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>
              {selector}
            </Text>
            <Text backgroundColor={DIALOG_BG_COLOR}>{icon} </Text>
            <Text
              color={
                isActive
                  ? colors.selected
                  : !project.hasExecuteFile
                    ? colors.error
                    : colors.header
              }
              bold={isActive}
              backgroundColor={DIALOG_BG_COLOR}
            >
              {displayName}
            </Text>
            {isActive && (
              <Text color={colors.selected} backgroundColor={DIALOG_BG_COLOR}> (active)</Text>
            )}
            {!project.hasExecuteFile && (
              <Text color={colors.error} backgroundColor={DIALOG_BG_COLOR}> (missing execute.md)</Text>
            )}
            <Text backgroundColor={DIALOG_BG_COLOR}>{rightPadVisual(lineVisualWidth)}</Text>
          </Text>
        );
      })}

      {/* Scroll indicator - down */}
      {showScrollDown && (
        <Text backgroundColor={DIALOG_BG_COLOR}>
          {padLine(`↓ ${projects.length - windowStart - visibleWindowSize} more below`)}
        </Text>
      )}

      {/* Description of selected project */}
      {projects[selectedIndex]?.description && (
        <>
          <Text backgroundColor={DIALOG_BG_COLOR}>{emptyLine()}</Text>
          <Text backgroundColor={DIALOG_BG_COLOR}>
            <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
            <Text color={colors.dimmed} italic backgroundColor={DIALOG_BG_COLOR}>
              {projects[selectedIndex].description.length > contentWidth
                ? projects[selectedIndex].description.slice(0, contentWidth - 3) + '...'
                : projects[selectedIndex].description}
            </Text>
            <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
          </Text>
        </>
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
        <Text color={colors.subagent} bold backgroundColor={DIALOG_BG_COLOR}>J/Esc</Text>
        <Text color={colors.dimmed} backgroundColor={DIALOG_BG_COLOR}>: Close</Text>
        <Text backgroundColor={DIALOG_BG_COLOR}>{' '.repeat(PADDING)}</Text>
      </Text>
    </Box>
  );
}

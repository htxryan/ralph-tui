import { useCallback } from 'react';
import { useInput, useApp, Key } from 'ink';
import { TabName, ViewMode } from '../lib/types.js';

export interface UseKeyboardOptions {
  onTabChange: (tab: TabName) => void;
  onViewChange: (view: ViewMode) => void;
  onNavigate: (direction: 'up' | 'down' | 'pageUp' | 'pageDown') => void;
  onSelect: () => void;
  onBack: () => void;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  currentTab: TabName;
  currentView: ViewMode;
  tabCount?: number;
}

const tabs: TabName[] = ['messages', 'bdissue', 'todos', 'errors', 'stats'];

export function useKeyboard(options: UseKeyboardOptions): void {
  const {
    onTabChange,
    onViewChange,
    onNavigate,
    onSelect,
    onBack,
    onToggleSidebar,
    onRefresh,
    currentTab,
    currentView,
    tabCount = 5,
  } = options;

  const { exit } = useApp();

  const handleInput = useCallback(
    (input: string, key: Key) => {
      // Quit
      if (input === 'q' || (key.ctrl && input === 'c')) {
        exit();
        return;
      }

      // Back navigation
      if (key.escape) {
        if (currentView !== 'main') {
          onViewChange('main');
        }
        onBack();
        return;
      }

      // Tab switching with number keys
      const num = parseInt(input);
      if (num >= 1 && num <= tabCount) {
        onTabChange(tabs[num - 1]);
        return;
      }

      // Tab cycling
      if (key.tab) {
        const currentIndex = tabs.indexOf(currentTab);
        if (key.shift) {
          // Previous tab
          const newIndex = (currentIndex - 1 + tabCount) % tabCount;
          onTabChange(tabs[newIndex]);
        } else {
          // Next tab
          const newIndex = (currentIndex + 1) % tabCount;
          onTabChange(tabs[newIndex]);
        }
        return;
      }

      // Navigation
      if (key.upArrow) {
        onNavigate('up');
        return;
      }
      if (key.downArrow) {
        onNavigate('down');
        return;
      }
      if (key.pageUp) {
        onNavigate('pageUp');
        return;
      }
      if (key.pageDown) {
        onNavigate('pageDown');
        return;
      }

      // Selection
      if (key.return) {
        onSelect();
        return;
      }

      // Toggle sidebar
      if (input === 's') {
        onToggleSidebar();
        return;
      }

      // Refresh
      if (input === 'r') {
        onRefresh();
        return;
      }
    },
    [
      exit,
      currentView,
      currentTab,
      tabCount,
      onViewChange,
      onBack,
      onTabChange,
      onNavigate,
      onSelect,
      onToggleSidebar,
      onRefresh,
    ]
  );

  useInput(handleInput);
}

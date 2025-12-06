import { colors } from './colors.js';
import { TabName, ViewMode } from './types.js';

export interface Shortcut {
  key: string;
  description: string;
  color?: string;
}

export interface ShortcutContext {
  currentView: ViewMode;
  currentTab?: TabName;
  isRalphRunning: boolean;
  isRalphStarting: boolean;
  isRalphStopping: boolean;
  isRalphResuming: boolean;
  hasSessionId: boolean;
}

// Individual shortcuts
const navigateShortcut: Shortcut = { key: '↑↓', description: 'Navigate' };
const quitShortcut: Shortcut = { key: 'Q', description: 'Quit' };
const selectShortcut: Shortcut = { key: 'Enter', description: 'Select' };
const filterShortcut: Shortcut = { key: 'F', description: 'Filter' };
const latestShortcut: Shortcut = { key: 'L', description: 'Latest' };
const sessionsShortcut: Shortcut = { key: 'P', description: 'Sessions' };
const refreshShortcut: Shortcut = { key: 'R', description: 'Refresh' };
const sidebarShortcut: Shortcut = { key: 'B', description: 'Sidebar' };
const startShortcut: Shortcut = { key: 'S', description: 'Start', color: colors.success };
const killShortcut: Shortcut = { key: 'K', description: 'Kill', color: colors.error };
const interruptShortcut: Shortcut = { key: 'I', description: 'Interrupt', color: colors.user };

// Dialog versions with conditional hints
const startShortcutDialog: Shortcut = { key: 'S', description: 'Start (when idle)', color: colors.success };
const killShortcutDialog: Shortcut = { key: 'K', description: 'Kill (when running)', color: colors.error };
const interruptShortcutDialog: Shortcut = { key: 'I', description: 'Interrupt (when running)', color: colors.user };
const tabsShortcut: Shortcut = { key: '1-5', description: 'Tabs' };
const backShortcut: Shortcut = { key: 'Esc', description: 'Back' };

/**
 * Get the list of shortcuts for the current context.
 * Order: Navigate, Quit, Select, Filter*, Latest*, Sessions, Refresh, Sidebar, Start/Kill/Interrupt, Tabs
 * (* = messages tab only)
 */
export function getContextualShortcuts(context: ShortcutContext): Shortcut[] {
  const {
    currentView,
    currentTab,
    isRalphRunning,
    isRalphStarting,
    isRalphStopping,
    isRalphResuming,
    hasSessionId,
  } = context;

  const shortcuts: Shortcut[] = [];

  if (currentView === 'main') {
    // Main view shortcuts in specified order
    shortcuts.push(quitShortcut);
    shortcuts.push(navigateShortcut);
    shortcuts.push(selectShortcut);

    // Filter and Latest only for messages tab
    if (currentTab === 'messages') {
      shortcuts.push(filterShortcut);
      shortcuts.push(latestShortcut);
    }

    // Start/Kill/Interrupt based on Ralph state
    if (isRalphRunning && !isRalphStopping && !isRalphResuming) {
      shortcuts.push(killShortcut);
      if (hasSessionId) {
        shortcuts.push(interruptShortcut);
      }
    } else if (!isRalphStarting && !isRalphResuming) {
      shortcuts.push(startShortcut);
    }

    shortcuts.push(sessionsShortcut);
    shortcuts.push(refreshShortcut);
    shortcuts.push(sidebarShortcut);
    shortcuts.push(tabsShortcut);
  } else {
    // Detail view shortcuts
    shortcuts.push(backShortcut);
    shortcuts.push(quitShortcut);
    shortcuts.push(navigateShortcut);
    shortcuts.push(sidebarShortcut);
  }

  return shortcuts;
}

/**
 * Get ALL shortcuts for the dialog (includes all Start/Kill/Interrupt regardless of state)
 */
export function getAllShortcutsForDialog(context: ShortcutContext): Shortcut[] {
  const { currentView, currentTab } = context;

  const shortcuts: Shortcut[] = [];

  if (currentView === 'main') {
    shortcuts.push(quitShortcut);
    shortcuts.push(navigateShortcut);
    shortcuts.push(selectShortcut);

    if (currentTab === 'messages') {
      shortcuts.push(filterShortcut);
      shortcuts.push(latestShortcut);
    }

    // Always show all three in dialog with conditional hints
    shortcuts.push(startShortcutDialog);
    shortcuts.push(killShortcutDialog);
    shortcuts.push(interruptShortcutDialog);

    shortcuts.push(sessionsShortcut);
    shortcuts.push(refreshShortcut);
    shortcuts.push(sidebarShortcut);
    shortcuts.push(tabsShortcut);
  } else {
    shortcuts.push(backShortcut);
    shortcuts.push(quitShortcut);
    shortcuts.push(navigateShortcut);
    shortcuts.push(sidebarShortcut);
  }

  return shortcuts;
}

/**
 * Calculate the display width of a shortcut (key + space + description + margin)
 */
export function getShortcutWidth(shortcut: Shortcut): number {
  return shortcut.key.length + 1 + shortcut.description.length + 2;
}

/**
 * The "show more" shortcut that appears when shortcuts are truncated
 */
export const moreShortcut: Shortcut = { key: '.', description: 'More' };

/**
 * Fit shortcuts into available width, truncating from right if needed
 * Returns visible shortcuts and whether truncation occurred
 */
export function fitShortcutsToWidth(
  shortcuts: Shortcut[],
  availableWidth: number
): { visible: Shortcut[]; truncated: boolean } {
  const moreWidth = getShortcutWidth(moreShortcut);

  // Calculate total width needed
  let totalWidth = 0;
  for (const shortcut of shortcuts) {
    totalWidth += getShortcutWidth(shortcut);
  }

  // If all shortcuts fit, return them all
  if (totalWidth <= availableWidth) {
    return { visible: shortcuts, truncated: false };
  }

  // Need to truncate - reserve space for "." shortcut
  const targetWidth = availableWidth - moreWidth;

  const visible: Shortcut[] = [];
  let usedWidth = 0;

  for (const shortcut of shortcuts) {
    const width = getShortcutWidth(shortcut);
    if (usedWidth + width <= targetWidth) {
      visible.push(shortcut);
      usedWidth += width;
    } else {
      // Can't fit any more
      break;
    }
  }

  return { visible, truncated: true };
}

/**
 * Shortcuts shown in interrupt mode
 */
export const interruptModeShortcuts: Shortcut[] = [
  { key: 'Enter', description: 'Submit', color: colors.success },
  { key: 'Esc', description: 'Cancel', color: colors.error },
];

/**
 * Shortcuts shown in session picker mode
 */
export const sessionPickerShortcuts: Shortcut[] = [
  { key: '↑↓', description: 'Navigate' },
  { key: 'Enter', description: 'Select', color: colors.success },
  { key: 'P/Esc', description: 'Close', color: colors.subagent },
];

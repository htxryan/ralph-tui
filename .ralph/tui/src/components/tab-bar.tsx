import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';
import { TabName } from '../lib/types.js';

export interface TabBarProps {
  currentTab: TabName;
  onTabChange: (tab: TabName) => void;
}

interface TabConfig {
  name: TabName;
  label: string;
  shortcut: string;
}

const tabs: TabConfig[] = [
  { name: 'messages', label: 'Messages', shortcut: '1' },
  { name: 'bdissue', label: 'BD Issue', shortcut: '2' },
  { name: 'todos', label: 'Todos', shortcut: '3' },
  { name: 'errors', label: 'Errors', shortcut: '4' },
  { name: 'stats', label: 'Stats', shortcut: '5' },
];

export function TabBar({ currentTab, onTabChange }: TabBarProps): React.ReactElement {
  return (
    <Box flexDirection="row" marginY={0}>
      {tabs.map((tab, index) => {
        const isActive = tab.name === currentTab;

        return (
          <Box key={tab.name} marginRight={1}>
            <Text
              color={isActive ? colors.activeTab : colors.inactiveTab}
              bold={isActive}
              inverse={isActive}
            >
              {' '}
              {tab.shortcut}. {tab.label}
              {' '}
            </Text>
          </Box>
        );
      })}
      <Box flexGrow={1} />
      <Text color={colors.dimmed}>Tab/Shift+Tab to switch</Text>
    </Box>
  );
}

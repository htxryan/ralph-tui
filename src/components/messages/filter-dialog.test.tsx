import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { FilterDialog } from './filter-dialog.js';
import { MessageFilterType, ALL_MESSAGE_FILTER_TYPES } from '../../lib/types.js';

describe('FilterDialog', () => {
  let mockOnFiltersChange: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFiltersChange = vi.fn();
    mockOnClose = vi.fn();
  });

  const allFiltersEnabled = new Set<MessageFilterType>(ALL_MESSAGE_FILTER_TYPES);
  const noFiltersEnabled = new Set<MessageFilterType>();

  describe('rendering', () => {
    it('renders the filter dialog title', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('Filter Messages');
    });

    it('displays enabled/total count', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain(`${ALL_MESSAGE_FILTER_TYPES.length}/${ALL_MESSAGE_FILTER_TYPES.length}`);
    });

    it('displays all filter type labels', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('Initial Prompt');
      expect(lastFrame()).toContain('User');
      expect(lastFrame()).toContain('Thinking');
      expect(lastFrame()).toContain('Tool');
      expect(lastFrame()).toContain('Assistant');
      expect(lastFrame()).toContain('Task Subagent');
      expect(lastFrame()).toContain('System');
      expect(lastFrame()).toContain('Result');
    });

    it('shows checkboxes for enabled filters', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      // Should show checked boxes for enabled filters
      expect(lastFrame()).toContain('[✓]');
    });

    it('shows empty checkboxes for disabled filters', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={noFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      // Should show unchecked boxes
      expect(lastFrame()).toContain('[ ]');
    });

    it('shows message counts when provided', () => {
      const messageCounts: Record<MessageFilterType, number> = {
        'initial-prompt': 1,
        'user': 5,
        'thinking': 3,
        'tool': 10,
        'assistant': 2,
        'subagent': 4,
        'system': 1,
        'result': 1,
      };

      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
          messageCounts={messageCounts}
        />
      );

      expect(lastFrame()).toContain('(5)'); // user count
      expect(lastFrame()).toContain('(10)'); // tool count
    });

    it('shows footer with shortcuts', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('Toggle');
      expect(lastFrame()).toContain('Close');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with arrow key', () => {
      const { stdin, lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      // Navigate down
      stdin.write('\x1B[B'); // Down arrow

      // Should render without error
      expect(lastFrame()).toBeDefined();
    });

    it('navigates up with arrow key', () => {
      const { stdin, lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      // Navigate up
      stdin.write('\x1B[A'); // Up arrow

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('filter toggling', () => {
    it('renders with selection indicator on first item', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      // First item should have selection indicator
      expect(lastFrame()).toContain('▸');
    });

    it('shows filter number prefixes', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('1.');
      expect(lastFrame()).toContain('2.');
      expect(lastFrame()).toContain('8.');
    });
  });

  describe('quick action shortcuts in footer', () => {
    it('shows All shortcut', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={noFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('A');
      expect(lastFrame()).toContain('ll');
    });

    it('shows None shortcut', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('N');
      expect(lastFrame()).toContain('one');
    });

    it('shows sUbagents shortcut', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('U');
      expect(lastFrame()).toContain('bagents');
    });
  });

  describe('close shortcut', () => {
    it('shows close hint in footer', () => {
      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={allFiltersEnabled}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain('F/Esc');
      expect(lastFrame()).toContain('Close');
    });
  });

  describe('partial filter states', () => {
    it('shows correct count for partially enabled filters', () => {
      const partialFilters = new Set<MessageFilterType>(['user', 'assistant', 'tool']);

      const { lastFrame } = render(
        <FilterDialog
          enabledFilters={partialFilters}
          onFiltersChange={mockOnFiltersChange}
          onClose={mockOnClose}
        />
      );

      expect(lastFrame()).toContain(`3/${ALL_MESSAGE_FILTER_TYPES.length}`);
    });
  });
});

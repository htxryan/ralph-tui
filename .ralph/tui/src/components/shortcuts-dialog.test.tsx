import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ShortcutsDialog } from './shortcuts-dialog.js';
import { Shortcut } from '../lib/shortcuts.js';

describe('ShortcutsDialog', () => {
  const sampleShortcuts: Shortcut[] = [
    { key: 'q', description: 'Quit' },
    { key: '↑↓', description: 'Navigate' },
    { key: 'Enter', description: 'Select' },
    { key: 'f', description: 'Filter' },
    { key: 'l', description: 'Latest' },
  ];

  describe('rendering', () => {
    it('renders the default title', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} />
      );

      expect(lastFrame()).toContain('Keyboard Shortcuts');
    });

    it('renders custom title when provided', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} title="Custom Title" />
      );

      expect(lastFrame()).toContain('Custom Title');
    });

    it('renders all shortcut keys', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} />
      );

      expect(lastFrame()).toContain('q');
      expect(lastFrame()).toContain('↑↓');
      expect(lastFrame()).toContain('Enter');
      expect(lastFrame()).toContain('f');
      expect(lastFrame()).toContain('l');
    });

    it('renders all shortcut descriptions', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} />
      );

      expect(lastFrame()).toContain('Quit');
      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Select');
      expect(lastFrame()).toContain('Filter');
      expect(lastFrame()).toContain('Latest');
    });

    it('shows dismiss hint', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} />
      );

      expect(lastFrame()).toContain('Press any key to dismiss');
    });
  });

  describe('empty state', () => {
    it('renders with empty shortcuts list', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={[]} />
      );

      expect(lastFrame()).toContain('Keyboard Shortcuts');
      expect(lastFrame()).toContain('Press any key to dismiss');
    });
  });

  describe('layout', () => {
    it('aligns keys properly', () => {
      const shortcuts: Shortcut[] = [
        { key: 'q', description: 'Quit' },
        { key: 'Enter', description: 'Select' },
      ];

      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={shortcuts} />
      );

      // Both keys should be present and descriptions aligned
      expect(lastFrame()).toContain('q');
      expect(lastFrame()).toContain('Enter');
    });

    it('respects custom width', () => {
      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={sampleShortcuts} width={50} />
      );

      // Should render without error at custom width
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('shortcuts with colors', () => {
    it('renders shortcuts with custom colors', () => {
      const coloredShortcuts: Shortcut[] = [
        { key: 's', description: 'Start', color: '#00ff00' },
        { key: 'k', description: 'Kill', color: '#ff0000' },
      ];

      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={coloredShortcuts} />
      );

      expect(lastFrame()).toContain('Start');
      expect(lastFrame()).toContain('Kill');
    });
  });

  describe('long content', () => {
    it('handles many shortcuts', () => {
      const manyShortcuts: Shortcut[] = Array.from({ length: 15 }, (_, i) => ({
        key: String.fromCharCode(97 + i), // a-o
        description: `Action ${i + 1}`,
      }));

      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={manyShortcuts} />
      );

      // Should render all shortcuts
      expect(lastFrame()).toContain('a');
      expect(lastFrame()).toContain('o');
    });

    it('handles long descriptions', () => {
      const longDescShortcuts: Shortcut[] = [
        { key: 'x', description: 'This is a very long description that might wrap' },
      ];

      const { lastFrame } = render(
        <ShortcutsDialog shortcuts={longDescShortcuts} width={60} />
      );

      expect(lastFrame()).toContain('long description');
    });
  });
});

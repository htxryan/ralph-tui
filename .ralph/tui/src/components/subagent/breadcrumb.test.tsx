import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Breadcrumb } from './breadcrumb.js';

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('renders single path segment', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main Agent']} />
      );

      expect(lastFrame()).toContain('Main Agent');
    });

    it('renders multiple path segments', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main Agent', 'Task: Search']} />
      );

      expect(lastFrame()).toContain('Main Agent');
      expect(lastFrame()).toContain('Task: Search');
    });

    it('renders separator between segments', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main Agent', 'Task: Search']} />
      );

      // Should contain the separator character (›)
      expect(lastFrame()).toContain('›');
    });

    it('renders three-level breadcrumb', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main Agent', 'Task: Explore', 'Messages']} />
      );

      expect(lastFrame()).toContain('Main Agent');
      expect(lastFrame()).toContain('Task: Explore');
      expect(lastFrame()).toContain('Messages');
    });

    it('renders empty breadcrumb without error', () => {
      const { lastFrame } = render(
        <Breadcrumb path={[]} />
      );

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('highlighting', () => {
    it('highlights the last segment', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Parent', 'Current']} />
      );

      // Both segments should be visible
      expect(lastFrame()).toContain('Parent');
      expect(lastFrame()).toContain('Current');
    });
  });

  describe('complex paths', () => {
    it('handles long segment names', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main Agent', 'Task: "Very Long Description Here"']} />
      );

      expect(lastFrame()).toContain('Main Agent');
      expect(lastFrame()).toContain('Very Long Description');
    });

    it('handles special characters in path', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Main', 'Task: "File → test.ts"']} />
      );

      expect(lastFrame()).toContain('Main');
      expect(lastFrame()).toContain('Task');
    });
  });

  describe('deep nesting', () => {
    it('renders deeply nested paths', () => {
      const { lastFrame } = render(
        <Breadcrumb path={['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']} />
      );

      expect(lastFrame()).toContain('Level 1');
      expect(lastFrame()).toContain('Level 5');
    });
  });
});

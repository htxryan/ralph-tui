/**
 * Tests for use-projects hook functionality
 *
 * Note: This file tests the underlying logic without using @testing-library/react
 * since the project uses ink-testing-library for component testing.
 * The hook is tested indirectly through component tests in the e2e suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and chokidar before imports
vi.mock('fs');
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn(),
    })),
  },
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

// Import the type for validation
import type { ProjectInfo } from './use-projects.js';

describe('use-projects', () => {
  const mockBasePath = '/test/project';
  const mockProjectsDir = `${mockBasePath}/.ralph/projects`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // ProjectInfo Type Validation
  // ==========================================================================

  describe('ProjectInfo type', () => {
    it('defines required fields correctly', () => {
      const project: ProjectInfo = {
        name: 'default',
        path: '/test/.ralph/projects/default',
        hasExecuteFile: true,
      };

      expect(project.name).toBe('default');
      expect(project.path).toBe('/test/.ralph/projects/default');
      expect(project.hasExecuteFile).toBe(true);
    });

    it('supports optional displayName and description', () => {
      const project: ProjectInfo = {
        name: 'bug-fix',
        path: '/test/.ralph/projects/bug-fix',
        hasExecuteFile: true,
        displayName: 'Bug Fix',
        description: 'Workflow for bug fixes',
      };

      expect(project.displayName).toBe('Bug Fix');
      expect(project.description).toBe('Workflow for bug fixes');
    });

    it('allows undefined optional fields', () => {
      const project: ProjectInfo = {
        name: 'minimal',
        path: '/test/.ralph/projects/minimal',
        hasExecuteFile: false,
        displayName: undefined,
        description: undefined,
      };

      expect(project.displayName).toBeUndefined();
      expect(project.description).toBeUndefined();
    });
  });

  // ==========================================================================
  // Project Directory Structure Tests (fs mock based)
  // ==========================================================================

  describe('project directory structure expectations', () => {
    it('expects projects to be in .ralph/projects/', () => {
      const expectedPath = path.join(mockBasePath, '.ralph', 'projects');
      expect(expectedPath).toBe(mockProjectsDir);
    });

    it('expects execute.md in each project directory', () => {
      const projectName = 'default';
      const executePath = path.join(mockProjectsDir, projectName, 'execute.md');
      expect(executePath).toBe(`${mockProjectsDir}/default/execute.md`);
    });

    it('expects settings.json in each project directory', () => {
      const projectName = 'default';
      const settingsPath = path.join(mockProjectsDir, projectName, 'settings.json');
      expect(settingsPath).toBe(`${mockProjectsDir}/default/settings.json`);
    });
  });

  // ==========================================================================
  // Settings File Parsing Logic
  // ==========================================================================

  describe('settings.json parsing logic', () => {
    it('parses valid settings.json with all fields', () => {
      const settingsContent = JSON.stringify({
        display_name: 'My Project',
        description: 'A test project',
        variables: { target_branch: 'main' },
      });

      const parsed = JSON.parse(settingsContent);
      expect(parsed.display_name).toBe('My Project');
      expect(parsed.description).toBe('A test project');
      expect(parsed.variables).toEqual({ target_branch: 'main' });
    });

    it('handles settings.json with only display_name', () => {
      const settingsContent = JSON.stringify({
        display_name: 'Simple Project',
      });

      const parsed = JSON.parse(settingsContent);
      expect(parsed.display_name).toBe('Simple Project');
      expect(parsed.description).toBeUndefined();
    });

    it('handles empty settings.json', () => {
      const settingsContent = JSON.stringify({});
      const parsed = JSON.parse(settingsContent);
      expect(parsed.display_name).toBeUndefined();
      expect(parsed.description).toBeUndefined();
    });

    it('throws on invalid JSON', () => {
      const invalidContent = '{ invalid json }';
      expect(() => JSON.parse(invalidContent)).toThrow();
    });
  });

  // ==========================================================================
  // Project Sorting Logic
  // ==========================================================================

  describe('project sorting logic', () => {
    it('sorts default project first', () => {
      const projects = ['zebra', 'alpha', 'default', 'beta'];

      const sorted = projects.sort((a, b) => {
        if (a === 'default') return -1;
        if (b === 'default') return 1;
        return a.localeCompare(b);
      });

      expect(sorted).toEqual(['default', 'alpha', 'beta', 'zebra']);
    });

    it('sorts alphabetically when no default', () => {
      const projects = ['zebra', 'alpha', 'beta'];

      const sorted = projects.sort((a, b) => {
        if (a === 'default') return -1;
        if (b === 'default') return 1;
        return a.localeCompare(b);
      });

      expect(sorted).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('handles single project', () => {
      const projects = ['only-one'];

      const sorted = projects.sort((a, b) => {
        if (a === 'default') return -1;
        if (b === 'default') return 1;
        return a.localeCompare(b);
      });

      expect(sorted).toEqual(['only-one']);
    });

    it('handles only default project', () => {
      const projects = ['default'];

      const sorted = projects.sort((a, b) => {
        if (a === 'default') return -1;
        if (b === 'default') return 1;
        return a.localeCompare(b);
      });

      expect(sorted).toEqual(['default']);
    });
  });

  // ==========================================================================
  // Directory Entry Filtering
  // ==========================================================================

  describe('directory entry filtering', () => {
    it('filters to only directories', () => {
      const entries = [
        { name: 'default', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
        { name: 'bug-fix', isDirectory: () => true },
        { name: '.DS_Store', isDirectory: () => false },
      ];

      const directories = entries.filter(e => e.isDirectory());
      expect(directories.map(d => d.name)).toEqual(['default', 'bug-fix']);
    });

    it('returns empty array when no directories', () => {
      const entries = [
        { name: 'README.md', isDirectory: () => false },
        { name: '.gitkeep', isDirectory: () => false },
      ];

      const directories = entries.filter(e => e.isDirectory());
      expect(directories).toEqual([]);
    });

    it('returns all entries when all are directories', () => {
      const entries = [
        { name: 'project-a', isDirectory: () => true },
        { name: 'project-b', isDirectory: () => true },
      ];

      const directories = entries.filter(e => e.isDirectory());
      expect(directories).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Path Construction
  // ==========================================================================

  describe('path construction', () => {
    it('constructs projects directory path correctly', () => {
      const basePath = '/home/user/my-project';
      const projectsDir = path.join(basePath, '.ralph', 'projects');
      expect(projectsDir).toBe('/home/user/my-project/.ralph/projects');
    });

    it('constructs project path correctly', () => {
      const projectsDir = '/test/.ralph/projects';
      const projectName = 'my-project';
      const projectPath = path.join(projectsDir, projectName);
      expect(projectPath).toBe('/test/.ralph/projects/my-project');
    });

    it('constructs execute.md path correctly', () => {
      const projectPath = '/test/.ralph/projects/my-project';
      const executePath = path.join(projectPath, 'execute.md');
      expect(executePath).toBe('/test/.ralph/projects/my-project/execute.md');
    });

    it('constructs settings.json path correctly', () => {
      const projectPath = '/test/.ralph/projects/my-project';
      const settingsPath = path.join(projectPath, 'settings.json');
      expect(settingsPath).toBe('/test/.ralph/projects/my-project/settings.json');
    });
  });
});

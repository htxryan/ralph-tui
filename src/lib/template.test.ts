import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  substituteVariables,
  extractVariableNames,
  hasUnsubstitutedVariables,
  validateVariables,
  SPECIAL_VARIABLES,
} from './template.js';

describe('template utilities', () => {
  // ==========================================================================
  // substituteVariables
  // ==========================================================================

  describe('substituteVariables', () => {
    describe('basic substitution', () => {
      it('replaces a single variable', () => {
        const result = substituteVariables(
          'Branch: {{target_branch}}',
          { target_branch: 'main' },
          { warnOnMissing: false }
        );
        expect(result).toBe('Branch: main');
      });

      it('replaces multiple variables', () => {
        const result = substituteVariables(
          'From {{source_branch}} to {{target_branch}}',
          { source_branch: 'feature', target_branch: 'main' },
          { warnOnMissing: false }
        );
        expect(result).toBe('From feature to main');
      });

      it('replaces the same variable multiple times', () => {
        const result = substituteVariables(
          '{{name}} is {{name}}',
          { name: 'Ralph' },
          { warnOnMissing: false }
        );
        expect(result).toBe('Ralph is Ralph');
      });

      it('handles empty variables object', () => {
        const result = substituteVariables(
          'No variables here',
          {},
          { warnOnMissing: false }
        );
        expect(result).toBe('No variables here');
      });

      it('handles empty template', () => {
        const result = substituteVariables(
          '',
          { foo: 'bar' },
          { warnOnMissing: false }
        );
        expect(result).toBe('');
      });

      it('handles variables with whitespace in names', () => {
        const result = substituteVariables(
          '{{ target_branch }}',
          { target_branch: 'main' },
          { warnOnMissing: false }
        );
        expect(result).toBe('main');
      });
    });

    describe('special variables', () => {
      it('substitutes {{execute_path}} when activeProjectName is provided', () => {
        const result = substituteVariables(
          'Read {{execute_path}}',
          {},
          { activeProjectName: 'default', warnOnMissing: false }
        );
        expect(result).toBe('Read .ralph/projects/default/execute.md');
      });

      it('substitutes {{execute_path}} with custom project name', () => {
        const result = substituteVariables(
          'Path: {{execute_path}}',
          {},
          { activeProjectName: 'bug-fix', warnOnMissing: false }
        );
        expect(result).toBe('Path: .ralph/projects/bug-fix/execute.md');
      });

      it('leaves {{execute_path}} when no activeProjectName', () => {
        const result = substituteVariables(
          'Read {{execute_path}}',
          {},
          { warnOnMissing: false }
        );
        expect(result).toBe('Read {{execute_path}}');
      });

      it('user variables do not override special variables', () => {
        const result = substituteVariables(
          '{{execute_path}}',
          { execute_path: 'custom/path.md' },
          { activeProjectName: 'default', warnOnMissing: false }
        );
        // Special variable takes precedence because it's added after spread
        expect(result).toBe('.ralph/projects/default/execute.md');
      });

      it('substitutes {{assignment_path}} when activeProjectName is provided', () => {
        const result = substituteVariables(
          'Write to {{assignment_path}}',
          {},
          { activeProjectName: 'default', warnOnMissing: false }
        );
        expect(result).toBe('Write to .ralph/projects/default/assignment.json');
      });

      it('substitutes {{assignment_path}} with custom project name', () => {
        const result = substituteVariables(
          'File: {{assignment_path}}',
          {},
          { activeProjectName: 'bug-fix', warnOnMissing: false }
        );
        expect(result).toBe('File: .ralph/projects/bug-fix/assignment.json');
      });

      it('leaves {{assignment_path}} when no activeProjectName', () => {
        const result = substituteVariables(
          'Write to {{assignment_path}}',
          {},
          { warnOnMissing: false }
        );
        expect(result).toBe('Write to {{assignment_path}}');
      });

      it('substitutes both execute_path and assignment_path together', () => {
        const result = substituteVariables(
          'Read {{execute_path}}, write {{assignment_path}}',
          {},
          { activeProjectName: 'my-project', warnOnMissing: false }
        );
        expect(result).toBe(
          'Read .ralph/projects/my-project/execute.md, write .ralph/projects/my-project/assignment.json'
        );
      });
    });

    describe('missing variables', () => {
      it('leaves missing variables as-is', () => {
        const result = substituteVariables(
          'Hello {{missing}}',
          {},
          { warnOnMissing: false }
        );
        expect(result).toBe('Hello {{missing}}');
      });

      it('warns about missing variables by default', () => {
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        substituteVariables('Hello {{missing}}', {});

        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining("Template variable 'missing' not found")
        );

        stderrSpy.mockRestore();
      });

      it('does not warn when warnOnMissing is false', () => {
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        substituteVariables('Hello {{missing}}', {}, { warnOnMissing: false });

        expect(stderrSpy).not.toHaveBeenCalled();

        stderrSpy.mockRestore();
      });

      it('calls custom onMissingVariable handler', () => {
        const missingVars: string[] = [];
        const handler = (name: string) => missingVars.push(name);

        substituteVariables(
          '{{foo}} and {{bar}}',
          {},
          { warnOnMissing: true, onMissingVariable: handler }
        );

        expect(missingVars).toEqual(['foo', 'bar']);
      });
    });

    describe('edge cases', () => {
      it('handles nested braces correctly', () => {
        // The regex /\{\{([^}]+)\}\}/g requires exactly two braces on each side
        // {{{var}}} has three opening braces, so the pattern matches starting
        // from the second brace, but [^}]+ can't match } so it won't work
        const result = substituteVariables(
          'Code: {{{var}}}',
          { var: 'value' },
          { warnOnMissing: false }
        );
        // The pattern doesn't match because the inner content would need to
        // exclude }, but there's a } at the end - so no substitution occurs
        expect(result).toBe('Code: {{{var}}}');
      });

      it('handles escaped-like patterns (no actual escaping)', () => {
        // The current implementation doesn't support escaping
        const result = substituteVariables(
          '\\{{var}}',
          { var: 'value' },
          { warnOnMissing: false }
        );
        expect(result).toBe('\\value');
      });

      it('handles multiline templates', () => {
        const template = `Line 1: {{a}}
Line 2: {{b}}
Line 3: {{a}}`;
        const result = substituteVariables(
          template,
          { a: 'A', b: 'B' },
          { warnOnMissing: false }
        );
        expect(result).toBe(`Line 1: A
Line 2: B
Line 3: A`);
      });

      it('handles variables with numbers', () => {
        const result = substituteVariables(
          '{{var1}} {{var2}}',
          { var1: 'one', var2: 'two' },
          { warnOnMissing: false }
        );
        expect(result).toBe('one two');
      });

      it('handles variables with underscores', () => {
        const result = substituteVariables(
          '{{my_variable_name}}',
          { my_variable_name: 'value' },
          { warnOnMissing: false }
        );
        expect(result).toBe('value');
      });

      it('handles empty variable values', () => {
        const result = substituteVariables(
          'Value: {{empty}}',
          { empty: '' },
          { warnOnMissing: false }
        );
        expect(result).toBe('Value: ');
      });
    });
  });

  // ==========================================================================
  // extractVariableNames
  // ==========================================================================

  describe('extractVariableNames', () => {
    it('extracts single variable', () => {
      const result = extractVariableNames('Hello {{name}}');
      expect(result).toEqual(['name']);
    });

    it('extracts multiple variables', () => {
      const result = extractVariableNames('{{a}} and {{b}} and {{c}}');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('returns unique variable names', () => {
      const result = extractVariableNames('{{a}} {{a}} {{b}} {{a}}');
      expect(result).toEqual(['a', 'b']);
    });

    it('returns empty array for no variables', () => {
      const result = extractVariableNames('No variables here');
      expect(result).toEqual([]);
    });

    it('handles whitespace in variable names', () => {
      const result = extractVariableNames('{{ name }} and {{  foo  }}');
      expect(result).toEqual(['name', 'foo']);
    });

    it('handles multiline templates', () => {
      const template = `First: {{first}}
Second: {{second}}`;
      const result = extractVariableNames(template);
      expect(result).toEqual(['first', 'second']);
    });

    it('can be called multiple times (regex reset)', () => {
      // Ensure lastIndex is properly reset
      const result1 = extractVariableNames('{{a}} {{b}}');
      const result2 = extractVariableNames('{{c}} {{d}}');

      expect(result1).toEqual(['a', 'b']);
      expect(result2).toEqual(['c', 'd']);
    });
  });

  // ==========================================================================
  // hasUnsubstitutedVariables
  // ==========================================================================

  describe('hasUnsubstitutedVariables', () => {
    it('returns true when variables present', () => {
      expect(hasUnsubstitutedVariables('Hello {{name}}')).toBe(true);
    });

    it('returns false when no variables', () => {
      expect(hasUnsubstitutedVariables('Hello world')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasUnsubstitutedVariables('')).toBe(false);
    });

    it('returns true for multiple variables', () => {
      expect(hasUnsubstitutedVariables('{{a}} {{b}}')).toBe(true);
    });

    it('can be called multiple times (regex reset)', () => {
      // Ensure lastIndex is properly reset between calls
      expect(hasUnsubstitutedVariables('{{a}}')).toBe(true);
      expect(hasUnsubstitutedVariables('no vars')).toBe(false);
      expect(hasUnsubstitutedVariables('{{b}}')).toBe(true);
    });
  });

  // ==========================================================================
  // validateVariables
  // ==========================================================================

  describe('validateVariables', () => {
    it('returns valid when all variables present', () => {
      const result = validateVariables(
        '{{a}} {{b}}',
        { a: 'A', b: 'B' }
      );
      expect(result).toEqual({ valid: true, missing: [] });
    });

    it('returns invalid with missing variables', () => {
      const result = validateVariables(
        '{{a}} {{b}} {{c}}',
        { a: 'A' }
      );
      expect(result).toEqual({ valid: false, missing: ['b', 'c'] });
    });

    it('returns valid for template with no variables', () => {
      const result = validateVariables(
        'No variables',
        {}
      );
      expect(result).toEqual({ valid: true, missing: [] });
    });

    it('handles extra variables in object (not an error)', () => {
      const result = validateVariables(
        '{{a}}',
        { a: 'A', b: 'B', c: 'C' }
      );
      expect(result).toEqual({ valid: true, missing: [] });
    });

    it('reports all missing variables', () => {
      const result = validateVariables(
        '{{x}} {{y}} {{z}}',
        {}
      );
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain('x');
      expect(result.missing).toContain('y');
      expect(result.missing).toContain('z');
    });
  });

  // ==========================================================================
  // SPECIAL_VARIABLES constant
  // ==========================================================================

  describe('SPECIAL_VARIABLES', () => {
    it('defines EXECUTE_PATH', () => {
      expect(SPECIAL_VARIABLES.EXECUTE_PATH).toBe('execute_path');
    });

    it('defines ASSIGNMENT_PATH', () => {
      expect(SPECIAL_VARIABLES.ASSIGNMENT_PATH).toBe('assignment_path');
    });
  });
});

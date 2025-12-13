/**
 * Template variable substitution utilities
 *
 * Handles replacement of {{variable_name}} patterns in template strings
 * with values from configuration.
 */

/**
 * Pattern to match template variables: {{variable_name}}
 * Captures the variable name without the braces
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Special variable names that have built-in handlers
 */
export const SPECIAL_VARIABLES = {
  /** Path to the active project's execute.md file */
  EXECUTE_PATH: 'execute_path',
  /** Path to the active project's assignment.json file */
  ASSIGNMENT_PATH: 'assignment_path',
} as const;

export interface SubstituteOptions {
  /** Active project name (used for {{execute_path}} substitution) */
  activeProjectName?: string;
  /** Project root directory */
  projectRoot?: string;
  /** Whether to warn about missing variables (default: true) */
  warnOnMissing?: boolean;
  /** Custom warning handler */
  onMissingVariable?: (variableName: string) => void;
}

/**
 * Substitute template variables in a string
 *
 * Replaces {{variable_name}} patterns with values from the variables object.
 * Special variables like {{execute_path}} are handled automatically based on options.
 *
 * @param template - The template string containing {{variable}} placeholders
 * @param variables - Object mapping variable names to their values
 * @param options - Additional options for substitution
 * @returns The template with all variables replaced
 *
 * @example
 * ```ts
 * substituteVariables(
 *   'Branch: {{target_branch}}',
 *   { target_branch: 'main' }
 * )
 * // Returns: 'Branch: main'
 * ```
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>,
  options: SubstituteOptions = {}
): string {
  const {
    activeProjectName,
    projectRoot = process.cwd(),
    warnOnMissing = true,
    onMissingVariable,
  } = options;

  // Build the complete variables object including special variables
  const allVariables: Record<string, string> = { ...variables };

  // Add special variables
  if (activeProjectName) {
    allVariables[SPECIAL_VARIABLES.EXECUTE_PATH] = `.ralph/projects/${activeProjectName}/execute.md`;
    allVariables[SPECIAL_VARIABLES.ASSIGNMENT_PATH] = `.ralph/projects/${activeProjectName}/assignment.json`;
  }

  return template.replace(VARIABLE_PATTERN, (match, variableName: string) => {
    const trimmedName = variableName.trim();

    // Check if variable exists
    if (trimmedName in allVariables) {
      return allVariables[trimmedName];
    }

    // Handle missing variable
    if (warnOnMissing) {
      if (onMissingVariable) {
        onMissingVariable(trimmedName);
      } else {
        process.stderr.write(`Warning: Template variable '${trimmedName}' not found, leaving as-is\n`);
      }
    }

    // Return the original match if variable not found
    return match;
  });
}

/**
 * Extract all variable names from a template string
 *
 * @param template - The template string to scan
 * @returns Array of unique variable names found in the template
 *
 * @example
 * ```ts
 * extractVariableNames('Hello {{name}}, welcome to {{place}}!')
 * // Returns: ['name', 'place']
 * ```
 */
export function extractVariableNames(template: string): string[] {
  const variables = new Set<string>();

  let match;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    variables.add(match[1].trim());
  }

  // Reset the regex lastIndex for subsequent calls
  VARIABLE_PATTERN.lastIndex = 0;

  return Array.from(variables);
}

/**
 * Check if a template contains any unsubstituted variables
 *
 * @param template - The template string to check
 * @returns True if the template contains {{variable}} patterns
 */
export function hasUnsubstitutedVariables(template: string): boolean {
  VARIABLE_PATTERN.lastIndex = 0;
  return VARIABLE_PATTERN.test(template);
}

/**
 * Validate that all required variables are present in the variables object
 *
 * @param template - The template string to validate against
 * @param variables - The variables object to check
 * @returns Object with validation result and any missing variable names
 */
export function validateVariables(
  template: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const required = extractVariableNames(template);
  const missing = required.filter(name => !(name in variables));

  return {
    valid: missing.length === 0,
    missing,
  };
}

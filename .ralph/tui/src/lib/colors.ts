// Color theme for Ralph TUI
// Inspired by visualize.py colors

export const colors = {
  // Message types - each type should have a DISTINCT color
  system: 'gray',
  user: 'blue',                // User input (distinct from initial prompt)
  initialPrompt: 'blueBright', // First user message in session (bright/bold blue)
  assistant: 'green',
  thinking: 'yellow',          // Assistant text-only messages
  tool: 'magenta',             // Assistant tool-only messages
  result: 'greenBright',       // Session completion (distinct from assistant)
  error: 'red',

  // Status indicators
  success: 'green',
  warning: 'yellow',
  pending: 'red',       // In-progress/incomplete tool calls
  running: 'blue',
  completed: 'green',

  // Tool types
  toolName: 'magenta',
  toolInput: 'gray',
  toolResult: 'white',
  subagent: 'cyan',            // Task subagent messages (distinct from user which is now blue)

  // Subagent types - distinct colors for each specialized agent
  subagentExplore: 'cyan',
  subagentPlan: 'blue',
  subagentGitOperator: 'yellow',
  subagentGithubOperator: 'magenta',
  subagentVercelOperator: 'white',
  subagentNeonOperator: 'green',
  subagentWebResearcher: 'blue',
  subagentProductArchitect: 'magenta',
  subagentBdOperator: 'yellow',
  subagentClaudeCodeGuide: 'cyan',
  subagentGeneralPurpose: 'gray',

  // UI elements
  border: 'gray',
  header: 'white',
  footer: 'gray',
  selected: 'green',
  dimmed: 'gray',

  // Tab indicators
  activeTab: 'green',
  inactiveTab: 'gray',

  // BD Issue status
  open: 'yellow',
  in_progress: 'blue',
  closed: 'green',

  // Priority
  high: 'red',
  medium: 'yellow',
  low: 'gray',

  // Todo status
  todoCompleted: 'green',
  todoInProgress: 'blue',
  todoPending: 'gray',
} as const;

export type ColorName = keyof typeof colors;

// Status icons
export const icons = {
  // Message types
  system: '\u2699',  // Gear
  user: '\u25B6',    // Play arrow
  assistant: '\u25CF', // Filled circle

  // Tool status
  pending: '\u25CB',  // Empty circle
  running: '\u23F3',  // Hourglass
  completed: '\u2713', // Checkmark
  error: '\u2717',    // X mark

  // Navigation
  selected: '\u25B6', // Arrow
  collapsed: '\u25B8', // Small arrow right
  expanded: '\u25BE', // Small arrow down

  // Todo status
  todoCompleted: '\u2611', // Checked box
  todoInProgress: '\u25B6', // Arrow
  todoPending: '\u2610',    // Empty box

  // General
  arrow: '\u2192',
  bullet: '\u2022',
  spinner: ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'],
} as const;

// Border styles for boxes
export const borders = {
  light: 'single',
  heavy: 'double',
  rounded: 'round',
} as const;

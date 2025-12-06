/**
 * Task Adapter Factory
 *
 * Creates and initializes task adapters based on configuration.
 * Supports multiple backends with automatic fallback and error handling.
 */

import {
  TaskAdapter,
  TaskManagementConfig,
  TaskProvider,
  AdapterCreateResult,
  DEFAULT_TASK_MANAGEMENT_CONFIG,
} from './types.js';
import { VibeKanbanAdapter } from './vibe-kanban-adapter.js';

// ============================================================================
// Stub Adapters (Placeholders for Future Implementation)
// ============================================================================

/**
 * Stub adapter for backends that aren't implemented yet.
 * Returns appropriate errors when used.
 */
class StubAdapter implements TaskAdapter {
  readonly name: TaskProvider;

  constructor(name: TaskProvider) {
    this.name = name;
  }

  async initialize(): Promise<void> {
    // No-op
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getTask(): Promise<null> {
    console.warn(`${this.name} adapter not implemented`);
    return null;
  }

  async listTasks(): Promise<[]> {
    console.warn(`${this.name} adapter not implemented`);
    return [];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a task adapter based on configuration
 *
 * @param config - Task management configuration
 * @returns Result containing the adapter or an error
 */
export async function createTaskAdapter(
  config: TaskManagementConfig = DEFAULT_TASK_MANAGEMENT_CONFIG
): Promise<AdapterCreateResult> {
  try {
    const adapter = instantiateAdapter(config);

    // Initialize the adapter
    await adapter.initialize();

    // Check if it's available
    const available = await adapter.isAvailable();

    if (!available) {
      // Handle Vibe Kanban auto-install if configured
      if (config.provider === 'vibe-kanban' && config.autoInstall) {
        const installResult = await attemptVibeKanbanInstall();
        if (installResult.success) {
          // Retry after install
          await adapter.initialize();
          const nowAvailable = await adapter.isAvailable();
          if (nowAvailable) {
            return {
              adapter,
              autoInstallAttempted: true,
            };
          }
        }

        return {
          adapter: null,
          error: installResult.error || 'Vibe Kanban installation failed',
          autoInstallAttempted: true,
        };
      }

      return {
        adapter: null,
        error: `${config.provider} adapter is not available`,
      };
    }

    return { adapter };
  } catch (error) {
    return {
      adapter: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Instantiate an adapter based on provider type
 */
function instantiateAdapter(config: TaskManagementConfig): TaskAdapter {
  switch (config.provider) {
    case 'vibe-kanban':
      return new VibeKanbanAdapter(config);

    case 'jira':
      return new StubAdapter('jira');

    case 'linear':
      return new StubAdapter('linear');

    case 'beads':
      return new StubAdapter('beads');

    case 'github-issues':
      return new StubAdapter('github-issues');

    default:
      throw new Error(`Unknown task provider: ${config.provider}`);
  }
}

// ============================================================================
// Auto-Install Support
// ============================================================================

interface InstallResult {
  success: boolean;
  error?: string;
}

/**
 * Attempt to auto-install the Vibe Kanban MCP server
 *
 * This is a placeholder for future implementation.
 * The actual installation logic would:
 * 1. Check if the MCP server package is available
 * 2. Install it via npm/npx or download
 * 3. Start the server
 * 4. Wait for it to become available
 */
async function attemptVibeKanbanInstall(): Promise<InstallResult> {
  // TODO: Implement auto-install logic
  // For now, just return a helpful error message
  return {
    success: false,
    error:
      'Vibe Kanban MCP server is not running. ' +
      'Please start it manually or check the installation instructions.',
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a list of all supported task providers
 */
export function getSupportedProviders(): TaskProvider[] {
  return ['vibe-kanban', 'jira', 'linear', 'beads', 'github-issues'];
}

/**
 * Check if a provider is currently implemented (not a stub)
 */
export function isProviderImplemented(provider: TaskProvider): boolean {
  return provider === 'vibe-kanban';
}

/**
 * Get human-readable name for a provider
 */
export function getProviderDisplayName(provider: TaskProvider): string {
  const displayNames: Record<TaskProvider, string> = {
    'vibe-kanban': 'Vibe Kanban',
    jira: 'Jira',
    linear: 'Linear',
    beads: 'Beads (BD)',
    'github-issues': 'GitHub Issues',
  };

  return displayNames[provider] || provider;
}

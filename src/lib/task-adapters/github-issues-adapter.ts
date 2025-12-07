/**
 * GitHub Issues Task Adapter
 *
 * Integrates with GitHub Issues for task management.
 * Uses the `gh` CLI for API access, handling authentication automatically.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { KanbanTask } from '../types.js';
import { BaseTaskAdapter } from './base-adapter.js';
import {
  TaskProvider,
  TaskManagementConfig,
  ListTasksOptions,
  CreateTaskInput,
  UpdateTaskInput,
} from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Default label filter for GitHub Issues
 */
const DEFAULT_LABEL_FILTER = 'ralph';

/**
 * GitHub Issue response from gh CLI
 */
interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'OPEN' | 'CLOSED';
  author: {
    login: string;
  } | null;
  assignees: {
    nodes: Array<{ login: string }>;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * GitHub Issues Task Adapter
 *
 * Connects to GitHub Issues via the `gh` CLI.
 * Supports auto-detection of repository from git remote.
 */
export class GitHubIssuesAdapter extends BaseTaskAdapter {
  readonly name: TaskProvider = 'github-issues';

  private owner: string | null = null;
  private repo: string | null = null;
  private labelFilter: string | null;
  private ghAvailable: boolean = false;

  constructor(config: TaskManagementConfig) {
    super(config);

    // Parse owner/repo from config if provided
    if (config.providerConfig?.githubRepo) {
      const parts = config.providerConfig.githubRepo.split('/');
      if (parts.length === 2) {
        this.owner = parts[0];
        this.repo = parts[1];
      }
    }

    // Set up label filter: default to 'ralph', allow explicit null/empty to disable
    const labelConfig = config.providerConfig?.labelFilter;
    if (labelConfig === null || labelConfig === '') {
      this.labelFilter = null;
    } else if (labelConfig !== undefined) {
      this.labelFilter = labelConfig;
    } else {
      this.labelFilter = DEFAULT_LABEL_FILTER;
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle Methods
  // -------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if gh CLI is available
    this.ghAvailable = await this.checkGhCli();

    // Try to detect repo if not provided
    if (!this.owner || !this.repo) {
      const detected = await this.detectProject();
      if (detected) {
        const parts = detected.split('/');
        if (parts.length === 2) {
          this.owner = parts[0];
          this.repo = parts[1];
        }
      }
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.ghAvailable) {
      return false;
    }

    // Check if we have a valid repo
    if (!this.owner || !this.repo) {
      return false;
    }

    // Verify we can access the repo
    try {
      await this.runGhCommand([
        'repo',
        'view',
        `${this.owner}/${this.repo}`,
        '--json',
        'name',
      ]);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Core Read Operations
  // -------------------------------------------------------------------------

  async getTask(taskId: string): Promise<KanbanTask | null> {
    this.ensureInitialized();

    if (!this.owner || !this.repo) {
      return null;
    }

    try {
      // Remove '#' prefix if present
      const issueNumber = taskId.replace(/^#/, '');

      const result = await this.runGhCommand([
        'issue',
        'view',
        issueNumber,
        '--repo',
        `${this.owner}/${this.repo}`,
        '--json',
        'number,title,body,state,author,assignees,labels,createdAt,updatedAt,url',
      ]);

      const issue = JSON.parse(result) as GitHubIssue;
      return this.mapGitHubIssue(issue);
    } catch (error) {
      // Issue not found or other error
      if (error instanceof Error && error.message.includes('Could not resolve')) {
        return null;
      }
      console.error(`Failed to fetch issue ${taskId}:`, error);
      return null;
    }
  }

  async listTasks(options?: ListTasksOptions): Promise<KanbanTask[]> {
    this.ensureInitialized();

    if (!this.owner || !this.repo) {
      console.warn('No GitHub repository configured for listing issues');
      return [];
    }

    try {
      const args = [
        'issue',
        'list',
        '--repo',
        `${this.owner}/${this.repo}`,
        '--json',
        'number,title,body,state,author,assignees,labels,createdAt,updatedAt,url',
      ];

      // Apply status filter
      if (options?.status && options.status !== 'all') {
        const ghState = this.mapStatusToGitHub(options.status);
        args.push('--state', ghState);
      }

      // Apply label filter
      if (this.labelFilter) {
        args.push('--label', this.labelFilter);
      }

      // Apply limit
      if (options?.limit) {
        args.push('--limit', String(options.limit));
      } else {
        // Default limit to prevent fetching too many issues
        args.push('--limit', '50');
      }

      // Apply assignee filter
      if (options?.assignee) {
        args.push('--assignee', options.assignee);
      }

      const result = await this.runGhCommand(args);
      const issues = JSON.parse(result) as GitHubIssue[];

      return issues.map(issue => this.mapGitHubIssue(issue));
    } catch (error) {
      console.error('Failed to list issues:', error);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  async createTask(input: CreateTaskInput): Promise<KanbanTask> {
    this.ensureInitialized();

    if (!this.owner || !this.repo) {
      throw new Error('No GitHub repository configured for creating issues');
    }

    const args = [
      'issue',
      'create',
      '--repo',
      `${this.owner}/${this.repo}`,
      '--title',
      input.title,
    ];

    if (input.description) {
      args.push('--body', input.description);
    }

    // Add labels
    const labels: string[] = [];

    // Add type-based label
    if (input.type === 'bug') {
      labels.push('bug');
    } else if (input.type === 'feature') {
      labels.push('enhancement');
    }

    // Add priority label
    if (input.priority) {
      labels.push(`priority:${input.priority}`);
    }

    // Add custom labels
    if (input.labels) {
      labels.push(...input.labels);
    }

    // Add the label filter label so the issue appears in Ralph
    if (this.labelFilter && !labels.includes(this.labelFilter)) {
      labels.push(this.labelFilter);
    }

    if (labels.length > 0) {
      args.push('--label', labels.join(','));
    }

    if (input.assignee) {
      args.push('--assignee', input.assignee);
    }

    const result = await this.runGhCommand(args);

    // gh issue create returns the URL of the created issue
    // We need to parse the issue number from it
    const urlMatch = result.match(/\/issues\/(\d+)/);
    if (!urlMatch) {
      throw new Error('Failed to parse created issue URL');
    }

    const issueNumber = urlMatch[1];

    // Fetch the created issue to return it
    const task = await this.getTask(issueNumber);
    if (!task) {
      throw new Error('Failed to fetch created issue');
    }

    return task;
  }

  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<KanbanTask> {
    this.ensureInitialized();

    if (!this.owner || !this.repo) {
      throw new Error('No GitHub repository configured for updating issues');
    }

    const issueNumber = taskId.replace(/^#/, '');

    // Handle status updates separately (close/reopen)
    if (updates.status !== undefined) {
      if (updates.status === 'closed') {
        await this.runGhCommand([
          'issue',
          'close',
          issueNumber,
          '--repo',
          `${this.owner}/${this.repo}`,
        ]);
      } else if (updates.status === 'open') {
        await this.runGhCommand([
          'issue',
          'reopen',
          issueNumber,
          '--repo',
          `${this.owner}/${this.repo}`,
        ]);
      }
      // Note: 'in_progress' doesn't have a direct GitHub equivalent
      // Could add a label like 'in-progress' if needed
    }

    // Handle other updates
    const editArgs = [
      'issue',
      'edit',
      issueNumber,
      '--repo',
      `${this.owner}/${this.repo}`,
    ];

    let hasEdits = false;

    if (updates.title !== undefined) {
      editArgs.push('--title', updates.title);
      hasEdits = true;
    }

    if (updates.description !== undefined) {
      editArgs.push('--body', updates.description);
      hasEdits = true;
    }

    if (updates.assignee !== undefined) {
      if (updates.assignee) {
        editArgs.push('--add-assignee', updates.assignee);
      }
      hasEdits = true;
    }

    if (updates.labels !== undefined && updates.labels.length > 0) {
      editArgs.push('--add-label', updates.labels.join(','));
      hasEdits = true;
    }

    if (hasEdits) {
      await this.runGhCommand(editArgs);
    }

    // Fetch and return the updated issue
    const task = await this.getTask(issueNumber);
    if (!task) {
      throw new Error('Failed to fetch updated issue');
    }

    return task;
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  async detectProject(): Promise<string | null> {
    try {
      // Get the remote URL from git
      const { stdout } = await execFileAsync('git', [
        'remote',
        'get-url',
        'origin',
      ]);

      const remoteUrl = stdout.trim();

      // Parse GitHub repo from various URL formats
      // git@github.com:owner/repo.git
      // https://github.com/owner/repo.git
      // https://github.com/owner/repo

      const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
      if (sshMatch) {
        return `${sshMatch[1]}/${sshMatch[2]}`;
      }

      const httpsMatch = remoteUrl.match(
        /https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/
      );
      if (httpsMatch) {
        return `${httpsMatch[1]}/${httpsMatch[2]}`;
      }

      return null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Check if the gh CLI is available and authenticated
   */
  private async checkGhCli(): Promise<boolean> {
    try {
      await execFileAsync('gh', ['auth', 'status']);
      return true;
    } catch {
      // gh not installed or not authenticated
      return false;
    }
  }

  /**
   * Run a gh CLI command and return stdout
   */
  private async runGhCommand(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync('gh', args);
      return stdout.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`gh command failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Map GitHub issue to our KanbanTask type
   */
  private mapGitHubIssue(issue: GitHubIssue): KanbanTask {
    const labels = issue.labels.nodes.map(l => l.name);

    return this.normalizeTask({
      id: `#${issue.number}`,
      title: issue.title,
      description: issue.body || undefined,
      status: this.mapStatus(issue.state),
      type: this.inferTypeFromLabels(labels),
      priority: this.inferPriorityFromLabels(labels),
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      assignee: issue.assignees.nodes[0]?.login,
      labels,
    });
  }

  /**
   * Infer task type from GitHub labels
   */
  private inferTypeFromLabels(labels: string[]): 'task' | 'bug' | 'feature' {
    const lowerLabels = labels.map(l => l.toLowerCase());

    if (lowerLabels.some(l => l === 'bug' || l.includes('bug'))) {
      return 'bug';
    }

    if (
      lowerLabels.some(
        l =>
          l === 'feature' ||
          l === 'enhancement' ||
          l.includes('feature') ||
          l.includes('enhancement')
      )
    ) {
      return 'feature';
    }

    return 'task';
  }

  /**
   * Infer priority from GitHub labels
   */
  private inferPriorityFromLabels(
    labels: string[]
  ): 'high' | 'medium' | 'low' | undefined {
    const lowerLabels = labels.map(l => l.toLowerCase());

    for (const label of lowerLabels) {
      if (
        label.includes('critical') ||
        label.includes('urgent') ||
        label === 'priority:high' ||
        label === 'p0' ||
        label === 'p1'
      ) {
        return 'high';
      }

      if (
        label === 'priority:low' ||
        label.includes('low-priority') ||
        label === 'p3' ||
        label === 'p4'
      ) {
        return 'low';
      }

      if (label === 'priority:medium' || label === 'p2') {
        return 'medium';
      }
    }

    return undefined;
  }

  /**
   * Map our status type to GitHub issue state
   */
  private mapStatusToGitHub(status: string): 'open' | 'closed' | 'all' {
    switch (status) {
      case 'todo':
      case 'open':
        return 'open';
      case 'done':
      case 'closed':
        return 'closed';
      case 'inprogress':
      case 'in_progress':
        // GitHub doesn't have an 'in progress' state, so show open issues
        return 'open';
      default:
        return 'all';
    }
  }
}

/**
 * Test Helpers Index
 *
 * Centralized exports for all test helper utilities.
 */

// Component rendering helpers
export {
  renderComponent,
  renderAndWait,
  KeyCodes,
  sendKeys,
  render,
  type CustomRenderOptions,
  type CustomRenderResult,
  type WaitForOptions,
} from './render.js';

// Mock agent utilities
export {
  createMockAgent,
  createMockSpawn,
  CLAUDE_CODE_CAPABILITIES,
  GENERIC_AGENT_CAPABILITIES,
  type MockAgentOptions,
  type MockAgentCapabilities,
  type MockAgentProcess,
} from './mock-agent.js';

// Mock file system utilities
export {
  createMockFs,
  createMockStat,
  createMockWatcher,
  createMockReadStream,
  type MockFsConfig,
  type MockStatConfig,
} from './mock-fs.js';

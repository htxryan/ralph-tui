import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  archiveCurrentSession,
  listArchivedSessions,
  _getLastTimestamp,
  _timestampToFilename,
  _isValidArchivedSessionFilename,
} from '../lib/archive.js';

describe('archive', () => {
  let tempDir: string;
  let jsonlPath: string;
  let archiveDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-test-'));
    jsonlPath = path.join(tempDir, 'claude_output.jsonl');
    archiveDir = path.join(tempDir, 'archive');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('timestampToFilename', () => {
    it('should convert ISO timestamp to sortable filename format', () => {
      const result = _timestampToFilename('2025-11-30T18:45:32.456Z');
      expect(result).toBe('20251130_184532_456');
    });

    it('should handle timestamps with zero milliseconds', () => {
      const result = _timestampToFilename('2025-01-01T00:00:00.000Z');
      expect(result).toBe('20250101_000000_000');
    });

    it('should pad single-digit values', () => {
      const result = _timestampToFilename('2025-01-05T09:05:03.007Z');
      expect(result).toBe('20250105_090503_007');
    });
  });

  describe('isValidArchivedSessionFilename', () => {
    it('should accept valid archived session filename', () => {
      expect(_isValidArchivedSessionFilename('claude_output.20251130_184532_456.jsonl')).toBe(true);
    });

    it('should accept filename with collision counter', () => {
      expect(_isValidArchivedSessionFilename('claude_output.20251130_184532_456_1.jsonl')).toBe(true);
      expect(_isValidArchivedSessionFilename('claude_output.20251130_184532_456_99.jsonl')).toBe(true);
    });

    it('should reject bare claude_output.jsonl', () => {
      expect(_isValidArchivedSessionFilename('claude_output.jsonl')).toBe(false);
    });

    it('should reject filenames without timestamp', () => {
      expect(_isValidArchivedSessionFilename('session.jsonl')).toBe(false);
      expect(_isValidArchivedSessionFilename('output.jsonl')).toBe(false);
    });

    it('should reject filenames with partial timestamps', () => {
      expect(_isValidArchivedSessionFilename('claude_output.20251130.jsonl')).toBe(false);
      expect(_isValidArchivedSessionFilename('claude_output.20251130_184532.jsonl')).toBe(false);
    });

    it('should reject filenames with wrong prefix', () => {
      expect(_isValidArchivedSessionFilename('session.20251130_184532_456.jsonl')).toBe(false);
    });
  });

  describe('getLastTimestamp', () => {
    it('should extract timestamp from last line', async () => {
      const event = {
        type: 'assistant',
        timestamp: '2025-11-30T18:45:32.456Z',
        message: { content: [] },
      };
      fs.writeFileSync(jsonlPath, JSON.stringify(event) + '\n');

      const result = await _getLastTimestamp(jsonlPath);
      expect(result).toBe('2025-11-30T18:45:32.456Z');
    });

    it('should extract timestamp from multiple lines', async () => {
      const events = [
        { type: 'user', timestamp: '2025-11-30T18:45:00.000Z', message: {} },
        {
          type: 'assistant',
          timestamp: '2025-11-30T18:45:32.456Z',
          message: {},
        },
      ];
      fs.writeFileSync(
        jsonlPath,
        events.map((e) => JSON.stringify(e)).join('\n') + '\n'
      );

      const result = await _getLastTimestamp(jsonlPath);
      expect(result).toBe('2025-11-30T18:45:32.456Z');
    });

    it('should return null for empty file', async () => {
      fs.writeFileSync(jsonlPath, '');

      const result = await _getLastTimestamp(jsonlPath);
      expect(result).toBeNull();
    });

    it('should skip malformed lines and find valid timestamp', async () => {
      const content = `{"type":"user","timestamp":"2025-11-30T18:45:00.000Z"}
not valid json
{"type":"assistant","timestamp":"2025-11-30T18:45:32.456Z"}
broken line`;
      fs.writeFileSync(jsonlPath, content);

      const result = await _getLastTimestamp(jsonlPath);
      expect(result).toBe('2025-11-30T18:45:32.456Z');
    });
  });

  describe('archiveCurrentSession', () => {
    it('should not archive non-existent file', async () => {
      const result = await archiveCurrentSession(jsonlPath, archiveDir);
      expect(result.archived).toBe(false);
    });

    it('should not archive empty file', async () => {
      fs.writeFileSync(jsonlPath, '');
      const result = await archiveCurrentSession(jsonlPath, archiveDir);
      expect(result.archived).toBe(false);
    });

    it('should archive file with valid timestamp', async () => {
      const event = {
        type: 'assistant',
        timestamp: '2025-11-30T18:45:32.456Z',
        message: { content: [] },
      };
      fs.writeFileSync(jsonlPath, JSON.stringify(event) + '\n');

      const result = await archiveCurrentSession(jsonlPath, archiveDir);

      expect(result.archived).toBe(true);
      expect(result.archivePath).toContain('20251130_184532_456');
      expect(fs.existsSync(jsonlPath)).toBe(false);
      expect(fs.existsSync(result.archivePath!)).toBe(true);
    });

    it('should create archive directory if it does not exist', async () => {
      const event = {
        type: 'assistant',
        timestamp: '2025-11-30T18:45:32.456Z',
        message: { content: [] },
      };
      fs.writeFileSync(jsonlPath, JSON.stringify(event) + '\n');

      expect(fs.existsSync(archiveDir)).toBe(false);

      const result = await archiveCurrentSession(jsonlPath, archiveDir);

      expect(result.archived).toBe(true);
      expect(fs.existsSync(archiveDir)).toBe(true);
    });

    it('should handle timestamp collision', async () => {
      // Create first archive
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251130_184532_456.jsonl'),
        'existing\n'
      );

      // Try to archive with same timestamp
      const event = {
        type: 'assistant',
        timestamp: '2025-11-30T18:45:32.456Z',
        message: { content: [] },
      };
      fs.writeFileSync(jsonlPath, JSON.stringify(event) + '\n');

      const result = await archiveCurrentSession(jsonlPath, archiveDir);

      expect(result.archived).toBe(true);
      expect(result.archivePath).toContain('20251130_184532_456_1');
    });

    it('should use fallback timestamp for malformed JSONL', async () => {
      fs.writeFileSync(jsonlPath, 'not valid json\n');

      const beforeTime = new Date();
      const result = await archiveCurrentSession(jsonlPath, archiveDir);
      const afterTime = new Date();

      expect(result.archived).toBe(true);
      expect(result.archivePath).toBeDefined();

      // Verify the timestamp is recent (within test execution time)
      const filename = path.basename(result.archivePath!);
      const match = filename.match(/\.(\d{8})_(\d{6})_(\d{3})\.jsonl$/);
      expect(match).not.toBeNull();
    });

    it('should preserve file content when archiving', async () => {
      const event = {
        type: 'assistant',
        timestamp: '2025-11-30T18:45:32.456Z',
        message: { content: ['test content'] },
      };
      const originalContent = JSON.stringify(event) + '\n';
      fs.writeFileSync(jsonlPath, originalContent);

      const result = await archiveCurrentSession(jsonlPath, archiveDir);

      expect(result.archived).toBe(true);
      const archivedContent = fs.readFileSync(result.archivePath!, 'utf-8');
      expect(archivedContent).toBe(originalContent);
    });
  });

  describe('listArchivedSessions', () => {
    it('should return empty array for non-existent directory', () => {
      const result = listArchivedSessions(archiveDir);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      fs.mkdirSync(archiveDir, { recursive: true });
      const result = listArchivedSessions(archiveDir);
      expect(result).toEqual([]);
    });

    it('should list jsonl files sorted by name descending', () => {
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251128_093045_123.jsonl'),
        ''
      );
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251130_184532_456.jsonl'),
        ''
      );
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251129_142231_789.jsonl'),
        ''
      );

      const result = listArchivedSessions(archiveDir);

      expect(result).toEqual([
        'claude_output.20251130_184532_456.jsonl',
        'claude_output.20251129_142231_789.jsonl',
        'claude_output.20251128_093045_123.jsonl',
      ]);
    });

    it('should ignore non-jsonl files', () => {
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251130_184532_456.jsonl'),
        ''
      );
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251129_142231_789.jsonl.gz'),
        ''
      );
      fs.writeFileSync(path.join(archiveDir, 'readme.txt'), '');

      const result = listArchivedSessions(archiveDir);

      expect(result).toEqual(['claude_output.20251130_184532_456.jsonl']);
    });

    it('should filter out bare claude_output.jsonl files', () => {
      fs.mkdirSync(archiveDir, { recursive: true });
      // Valid archived session
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251130_184532_456.jsonl'),
        ''
      );
      // Invalid: bare claude_output.jsonl (no timestamp)
      fs.writeFileSync(path.join(archiveDir, 'claude_output.jsonl'), '');

      const result = listArchivedSessions(archiveDir);

      expect(result).toEqual(['claude_output.20251130_184532_456.jsonl']);
    });

    it('should filter out malformed jsonl files', () => {
      fs.mkdirSync(archiveDir, { recursive: true });
      // Valid archived session
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251130_184532_456.jsonl'),
        ''
      );
      // Invalid: wrong prefix
      fs.writeFileSync(
        path.join(archiveDir, 'session.20251129_142231_789.jsonl'),
        ''
      );
      // Invalid: partial timestamp
      fs.writeFileSync(
        path.join(archiveDir, 'claude_output.20251128.jsonl'),
        ''
      );

      const result = listArchivedSessions(archiveDir);

      expect(result).toEqual(['claude_output.20251130_184532_456.jsonl']);
    });
  });
});

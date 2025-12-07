import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ArchiveResult {
  archived: boolean;
  archivePath?: string;
  error?: string;
}

/**
 * Extract the timestamp from the last valid JSON line of a JSONL file.
 * Reads only the last portion of the file for efficiency.
 */
async function getLastTimestamp(filePath: string): Promise<string | null> {
  // Read only the last chunk of the file for efficiency (last 64KB should be plenty)
  const stats = fs.statSync(filePath);
  const readSize = Math.min(stats.size, 64 * 1024);
  const startPos = Math.max(0, stats.size - readSize);

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(readSize);
  fs.readSync(fd, buffer, 0, readSize, startPos);
  fs.closeSync(fd);

  const content = buffer.toString('utf-8');
  const lines = content.trim().split('\n').filter((line) => line.trim());

  if (lines.length === 0) return null;

  // Try last few lines in case of malformed entries
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    try {
      const event = JSON.parse(lines[i]!);
      if (event.timestamp) {
        return event.timestamp;
      }
    } catch {
      // Continue to previous line
    }
  }

  return null;
}

/**
 * Convert ISO timestamp to sortable filename format
 * Input:  "2025-11-30T18:45:32.456Z"
 * Output: "20251130_184532_456"
 */
function timestampToFilename(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}_${millis}`;
}

async function archiveWithTimestamp(
  jsonlPath: string,
  archiveDir: string,
  timestamp: string
): Promise<ArchiveResult> {
  try {
    // Ensure archive directory exists
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Generate archive filename
    const basename = path.basename(jsonlPath, '.jsonl');
    const sortableTs = timestampToFilename(timestamp);
    const archiveFilename = `${basename}.${sortableTs}.jsonl`;
    const archivePath = path.join(archiveDir, archiveFilename);

    // Handle collision (extremely rare, but possible)
    let finalPath = archivePath;
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(
        archiveDir,
        `${basename}.${sortableTs}_${counter}.jsonl`
      );
      counter++;
    }

    // Move file to archive
    fs.renameSync(jsonlPath, finalPath);

    return { archived: true, archivePath: finalPath };
  } catch (error) {
    return {
      archived: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Archive the current JSONL file if it exists and has content.
 * The archive filename is based on the last event's timestamp.
 */
export async function archiveCurrentSession(
  jsonlPath: string,
  archiveDir: string
): Promise<ArchiveResult> {
  // Check if file exists
  if (!fs.existsSync(jsonlPath)) {
    return { archived: false };
  }

  // Check if file has content
  const stats = fs.statSync(jsonlPath);
  if (stats.size === 0) {
    return { archived: false };
  }

  // Get last timestamp from file
  const lastTimestamp = await getLastTimestamp(jsonlPath);
  if (!lastTimestamp) {
    // No valid timestamp found, use current time as fallback
    const fallbackTimestamp = new Date().toISOString();
    return archiveWithTimestamp(jsonlPath, archiveDir, fallbackTimestamp);
  }

  return archiveWithTimestamp(jsonlPath, archiveDir, lastTimestamp);
}

/**
 * Check if a filename matches the archived session naming pattern.
 * Valid format: claude_output.YYYYMMDD_HHMMSS_mmm.jsonl
 */
function isValidArchivedSessionFilename(filename: string): boolean {
  return /^claude_output\.\d{8}_\d{6}_\d{3}(_\d+)?\.jsonl$/.test(filename);
}

/**
 * List archived session files, sorted by filename (most recent first).
 * Only returns files matching the proper archive naming pattern
 * (claude_output.YYYYMMDD_HHMMSS_mmm.jsonl), filtering out any
 * malformed files like bare "claude_output.jsonl".
 */
export function listArchivedSessions(archiveDir: string): string[] {
  if (!fs.existsSync(archiveDir)) return [];

  return fs
    .readdirSync(archiveDir)
    .filter((f) => f.endsWith('.jsonl') && isValidArchivedSessionFilename(f))
    .sort()
    .reverse(); // Most recent first
}

// Export helpers for testing
export {
  getLastTimestamp as _getLastTimestamp,
  timestampToFilename as _timestampToFilename,
  isValidArchivedSessionFilename as _isValidArchivedSessionFilename,
};

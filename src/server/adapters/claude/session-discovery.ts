import fs from 'node:fs';
import path from 'node:path';
import { getClaudeProjectsDir } from '../../../shared/paths.js';
import type { DateRange } from '../../../shared/types.js';
import { getFirstLastTimestamp } from './jsonl-parser.js';
import { logger } from '../../logger.js';

/**
 * Discovers all Claude Code session JSONL files that contain events for the target date.
 * Uses 3-layer strategy:
 *   Layer 1: mtime pre-filter (exclude files last written before target date)
 *   Layer 2: first/last timestamp overlap check
 *   Layer 3: streaming precise filter (handled during parse, not here)
 *
 * Also discovers subagent files within session directories.
 */
export async function discoverSessionFiles(
  range: DateRange,
  customDir?: string,
): Promise<string[]> {
  const baseDir = customDir ?? getClaudeProjectsDir();

  if (!fs.existsSync(baseDir)) {
    logger.info({ dir: baseDir }, 'Claude projects directory not found');
    return [];
  }

  // Collect all .jsonl files (including subagent files)
  const allFiles = collectJsonlFiles(baseDir);
  logger.info({ count: allFiles.length, dir: baseDir }, 'Found JSONL files');

  // Layer 1: mtime pre-filter
  const startMs = range.start.getTime();
  const candidates = allFiles.filter((filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return stat.mtimeMs >= startMs;
    } catch {
      return false;
    }
  });
  logger.debug({ original: allFiles.length, afterMtime: candidates.length }, 'mtime filter applied');

  // Layer 2: first/last timestamp overlap check
  const matching: string[] = [];
  for (const filePath of candidates) {
    const timestamps = await getFirstLastTimestamp(filePath);
    if (!timestamps) continue;

    if (rangesOverlap(timestamps, range)) {
      matching.push(filePath);
    }
  }

  logger.info({ count: matching.length }, 'Sessions matching target date');
  return matching;
}

/**
 * Recursively collects all .jsonl files from the projects directory.
 * Handles: project-slug/session-uuid.jsonl and project-slug/session-uuid/subagents/agent-id.jsonl
 */
function collectJsonlFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectJsonlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    logger.warn({ dir, err }, 'Error reading directory');
  }

  return files;
}

/**
 * Checks if a file's timestamp range overlaps with the target date range.
 */
function rangesOverlap(
  file: { first: Date; last: Date },
  target: DateRange,
): boolean {
  return file.first <= target.end && file.last >= target.start;
}

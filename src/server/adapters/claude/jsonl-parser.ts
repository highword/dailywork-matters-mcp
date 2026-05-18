import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { logger } from '../../logger.js';

/**
 * Known JSONL entry types in Claude Code session files.
 */
export interface JSONLEntry {
  type: string;
  uuid?: string;
  parentUuid?: string | null;
  timestamp?: string;
  sessionId?: string;
  message?: {
    role: string;
    content: unknown;
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  isMeta?: boolean;
  isSidechain?: boolean;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  toolUseResult?: unknown;
  subtype?: string;
  content?: string;
}

/**
 * Stream-parses a JSONL file line by line. Constant memory usage regardless of file size.
 * Corrupted/incomplete lines are skipped with a warning logged to stderr.
 */
export async function* streamParseJSONL(filePath: string): AsyncGenerator<JSONLEntry> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const entry = JSON.parse(trimmed) as JSONLEntry;
      yield entry;
    } catch {
      logger.warn({ file: filePath, line: lineNum }, 'Skipping malformed JSONL line');
    }
  }
}

/**
 * Reads first and last timestamps from a JSONL file for session discovery Layer 2.
 * Returns null if no timestamps found.
 */
export async function getFirstLastTimestamp(
  filePath: string,
): Promise<{ first: Date; last: Date } | null> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let first: Date | null = null;
  let last: Date | null = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed) as JSONLEntry;
      if (entry.timestamp) {
        const ts = new Date(entry.timestamp);
        if (!Number.isNaN(ts.getTime())) {
          if (!first) first = ts;
          last = ts;
        }
      }
    } catch {
      continue;
    }
  }

  return first && last ? { first, last } : null;
}

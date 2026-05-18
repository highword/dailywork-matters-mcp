import type { DataSourceAdapter, DateRange, NormalizedEvent } from '../../../shared/types.js';
import { getClaudeProjectsDir } from '../../../shared/paths.js';
import { discoverSessionFiles } from './session-discovery.js';
import { streamParseJSONL, type JSONLEntry } from './jsonl-parser.js';
import { logger } from '../../logger.js';
import fs from 'node:fs';
import path from 'node:path';

export class ClaudeAdapter implements DataSourceAdapter {
  readonly name = 'claude';
  private customDir?: string;

  constructor(customDir?: string) {
    this.customDir = customDir;
  }

  async isAvailable(): Promise<boolean> {
    const dir = this.customDir ?? getClaudeProjectsDir();
    return fs.existsSync(dir);
  }

  async *getEvents(range: DateRange): AsyncGenerator<NormalizedEvent> {
    const files = await discoverSessionFiles(range, this.customDir);

    for (const filePath of files) {
      for await (const entry of streamParseJSONL(filePath)) {
        // Layer 3: precise timestamp filter
        if (!entry.timestamp) continue;
        const ts = new Date(entry.timestamp);
        if (ts < range.start || ts > range.end) continue;

        // Skip sidechains and meta-only entries for summary purposes
        if (entry.isSidechain) continue;

        const event = mapEntryToEvent(entry, filePath);
        if (event) yield event;
      }
    }
  }
}

function mapEntryToEvent(entry: JSONLEntry, filePath: string): NormalizedEvent | null {
  const sessionId = entry.sessionId ?? extractSessionId(filePath);
  const timestamp = entry.timestamp ?? new Date().toISOString();
  const project = extractProjectFromPath(filePath);

  switch (entry.type) {
    case 'user': {
      if (entry.isMeta) return null; // skip system-injected meta messages
      const content = extractTextContent(entry.message?.content);
      if (!content) return null;
      return {
        timestamp,
        type: 'prompt',
        source: 'claude',
        project,
        sessionId,
        parentId: entry.parentUuid ?? null,
        content,
        outcome: null,
        files: [],
        duration: null,
        tokens: null,
        tags: [],
        confidence: null,
        metadata: { cwd: entry.cwd, version: entry.version, gitBranch: entry.gitBranch },
      };
    }

    case 'assistant': {
      const msg = entry.message;
      if (!msg) return null;
      const textParts = Array.isArray(msg.content)
        ? (msg.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === 'text')
            .map((c) => c.text ?? '')
            .join('\n')
        : '';
      const toolUses = Array.isArray(msg.content)
        ? (msg.content as Array<{ type: string; name?: string; input?: Record<string, unknown> }>).filter(
            (c) => c.type === 'tool_use',
          )
        : [];

      const tokens = msg.usage
        ? {
            input: msg.usage.input_tokens ?? 0,
            output: msg.usage.output_tokens ?? 0,
            cache: (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0),
          }
        : null;

      // If this is a tool_use response, emit each tool call as a separate event
      if (toolUses.length > 0) {
        // Return the first tool call as the primary event
        const tool = toolUses[0] as { name: string; input: Record<string, unknown> };
        const files = extractFilesFromToolUse(tool);
        return {
          timestamp,
          type: 'tool_call',
          source: 'claude',
          project,
          sessionId,
          parentId: entry.parentUuid ?? null,
          content: `${tool.name}(${summarizeToolInput(tool)})`,
          outcome: null,
          files,
          duration: null,
          tokens,
          tags: [tool.name],
          confidence: null,
          metadata: { model: msg.model, toolCount: toolUses.length },
        };
      }

      // Text-only assistant response
      if (!textParts) return null;
      return {
        timestamp,
        type: 'response',
        source: 'claude',
        project,
        sessionId,
        parentId: entry.parentUuid ?? null,
        content: textParts.slice(0, 500), // truncate long responses for storage
        outcome: null,
        files: [],
        duration: null,
        tokens,
        tags: [],
        confidence: null,
        metadata: { model: msg.model },
      };
    }

    default:
      return null; // Skip file-history-snapshot, permission-mode, attachment, last-prompt, system
  }
}

function extractSessionId(filePath: string): string {
  const basename = path.basename(filePath, '.jsonl');
  // Subagent files: agent-<id>.jsonl -> use parent dir name
  if (basename.startsWith('agent-')) {
    const parts = filePath.split(path.sep);
    // .../<session-uuid>/subagents/agent-<id>.jsonl
    const sessionIdx = parts.findIndex((p) => p === 'subagents') - 1;
    if (sessionIdx >= 0) return parts[sessionIdx];
  }
  return basename;
}

function extractProjectFromPath(filePath: string): string {
  // Path: ~/.claude/projects/<project-slug>/<session>.jsonl
  const parts = filePath.split(path.sep);
  const projectsIdx = parts.findIndex((p) => p === 'projects');
  if (projectsIdx >= 0 && projectsIdx + 1 < parts.length) {
    return parts[projectsIdx + 1];
  }
  return 'unknown';
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as Array<{ type: string; content?: string; text?: string }>)
      .filter((c) => c.type === 'tool_result' || c.type === 'text')
      .map((c) => (typeof c.content === 'string' ? c.content : c.text ?? ''))
      .join('\n')
      .slice(0, 1000);
  }
  return '';
}

function extractFilesFromToolUse(tool: { name: string; input: Record<string, unknown> }): string[] {
  const input = tool.input ?? {};
  if ('file_path' in input && typeof input.file_path === 'string') return [input.file_path];
  if ('path' in input && typeof input.path === 'string') return [input.path];
  return [];
}

function summarizeToolInput(tool: { name: string; input: Record<string, unknown> }): string {
  const input = tool.input ?? {};
  if ('file_path' in input) return String(input.file_path);
  if ('path' in input) return String(input.path);
  if ('command' in input) return String(input.command).slice(0, 80);
  if ('query' in input) return String(input.query).slice(0, 80);
  return Object.keys(input).join(', ');
}

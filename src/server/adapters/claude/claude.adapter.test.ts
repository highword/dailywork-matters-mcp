import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ClaudeAdapter } from './claude.adapter.js';
import { createDateRange } from '../../../shared/paths.js';

const TEST_DIR = path.join(os.tmpdir(), 'claude-adapter-test-' + Date.now());
const PROJECT_DIR = path.join(TEST_DIR, 'C--test-project');

const SAMPLE_ENTRIES = [
  JSON.stringify({ type: 'permission-mode', permissionMode: 'default', sessionId: 'test-session-001' }),
  JSON.stringify({ type: 'user', uuid: 'u1', parentUuid: null, timestamp: '2026-05-19T10:00:00.000Z', sessionId: 'test-session-001', message: { role: 'user', content: 'Fix the login bug' }, isMeta: false, isSidechain: false, cwd: '/test', version: '2.1.0' }),
  JSON.stringify({ type: 'assistant', uuid: 'a1', parentUuid: 'u1', timestamp: '2026-05-19T10:00:05.000Z', sessionId: 'test-session-001', message: { role: 'assistant', model: 'claude-sonnet-4-6', content: [{ type: 'text', text: 'I will fix the login bug.' }], usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 200 } }, isSidechain: false }),
  JSON.stringify({ type: 'assistant', uuid: 'a2', parentUuid: 'a1', timestamp: '2026-05-19T10:00:10.000Z', sessionId: 'test-session-001', message: { role: 'assistant', model: 'claude-sonnet-4-6', content: [{ type: 'tool_use', id: 'tu1', name: 'Edit', input: { file_path: '/src/auth.ts', old_string: 'bug', new_string: 'fix' } }], usage: { input_tokens: 150, output_tokens: 80, cache_read_input_tokens: 500, cache_creation_input_tokens: 0 } }, isSidechain: false }),
];

describe('ClaudeAdapter', () => {
  beforeEach(() => {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
    const sessionFile = path.join(PROJECT_DIR, 'test-session-001.jsonl');
    fs.writeFileSync(sessionFile, SAMPLE_ENTRIES.join('\n') + '\n');
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('isAvailable returns true when directory exists', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('isAvailable returns false for non-existent directory', async () => {
    const adapter = new ClaudeAdapter('/nonexistent/path');
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('getEvents yields NormalizedEvents for matching date', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    const range = createDateRange('2026-05-19');
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].source).toBe('claude');
    expect(events[0].sessionId).toBe('test-session-001');
  });

  it('maps user prompts to type "prompt"', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    const range = createDateRange('2026-05-19');
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    const prompt = events.find((e) => e.type === 'prompt');
    expect(prompt).toBeDefined();
    expect(prompt.content).toContain('Fix the login bug');
  });

  it('maps tool_use to type "tool_call" with file path', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    const range = createDateRange('2026-05-19');
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    const toolCall = events.find((e) => e.type === 'tool_call');
    expect(toolCall).toBeDefined();
    expect(toolCall.files).toContain('/src/auth.ts');
    expect(toolCall.tags).toContain('Edit');
  });

  it('includes token usage from assistant messages', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    const range = createDateRange('2026-05-19');
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    const withTokens = events.find((e) => e.tokens !== null);
    expect(withTokens).toBeDefined();
    expect(withTokens.tokens.input).toBeGreaterThan(0);
  });

  it('skips events outside target date range', async () => {
    const adapter = new ClaudeAdapter(TEST_DIR);
    const range = createDateRange('2026-05-20'); // different day
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    expect(events).toHaveLength(0);
  });

  it('handles corrupted JSONL gracefully', async () => {
    // Use isolated directory to avoid picking up events from other session files
    const isolatedDir = path.join(os.tmpdir(), 'claude-corrupt-test-' + Date.now());
    const isolatedProject = path.join(isolatedDir, 'C--corrupt-project');
    fs.mkdirSync(isolatedProject, { recursive: true });

    const corruptFile = path.join(isolatedProject, 'corrupt-session.jsonl');
    const content = [
      '{"type":"user","uuid":"x","timestamp":"2026-05-19T12:00:00.000Z","sessionId":"s","message":{"role":"user","content":"valid"},"isMeta":false,"isSidechain":false}',
      'not valid json at all{{{',
      '{"type":"user","uuid":"y","timestamp":"2026-05-19T12:01:00.000Z","sessionId":"s","message":{"role":"user","content":"also valid"},"isMeta":false,"isSidechain":false}',
    ].join('\n');
    fs.writeFileSync(corruptFile, content);

    const adapter = new ClaudeAdapter(isolatedDir);
    const range = createDateRange('2026-05-19');
    const events: any[] = [];
    for await (const event of adapter.getEvents(range)) {
      events.push(event);
    }
    // Should get both valid entries, skip the corrupt one
    expect(events.length).toBe(2);

    fs.rmSync(isolatedDir, { recursive: true, force: true });
  });
});

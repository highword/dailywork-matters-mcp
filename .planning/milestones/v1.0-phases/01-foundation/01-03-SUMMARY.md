---
phase: 01-foundation
plan: 03
subsystem: data-ingestion
tags: [claude-adapter, jsonl-parser, session-discovery, streaming, adapter-pattern]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [ClaudeAdapter, AdapterRegistry, streamParseJSONL, discoverSessionFiles]
  affects: [02-01, 01-04]
tech_stack:
  added: []
  patterns: [async-generator, streaming-readline, adapter-pattern, 3-layer-discovery]
key_files:
  created:
    - src/server/adapters/registry.ts
    - src/server/adapters/claude/jsonl-parser.ts
    - src/server/adapters/claude/session-discovery.ts
    - src/server/adapters/claude/claude.adapter.ts
    - src/server/adapters/claude/claude.adapter.test.ts
  modified: []
decisions:
  - "Isolated corrupt-JSONL test to separate temp directory to avoid cross-test contamination"
metrics:
  duration: 216s
  completed: 2026-05-19T01:57:55Z
  tasks_completed: 4
  tasks_total: 4
  tests_added: 8
  files_created: 5
---

# Phase 1 Plan 3: Claude Code Session Adapter Summary

Streaming JSONL parser + 3-layer session discovery + adapter registry yielding NormalizedEvents via AsyncGenerator

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create adapter registry | 3c9055a | src/server/adapters/registry.ts |
| 2 | Streaming JSONL parser with error resilience | ec34c0f | src/server/adapters/claude/jsonl-parser.ts |
| 3 | 3-layer session discovery | fe27b12 | src/server/adapters/claude/session-discovery.ts |
| 4 | ClaudeAdapter with NormalizedEvent mapping + tests | ad108b6 | src/server/adapters/claude/claude.adapter.ts, claude.adapter.test.ts |

## Implementation Details

### Adapter Registry (Task 1)
- `AdapterRegistry` class manages pluggable data source adapters
- `gatherEvents()` uses async generator to stream events from all available adapters
- Individual adapter failures are caught and logged without stopping the pipeline

### Streaming JSONL Parser (Task 2)
- `streamParseJSONL` async generator reads line-by-line using Node.js readline
- `crlfDelay: Infinity` handles Windows CRLF line endings
- Corrupted/malformed lines are skipped with `logger.warn`, never thrown
- `getFirstLastTimestamp` reads timestamps for Layer 2 discovery overlap check
- Constant memory usage regardless of file size

### 3-Layer Session Discovery (Task 3)
- Layer 1: `stat.mtimeMs >= startMs` pre-filter eliminates stale files without reading content
- Layer 2: First/last timestamp overlap check via `rangesOverlap` helper
- Layer 3: Precise per-event filter applied during streaming parse (in adapter)
- Recursive `collectJsonlFiles` discovers subagent files under session directories

### Claude Adapter (Task 4)
- Implements `DataSourceAdapter` interface with `async *getEvents()` AsyncGenerator
- Maps JSONL `user` entries to `prompt` type, `assistant` text to `response`, `tool_use` to `tool_call`
- Extracts token usage (input, output, cache) from assistant message usage field
- Extracts file paths from tool_use inputs (file_path, path keys)
- Content truncation: 500 chars for responses, 1000 chars for prompts
- Session ID extraction handles both flat files and subagent paths
- Project slug extraction from filesystem path structure

## Test Results

8 tests passing:
1. isAvailable returns true when directory exists
2. isAvailable returns false for non-existent directory
3. getEvents yields NormalizedEvents for matching date
4. maps user prompts to type "prompt"
5. maps tool_use to type "tool_call" with file path
6. includes token usage from assistant messages
7. skips events outside target date range
8. handles corrupted JSONL gracefully

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed corrupt JSONL test isolation**
- **Found during:** Task 4 verification
- **Issue:** Test expected 2 events from corrupt file but got 5 because both session files (test-session-001.jsonl + corrupt-session.jsonl) were discovered in the shared TEST_DIR
- **Fix:** Used isolated temp directory for the corrupt JSONL test case
- **Files modified:** src/server/adapters/claude/claude.adapter.test.ts
- **Commit:** ad108b6

## Known Stubs

None — all adapter methods are fully wired with real implementations.

## Self-Check: PASSED

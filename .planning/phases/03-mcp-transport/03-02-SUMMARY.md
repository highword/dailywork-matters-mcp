---
phase: 3
plan: "03-02"
title: "MCP Tool Registration (6 tools)"
subsystem: mcp-tools
tags: [mcp, tools, zod, concurrency, persistence]
dependency_graph:
  requires: [03-01, 02-01, 02-02, 02-03]
  provides: [mcp-tools-layer, generate-daily-summary, save-summary, batch-summary, tool-index]
  affects: [03-03, 04-01]
tech_stack:
  added: ["zod@4.4.3 (tool input schemas)", "registerTool API (MCP SDK v1.29)"]
  patterns: [inline-promise-pool, version-append-db-tracking, zero-config-two-step]
key_files:
  created:
    - src/server/mcp/tools/generate-daily-summary.ts
    - src/server/mcp/tools/save-summary.ts
    - src/server/mcp/tools/list-today-sessions.ts
    - src/server/mcp/tools/configure-settings.ts
    - src/server/mcp/tools/get-summary-by-date.ts
    - src/server/mcp/tools/generate-batch-summary.ts
    - src/server/mcp/tools/index.ts
  modified:
    - src/server/main.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Used inline Promise-pool pattern for batch concurrency (no p-limit dependency)"
  - "Zod added as devDependency since it's a peer of MCP SDK, needed for tool input schemas"
  - "API key masked to first 8 + last 4 chars in configure_settings get response"
  - "Batch in zero-config mode skips (cannot auto-generate without API key)"
metrics:
  duration: "4m 54s"
  completed: "2026-05-20T09:25:49Z"
  tasks: 4
  files_changed: 10
---

# Phase 3 Plan 02: MCP Tool Registration (6 tools) Summary

Six MCP tools registered via registerTool API with Zod input validation, covering daily summary generation (API + zero-config modes), batch processing with inline concurrency pool (max 3), configuration management, and summary retrieval with DB-first fallback.

## Tasks Completed

| Task | Title | Commit | Key Changes |
|------|-------|--------|-------------|
| 1 | Implement generate_daily_summary and save_summary tools | 3f08b63 | Two core tools: generation (auto mode detection) and persistence (zero-config D-02) |
| 2 | Implement list_today_sessions, configure_settings, get_summary_by_date | 792e014 | Session discovery, config CRUD with key masking, DB-first summary retrieval |
| 3 | Implement generate_batch_summary with concurrency control | 61a48be | Date range processing, inline Promise-pool (max 3), skip/regenerate logic |
| 4 | Create tool index and wire into main.ts | 90874aa | registerAllTools orchestrator, adapter registration in main entry |

## Implementation Details

### Tool 1: generate_daily_summary
- Optional `date` parameter (defaults to today)
- Detects API vs zero-config mode via `generateSummary()` result
- API mode: saves file (version append), stores in DB with version tracking, returns `{ summary, file, version }`
- Zero-config mode: returns `ZeroConfigResponse` JSON directly (no file save)

### Tool 2: save_summary
- Required `date` + `markdown` parameters
- Enables the zero-config two-step pattern (D-02)
- Saves via `saveSummaryFile()` (version append) and stores in DB with `mode='zero-config'`

### Tool 3: list_today_sessions
- Zero-arg tool (no input schema)
- Gathers today's events via registry, groups by source:sessionId
- Returns session counts, event counts, session details, and repo details

### Tool 4: configure_settings
- `action: 'get' | 'set'` with optional `key`/`value`
- Get: returns full config with API key masked (security)
- Set: validates key existence, supports nested `ai.*` keys, type coercion for numbers/booleans

### Tool 5: get_summary_by_date
- Required `date` parameter
- Queries DB first (latest version by `created_at DESC`), falls back to disk file
- Returns structured JSON (DB) or raw markdown (disk)

### Tool 6: generate_batch_summary
- Required `startDate` + `endDate` (inclusive range)
- Inline Promise-pool limits to 3 concurrent date processors
- Skips dates with zero events (D-12 compliance)
- Regenerates existing summaries (version append per D-04)
- Returns `{ processed, skipped, failed, total, results }`

### Main Entry Wiring
- Creates `AdapterRegistry` with `ClaudeAdapter` + `GitAdapter` registered
- Calls `registerAllTools(mcpServer, config, registry)` after MCP server creation
- All tools receive shared config and registry instances

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added zod as explicit dev dependency**
- **Found during:** Task 1
- **Issue:** zod was only available as a transitive dependency of MCP SDK, not directly importable
- **Fix:** Added `zod@^4.4.3` to devDependencies via `pnpm add -D zod`
- **Files modified:** package.json, pnpm-lock.yaml
- **Commit:** 90874aa (included in Task 4 commit)

## Verification

- `pnpm exec tsc --noEmit` passes with zero errors across all 4 commits
- No `console.log` in any tool implementation (all logging via `logger.*` to stderr)
- All 6 tools use `registerTool` API with Zod input schemas
- All tools return `isError: true` on validation/runtime failures

## Known Stubs

None. All tools are fully implemented with real logic calling into intelligence and persistence layers.

## Self-Check: PASSED

- All 7 created files exist on disk
- All 4 task commits verified in git history (3f08b63, 792e014, 61a48be, 90874aa)
- TypeScript compilation clean (`pnpm exec tsc --noEmit` = 0 errors)

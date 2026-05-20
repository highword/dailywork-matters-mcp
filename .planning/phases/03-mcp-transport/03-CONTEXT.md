# Phase 3: MCP Transport + Persistence — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers interact with the system via 6 MCP tools over stdio transport, summaries persist as versioned Markdown files on disk, and an HTTP server runs concurrently on port 37888 for Phase 4 readiness. The MCP server also exposes resources (stored summaries) and prompts (guided summary generation).

</domain>

<decisions>
## Implementation Decisions

### Tool Design (6 tools total)
- **D-01:** `generate_daily_summary` returns JSON object containing `{ summary: DailySummary, file: string }` — the full structured summary plus the path where the Markdown file was saved. In zero-config mode, returns compressed event data instead of DailySummary.
- **D-02:** Zero-config mode uses a **two-step interaction pattern**: Step 1: `generate_daily_summary` returns compressed event JSON for host AI to synthesize. Step 2: host AI calls `save_summary(date, markdown)` to persist the result. This requires a 6th tool: `save_summary`.
- **D-03:** Full tool list (6 tools):
  1. `generate_daily_summary` — Generate summary for a date (default: today)
  2. `list_today_sessions` — List active sessions/repos for today
  3. `configure_settings` — View/update configuration
  4. `get_summary_by_date` — Retrieve stored summary for a specific date
  5. `generate_batch_summary` — Generate summaries for a date range
  6. `save_summary` — Save externally-generated summary content (for zero-config mode)

### Persistence Strategy
- **D-04:** **Version append mode** — regenerating a summary for the same date renames the existing file to `YYYY-MM-DD.v{N}.md` and writes the new one as `YYYY-MM-DD.md`. DB retains all versions with timestamps.
- **D-05:** File path convention: `~/dailywork-matters/summaries/YYYY-MM-DD.md` (latest), `~/dailywork-matters/summaries/YYYY-MM-DD.v1.md` (first version), etc.
- **D-06:** DB `summaries` table uses existing schema + new version tracking. Each row is a version; `date` column is not unique — query latest by `MAX(created_at) WHERE date = ?`.

### MCP Server Startup
- **D-07:** **Single process, dual transport from start** — stdio MCP transport + HTTP server (port 37888) both initialize on startup. Phase 4 adds frontend routes to the existing HTTP server.
- **D-08:** All logging to stderr exclusively. stdout is reserved for MCP stdio protocol. Pino logger already configured with `transport: { target: 'pino/file', options: { destination: 2 } }`.
- **D-09:** Graceful shutdown: handle SIGINT/SIGTERM, close DB (WAL checkpoint), close HTTP server, then exit.

### MCP Capabilities
- **D-10:** Declare **tools + resources + prompts** capabilities:
  - Tools: 6 tools as listed above
  - Resources: stored summaries exposed as `summary://YYYY-MM-DD` URIs
  - Prompts: guided summary generation prompt template

### Batch Processing
- **D-11:** `generate_batch_summary` uses **limited concurrency (max 3)** for parallel date processing. Avoids API rate limits while being faster than strict sequential.
- **D-12:** Batch **regenerates all dates** (including those with existing summaries) but **skips dates with no session/git data**. Existing summaries are versioned per D-04.
- **D-13:** Batch returns progress-style result: `{ processed: N, skipped: M, failed: K, results: [...] }`.

### Claude's Discretion
- Specific MCP SDK server initialization patterns and version compatibility
- HTTP framework choice for dual-transport (Hono already in stack per CLAUDE.md)
- Concurrency control implementation (Promise pool vs semaphore pattern)
- Error response formatting for MCP tool errors
- Resource URI scheme design and listing behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `CLAUDE.md` — Stack definition (MCP SDK v1, Hono, better-sqlite3, tsup), conventions (stderr logging, streaming parsers, path resolution)
- `.planning/phases/02-intelligence/02-CONTEXT.md` — Intelligence layer decisions (D-04 zero-config, D-10 JSON source of truth, D-11 output formats)

### Phase 2 Intelligence (dependency)
- `src/server/intelligence/index.ts` — `generateSummary(date, events, config)` public API
- `src/server/intelligence/types.ts` — DailySummary, ZeroConfigResponse, GenerateSummaryResult interfaces
- `src/server/intelligence/renderer.ts` — `renderMarkdown(summary)` function

### Data Layer
- `src/server/database.ts` — initDatabase, getDatabase, closeDatabase, Migration system
- `src/server/config.ts` — loadConfig, saveConfig, resolveConfigPaths
- `src/server/adapters/registry.ts` — AdapterRegistry.gatherEvents(range) pattern

### MCP SDK
- `@modelcontextprotocol/sdk` (v1.12.0) — Server class, stdio transport, tool/resource/prompt registration

</canonical_refs>

<code_context>
## Existing Code Insights

### Entry Point
- `src/server/main.ts` — Currently a stub (`logger.info('starting...')`). This becomes the dual-transport initialization point.
- `package.json` bin: `"dailywork-matters-mcp": "./dist/server.mjs"` — already configured for npx execution.

### Available Infrastructure
- **Logging:** Pino logger at `src/server/logger.ts` — already writes to stderr (fd 2)
- **Config:** Full config system with first-run creation, deep merge, tilde resolution
- **Database:** SQLite with WAL, migration system, `summaries` table already exists
- **Adapters:** Registry pattern with async generator `gatherEvents(range)`
- **Intelligence:** `generateSummary()` → `GenerateSummaryResult` with mode detection built in

### Integration Points
- `generateSummary(date, events, config)` is the main intelligence entry point
- `AdapterRegistry.gatherEvents(dateRange)` collects all events
- `renderMarkdown(dailySummary)` renders to Markdown string
- Config `ai.apiKey` determines zero-config vs API mode automatically

</code_context>

<deferred>
## Deferred Ideas

(none captured)

</deferred>

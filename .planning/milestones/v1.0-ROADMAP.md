# Roadmap: dailywork-matters-mcp

## Overview

This roadmap transforms a blank project into a production-ready MCP Server that aggregates daily developer work into intelligent summaries. The journey moves from raw data parsing (the architectural one-way door) through AI intelligence, MCP delivery, Web UI visualization, and finally cross-platform distribution. Each phase delivers a coherent, testable capability that builds on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, streaming parsers, SQLite storage, adapter pattern *(completed 2026-05-19)*
- [x] **Phase 2: Intelligence** - Cross-session aggregation, dual AI mode, structured task output *(completed 2026-05-20)*
- [x] **Phase 3: MCP Transport + Persistence** - 5 MCP tools, Markdown output, summary storage *(completed 2026-05-20)*
- [x] **Phase 4: Web UI + HTTP API** - React SPA with 4 pages, charts, REST API *(completed 2026-05-29)*
- [x] **Phase 4.1: Zero-Config UI Hint** - Generate page shows friendly prompt when no API key configured (INSERTED) *(completed 2026-06-01)*
- [x] **Phase 5: Distribution + Operations** - npx packaging, scheduler, cross-platform validation *(completed 2026-06-01)*

## Phase Details

### Phase 1: Foundation
**Goal**: Developers have a working data pipeline that can discover, stream-parse, and normalize daily work events from Claude Code sessions and Git history
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. Running the project against a date with Claude Code sessions discovers and parses all JSONL files for that date without loading entire files into memory
  2. Running the project against a date with Git commits extracts all commits, diffs, and file changes for that date from configured repositories
  3. Both parsers return data conforming to the same NormalizedEvent interface (adapter pattern working)
  4. User configuration file at ~/.dailywork-matters/config.json is created on first run and supports all documented settings
  5. All path resolution works correctly on Windows (primary), macOS, and Linux (~ resolves via os.homedir())
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffold and shared types
- [x] 01-02-PLAN.md — SQLite database with WAL mode and migrations
- [x] 01-03-PLAN.md — Claude Code JSONL streaming parser and adapter
- [x] 01-04-PLAN.md — Git history adapter with identity filtering

### Phase 2: Intelligence
**Goal**: The system can take raw normalized events and produce semantically meaningful, outcome-oriented task summaries with cross-session aggregation
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. Zero-config mode (no API key) returns pre-processed structured data that a host AI can synthesize into a coherent summary
  2. API key mode calls Claude API and returns a complete Markdown summary independently without host AI involvement
  3. Work spanning multiple sessions on the same topic appears as a single merged task entry with final outcome state (not duplicated per session)
  4. Each task in output contains exactly 5 fields: task name, category, outcome description, files involved, time proportion
  5. Summary describes what was accomplished (outcomes) rather than what operations were performed (process)
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — Intelligence types, config extension, and content compression
- [x] 02-02-PLAN.md — AI client, prompts, aggregation, and window processor
- [x] 02-03-PLAN.md — Zero-config mode, merge processor, renderer, and public API

### Phase 3: MCP Transport + Persistence
**Goal**: Developers can use all 6 MCP tools from any MCP client and summaries persist as Markdown files for future reference
**Depends on**: Phase 2
**Requirements**: DLVR-01, DLVR-02, DLVR-04, OPS-01
**Success Criteria** (what must be TRUE):
  1. Running `npx dailywork-matters-mcp` starts a stdio MCP Server + HTTP server and an MCP client can list all 6 registered tools
  2. Calling generate_daily_summary produces a summary and saves it as Markdown to the configured output directory (default: ~/dailywork-matters/summaries/YYYY-MM-DD.md)
  3. Calling generate_batch_summary with a date range processes each day with max 3 concurrency, skipping days with no data
  4. All MCP communication happens over stdio without stdout pollution (logging to stderr only)
**Plans**: 3 plans
Plans:
- [x] 03-01-PLAN.md — Server bootstrap, DB migration, and persistence layer
- [x] 03-02-PLAN.md — MCP tool registration (6 tools)
- [x] 03-03-PLAN.md — MCP resources, prompts, and integration test

### Phase 4: Web UI + HTTP API
**Goal**: Developers can browse summaries, trigger generation, view charts, and manage settings through a local web interface
**Depends on**: Phase 3
**Requirements**: DLVR-03
**Success Criteria** (what must be TRUE):
  1. Visiting localhost:37888 shows a working React SPA with navigation between 4 pages (summary list/detail, generate trigger, settings, charts)
  2. User can browse past summaries and view full detail for any date
  3. User can trigger summary generation for today or a specific date from the UI and see the result
  4. Charts page shows category distribution and time proportion visualizations from stored summary data
**Plans**: 5 plans
Plans:
- [x] 04-01-PLAN.md — REST API route handlers + unit tests
- [x] 04-02-PLAN.md — Frontend scaffold (Vite, React Router, TanStack Query, Tailwind v4, shadcn/ui)
- [x] 04-03-PLAN.md — Summaries page (master-detail) + Generate page (SSE streaming)
- [x] 04-04-PLAN.md — Charts page (8 chart types, draggable grid, Recharts)
- [x] 04-05-PLAN.md — Settings page + production build integration + human verification
**UI hint**: yes

### Phase 4.1: Zero-Config UI Hint (INSERTED)
**Goal**: Generate page detects zero-config mode (no API key) and displays a clear, friendly prompt explaining the situation — no silent failure, no confusing empty result
**Depends on**: Phase 4
**Requirements**: DLVR-03
**Success Criteria** (what must be TRUE):
  1. Generate page detects zero-config mode (no API key configured) and displays a user-friendly message before the user clicks generate
  2. The message clearly explains that AI summary requires an API key and guides the user to Settings
  3. The prompt does not block usage — user can still trigger generation (which returns raw event data to MCP host)
**Plans**: 1 plan
Plans:
- [x] 04.1-01-PLAN.md — API key detection modal on Generate page

### Phase 5: Distribution + Operations
**Goal**: The tool is installable via npx on all platforms and runs scheduled daily generation without manual intervention
**Depends on**: Phase 3, Phase 4
**Requirements**: OPS-02
**Success Criteria** (what must be TRUE):
  1. `npx dailywork-matters` installs and starts successfully on Windows, macOS, and Linux without requiring manual setup
  2. Configuring a schedule time triggers automatic daily summary generation at the specified time without user interaction
  3. The npm package contains only the bundled dist/server.mjs, dist/ui/ static assets, and declares better-sqlite3 as its sole runtime dependency
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — NPX packaging: pino fix, static path fix, package.json restructure
- [x] 05-02-PLAN.md — In-process scheduler with startup catch-up
- [x] 05-03-PLAN.md — GitHub Actions CI matrix + publish workflow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 4.1 -> 5
(Phases 3 and 4 are partially parallelizable once the service layer is stable)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-05-19 |
| 2. Intelligence | 3/3 | Complete | 2026-05-20 |
| 3. MCP Transport + Persistence | 3/3 | Complete | 2026-05-20 |
| 4. Web UI + HTTP API | 5/5 | Complete | 2026-05-29 |
| 4.1 Zero-Config UI Hint | 1/1 | Complete | 2026-06-01 |
| 5. Distribution + Operations | 3/3 | Complete | 2026-06-01 |

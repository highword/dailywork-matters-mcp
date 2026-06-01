# Phase 5: Distribution + Operations — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The tool is packaged for npm distribution (`npx dailywork-matters`), implements scheduled daily generation with startup catch-up, and validates cross-platform compatibility via GitHub Actions CI matrix. This phase delivers production-readiness: zero-manual-setup installation, automated daily summaries, and confidence that Windows/macOS/Linux all work.

</domain>

<decisions>
## Implementation Decisions

### NPX Packaging
- **D-01:** Package name changes from `dailywork-matters-mcp` to `dailywork-matters`. Users run `npx dailywork-matters` to start.
- **D-02:** All frontend dependencies (React, Recharts, lucide-react, etc.) move to `devDependencies` before publish — they are already bundled into `dist/ui/` static assets.
- **D-03:** Only `better-sqlite3` remains as a runtime dependency (external in tsup). All other externals (`pino`, `simple-git`, `@anthropic-ai/sdk`) become bundled inline via tsup `noExternal`.
- **D-04:** `dist/` directory ships as-is: `dist/server.mjs` (server bundle with shebang) + `dist/ui/` (static frontend assets).

### Scheduler Mechanism
- **D-05:** In-process `setTimeout` loop — calculates ms until next `scheduleTime` (HH:mm format), fires generation, then reschedules for next day.
- **D-06:** Startup catch-up: on process start, if `scheduleTime` is configured, check all dates from last successful summary to today. Generate any missing days sequentially (oldest first).
- **D-07:** No external scheduler dependency (no node-cron, no system crontab). Process alive = scheduler alive.

### Cross-Platform Validation
- **D-08:** GitHub Actions CI matrix with `ubuntu-latest`, `macos-latest`, `windows-latest`. Validates `pnpm install && pnpm build && pnpm test -- --run` on all three.
- **D-09:** better-sqlite3 prebuild binaries handle native compilation. No user-facing build step needed.

### Publish Workflow
- **D-10:** CI auto-publish: pushing a git tag (`v*`) triggers `npm publish` via GitHub Actions workflow.
- **D-11:** `prepublishOnly` script runs `pnpm build` to ensure dist/ is fresh.
- **D-12:** `.npmignore` (or `files` field) ensures only `dist/`, `package.json`, `README.md` are published.

### Claude's Discretion
- CI workflow file structure and exact job names
- README content and formatting for npm page
- Exact startup catch-up logging format
- Whether to add a `--no-schedule` CLI flag for MCP-only mode

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Configuration
- `package.json` — Current deps, scripts, bin/files/main fields (will be modified)
- `tsup.config.ts` — Bundle config, external list (will be modified)

### Server Entry
- `src/server/main.ts` — Process entry point (scheduler hooks here)

### Config System
- `src/shared/types.ts` — Config interface including `scheduleTime: string | null`
- `src/server/config.ts` — Config loading, defaults, persistence

### Existing Summaries
- `src/server/database.ts` — Database with `summaries` table (for catch-up date check)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` bin/files/main already configured for npm distribution
- `tsup.config.ts` already bundles server with `#!/usr/bin/env node` shebang
- `scheduleTime` config field exists in types, UI, and config tools
- Build pipeline (`vite build && tsup`) already produces production output

### Established Patterns
- All logging to stderr (stdout reserved for MCP stdio protocol)
- Config at `~/.dailywork-matters/config.json` via `os.homedir()` resolution
- Summaries stored at `~/dailywork-matters/summaries/YYYY-MM-DD.md`
- Hono HTTP server serves static UI + API on port 37888

### Integration Points
- Scheduler hooks into `src/server/main.ts` after server startup
- Catch-up logic queries summaries table for existing dates
- `generate_daily_summary` MCP tool logic is reusable for scheduler-triggered generation

</code_context>

<specifics>
## Specific Ideas

- Catch-up should generate ALL missing days (not just today) between last successful summary and now
- Package rename requires updating `bin` field key to match new name

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-distribution*
*Context gathered: 2026-06-01*

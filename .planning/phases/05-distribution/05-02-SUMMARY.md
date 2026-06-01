---
phase: 05-distribution
plan: 02
subsystem: server/scheduler
tags: [scheduler, catch-up, setTimeout, automation, OPS-02]
dependency_graph:
  requires: [05-01]
  provides: [scheduler-module, startup-catchup, no-schedule-flag]
  affects: [src/server/main.ts]
tech_stack:
  added: []
  patterns: [setTimeout-loop, timer-unref, startup-catchup, HH:mm-validation]
key_files:
  created:
    - src/server/scheduler.ts
    - src/server/scheduler.test.ts
  modified:
    - src/server/main.ts
decisions:
  - "Used setTimeout loop with timer.unref() for daily scheduling (D-05, D-07)"
  - "Added --no-schedule flag for MCP-only mode (Claude's discretion)"
  - "Added HH:mm format validation as T-05-03 threat mitigation"
  - "30-day cap on catch-up when no prior history exists (T-05-04)"
metrics:
  duration: "7m 25s"
  completed: "2026-06-01T08:40:09Z"
  tasks: 2
  files_created: 2
  files_modified: 1
---

# Phase 5 Plan 2: In-Process Scheduler and Startup Catch-Up Summary

setTimeout loop scheduler with startup catch-up logic, generating missing summaries sequentially with 30-day cap for fresh installs

## Tasks Completed

| Task | Name | Commit(s) | Key Changes |
|------|------|-----------|-------------|
| 1 | Create scheduler module with tests (TDD) | 21c1f71, ade4100 | scheduler.ts (201 LOC), scheduler.test.ts (11 tests) |
| 2 | Wire scheduler and catch-up into server startup | 180bda8 | main.ts integration, --no-schedule flag, graceful shutdown |

## Implementation Details

### Scheduler Module (src/server/scheduler.ts)

Exports:
- `startScheduler(config, registry)` - Returns SchedulerHandle or null if scheduleTime not configured
- `runCatchUp(config, registry)` - Generates missing days since last summary on startup
- `getMsUntilNext(timeStr)` - Calculates milliseconds until next scheduled time
- `generateDateRange(startDate, endDate)` - Inclusive date range as string array
- `formatDate(d)` - Zero-padded YYYY-MM-DD formatter

Key behaviors:
- Timer uses `.unref()` so it does not prevent graceful process shutdown
- Catch-up requires both `scheduleTime` and `apiKey` to be configured
- Fresh installs cap catch-up at 30 days (prevents unbounded API calls)
- Dates with no events are silently skipped
- Zero-config mode results are not saved to files (needs API key for full generation)

### Server Integration (src/server/main.ts)

- Scheduler activates after HTTP server startup (line 70+)
- `--no-schedule` CLI flag disables both catch-up and scheduler for MCP-only mode
- Shutdown handler stops scheduler timer before closing MCP/HTTP/DB

### Threat Mitigations Applied

- **T-05-03 (Spoofing):** Regex validates HH:mm format before parsing in scheduler init
- **T-05-04 (DoS):** 30-day cap on catch-up prevents unbounded sequential API calls

## TDD Gate Compliance

- RED gate: 21c1f71 (`test(05-02)`) - Tests written first, fail due to missing module
- GREEN gate: ade4100 (`feat(05-02)`) - Implementation passes all 11 tests
- REFACTOR gate: Not needed (code is clean, no duplication)

## Verification Results

- `pnpm test -- --run src/server/scheduler.test.ts`: 11/11 tests pass
- `pnpm build` (tsup): Succeeds, produces dist/server.mjs (2.21 MB)
- Pre-existing failures in database.test.ts and git.adapter.test.ts are unrelated (out of scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added HH:mm format validation (T-05-03)**
- **Found during:** Task 1
- **Issue:** Plan's threat model requires validating scheduleTime format before parsing
- **Fix:** Added `isValidTimeFormat()` function with regex validation in startScheduler
- **Files modified:** src/server/scheduler.ts
- **Commit:** ade4100

No other deviations - plan executed as written.

## Known Stubs

None - all code paths are fully wired to real implementations.

## Self-Check: PASSED

- [x] src/server/scheduler.ts exists with all 5 exports (startScheduler, runCatchUp, getMsUntilNext, generateDateRange, formatDate)
- [x] src/server/scheduler.test.ts exists (11 tests)
- [x] src/server/main.ts contains scheduler import, runCatchUp, startScheduler, schedulerHandle, --no-schedule
- [x] timer.unref() present in scheduler.ts
- [x] Catch-up query present: 'SELECT date FROM summaries ORDER BY date DESC LIMIT 1'
- [x] No node-cron or external scheduler dependency
- [x] Commits verified: 21c1f71, ade4100, 180bda8

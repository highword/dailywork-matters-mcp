---
phase: 05-distribution
plan: 01
subsystem: build-distribution
tags: [npm-packaging, bundling, pino, static-assets, tsup]
dependency_graph:
  requires: []
  provides: [buildable-npm-package, import-meta-url-resolution, pino-sync-mode]
  affects: [dist/server.mjs, package.json, tsup.config.ts]
tech_stack:
  added: []
  patterns: [createRequire-banner, pino-sync-destination, import-meta-url-dirname]
key_files:
  created: []
  modified:
    - src/server/logger.ts
    - src/server/main.ts
    - package.json
    - tsup.config.ts
    - pnpm-lock.yaml
decisions:
  - "createRequire banner needed for CJS-in-ESM bundling (pino uses require('node:os'))"
  - "pino.destination({ dest: 2, sync: true }) eliminates worker thread dependency"
metrics:
  duration: 8min
  completed: 2026-06-01T08:18:43Z
  tasks_completed: 2
  tasks_total: 2
---

# Phase 5 Plan 1: NPX Packaging Fixes Summary

Pino sync destination mode + import.meta.url static path resolution + package restructure for `npx dailywork-matters` distribution.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Fix pino logger and static asset path resolution | b8df981 | logger.ts: sync destination; main.ts: import.meta.url |
| 2 | Restructure package.json and tsup.config.ts | 830b31c | Rename, deps restructure, noExternal expansion, createRequire banner |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CJS require('os') fails in ESM bundle**
- **Found during:** Task 2 verification (pnpm build -> node dist/server.mjs)
- **Issue:** Pino uses `require('node:os')` internally. When bundled into ESM by tsup, the `__require` shim fails because `typeof require !== "undefined"` is false in pure ESM context.
- **Fix:** Added `createRequire(import.meta.url)` to tsup banner, providing a real `require` function for CJS modules bundled into ESM.
- **Files modified:** tsup.config.ts
- **Commit:** 830b31c (included in Task 2 commit)

## Verification Results

- `pnpm build` succeeds: vite builds UI (dist/ui/), tsup bundles server (dist/server.mjs, 2.20 MB)
- `node dist/server.mjs` starts without errors: database init, adapters registered, MCP connected, UI assets served, HTTP on port 37888
- Static UI path resolves correctly via import.meta.url (logs show absolute path to dist/ui/)
- No pino worker thread errors (sync destination mode works)
- 76/82 tests pass (6 pre-existing failures in database.test.ts and git.adapter.test.ts, unrelated to this plan)

## Key Decisions

1. **createRequire banner:** Pino and other CJS packages bundled into ESM need a real `require()`. The banner `import { createRequire } from "module"; const require = createRequire(import.meta.url);` is the standard solution for this pattern.
2. **pino sync destination:** `pino.destination({ dest: 2, sync: true })` writes to stderr without worker threads, making pino fully bundleable.

## Known Stubs

None.

## Self-Check: PASSED

- [x] src/server/logger.ts exists and contains `pino.destination`
- [x] src/server/main.ts exists and contains `fileURLToPath(import.meta.url)`
- [x] package.json contains `"name": "dailywork-matters"`
- [x] tsup.config.ts contains `noExternal` with pino, simple-git, @anthropic-ai/sdk, zod
- [x] Commit b8df981 exists
- [x] Commit 830b31c exists

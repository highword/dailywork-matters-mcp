# Phase 5: Distribution + Operations - Research

**Researched:** 2026-06-01
**Domain:** npm packaging, in-process scheduling, cross-platform CI, native modules
**Confidence:** HIGH

## Summary

This phase transforms the working development server into a production-ready npm package installable via `npx dailywork-matters`. The work spans three distinct concerns: (1) npm packaging with a renamed package, corrected dependency classification, and inline bundling of non-native deps; (2) an in-process scheduler using setTimeout loops with startup catch-up; and (3) GitHub Actions CI for cross-platform validation and automated npm publishing.

The most critical discovery is that **pino cannot be trivially bundled** due to its worker-thread transport architecture. The current logger.ts uses `transport: { target: 'pino/file' }` which spawns worker threads that break when bundled. The fix is to switch to pino's synchronous destination mode (`pino.destination(2)`) which writes directly to stderr without worker threads, making it fully bundleable by tsup.

A second critical issue is the **static asset path resolution bug**: the current `main.ts` uses `process.cwd()` to find `dist/ui/`, which will resolve to the user's directory (not the package directory) when run via npx. The fix is `import.meta.url`-based resolution, which Hono's official docs explicitly recommend for this scenario.

**Primary recommendation:** Fix the pino transport mode and static path resolution FIRST (these are blocking bugs for npx), then restructure package.json deps, then add scheduler, then CI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Package name changes from `dailywork-matters-mcp` to `dailywork-matters`
- D-02: All frontend dependencies move to `devDependencies`
- D-03: Only `better-sqlite3` remains as runtime dependency. `pino`, `simple-git`, `@anthropic-ai/sdk` become bundled inline via tsup `noExternal`
- D-04: `dist/` ships as-is: `dist/server.mjs` + `dist/ui/`
- D-05: In-process `setTimeout` loop for scheduler
- D-06: Startup catch-up: generate missing days since last successful summary
- D-07: No external scheduler dependency
- D-08: GitHub Actions CI matrix (ubuntu, macos, windows)
- D-09: better-sqlite3 prebuild binaries handle native compilation
- D-10: CI auto-publish on git tag (v*)
- D-11: prepublishOnly runs build
- D-12: .npmignore or files field limits published content

### Claude's Discretion
- CI workflow file structure and exact job names
- README content and formatting for npm page
- Exact startup catch-up logging format
- Whether to add a `--no-schedule` CLI flag for MCP-only mode

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-02 | Scheduled automatic daily summary generation | Scheduler patterns (D-05/D-06/D-07), catch-up logic, setTimeout loop with drift prevention |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| npm packaging | Build/Distribution | -- | Package.json restructure, tsup config, files field |
| In-process scheduler | Server Process | -- | setTimeout loop in main.ts, no external service |
| Startup catch-up | Server Process | Database | Queries summaries table for gaps, triggers generation |
| Static asset serving | Server Process | CDN/Static (dist/ui/) | Resolved relative to bundle location via import.meta.url |
| Cross-platform CI | CI/CD (GitHub Actions) | -- | Matrix build validates all platforms |
| npm publishing | CI/CD (GitHub Actions) | -- | Tag-triggered workflow pushes to registry |

## Standard Stack

### Core (Already In Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | ^8.4.0 (current: 8.5.1) | Bundle server with noExternal | Already configured, handles ESM+shebang |
| better-sqlite3 | ^11.7.0 (latest: 12.10.0) | SQLite (sole runtime dep) | Native module with prebuild-install |
| pino | ^9.6.0 (latest: 10.3.1) | Logging to stderr | Already used; needs transport mode change |

[VERIFIED: npm registry] — versions confirmed via `npm view` on 2026-06-01.

### Supporting (CI)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/checkout | v6 | Git checkout in CI | Every workflow |
| actions/setup-node | v4 | Node.js setup with caching | Every workflow |
| pnpm/action-setup | latest SHA | Install pnpm in CI | Every workflow |

[CITED: docs.github.com/en/actions] — from official GitHub Actions docs.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pino (bundled) | console.error wrapper | Loses structured JSON logging; pino is fine if transport mode is fixed |
| setTimeout loop | node-cron | Adds dependency; violates D-07 |
| prebuild-install | node-gyp only | Forces users to have build tools; prebuild is already in better-sqlite3 |

**Installation:**
No new packages needed. All changes are configuration-level (tsup noExternal, package.json restructure).

## Architecture Patterns

### System Architecture Diagram

```
User: npx dailywork-matters
         |
         v
+------------------+
|  dist/server.mjs |  (ESM bundle with shebang)
|  (bin entry)     |
+--------+---------+
         |
    +----+----+----------+----------+
    |         |          |          |
    v         v          v          v
 MCP/stdio  HTTP:37888  Scheduler  Catch-up
 transport   (Hono)     (setTimeout (on startup)
    |         |          loop)       |
    |    +----+----+        |       |
    |    |         |        v       v
    |    v         v     generateSummary()
    |  REST API  Static     for scheduled date
    |  /api/*    /dist/ui/  or missing dates
    |              ^
    |              |
    |   import.meta.url resolution
    |   (not process.cwd!)
    v
  stdio <-> MCP Client (Claude Desktop, etc.)
```

### Recommended Project Structure
```
.github/
  workflows/
    ci.yml           # Matrix build: test on all platforms
    publish.yml      # Tag-triggered npm publish
src/
  server/
    main.ts          # Entry point — scheduler init added here
    scheduler.ts     # NEW: setTimeout loop + catch-up logic
    logger.ts        # MODIFIED: pino sync destination mode
dist/
  server.mjs         # Bundled output (shebang, ESM)
  ui/                # Vite-built static assets
package.json         # Restructured deps, renamed package
tsup.config.ts       # Updated external/noExternal
```

### Pattern 1: Pino Synchronous Destination (Bundleable)
**What:** Replace pino's worker-thread transport with synchronous `pino.destination(fd)` for bundleable stderr logging.
**When to use:** When bundling pino into a single-file output with tsup/esbuild.
**Example:**
```typescript
// Source: https://github.com/pinojs/pino/blob/main/docs/bundling.md
// BEFORE (uses worker threads — CANNOT be bundled):
// import pino from 'pino';
// export const logger = pino({
//   transport: { target: 'pino/file', options: { destination: 2 } }
// });

// AFTER (synchronous — fully bundleable):
import pino from 'pino';

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.destination({ dest: 2, sync: true })  // fd 2 = stderr, sync = no worker threads
);
```

### Pattern 2: Static Path Resolution via import.meta.url
**What:** Resolve dist/ui/ relative to the script's filesystem location, not process.cwd().
**When to use:** Any npm package CLI that serves static files.
**Example:**
```typescript
// Source: https://hono.dev/docs/getting-started/nodejs
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiDistPath = path.resolve(__dirname, 'ui'); // dist/server.mjs -> dist/ui/

// For serveStatic:
app.use('/*', serveStatic({ root: path.resolve(__dirname, 'ui') }));
```

### Pattern 3: setTimeout Scheduler Loop
**What:** Self-rescheduling setTimeout that calculates ms until next scheduled time.
**When to use:** In-process daily scheduling without external dependencies.
**Example:**
```typescript
function startScheduler(scheduleTime: string, onTick: () => Promise<void>): { stop: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function scheduleNext() {
    if (stopped) return;
    const msUntilNext = getMsUntilNext(scheduleTime);
    timer = setTimeout(async () => {
      try {
        await onTick();
      } catch (err) {
        // log error but don't crash
      }
      scheduleNext(); // reschedule for next day
    }, msUntilNext);
    // Unref so timer doesn't prevent process exit on SIGTERM
    timer.unref();
  }

  scheduleNext();
  return { stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
}

function getMsUntilNext(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1); // next day
  }
  return target.getTime() - now.getTime();
}
```

### Pattern 4: Startup Catch-up Logic
**What:** On startup, detect missing summary dates between last successful generation and today.
**When to use:** Process may be offline for days; ensures no gaps in summaries.
**Example:**
```typescript
async function runCatchUp(config: Config, registry: AdapterRegistry): Promise<void> {
  if (!config.scheduleTime || !config.ai.apiKey) return; // Need schedule + API key

  const db = getDatabase();
  const lastSummary = db.prepare(
    'SELECT date FROM summaries ORDER BY date DESC LIMIT 1'
  ).get() as { date: string } | undefined;

  const startDate = lastSummary
    ? nextDay(lastSummary.date)
    : formatDate(daysAgo(7)); // Default: last 7 days if no history

  const today = formatDate(new Date());
  if (startDate > today) return; // All caught up

  const missingDates = generateDateRange(startDate, today);
  for (const date of missingDates) {
    await processOneDate(date, config, registry); // Sequential, oldest first
  }
}
```

### Anti-Patterns to Avoid
- **process.cwd() for package assets:** Will resolve to user's directory via npx. Always use import.meta.url.
- **pino transport in bundled code:** Worker threads cannot find their entry files after bundling. Use sync destination.
- **setInterval for scheduling:** Drifts over time; setTimeout+recalculate is more accurate for daily triggers.
- **Catching up with concurrency:** Running catch-up in parallel may hit API rate limits. Use sequential processing.
- **Keeping timer ref'd:** `timer.unref()` is essential so the scheduler doesn't prevent graceful shutdown.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native module cross-compilation | Custom build scripts per OS | prebuild-install (in better-sqlite3) | Handles 15+ platform/arch combos automatically |
| Date arithmetic for ranges | Manual day-of-month math | Existing `generateDateRange()` in batch tool | Already handles month boundaries correctly |
| CI matrix boilerplate | Custom shell scripts | GitHub Actions matrix strategy | Standard, well-documented, handles cleanup |
| npm provenance/trust | Manual signing | `--provenance` flag in npm publish | Ties package to GitHub Actions run via OIDC |
| Process concurrency control | Custom pool | Existing `batchWithConcurrency()` helper | Already proven in batch summary tool |

**Key insight:** The project already has `generateDateRange()` and `processOneDate()` in `src/server/mcp/tools/generate-batch-summary.ts`. The scheduler catch-up logic should extract and reuse these, not duplicate them.

## Common Pitfalls

### Pitfall 1: pino Worker Thread Bundling Failure
**What goes wrong:** After moving pino to `noExternal` in tsup, the bundled server crashes with `Cannot find module 'thread-stream-worker'` or similar.
**Why it happens:** pino's `transport` option spawns a worker thread that dynamically loads files — bundlers cannot trace these runtime `require()`s.
**How to avoid:** Switch logger.ts from `transport: { target: 'pino/file' }` to `pino.destination({ dest: 2, sync: true })` BEFORE adding pino to noExternal.
**Warning signs:** Any error mentioning `thread-stream`, `pino-worker`, or `Cannot find module` after build.

### Pitfall 2: Static Assets 404 via npx
**What goes wrong:** UI returns 404 for all routes when running via `npx dailywork-matters`.
**Why it happens:** `process.cwd()` resolves to user's shell directory, not the npm package's install location. The `dist/ui/` folder is inside the package, not in the user's cwd.
**How to avoid:** Use `path.dirname(fileURLToPath(import.meta.url))` to resolve relative to `dist/server.mjs`.
**Warning signs:** Works in dev (`pnpm dev`), fails when run from a different directory.

### Pitfall 3: prepublishOnly vs prepare in pnpm
**What goes wrong:** `pnpm publish` may not trigger `prepublishOnly` in the same way npm does.
**Why it happens:** pnpm has slightly different lifecycle script behavior.
**How to avoid:** Test with `pnpm pack` first to verify the built dist/ is included. Also add `prepack` as an alias that runs build. [ASSUMED]
**Warning signs:** Published package is missing dist/ or has stale bundle.

### Pitfall 4: Scheduler Timezone Drift
**What goes wrong:** Scheduled generation fires at wrong time after DST change or timezone shift.
**Why it happens:** Using fixed ms delay calculated once, not recalculating after each tick.
**How to avoid:** Recalculate `getMsUntilNext()` fresh after each tick. Use local Date object (which handles DST).
**Warning signs:** Summary generated at unexpected hour after clock change.

### Pitfall 5: npm bin Field Key Must Match Package Name
**What goes wrong:** `npx dailywork-matters` doesn't work even though package is published.
**Why it happens:** The `bin` field key determines the command name. If key is `dailywork-matters-mcp` but package is `dailywork-matters`, npx uses the key name.
**How to avoid:** Change bin field to `{ "dailywork-matters": "./dist/server.mjs" }`.
**Warning signs:** `npx dailywork-matters` says "command not found" or installs but doesn't execute.

### Pitfall 6: Anthropic SDK Dynamic Imports
**What goes wrong:** Bundling `@anthropic-ai/sdk` may fail if it uses dynamic imports internally.
**Why it happens:** Some SDKs lazy-load modules at runtime for tree-shaking or optional features.
**How to avoid:** Test the full bundle (`pnpm build && node dist/server.mjs`) with an API call after adding to noExternal. If it fails, check for dynamic `import()` calls in the SDK. [ASSUMED]
**Warning signs:** Runtime errors like "Cannot find module" when the AI generation path runs.

## Code Examples

### package.json Restructure
```json
{
  "name": "dailywork-matters",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "dailywork-matters": "./dist/server.mjs"
  },
  "main": "./dist/server.mjs",
  "files": ["dist/"],
  "scripts": {
    "dev": "tsx src/server/main.ts",
    "dev:ui": "vite",
    "build": "vite build && tsup",
    "build:ui": "vite build",
    "test": "vitest",
    "lint": "biome check .",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0"
  },
  "devDependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@biomejs/biome": "^1.9.0",
    "@hono/node-server": "^1.14.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-separator": "^1.1.8",
    "@tailwindcss/vite": "^4.3.0",
    "@tanstack/react-query": "^5.100.14",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@types/react-grid-layout": "^2.1.0",
    "@vitejs/plugin-react": "^6.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.3.0",
    "hono": "^4.7.0",
    "lucide-react": "^1.16.0",
    "pino": "^9.6.0",
    "react": "^19.2.6",
    "react-day-picker": "^10.0.1",
    "react-dom": "^19.2.6",
    "react-grid-layout": "^2.2.3",
    "react-router": "^7.15.1",
    "recharts": "^3.8.1",
    "simple-git": "^3.27.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4.3.0",
    "tsup": "^8.4.0",
    "tsx": "^4.0.0",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5.7.0",
    "vite": "^8.0.14",
    "vitest": "^3.1.0",
    "zod": "^4.4.3"
  }
}
```

### tsup.config.ts Updated
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server/main.ts' },
  format: ['esm'],
  outDir: 'dist',
  outExtension: () => ({ js: '.mjs' }),
  target: 'node18',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  shims: true,
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [
    '@modelcontextprotocol/sdk',
    'hono',
    '@hono/node-server',
    'pino',
    'simple-git',
    '@anthropic-ai/sdk',
    'zod',
  ],
});
```

### GitHub Actions CI Workflow (.github/workflows/ci.yml)
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [20.x]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test -- --run
```

### GitHub Actions Publish Workflow (.github/workflows/publish.yml)
```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test -- --run
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Scheduler Module (src/server/scheduler.ts)
```typescript
import type { Config } from '../shared/types.js';
import type { AdapterRegistry } from './adapters/registry.js';
import { logger } from './logger.js';

export interface SchedulerHandle {
  stop: () => void;
}

export function startScheduler(
  config: Config,
  registry: AdapterRegistry,
  generateForDate: (date: string) => Promise<void>,
): SchedulerHandle | null {
  if (!config.scheduleTime) {
    logger.info('No scheduleTime configured — scheduler disabled');
    return null;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function scheduleNext() {
    if (stopped) return;
    const ms = getMsUntilNext(config.scheduleTime!);
    logger.info({ scheduleTime: config.scheduleTime, msUntilNext: ms }, 'Scheduler: next tick scheduled');
    timer = setTimeout(async () => {
      const today = formatDate(new Date());
      try {
        await generateForDate(today);
        logger.info({ date: today }, 'Scheduler: summary generated');
      } catch (err) {
        logger.error({ err, date: today }, 'Scheduler: generation failed');
      }
      scheduleNext();
    }, ms);
    timer.unref(); // Don't prevent graceful shutdown
  }

  scheduleNext();
  return { stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
}

function getMsUntilNext(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-cron for scheduling | setTimeout loops (Bun/Deno compat) | 2024+ | No native dep, simpler, works everywhere |
| npm scripts.install for native | prebuild-install (download prebuilt) | 2020+ | Users don't need build tools |
| npm publish manual | GitHub Actions + provenance | 2023+ | Supply chain security, OIDC trust |
| .npmignore file | `files` field in package.json | Always preferred | Allowlist > denylist for safety |
| pnpm/action-setup with SHA | pnpm/action-setup@v4 | 2024+ | Stable major version reference |

[VERIFIED: npm registry, GitHub Actions docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | prepublishOnly may need `prepack` alias for pnpm | Pitfall 3 | Build might not run before pack; mitigated by testing with `pnpm pack` |
| A2 | @anthropic-ai/sdk can be bundled without dynamic import issues | Pitfall 6 | Bundle may crash at runtime; mitigated by testing full path after build |
| A3 | pnpm/action-setup@v4 is the current stable version | CI workflow | Wrong version might fail; easy to fix in CI YAML |

## Open Questions

1. **`--no-schedule` CLI flag**
   - What we know: No CLI arg parsing exists yet. Claude's discretion per CONTEXT.md.
   - What's unclear: Whether users need this (MCP clients may want to connect without scheduler overhead).
   - Recommendation: Add a minimal `--no-schedule` flag using `process.argv.includes('--no-schedule')`. Low effort, useful for MCP-only mode.

2. **Catch-up scope limit**
   - What we know: D-06 says generate ALL missing days since last successful summary.
   - What's unclear: What if the tool has never run (no summaries at all)? Generate all-time history?
   - Recommendation: Cap at 30 days by default, or the last successful date, whichever is more recent. Prevents accidentally generating 365+ days on first install with scheduleTime configured.

3. **pino version pinning for bundling**
   - What we know: Project uses pino ^9.6.0 (current latest: 10.3.1). Pino v10 has breaking changes (slow-redact replaces fast-redact, real-require ^1.0.0).
   - What's unclear: Whether the sync destination API changed between v9 and v10.
   - Recommendation: Keep pino ^9.6.0 for now. The sync destination API (`pino.destination()`) has been stable since v7.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v24.15.0 | -- |
| pnpm | Build/CI | Yes | 11.5.0 | -- |
| npm | Publish | Yes | (bundled with Node) | -- |
| GitHub Actions | CI/CD | N/A (remote) | -- | Manual testing + manual publish |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- --run` |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-02-a | Scheduler calculates correct ms delay | unit | `pnpm test -- --run src/server/scheduler.test.ts` | Wave 0 |
| OPS-02-b | Catch-up detects missing dates | unit | `pnpm test -- --run src/server/scheduler.test.ts` | Wave 0 |
| OPS-02-c | Logger works in sync mode (bundleable) | smoke | `pnpm build && node dist/server.mjs --help` | Manual |
| OPS-02-d | Static assets resolve via import.meta.url | integration | `pnpm build && node -e "..."` | Manual |
| OPS-02-e | Package structure is correct | smoke | `pnpm pack && tar tf dailywork-matters-1.0.0.tgz` | Manual |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run`
- **Per wave merge:** `pnpm build && pnpm test -- --run`
- **Phase gate:** Full suite green + `pnpm pack` verified

### Wave 0 Gaps
- [ ] `src/server/scheduler.test.ts` -- covers OPS-02-a, OPS-02-b (getMsUntilNext, catch-up date logic)
- [ ] Integration test: build + verify dist/ui/ path resolution

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | -- |
| V5 Input Validation | Yes (scheduleTime format) | Regex validation of HH:mm format |
| V6 Cryptography | No | -- |

### Known Threat Patterns for npm Distribution

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply chain (malicious dep) | Tampering | npm provenance + `--provenance` flag |
| npm token exposure | Info Disclosure | GitHub Actions secrets, never in code |
| Arbitrary code in install script | Elevation | No custom install scripts; prebuild-install is well-audited |

## Sources

### Primary (HIGH confidence)
- [npm registry] - `npm view` for better-sqlite3, pino, tsup, simple-git, @anthropic-ai/sdk versions and dependencies
- [/pinojs/pino via Context7] - Bundling documentation, transport architecture, sync destination API
- [/websites/hono_dev via Context7] - serveStatic with absolute path via import.meta.url
- [/websites/github_en_actions via Context7] - Matrix strategy, npm publish workflow, pnpm setup, tag triggers

### Secondary (MEDIUM confidence)
- [Codebase analysis] - package.json, tsup.config.ts, main.ts, generate-batch-summary.ts examined directly
- [dist/server.mjs inspection] - Confirmed ESM output with real imports (not CJS wrapper)

### Tertiary (LOW confidence)
- [A1] prepublishOnly/prepack behavior in pnpm (needs verification via `pnpm pack`)
- [A2] @anthropic-ai/sdk bundlability (needs post-build runtime test)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all versions verified via npm registry, no new deps needed
- Architecture: HIGH - patterns confirmed via official docs (pino, Hono, GitHub Actions)
- Pitfalls: HIGH - pino bundling issue confirmed by official docs; path resolution bug confirmed by code inspection
- Scheduler: MEDIUM - setTimeout pattern is well-known but catch-up scope limit needs user confirmation

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable domain, no fast-moving deps)

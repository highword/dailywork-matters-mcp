# Phase 4: Web UI + HTTP API - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 22 new/modified files
**Analogs found:** 18 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/server/api/index.ts` | route | request-response | `src/server/mcp/index.ts` | role-match |
| `src/server/api/summaries.ts` | controller | CRUD | `src/server/mcp/tools/generate-daily-summary.ts` | role-match |
| `src/server/api/generate.ts` | controller | streaming | `src/server/mcp/tools/generate-daily-summary.ts` | partial |
| `src/server/api/stats.ts` | controller | CRUD | `src/server/database.ts` | partial |
| `src/server/api/config.ts` | controller | CRUD | `src/server/config.ts` | exact |
| `src/server/main.ts` (modify) | config | request-response | self | exact |
| `src/server/api/summaries.test.ts` | test | request-response | `src/server/config.test.ts` | role-match |
| `src/server/api/generate.test.ts` | test | streaming | `src/server/mcp/tools/generate-daily-summary.test.ts` | role-match |
| `src/server/api/stats.test.ts` | test | CRUD | `src/server/database.test.ts` | role-match |
| `src/ui/main.tsx` | provider | request-response | -- (new domain) | no-analog |
| `src/ui/globals.css` | config | -- | -- (new domain) | no-analog |
| `src/ui/lib/utils.ts` | utility | transform | `src/shared/paths.ts` | partial |
| `src/ui/lib/api.ts` | service | request-response | `src/server/config.ts` | partial |
| `src/ui/hooks/use-summaries.ts` | hook | CRUD | -- (new domain) | no-analog |
| `src/ui/hooks/use-generate.ts` | hook | streaming | -- (new domain) | no-analog |
| `src/ui/hooks/use-stats.ts` | hook | CRUD | -- (new domain) | no-analog |
| `src/ui/hooks/use-config.ts` | hook | CRUD | -- (new domain) | no-analog |
| `src/ui/pages/summaries.tsx` | component | CRUD | -- (new domain) | no-analog |
| `src/ui/pages/generate.tsx` | component | streaming | -- (new domain) | no-analog |
| `src/ui/pages/charts.tsx` | component | CRUD | -- (new domain) | no-analog |
| `src/ui/pages/settings.tsx` | component | CRUD | -- (new domain) | no-analog |
| `vite.config.ts` | config | -- | `tsup.config.ts` | role-match |
| `tsup.config.ts` (modify) | config | -- | self | exact |

## Pattern Assignments

### `src/server/api/index.ts` (route, request-response)

**Analog:** `src/server/mcp/index.ts` (registration orchestrator)

**Imports pattern** (lines 1-3 of analog):
```typescript
// From src/server/mcp/index.ts — shows module assembly pattern
import { Hono } from 'hono';
import { summariesRoutes } from './summaries.js';
import { generateRoutes } from './generate.js';
import { statsRoutes } from './stats.js';
import { configRoutes } from './config.js';
```

**Core pattern — sub-app assembly:**
```typescript
// Hono sub-app pattern (D-15: /api/ prefix)
export const apiApp = new Hono()
  .route('/summaries', summariesRoutes)
  .route('/summaries', generateRoutes)   // /generate nested under /summaries
  .route('/stats', statsRoutes)
  .route('/config', configRoutes);
```

---

### `src/server/api/summaries.ts` (controller, CRUD)

**Analog:** `src/server/mcp/tools/generate-daily-summary.ts` (lines 1-9 imports, 36-47 validation, 93-115 DB access)

**Imports pattern** (lines 1-9):
```typescript
import { Hono } from 'hono';
import { getDatabase } from '../database.js';
import { listSummaryDates, loadSummaryFromDisk } from '../persistence.js';
import { loadConfig, resolveConfigPaths } from '../config.js';
import { logger } from '../logger.js';
```

**Date validation pattern** (from analog lines 147-155):
```typescript
function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}
```

**Database query pattern** (from analog lines 93-115):
```typescript
const db = getDatabase();
const row = db.prepare(
  'SELECT * FROM summaries WHERE date = ? ORDER BY version DESC LIMIT 1'
).get(dateStr) as { date: string; version: number; markdown: string; structured_json: string; metadata: string } | undefined;
```

**Error response pattern** (D-18 structured errors):
```typescript
// From CONTEXT.md D-18 — all API errors follow this shape
return c.json({ error: { code: 'NOT_FOUND', message: `No summary for ${date}` } }, 404);
```

**Persistence list pattern** (from `src/server/persistence.ts` lines 52-62):
```typescript
// listSummaryDates returns string[] sorted newest first
const config = resolveConfigPaths(loadConfig());
const dates = listSummaryDates(config.outputDir);
return c.json({ dates });
```

---

### `src/server/api/generate.ts` (controller, streaming/SSE)

**Analog:** `src/server/mcp/tools/generate-daily-summary.ts` (lines 34-143 — full handler logic)

**Imports pattern:**
```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createDateRange } from '../../shared/paths.js';
import type { Config, NormalizedEvent } from '../../shared/types.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { getDatabase } from '../database.js';
import { generateSummary } from '../intelligence/index.js';
import { saveSummaryFile } from '../persistence.js';
import { logger } from '../logger.js';
```

**Event gathering pattern** (from analog lines 49-55):
```typescript
const range = createDateRange(dateStr);
const events: NormalizedEvent[] = [];
for await (const event of registry.gatherEvents(range)) {
  events.push(event);
}
```

**Generation call pattern** (from analog line 72):
```typescript
const result = await generateSummary(dateStr, events, config);
```

**DB insert after generation** (from analog lines 93-115):
```typescript
const db = getDatabase();
const currentVersion = (
  db.prepare('SELECT MAX(version) as maxVer FROM summaries WHERE date = ?')
    .get(dateStr) as { maxVer: number | null } | undefined
)?.maxVer ?? 0;

db.prepare(
  `INSERT INTO summaries (date, version, markdown, structured_json, metadata, mode, models_used)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
).run(
  dateStr,
  currentVersion + 1,
  result.markdown,
  JSON.stringify(result.summary),
  JSON.stringify(result.summary?.metadata ?? {}),
  result.mode,
  JSON.stringify(config.ai),
);
```

**SSE streaming pattern** (from RESEARCH.md Pattern 2):
```typescript
// Hono streamSSE helper — D-16
return streamSSE(c, async (stream) => {
  let eventId = 0;
  await stream.writeSSE({
    id: String(eventId++),
    event: 'progress',
    data: JSON.stringify({ stage: 'gathering', message: 'Gathering events...' }),
  });
  // ... processing ...
  await stream.writeSSE({
    id: String(eventId++),
    event: 'complete',
    data: JSON.stringify({ date: targetDate, summary: result.summary }),
  });
});
```

---

### `src/server/api/stats.ts` (controller, CRUD/aggregation)

**Analog:** `src/server/database.ts` (singleton access pattern, lines 47-52)

**Database access pattern:**
```typescript
import { getDatabase } from '../database.js';

// Use getDatabase() singleton — same as all other server code
const db = getDatabase();
```

**SQL aggregation against tasks table** (schema from migration 001):
```typescript
// Tasks schema: id, summary_id, name, category, outcome, files, time_proportion, metadata
// Summaries schema: id, date, version, markdown, structured_json, metadata, mode, models_used, created_at

// Category distribution query
const categories = db.prepare(`
  SELECT t.category, SUM(t.time_proportion) as total_proportion, COUNT(*) as task_count
  FROM tasks t
  JOIN summaries s ON t.summary_id = s.id
  WHERE s.date BETWEEN ? AND ?
  GROUP BY t.category
  ORDER BY total_proportion DESC
`).all(from, to);

// Daily trend query
const trends = db.prepare(`
  SELECT s.date, COUNT(t.id) as task_count
  FROM summaries s
  JOIN tasks t ON t.summary_id = s.id
  WHERE s.date BETWEEN ? AND ?
  GROUP BY s.date
  ORDER BY s.date
`).all(from, to);
```

**Query parameter validation pattern:**
```typescript
// Date range from query params
const from = c.req.query('from');
const to = c.req.query('to');
if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
  return c.json({ error: { code: 'INVALID_PARAMS', message: 'from and to query params required (YYYY-MM-DD)' } }, 400);
}
```

---

### `src/server/api/config.ts` (controller, CRUD)

**Analog:** `src/server/config.ts` (exact — wraps loadConfig/saveConfig)

**Imports pattern** (from `src/server/config.ts` lines 1-4):
```typescript
import { Hono } from 'hono';
import { loadConfig, saveConfig } from '../config.js';
import { logger } from '../logger.js';
```

**Config read/write pattern** (from `src/server/config.ts` lines 21-66):
```typescript
// GET /api/config — expose loadConfig()
const config = loadConfig();
return c.json({ config });

// PUT /api/config — expose saveConfig(partial)
const updates = await c.req.json<Partial<Config>>();
const merged = saveConfig(updates);
return c.json({ config: merged });
```

---

### `src/server/main.ts` (modify — add API routes + serveStatic)

**Self-analog:** `src/server/main.ts` (lines 32-36 — existing Hono app setup)

**Current code to extend** (lines 32-36):
```typescript
// Start HTTP server (Phase 4 adds frontend routes)
const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));
const httpServer = serve({ fetch: app.fetch, port: config.httpPort });
logger.info({ port: config.httpPort }, 'HTTP server started');
```

**Addition pattern — API routes before static:**
```typescript
import { apiApp } from './api/index.js';
import { serveStatic } from '@hono/node-server/serve-static';

// Register API first (D-15, Pitfall 2: order matters)
app.route('/api', apiApp);

// Serve static UI assets in production
app.use('/*', serveStatic({ root: './dist/ui' }));

// SPA fallback
app.get('*', (c) => {
  // serve index.html for non-API, non-static routes
});
```

---

### `src/server/api/summaries.test.ts` (test, request-response)

**Analog:** `src/server/config.test.ts` (lines 1-29 — setup/teardown pattern)

**Test structure pattern:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TEST_DIR = path.join(os.tmpdir(), 'dailywork-api-test-' + Date.now());

// Mock logger to suppress output during tests
vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock database module (no native module in test env)
vi.mock('../database.js', () => ({
  getDatabase: () => ({
    prepare: () => ({
      get: () => null,
      all: () => [],
      run: () => ({}),
    }),
  }),
}));
```

**Hono test pattern** (test Hono routes via `app.request()`):
```typescript
import { Hono } from 'hono';
import { summariesRoutes } from './summaries.js';

const app = new Hono().route('/api/summaries', summariesRoutes);

it('returns 404 for unknown date', async () => {
  const res = await app.request('/api/summaries/9999-01-01');
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body.error.code).toBe('NOT_FOUND');
});
```

---

### `vite.config.ts` (config)

**Analog:** `tsup.config.ts` (lines 1-24 — build config pattern)

**Pattern — defineConfig with plugins:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: 'src/ui',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/ui') },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:37888', changeOrigin: true } },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
  },
});
```

---

### `tsup.config.ts` (modify — sequential build)

**Self-analog** (existing file, lines 1-24):
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
  clean: true,
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [
    '@modelcontextprotocol/sdk',
    'hono',
    '@hono/node-server',
    '@anthropic-ai/sdk',
    'simple-git',
    'pino',
  ],
});
```

**Modification note:** The `clean: true` should be adjusted to NOT wipe `dist/ui/` (built by Vite first). Either remove `clean: true` or change build script to `vite build && tsup`.

---

## Shared Patterns

### Logging (stderr only)
**Source:** `src/server/logger.ts` (lines 1-9)
**Apply to:** All `src/server/api/*.ts` files
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: 2 }, // fd 2 = stderr
  },
});
```

Usage in route handlers:
```typescript
import { logger } from '../logger.js';
logger.info({ date, file: filePath }, 'Summary generated');
logger.error({ err }, 'generate endpoint failed');
```

### Error Response Format
**Source:** CONTEXT.md D-18
**Apply to:** All `src/server/api/*.ts` endpoint handlers
```typescript
// Success responses: c.json({ data }) with 200
// Error responses: structured format with appropriate HTTP status
return c.json({ error: { code: 'NOT_FOUND', message: `No summary for ${date}` } }, 404);
return c.json({ error: { code: 'INVALID_PARAMS', message: 'date is required' } }, 400);
return c.json({ error: { code: 'GENERATION_FAILED', message: err.message } }, 500);
```

### Database Access (Singleton)
**Source:** `src/server/database.ts` (lines 47-52)
**Apply to:** `src/server/api/summaries.ts`, `src/server/api/stats.ts`, `src/server/api/generate.ts`
```typescript
import { getDatabase } from '../database.js';

// Always use getDatabase() — throws if not initialized
const db = getDatabase();
const row = db.prepare('SELECT ...').get(param) as ExpectedType | undefined;
const rows = db.prepare('SELECT ...').all(param) as ExpectedType[];
```

### Date Validation
**Source:** `src/server/mcp/tools/generate-daily-summary.ts` (lines 147-155)
**Apply to:** All API endpoints accepting date params
```typescript
function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

function formatToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

### Test Setup (Mocking)
**Source:** `src/server/config.test.ts` (lines 1-29), `src/server/database.test.ts` (lines 1-18)
**Apply to:** All `src/server/api/*.test.ts` files
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Always mock logger
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Always mock database (native module)
vi.mock('../database.js', () => ({
  getDatabase: () => ({
    prepare: (sql: string) => ({
      get: (...args: unknown[]) => null,
      all: (...args: unknown[]) => [],
      run: (...args: unknown[]) => ({ changes: 0 }),
    }),
  }),
}));
```

### Path Resolution
**Source:** `src/shared/paths.ts` (lines 1-17)
**Apply to:** Any code that needs to resolve `~` paths (config, persistence)
```typescript
import { resolveHome } from '../shared/paths.js';
// or from '../../shared/paths.js' depending on depth

const resolved = resolveHome(config.outputDir);
```

### Config Access Pattern
**Source:** `src/server/config.ts` (lines 21-66)
**Apply to:** `src/server/api/config.ts`, any route needing config
```typescript
import { loadConfig, saveConfig, resolveConfigPaths } from '../config.js';

// Read: merge defaults with user file
const config = loadConfig();

// Write: partial update, merges with existing
const updated = saveConfig({ language: 'zh' });

// When accessing filesystem paths:
const resolved = resolveConfigPaths(loadConfig());
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/ui/main.tsx` | provider | request-response | No React code exists yet; use RESEARCH.md Pattern 5 (React Router v7 setup) |
| `src/ui/globals.css` | config | -- | No CSS exists yet; use RESEARCH.md "Global CSS" code example |
| `src/ui/lib/utils.ts` | utility | transform | shadcn/ui standard `cn()` helper; no analog needed |
| `src/ui/lib/api.ts` | service | request-response | No fetch wrapper exists; derive from RESEARCH.md TanStack Query patterns |
| `src/ui/hooks/use-summaries.ts` | hook | CRUD | No React hooks exist; use RESEARCH.md "TanStack Query Hook" example |
| `src/ui/hooks/use-generate.ts` | hook | streaming | No SSE consumer exists; use RESEARCH.md Pattern 3 |
| `src/ui/hooks/use-stats.ts` | hook | CRUD | No chart hooks exist; use RESEARCH.md "Chart Stats Hook" example |
| `src/ui/hooks/use-config.ts` | hook | CRUD | Derive from use-summaries pattern with queryKey ['config'] |
| `src/ui/pages/summaries.tsx` | component | CRUD | No pages exist; use RESEARCH.md Pattern 5 route structure |
| `src/ui/pages/generate.tsx` | component | streaming | No pages exist; combine SSE consumer with progress UI |
| `src/ui/pages/charts.tsx` | component | CRUD | No pages exist; react-grid-layout + Recharts composition |
| `src/ui/pages/settings.tsx` | component | CRUD | No pages exist; form with controlled inputs |
| `src/ui/components/layout/*` | component | -- | No layout components; derive from D-01 sidebar spec |
| `src/ui/components/ui/*` | component | -- | Generated by `npx shadcn@latest add`; no manual coding |

---

## Metadata

**Analog search scope:** `src/server/`, `src/shared/`, project root configs
**Files scanned:** 25+ source files across server, shared, and config
**Pattern extraction date:** 2026-05-27

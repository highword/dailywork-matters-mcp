# Phase 4: Web UI + HTTP API - Research

**Researched:** 2026-05-27
**Domain:** React SPA + REST API with Hono server integration, data visualization
**Confidence:** HIGH

## Summary

Phase 4 adds a React SPA frontend (4 pages: Summaries, Generate, Charts, Settings) and a REST API layer to the existing Hono HTTP server. The frontend is built with Vite, styled with Tailwind CSS v4 + shadcn/ui (neutral preset, sharp edges), uses TanStack Query for server state, React Router v7 (library/data mode) for navigation, Recharts for charts, and react-grid-layout for the draggable chart dashboard. The backend adds RESTful `/api/*` routes to the existing Hono app, SSE streaming for generation progress, and new SQL aggregation queries for chart data.

The architecture is single-process: Hono serves both the REST API and static frontend assets (from `dist/ui/`). In development, Vite dev server on :5173 proxies `/api/*` to Hono on :37888. In production, Hono's `serveStatic` middleware serves the built UI with SPA fallback.

**Primary recommendation:** Structure the frontend as `src/ui/` alongside existing `src/server/`, build API routes as a modular Hono sub-app, use shadcn/ui's neutral preset with 0px border-radius override to match the Hermes aesthetic, and design chart data endpoints as independent cacheable queries.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Navigation uses a fixed left sidebar with 4 page entries (Summaries, Generate, Charts, Settings)
- D-02: Frontend routing via React Router v7 (library mode, not framework mode)
- D-03: Summary page uses Master-Detail split layout
- D-04: Strictly 4 pages per roadmap
- D-05: UI component strategy: shadcn/ui + custom visual layer (Radix primitives + custom design tokens)
- D-06: State management: TanStack Query for server data + local useState for UI-only state
- D-07: Basic responsive design (desktop-first)
- D-08: System auto color scheme (prefers-color-scheme)
- D-09: Hermes-style developer tool aesthetic (backdrop-blur, gradients, sharp edges, monospace data)
- D-10: Chart library: Recharts
- D-11: 8 chart types on Charts page
- D-12: Time range control: preset quick buttons (7d/14d/30d/90d) + custom date range picker
- D-13: Charts page uses draggable dashboard layout (react-grid-layout), persisted in localStorage
- D-14: Charts are interactive (hover tooltips, click navigates to date)
- D-15: API style: RESTful resource with /api/ prefix
- D-16: Summary generation feedback: SSE real-time stream
- D-17: Chart data endpoints: split into multiple endpoints by chart type
- D-18: Error responses: structured JSON { error: { code, message } }
- D-19: Build pipeline: Vite builds frontend -> dist/ui/, then tsup bundles server -> dist/server.mjs
- D-20: Development mode: Vite dev server (:5173) with proxy to Hono (:37888)
- D-21: Production serving: Hono serveStatic middleware serves dist/ui/
- D-22: NPM distribution: dist/ui/ ships inside the package

### Claude's Discretion
- Frontend code directory structure (leaning src/ui/)
- CORS handling for dev mode
- Specific Recharts component composition and chart styling
- Draggable grid library choice (react-grid-layout confirmed in D-13)
- Exact API endpoint naming and query parameter design
- shadcn/ui component selection

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DLVR-03 | Web UI for browsing summaries, triggering generation, viewing charts, managing settings | Full stack researched: React Router for 4-page SPA, TanStack Query for API integration, Recharts for charts, Hono REST API for data layer, SSE for generation progress |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Page routing & navigation | Browser (React Router) | -- | Client-side SPA routing; no SSR needed for local tool |
| Summary browsing | API (Hono REST) | Browser (TanStack Query) | Data lives in SQLite/disk; API fetches, browser caches and renders |
| Summary generation trigger | API (Hono REST + SSE) | Browser (EventSource) | Heavy processing happens server-side; browser shows progress stream |
| Chart data aggregation | API (Hono REST + SQLite) | -- | SQL aggregation queries must run on server against better-sqlite3 |
| Chart visualization | Browser (Recharts) | -- | Rendering is purely client-side SVG |
| Dashboard layout persistence | Browser (localStorage) | -- | Single-user local tool; no server persistence needed for layout |
| Settings management | API (Hono REST) | Browser (form state) | Config file on disk; API reads/writes, browser presents form |
| Static asset serving | API (Hono serveStatic) | CDN/Static (none - local tool) | Production serves from dist/ui/ via Hono middleware |
| Color scheme | Browser (CSS media query) | -- | System preference via prefers-color-scheme, no server involvement |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.0 | UI rendering | [VERIFIED: npm registry] Latest stable; shadcn/ui v4+ targets React 19 |
| react-dom | ^19.2.0 | DOM rendering | [VERIFIED: npm registry] Matches React version |
| react-router | ^7.15.0 | Client-side routing (library/data mode) | [VERIFIED: npm registry] D-02 locked; createBrowserRouter for data mode |
| @tanstack/react-query | ^5.100.0 | Server state management | [VERIFIED: npm registry] D-06 locked; caching, revalidation, optimistic updates |
| recharts | ^3.8.0 | Chart visualization | [VERIFIED: npm registry] D-10 locked; declarative React charts |
| react-grid-layout | ^2.2.3 | Draggable/resizable chart dashboard | [VERIFIED: npm registry] D-13 locked; mature grid layout lib |
| lucide-react | ^1.16.0 | Icon library | [VERIFIED: npm registry] shadcn/ui default icon set |
| sonner | ^2.0.7 | Toast notifications | [VERIFIED: npm registry] shadcn/ui recommended replacement for toast |
| date-fns | ^4.3.0 | Date formatting/manipulation | [VERIFIED: npm registry] Tree-shakeable; needed for date picker + chart axes |

### Build & Dev

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite | ^6.4.0 | Frontend dev server + bundler | [VERIFIED: npm registry] Build UI to dist/ui/; dev HMR on :5173 |
| @vitejs/plugin-react | ^4.7.0 | React Fast Refresh + JSX transform | [VERIFIED: npm registry] Pairs with Vite 6; stable React support |
| tailwindcss | ^4.3.0 | Utility-first CSS | [VERIFIED: npm registry] v4 uses CSS-based config, @theme directive |
| @tailwindcss/vite | ^4.3.0 | Tailwind Vite plugin (replaces PostCSS) | [VERIFIED: npm registry] Tailwind v4 native Vite integration |
| tw-animate-css | ^1.4.0 | Animation utilities for shadcn/ui | [VERIFIED: npm registry] Required by shadcn/ui Tailwind v4 setup |
| @types/react | ^19.2.0 | TypeScript types for React | [VERIFIED: npm registry] |
| @types/react-dom | ^19.2.0 | TypeScript types for React DOM | [VERIFIED: npm registry] |
| @types/react-grid-layout | ^2.1.0 | TypeScript types for react-grid-layout | [VERIFIED: npm registry] |

### shadcn/ui Utilities (auto-installed by shadcn CLI)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.1 | Component variant definitions | [VERIFIED: npm registry] Used by shadcn Button, Badge etc. |
| clsx | ^2.1.1 | Conditional class merging | [VERIFIED: npm registry] |
| tailwind-merge | ^3.6.0 | Tailwind class deduplication | [VERIFIED: npm registry] cn() utility function |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo | Nivo has more chart types but larger bundle; Recharts is simpler, lighter |
| react-grid-layout | @hello-pangea/dnd | @hello-pangea/dnd is drag-only, no grid resize; react-grid-layout purpose-built for dashboard layouts |
| TanStack Query | SWR | SWR is lighter but lacks mutations, devtools, and query invalidation patterns |
| Vite 6 | Vite 8 | Vite 8 is `latest` but very new; Vite 6 is mature and broadly tested with all deps |

**Installation:**
```bash
# Frontend runtime dependencies
pnpm add react react-dom react-router @tanstack/react-query recharts react-grid-layout lucide-react sonner date-fns

# Frontend dev dependencies
pnpm add -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite tw-animate-css @types/react @types/react-dom @types/react-grid-layout
```

**shadcn/ui initialization (after vite config exists):**
```bash
npx shadcn@latest init
# Select: neutral base color, src/ui/globals.css, aliases @/
```

**Version verification:** All versions confirmed via `npm view <package> version` on 2026-05-27.

## Architecture Patterns

### System Architecture Diagram

```
[Browser :5173 (dev) / :37888 (prod)]
    |
    |-- React Router (client-side)
    |     |-- /summaries/:date  --> SummaryPage (MasterDetail)
    |     |-- /generate         --> GeneratePage (SSE consumer)
    |     |-- /charts           --> ChartsPage (react-grid-layout)
    |     \-- /settings         --> SettingsPage (form)
    |
    |-- TanStack Query (cache layer)
    |     |-- queryKey: ['summaries']       --> GET /api/summaries
    |     |-- queryKey: ['summary', date]   --> GET /api/summaries/:date
    |     |-- queryKey: ['stats', type, range] --> GET /api/stats/:type?from=&to=
    |     \-- queryKey: ['config']          --> GET /api/config
    |
    |-- fetch() / EventSource
    |
[Hono HTTP Server :37888]
    |
    |-- /api/summaries          (GET list, GET/:date detail)
    |-- /api/summaries/generate (POST -> SSE stream)
    |-- /api/stats/categories   (GET aggregation)
    |-- /api/stats/trends       (GET aggregation)
    |-- /api/stats/files        (GET aggregation)
    |-- /api/stats/hours        (GET aggregation)
    |-- /api/stats/heatmap      (GET aggregation)
    |-- /api/stats/projects     (GET aggregation)
    |-- /api/config             (GET/PUT)
    |-- /* static (serveStatic dist/ui/)
    \-- /* fallback (index.html for SPA routing)
         |
         |-- [SQLite WAL] summaries + tasks tables
         |-- [Disk] ~/dailywork-matters/summaries/*.md
         \-- [Disk] ~/.dailywork-matters/config.json
```

### Recommended Project Structure
```
src/
├── server/              # Existing server code
│   ├── main.ts          # Entry: add API routes + serveStatic here
│   ├── api/             # NEW: REST API route handlers
│   │   ├── index.ts     # Sub-app: all /api/* routes assembled
│   │   ├── summaries.ts # GET /api/summaries, GET /api/summaries/:date
│   │   ├── generate.ts  # POST /api/summaries/generate (SSE)
│   │   ├── stats.ts     # GET /api/stats/* (chart data)
│   │   └── config.ts    # GET/PUT /api/config
│   ├── adapters/        # Existing
│   ├── intelligence/    # Existing
│   ├── mcp/             # Existing
│   ├── persistence.ts   # Existing
│   ├── config.ts        # Existing
│   └── database.ts      # Existing
├── ui/                  # NEW: React frontend
│   ├── main.tsx         # Entry point: Router + QueryClient setup
│   ├── index.html       # Vite HTML entry (in root or src/ui/)
│   ├── globals.css      # Tailwind imports + shadcn theme variables
│   ├── lib/
│   │   ├── utils.ts     # cn() helper
│   │   └── api.ts       # Fetch wrapper with error handling
│   ├── hooks/
│   │   ├── use-summaries.ts
│   │   ├── use-generate.ts
│   │   ├── use-stats.ts
│   │   └── use-config.ts
│   ├── components/
│   │   ├── ui/          # shadcn/ui generated components
│   │   ├── layout/      # AppShell, Sidebar
│   │   ├── summaries/   # DateList, SummaryDetail, TaskRow
│   │   ├── generate/    # GenerateForm, ProgressStream
│   │   ├── charts/      # ChartDashboard, ChartCard, individual charts
│   │   └── settings/    # SettingsForm sections
│   └── pages/
│       ├── summaries.tsx
│       ├── generate.tsx
│       ├── charts.tsx
│       └── settings.tsx
└── shared/              # Existing shared types
    ├── types.ts
    └── paths.ts
```

### Pattern 1: Hono Sub-App for API Routes
**What:** Mount all API routes as a separate Hono app, then route from main app.
**When to use:** Always for this project (clean separation of API from static serving).
**Example:**
```typescript
// Source: Context7 /websites/hono_dev — route grouping
// src/server/api/index.ts
import { Hono } from 'hono';
import { summariesRoutes } from './summaries.js';
import { generateRoutes } from './generate.js';
import { statsRoutes } from './stats.js';
import { configRoutes } from './config.js';

export const apiApp = new Hono()
  .route('/summaries', summariesRoutes)
  .route('/summaries', generateRoutes)
  .route('/stats', statsRoutes)
  .route('/config', configRoutes);

// src/server/main.ts
app.route('/api', apiApp);
```

### Pattern 2: SSE Streaming for Generation Progress
**What:** Use Hono's `streamSSE` helper to push progress events during summary generation.
**When to use:** POST /api/summaries/generate endpoint.
**Example:**
```typescript
// Source: Context7 /websites/hono_dev — streamSSE
import { streamSSE } from 'hono/streaming';

app.post('/generate', async (c) => {
  const { date } = await c.req.json();
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: 'progress', data: JSON.stringify({ stage: 'gathering', message: 'Gathering events...' }) });
    
    const events = await gatherEvents(date);
    await stream.writeSSE({ event: 'progress', data: JSON.stringify({ stage: 'processing', message: `Processing window 1/${windowCount}...` }) });
    
    const result = await generateSummary(date, events, config);
    await stream.writeSSE({ event: 'complete', data: JSON.stringify({ summary: result.summary }) });
  });
});
```

### Pattern 3: TanStack Query with SSE Integration
**What:** Use mutation for triggering generation, consume SSE in onMutate/custom hook.
**When to use:** Generate page's real-time progress display.
**Example:**
```typescript
// Source: Context7 /tanstack/query — useMutation
function useGenerateSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      // SSE consumption handled by EventSource in the component
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
    },
  });
}
```

### Pattern 4: Hono SPA Fallback (Production)
**What:** Serve static assets, then fallback all non-API routes to index.html.
**When to use:** Production mode when serving the built SPA.
**Example:**
```typescript
// Source: Context7 /websites/hono_dev — serveStatic for Node.js
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';

// Serve static UI assets
app.use('/*', serveStatic({ root: './dist/ui' }));

// SPA fallback: non-API routes that didn't match a static file -> index.html
app.get('*', (c) => {
  const indexPath = path.join(process.cwd(), 'dist/ui/index.html');
  const html = fs.readFileSync(indexPath, 'utf-8');
  return c.html(html);
});
```

### Pattern 5: React Router v7 Library/Data Mode Setup
**What:** Use createBrowserRouter for client-side routing with data mode (loaders optional).
**When to use:** App entry point.
**Example:**
```typescript
// Source: Context7 /remix-run/react-router — createBrowserRouter + RouterProvider
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AppShell() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, lazy: () => import('./pages/summaries') },
      { path: 'summaries/:date?', lazy: () => import('./pages/summaries') },
      { path: 'generate', lazy: () => import('./pages/generate') },
      { path: 'charts', lazy: () => import('./pages/charts') },
      { path: 'settings', lazy: () => import('./pages/settings') },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
```

### Anti-Patterns to Avoid
- **Mixing API and static serving order:** API routes MUST be registered before the serveStatic catch-all, otherwise static middleware intercepts API paths.
- **Loading entire summary list with content:** Only return dates + metadata in list endpoint; load full content on detail request.
- **Polling for generation progress:** Use SSE (EventSource), not setTimeout polling. Single connection, server-pushed events.
- **Storing chart layout in API/DB:** This is per-device UI preference; localStorage is correct (single-user local tool).
- **Direct SQLite access from frontend:** All data access goes through REST API; no direct file/DB imports in ui/ code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker | Calendar dropdown component | shadcn/ui Calendar + Popover | Accessibility, keyboard nav, locale handling |
| Toast notifications | Custom notification system | sonner (via shadcn/ui) | Animation, stacking, auto-dismiss, SSR-safe |
| Draggable grid | Custom drag-and-drop with resize | react-grid-layout | Breakpoint responsiveness, collision detection, persist/restore |
| Chart tooltips | Custom hover overlays | Recharts Tooltip component | Position calculation, boundary detection, animation |
| Form validation | Manual form state tracking | Controlled inputs + simple validation | For this scope, no Formik/react-hook-form needed (only Settings page) |
| CSS utility function | Manual className concatenation | cn() = clsx + tailwind-merge | Handles Tailwind class conflicts correctly |
| SSE parsing | Manual text/event-stream parser | Native EventSource API | Built into browsers, handles reconnection |
| Theme switching | Custom theme context | CSS `prefers-color-scheme` media query + `.dark` class | D-08 locks system-auto; Tailwind v4 handles natively |

**Key insight:** This is a local developer tool with a single user. Most "scale" concerns (state management complexity, server-side rendering, CDN distribution) don't apply. Keep it simple: fetch data, render it, cache locally.

## Common Pitfalls

### Pitfall 1: Vite Proxy Not Forwarding SSE Correctly
**What goes wrong:** SSE connections through Vite's dev proxy get buffered or drop.
**Why it happens:** HTTP proxy middleware may buffer responses; SSE needs streaming.
**How to avoid:** Ensure the Vite proxy config does NOT rewrite headers. The default `http-proxy` used by Vite supports streaming natively, but custom `configure` callbacks that set response headers can break it.
**Warning signs:** SSE events arrive all at once after generation completes instead of progressively.

### Pitfall 2: serveStatic vs API Route Ordering
**What goes wrong:** Static middleware catches `/api/summaries` requests because a file `summaries` might not exist (returns 404) or worse, intercepts before API routes.
**Why it happens:** Middleware registration order in Hono matters.
**How to avoid:** Register API routes FIRST (`app.route('/api', apiApp)`), THEN register serveStatic catch-all. The API routes have priority because they match first.
**Warning signs:** API calls return 404 or HTML in production mode.

### Pitfall 3: React Router Basename Conflict
**What goes wrong:** Routes work in dev but 404 in production because the SPA is served from root but index.html isn't found for sub-paths.
**Why it happens:** SPA routing requires all non-asset, non-API paths to serve index.html.
**How to avoid:** Add explicit fallback route in Hono after serveStatic: any GET request that didn't match API or static file returns index.html.
**Warning signs:** Direct navigation to `/charts` or `/settings` shows blank page or 404 in production.

### Pitfall 4: Tailwind v4 Configuration Confusion
**What goes wrong:** Tailwind classes don't work; old `tailwind.config.js` patterns fail.
**Why it happens:** Tailwind v4 moved to CSS-first configuration. No more `tailwind.config.js`. Configuration is done via `@theme` and `@import` in CSS.
**How to avoid:** Use `@tailwindcss/vite` plugin (not PostCSS). Configure via CSS `@theme inline {}` directive. shadcn/ui v4+ generates the correct CSS structure.
**Warning signs:** Utility classes not generating; `@apply` not working; `tailwind.config.js` exists but is ignored.

### Pitfall 5: react-grid-layout CSS Not Loaded
**What goes wrong:** Grid items overlap or don't drag properly.
**Why it happens:** react-grid-layout requires its CSS file to be imported explicitly.
**How to avoid:** Import `react-grid-layout/css/styles.css` and `react-resizable/css/styles.css` in the charts page or globally.
**Warning signs:** Elements render but are stacked on top of each other; drag handles don't appear.

### Pitfall 6: better-sqlite3 Synchronous Blocking During Generation
**What goes wrong:** UI becomes unresponsive during summary generation because SQLite writes block the event loop.
**Why it happens:** better-sqlite3 is synchronous; long write operations block Node.js.
**How to avoid:** The generation process (AI calls) is already async. Only the final DB insert is sync, which is fast. For chart aggregation queries: they run on WAL-mode reads which are non-blocking against writes. No issue in practice for this single-user tool.
**Warning signs:** Only an issue if generation involves many sequential sync operations (it doesn't).

### Pitfall 7: shadcn/ui Border Radius Override
**What goes wrong:** Components still have rounded corners despite D-09 sharp-edge requirement.
**Why it happens:** shadcn/ui defaults to `--radius: 0.625rem`. Must override to 0.
**How to avoid:** Set `--radius: 0` in `:root` CSS variables. All shadcn components derive border-radius from this variable.
**Warning signs:** Buttons, cards, inputs have rounded corners.

## Code Examples

### Vite Configuration (src/ui/vite.config.ts)
```typescript
// Based on: Context7 /vitejs/vite — proxy config
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, '../..'),  // or use separate vite root
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:37888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/ui'),
    emptyOutDir: true,
  },
});
```

### Hono API Route Handler (src/server/api/summaries.ts)
```typescript
import { Hono } from 'hono';
import { getDatabase } from '../database.js';
import { loadSummaryFromDisk, listSummaryDates } from '../persistence.js';

export const summariesRoutes = new Hono();

// GET /api/summaries — list all available dates
summariesRoutes.get('/', (c) => {
  const config = c.get('config');
  const dates = listSummaryDates(config.outputDir);
  return c.json({ dates });
});

// GET /api/summaries/:date — get full summary for a date
summariesRoutes.get('/:date', (c) => {
  const { date } = c.req.param();
  const db = getDatabase();
  const row = db.prepare(
    'SELECT * FROM summaries WHERE date = ? ORDER BY version DESC LIMIT 1'
  ).get(date);
  
  if (row) {
    return c.json({
      date: row.date,
      version: row.version,
      summary: JSON.parse(row.structured_json),
      markdown: row.markdown,
      metadata: JSON.parse(row.metadata),
    });
  }
  
  return c.json({ error: { code: 'NOT_FOUND', message: `No summary for ${date}` } }, 404);
});
```

### SSE Generation Endpoint (src/server/api/generate.ts)
```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const generateRoutes = new Hono();

generateRoutes.post('/generate', async (c) => {
  const { date } = await c.req.json<{ date?: string }>();
  const targetDate = date ?? formatToday();

  return streamSSE(c, async (stream) => {
    let eventId = 0;

    await stream.writeSSE({
      id: String(eventId++),
      event: 'progress',
      data: JSON.stringify({ stage: 'gathering', message: 'Gathering events...' }),
    });

    // ... gather events, process windows, merge ...

    await stream.writeSSE({
      id: String(eventId++),
      event: 'complete',
      data: JSON.stringify({ date: targetDate, summary: result.summary }),
    });
  });
});
```

### TanStack Query Hook (src/ui/hooks/use-summaries.ts)
```typescript
import { useQuery } from '@tanstack/react-query';

interface SummaryListResponse {
  dates: string[];
}

export function useSummaryDates() {
  return useQuery({
    queryKey: ['summaries'],
    queryFn: async (): Promise<SummaryListResponse> => {
      const res = await fetch('/api/summaries');
      if (!res.ok) throw new Error('Failed to fetch summaries');
      return res.json();
    },
    staleTime: 60_000, // 1 min cache
  });
}

export function useSummaryDetail(date: string | undefined) {
  return useQuery({
    queryKey: ['summary', date],
    queryFn: async () => {
      const res = await fetch(`/api/summaries/${date}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
    enabled: !!date,
  });
}
```

### Chart Stats Hook (src/ui/hooks/use-stats.ts)
```typescript
import { useQuery } from '@tanstack/react-query';

export function useStats(type: string, from: string, to: string) {
  return useQuery({
    queryKey: ['stats', type, from, to],
    queryFn: async () => {
      const res = await fetch(`/api/stats/${type}?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Failed to fetch ${type} stats`);
      return res.json();
    },
    staleTime: 5 * 60_000, // 5 min cache for aggregated data
  });
}
```

### Global CSS (src/ui/globals.css) — Hermes Theme
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;
}

:root {
  --radius: 0;
  --background: hsl(0 0% 98%);
  --foreground: hsl(0 0% 9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 9%);
  --primary: hsl(220 70% 50%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(0 0% 96%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96%);
  --muted-foreground: hsl(0 0% 45%);
  --accent: hsl(220 70% 50%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 72% 51%);
  --border: hsl(0 0% 90%);
  --input: hsl(0 0% 90%);
  --ring: hsl(220 70% 50%);
}

.dark {
  --background: hsl(0 0% 7%);
  --foreground: hsl(0 0% 95%);
  --card: hsl(0 0% 11%);
  --card-foreground: hsl(0 0% 95%);
  --primary: hsl(220 70% 60%);
  --primary-foreground: hsl(0 0% 7%);
  --secondary: hsl(0 0% 15%);
  --secondary-foreground: hsl(0 0% 95%);
  --muted: hsl(0 0% 15%);
  --muted-foreground: hsl(0 0% 55%);
  --accent: hsl(220 70% 60%);
  --accent-foreground: hsl(0 0% 7%);
  --destructive: hsl(0 62% 55%);
  --border: hsl(0 0% 20%);
  --input: hsl(0 0% 20%);
  --ring: hsl(220 70% 60%);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js | CSS @theme directive (Tailwind v4) | 2025-02 | No JS config file; all in CSS |
| PostCSS for Tailwind | @tailwindcss/vite plugin | 2025-02 | Faster, simpler setup |
| shadcn/ui default style | new-york style (deprecated default) | 2025-02 | Use `new-york` or `radix-nova` style |
| HSL color variables | OKLCH color space | 2025-02 | Better perceptual uniformity |
| React.forwardRef | Direct ref prop (React 19) | 2024-12 | shadcn/ui components no longer use forwardRef |
| react-router v6 data APIs | react-router v7 data mode | 2025 | Same API, new package version |
| @tanstack/react-query v4 | v5 | 2024 | No QueryCache separate from QueryClient |

**Deprecated/outdated:**
- `tailwindcss-animate`: Replaced by `tw-animate-css` for Tailwind v4
- `tailwind.config.js/ts`: No longer used in Tailwind v4 projects
- shadcn/ui `default` style: Deprecated in favor of `new-york` / `radix-nova`
- `React.forwardRef`: Not needed in React 19; shadcn/ui components updated

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite 6 is the safest choice over Vite 8 for broad ecosystem compatibility | Standard Stack | LOW — Vite 8 works too but is newer; can switch if issues arise |
| A2 | react-grid-layout CSS imports are sufficient for Tailwind v4 coexistence | Common Pitfalls | LOW — standard CSS imports work alongside Tailwind |
| A3 | shadcn/ui `radix-nova` style is the current recommended style for new projects | Standard Stack | LOW — `new-york` also works; both have 0-radius support |

## Open Questions

1. **shadcn/ui style selection (new-york vs radix-nova)**
   - What we know: shadcn/ui deprecated `default` style, recommends `new-york` or `radix-nova`
   - What's unclear: Which maps best to Hermes aesthetic with 0 border-radius
   - Recommendation: Use `new-york` (closest to neutral/sharp) and override `--radius: 0`

2. **Vite config location for monorepo-like structure**
   - What we know: UI code lives in `src/ui/`, but Vite needs a root with `index.html`
   - What's unclear: Whether to put `vite.config.ts` at project root or in `src/ui/`
   - Recommendation: Put `vite.config.ts` at project root with `root: 'src/ui'` option. Keep `index.html` in `src/ui/`.

3. **Chart aggregation SQL query complexity**
   - What we know: Tasks table has category, time_proportion; summaries has date, structured_json
   - What's unclear: Whether existing schema covers all 8 chart types (heatmap needs date counts, hours distribution needs event timestamps)
   - Recommendation: Most charts can be derived from tasks table joins. Work hours distribution (chart 7) may need raw events table or structured_json metadata. Implement what's available; defer complex charts if data insufficient.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | Yes | v24.15.0 | -- |
| npm | Package installs | Yes | 11.12.1 | -- |
| pnpm | Project package manager | Yes (via npx) | 11.3.0 | npm |
| TypeScript | Build | Yes (in devDeps) | ^5.7.0 | -- |
| Vitest | Testing | Yes (in devDeps) | ^3.1.0 | -- |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** pnpm not globally installed but available via npx; project lockfile is pnpm-lock.yaml so must use pnpm.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.x |
| Config file | vitest.config.ts (exists, environment: node) |
| Quick run command | `pnpm test -- --run src/server/api/` |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DLVR-03.1 | React SPA loads with 4 pages navigable | smoke (manual) | Manual: visit localhost:37888 | N/A |
| DLVR-03.2 | Browse summaries + view detail | unit (API) | `pnpm test -- --run src/server/api/summaries.test.ts` | Wave 0 |
| DLVR-03.3 | Trigger generation + see result | unit (API) | `pnpm test -- --run src/server/api/generate.test.ts` | Wave 0 |
| DLVR-03.4 | Charts show category/time data | unit (API) | `pnpm test -- --run src/server/api/stats.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run src/server/api/`
- **Per wave merge:** `pnpm test -- --run`
- **Phase gate:** Full suite green + manual smoke test (visit localhost:37888)

### Wave 0 Gaps
- [ ] `src/server/api/summaries.test.ts` — covers DLVR-03.2 (list + detail endpoints)
- [ ] `src/server/api/generate.test.ts` — covers DLVR-03.3 (SSE generation endpoint)
- [ ] `src/server/api/stats.test.ts` — covers DLVR-03.4 (chart data aggregation)
- [ ] Vitest config may need `environment: 'jsdom'` for UI component tests (separate config)
- [ ] Frontend smoke testing: manual verification (no Playwright/Cypress in scope for MVP)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Local tool, single user, no auth |
| V3 Session Management | No | No sessions (stateless REST) |
| V4 Access Control | No | Single user, localhost only |
| V5 Input Validation | Yes | Zod for API input validation (date format, config schema) |
| V6 Cryptography | No | No secrets handled by UI/API |

### Known Threat Patterns for Local Dev Tool

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via date param | Tampering | Validate date format strictly (YYYY-MM-DD regex) before filesystem access |
| XSS in rendered summary markdown | Tampering | Render markdown safely (no dangerouslySetInnerHTML with raw user content) |
| SSRF via config gitRepoScanDirs | Tampering | Config only writable via localhost API; no external input vectors |

**Note:** This is a localhost-only developer tool. No authentication is needed. The HTTP server binds to 127.0.0.1 (or 0.0.0.0 if configured — recommend defaulting to localhost only).

## Sources

### Primary (HIGH confidence)
- Context7 /remix-run/react-router — createBrowserRouter, Outlet, data mode setup
- Context7 /websites/hono_dev — streamSSE, serveStatic, route grouping
- Context7 /tanstack/query — useQuery, useMutation, QueryClientProvider
- Context7 /recharts/recharts — PieChart, BarChart, LineChart, AreaChart patterns
- Context7 /websites/ui_shadcn — Tailwind v4 setup, components.json, CSS variables
- npm registry — all package versions verified 2026-05-27

### Secondary (MEDIUM confidence)
- Context7 /vitejs/vite — proxy configuration, build.outDir

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry, APIs confirmed via Context7
- Architecture: HIGH — existing codebase patterns (Hono app, SQLite, persistence) directly inform REST API design
- Pitfalls: HIGH — derived from official documentation (Tailwind v4 migration, Hono middleware ordering) and known patterns

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable ecosystem, no fast-moving dependencies)

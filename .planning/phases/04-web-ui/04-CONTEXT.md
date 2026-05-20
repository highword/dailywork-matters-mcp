# Phase 4: Web UI + HTTP API — Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers can browse summaries, trigger generation, view charts, and manage settings through a local web interface at localhost:37888. This phase delivers a React SPA with 4 pages (Summaries, Generate, Charts, Settings), REST API endpoints for the frontend, and embeds the built UI as static assets served by the existing Hono HTTP server.

</domain>

<decisions>
## Implementation Decisions

### Page Layout & Navigation
- **D-01:** Navigation uses a **fixed left sidebar** with 4 page entries (Summaries, Generate, Charts, Settings).
- **D-02:** Frontend routing via **React Router v7** (library mode, not framework mode). Provides loader/action patterns, code splitting, and extensibility for future pages.
- **D-03:** Summary page uses **Master-Detail split layout** — left panel shows date list, right panel shows selected date's full summary. Narrow screens degrade to list→detail toggle.
- **D-04:** Strictly **4 pages** per roadmap: Summaries (default landing, auto-selects most recent date), Generate (independent task trigger page), Charts (dashboard), Settings (form-based).
- **D-05:** UI component strategy: **shadcn/ui + custom visual layer** — Radix primitives for accessibility/interaction, fully custom design tokens for visual personality.
- **D-06:** State management: **TanStack Query** for server data (caching, revalidation, optimistic updates) + local `useState` for UI-only state.
- **D-07:** Basic responsive design (sidebar collapses on narrow screens, Master-Detail degrades), but desktop-first — this is a local developer tool.

### Visual Design
- **D-08:** **System auto** color scheme — follows OS light/dark preference via `prefers-color-scheme`.
- **D-09:** Visual identity: **Hermes-style developer tool aesthetic** — NOT generic flat SaaS. Key traits:
  - Backdrop-blur (frosted glass) on layered surfaces
  - Subtle gradients and multi-layer box-shadows for depth
  - Precise typography (strong weight variation, monospace for data/code)
  - Sharp edges with refined details (precision tool feel, not consumer-app roundness)
  - Restrained but purposeful transitions/animations (hover feedback, page transitions)
  - Dark mode should be especially polished (this is where the aesthetic shines)

### Charts & Visualization
- **D-10:** Chart library: **Recharts** (declarative, composable, ~45KB gzipped, strong React ecosystem).
- **D-11:** 8 chart types on the Charts page:
  1. Category distribution (Donut chart)
  2. Time proportion per task (Horizontal Bar)
  3. Daily trend — task count over time (Line)
  4. Category trend over time (Stacked Area)
  5. Output heatmap — GitHub-style contribution calendar (Heatmap)
  6. File activity Top N (Horizontal Bar)
  7. Work hours distribution — 24h radial/clock chart (Radial)
  8. Project time allocation (Treemap or Stacked Bar)
- **D-12:** Time range control: **preset quick buttons** (7d/14d/30d/90d) **+ custom date range picker**.
- **D-13:** Charts page uses **draggable dashboard layout** — users can resize and reposition chart cards. Layout persisted in **localStorage**.
- **D-14:** Charts are **interactive** — hover shows tooltip with values, click navigates to corresponding date's Summary detail.

### REST API Design
- **D-15:** API style: **RESTful resource** with `/api/` prefix. All API routes under `/api/*`, frontend static assets served from root `/`.
- **D-16:** Summary generation feedback: **SSE real-time stream** — POST to generate endpoint returns SSE stream with progress events (processing window 1/3, 2/3, merging, done). No job queue needed (single-user local tool).
- **D-17:** Chart data endpoints: **split into multiple endpoints** by chart type (e.g., `/api/stats/categories`, `/api/stats/trends`, `/api/stats/files`, `/api/stats/hours`). Frontend loads each chart's data independently.
- **D-18:** Error responses: **structured JSON** — `{ error: { code: "NOT_FOUND", message: "..." } }` with appropriate HTTP status codes.

### Build & Embedding Strategy
- **D-19:** Build pipeline: **Vite builds frontend → `dist/ui/`**, then **tsup bundles server → `dist/server.mjs`**. Sequential: `vite build && tsup`.
- **D-20:** Development mode: **Vite dev server (:5173)** with proxy config forwarding `/api/*` to Hono (:37888). Full HMR for frontend, API served by backend process.
- **D-21:** Production serving: **Hono `serveStatic`** middleware serves `dist/ui/` directory. Non-API, non-static routes fallback to `index.html` (SPA routing).
- **D-22:** NPM distribution: `dist/ui/` ships inside the package alongside `dist/server.mjs`. Zero download on first run.

### Claude's Discretion
- Frontend code directory structure (src/ui/ vs ui/ workspace — leaning src/ui/ for simplicity)
- CORS handling for dev mode (Vite proxy makes it unnecessary, but dev-only CORS header is fine as fallback)
- Specific Recharts component composition and chart styling details
- Draggable grid library choice (react-grid-layout or similar)
- Exact API endpoint naming and query parameter design
- shadcn/ui component selection (which primitives to include)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `CLAUDE.md` — Stack (React+Vite+Tailwind, Hono, tsup bundle), conventions (stderr logging, streaming parsers)
- `.planning/phases/02-intelligence/02-CONTEXT.md` — D-10 (JSON is truth, Markdown is derived), D-11 (output formats configurable)
- `.planning/phases/03-mcp-transport/03-CONTEXT.md` — D-07 (dual transport, HTTP on port 37888), D-08 (stderr only)

### Data Layer (dependency)
- `src/server/main.ts` — Existing Hono app with `/health` endpoint, dual transport setup
- `src/server/persistence.ts` — `listSummaryDates()`, `loadSummaryFromDisk()`, `saveSummaryFile()` — persistence APIs the frontend will consume
- `src/server/intelligence/index.ts` — `generateSummary()` entry point for triggering generation
- `src/server/intelligence/types.ts` — `DailySummary`, `Task`, `SummaryMetadata` — the data shapes the UI renders
- `src/shared/types.ts` — `Config` interface (settings page renders/edits this)
- `src/server/config.ts` — `loadConfig()`, `saveConfig()` — config management the settings page calls
- `src/server/database.ts` — SQLite with WAL, `summaries` and `tasks` tables for chart aggregation queries

### Requirements
- `.planning/ROADMAP.md` §Phase 4 — Success criteria (4 items), UI hint

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/main.ts:33-35` — Hono app already created and serving on port 37888; add API routes and static serving here
- `src/server/persistence.ts` — Full file-based persistence API (list dates, load summary, save summary, version tracking)
- `src/server/intelligence/index.ts` — `generateSummary(date, events, config)` — direct integration point for Generate page
- `src/server/config.ts` — `loadConfig()` / `saveConfig()` — backend for Settings page
- `src/server/adapters/registry.ts` — `AdapterRegistry.gatherEvents(range)` — needed to feed intelligence layer

### Established Patterns
- **Hono for HTTP** — already in use, add routes to existing app instance
- **Pino logger to stderr** — all backend logging follows this; new API routes must too
- **SQLite WAL mode** — concurrent reads safe; chart aggregation queries can run without blocking writes
- **Config at `~/.dailywork-matters/config.json`** — settings page reads/writes this file
- **Singleton DB with `getDatabase()`** — chart queries use this to access summaries/tasks tables

### Integration Points
- Add REST API routes to Hono app in `src/server/main.ts`
- Add `serveStatic` middleware for `dist/ui/` in production mode
- Chart aggregation requires new SQL queries against `summaries` and `tasks` tables
- SSE streaming for generate endpoint: Hono supports `c.stream()` / `c.streamText()`
- Vite config needs proxy to `:37888/api/*` for dev mode

</code_context>

<specifics>
## Specific Ideas

- 视觉风格参考 **Hermes (Mercury macOS client)** — 毛玻璃层叠、精致排版、开发者工具的锋利感。不要千篇一律的扁平 SaaS 模板。
- 产出热力图参考 **GitHub contribution graph** 的交互模式
- Charts 页面的可拖拽布局类似 **Grafana dashboard** 的网格拖拽体验
- 图表点击联动到 Summary 详情页 — 类似 BI 工具的 drill-down 体验

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-web-ui*
*Context gathered: 2026-05-21*

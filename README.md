<p align="center">
  <img src=".github/assets/banner.png" alt="Dailywork Matters" width="100%" />
</p>

<p align="center">
  <strong>Your AI-powered daily work journal. Zero effort. Full picture.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dailywork-matters"><img src="https://img.shields.io/npm/v/dailywork-matters?color=4a7c8a&label=npm" alt="npm version" /></a>
  <a href="https://github.com/highword/dailywork-matters-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/highword/dailywork-matters-mcp?color=4a7c8a" alt="License" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-4a7c8a" alt="Platform" />
  <img src="https://img.shields.io/badge/MCP-compatible-4a7c8a" alt="MCP Compatible" />
</p>

<p align="center">
  Aggregates your Claude Code sessions + Git history into intelligent, outcome-oriented daily summaries.<br/>
  Works as an <strong>MCP Server</strong> with any compatible client, plus a local <strong>Web UI</strong> for browsing and generating reports.
</p>

<p align="center">
  <a href="./README_CN.md">中文</a> | English
</p>

---

## The Problem

You ship code all day. At EOD, someone asks "what did you work on?" and you draw a blank. Standup notes are always stale. Time tracking is tedious. Your best work is invisible.

## The Solution

Dailywork Matters reads your **Claude Code session logs** and **Git history**, then uses AI to synthesize a single, coherent daily report — focused on *outcomes*, not operations.

```
"Implemented authentication flow with OAuth2, fixed 3 race conditions
 in the connection pool, and reviewed PR #142 for the billing team."
```

Not:

```
"Edited 47 files. Made 12 commits. Had 6 Claude sessions."
```

---

## Quick Start

```bash
npx dailywork-matters
```

That's it. Opens on `http://localhost:37888`.

### Configure as MCP Server

Add to your Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "dailywork-matters": {
      "command": "npx",
      "args": ["dailywork-matters"]
    }
  }
}
```

Then ask Claude: *"Generate my daily summary"*

---

## Features

### MCP Tools (6 tools)

| Tool | Description |
|------|-------------|
| `generate_daily_summary` | AI-powered summary for any date |
| `generate_batch_summary` | Process a date range (max 3 concurrent) |
| `get_summary_by_date` | Retrieve a stored summary |
| `list_today_sessions` | Show today's Claude Code sessions |
| `save_summary` | Persist a summary as Markdown |
| `configure_settings` | Update configuration via MCP |

### Web UI

- **Summaries** — Browse past summaries with full detail view
- **Generate** — Trigger generation for any date with live SSE streaming
- **Charts** — Category distribution, time proportions, 8 chart types with draggable grid
- **Settings** — Configure API key, models, data sources, schedule

### Intelligence

- **Dual mode** — Works with or without API key. Zero-config mode returns structured data for your MCP host to synthesize; API key mode produces complete Markdown independently.
- **Cross-session aggregation** — Work spanning multiple sessions on the same topic appears as one merged task.
- **Outcome-oriented** — Describes *what was accomplished*, not what operations were performed.
- **Streaming parser** — Handles large JSONL session files without loading them into memory.

### Operations

- **Scheduled generation** — Configure `scheduleTime` for automatic daily summaries
- **Startup catch-up** — Generates missing days on launch (capped at 30)
- **Cross-platform** — Windows, macOS, Linux
- **Single dependency** — Only `better-sqlite3` at runtime (everything else bundled)

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │     │   Git History    │
│  Session Logs   │     │   (Commits +     │
│  (.jsonl)       │     │    Diffs)        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│         Adapter Layer (Streaming)        │
│   Normalize → NormalizedEvent interface  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│          Intelligence Engine             │
│  Compress → Window → Merge → Render     │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  MCP     │   │  Web UI  │   │ Markdown │
│  Tools   │   │ :37888   │   │  Files   │
└──────────┘   └──────────┘   └──────────┘
```

---

## Configuration

Config lives at `~/.dailywork-matters/config.json`. Edit via Web UI Settings page or MCP tool.

```json
{
  "ai": {
    "apiKey": "sk-ant-...",
    "baseUrl": null,
    "windowModel": "claude-haiku-4-5-20251001",
    "mergeModel": "claude-sonnet-4-6-20250514"
  },
  "outputDir": "~/dailywork-matters/summaries",
  "scheduleTime": "18:00",
  "language": "en",
  "gitIdentities": ["your@email.com"],
  "gitRepoScanDirs": ["~/projects"]
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `ai.apiKey` | Anthropic API key (or proxy key) | `null` (zero-config mode) |
| `ai.baseUrl` | Custom endpoint for proxies | `null` (uses Anthropic default) |
| `ai.windowModel` | Model for per-window summarization | `claude-haiku-4-5-20251001` |
| `ai.mergeModel` | Model for final merge/synthesis | `claude-sonnet-4-6-20250514` |
| `scheduleTime` | Auto-generate time (HH:MM, 24h) | `null` (disabled) |
| `language` | Summary language (`en` / `zh`) | `en` |
| `gitIdentities` | Filter commits by author | `[]` (all commits) |
| `gitRepoScanDirs` | Directories to scan for git repos | `[]` |

---

## Development

```bash
git clone https://github.com/highword/dailywork-matters-mcp.git
cd dailywork-matters-mcp
pnpm install

# Backend (HTTP-only, no MCP stdio)
pnpm dev:http

# Frontend (Vite HMR, proxies /api to :37888)
pnpm dev:ui

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Server | Hono + @hono/node-server |
| MCP | @modelcontextprotocol/sdk v1 |
| Database | better-sqlite3 (WAL mode) |
| AI | @anthropic-ai/sdk |
| Frontend | React 19 + Vite + Tailwind v4 |
| Charts | Recharts + react-grid-layout |
| Bundle | tsup (server) + Vite (UI) |
| Test | Vitest |

---

## Privacy & Data

- **100% local.** All data stays on your machine. No telemetry. No cloud sync.
- Session logs are read from your local `~/.claude/projects` directory.
- Summaries are stored as plain Markdown files in your configured output directory.
- API key is stored in your local config file and only used to call the AI provider you configure.
- The HTTP server binds to `localhost` only — not accessible from the network.

---

## Roadmap

- [ ] Calendar view for summaries
- [ ] Cross-day task continuity tracking
- [ ] UI visual redesign
- [ ] Auto-start HTTP on session open
- [ ] More data source adapters (Cursor, VS Code, etc.)

---

## License

MIT

---

<p align="center">
  <sub>Built by developers, for developers who ship every day.</sub>
</p>

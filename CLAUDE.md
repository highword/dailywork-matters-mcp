# dailywork-matters-mcp

## Project

MCP Server that aggregates Claude Code sessions + Git history into AI-powered, outcome-oriented daily work summaries. Serves via 5 MCP tools + local Web UI.

**Stack:** TypeScript, MCP SDK v1, Hono, better-sqlite3, React+Vite+Tailwind (embedded static), tsup bundle
**Architecture:** Single process dual transport (stdio MCP + HTTP Web UI), adapter pattern for data sources, streaming JSONL parser, map-reduce AI summarization

## Workflow

This project uses GSD workflow. Planning docs live in `.planning/`.

- **Current milestone:** v1.0 MVP
- **Phases:** 5 (Foundation → Intelligence → MCP Transport → Web UI → Distribution)
- **Mode:** YOLO (auto-approve execution)
- **Parallelization:** enabled

## Conventions

- All logging to **stderr** (stdout reserved for MCP protocol)
- Streaming parsers only (never load full JSONL into memory)
- Path resolution via `os.homedir()` (never raw `~`)
- Single native runtime dependency: `better-sqlite3`
- All other deps bundled at build time via tsup
- Config at `~/.dailywork-matters/config.json`
- Summaries at `~/dailywork-matters/summaries/YYYY-MM-DD.md`

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Bundle server + UI
pnpm test       # Run Vitest
pnpm lint       # Biome check
```

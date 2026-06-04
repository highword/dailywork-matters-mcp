# Phase 3: MCP Transport + Persistence — Research

**Researched:** 2026-05-20
**SDK Version:** @modelcontextprotocol/sdk 1.29.0
**Zod Version:** 4.4.3

## 1. MCP SDK Server API (v1.29.0)

### McpServer Class

The high-level API is `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'dailywork-matters',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});
```

### Tool Registration (new API — `registerTool`)

The `.tool()` methods are **deprecated**. Use `registerTool`:

```typescript
import { z } from 'zod';

server.registerTool('generate_daily_summary', {
  description: 'Generate a daily work summary for a specific date',
  inputSchema: {
    date: z.string().optional().describe('Date in YYYY-MM-DD format (default: today)'),
  },
}, async (args, extra) => {
  // Return CallToolResult
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
  };
});
```

### Resource Registration (new API — `registerResource`)

For static resources (fixed URI):
```typescript
server.registerResource('summary-2026-05-20', 'summary://2026-05-20', {
  description: 'Daily summary for 2026-05-20',
  mimeType: 'text/markdown',
}, async (uri) => {
  return { contents: [{ uri, text: markdownContent, mimeType: 'text/markdown' }] };
});
```

For dynamic resources (URI template):
```typescript
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

server.registerResource('daily-summary', new ResourceTemplate('summary://{date}', { list: undefined }), {
  description: 'Daily work summaries',
  mimeType: 'text/markdown',
}, async (uri, { date }) => {
  return { contents: [{ uri: uri.href, text: markdownContent, mimeType: 'text/markdown' }] };
});
```

### Prompt Registration (new API — `registerPrompt`)

```typescript
server.registerPrompt('generate-summary', {
  description: 'Guide summary generation for a date',
  argsSchema: {
    date: z.string().optional().describe('Date in YYYY-MM-DD format'),
  },
}, async (args) => {
  return {
    messages: [{
      role: 'user',
      content: { type: 'text', text: `Generate a daily work summary for ${args.date || 'today'}...` },
    }],
  };
});
```

### Transport Connection

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

StdioServerTransport reads from `process.stdin` and writes to `process.stdout`. All other output MUST go to stderr.

## 2. Stdio Protocol Constraints

### Critical: stdout is MCP-only
- `StdioServerTransport` reads/writes JSON-RPC messages on stdin/stdout
- ANY non-JSON-RPC output on stdout WILL corrupt the protocol
- Logger must target stderr (fd 2) — already configured via Pino
- No `console.log()` allowed anywhere in the codebase — use `logger.*` exclusively

### Process Lifecycle
- Client spawns server process via `npx dailywork-matters-mcp`
- Server initializes, connects transport, waits for messages
- Client sends `initialize` → server responds with capabilities
- Client sends tool/resource/prompt requests → server responds
- Client sends `close` or process exits → graceful shutdown

## 3. Dual Transport Architecture

The project requires stdio MCP + HTTP running concurrently in a single process:

```typescript
// Pseudo-structure for main.ts
async function main() {
  // 1. Initialize shared services
  const config = loadConfig();
  initDatabase();
  const registry = new AdapterRegistry();
  // register adapters...

  // 2. Start MCP Server (stdio)
  const mcpServer = new McpServer({ name: 'dailywork-matters', version: '1.0.0' }, { capabilities: { tools: {}, resources: {}, prompts: {} } });
  registerTools(mcpServer, config, registry);
  registerResources(mcpServer);
  registerPrompts(mcpServer);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  // 3. Start HTTP Server (Hono) — Phase 4 will add routes
  const app = new Hono();
  app.get('/health', (c) => c.json({ status: 'ok' }));
  const httpServer = serve({ fetch: app.fetch, port: config.httpPort });

  // 4. Graceful shutdown
  const shutdown = async () => {
    await mcpServer.close();
    httpServer.close();
    closeDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

## 4. File Persistence — Version Append Pattern

### File Naming Convention
```
~/dailywork-matters/summaries/
├── 2026-05-20.md        ← always the LATEST version
├── 2026-05-20.v1.md     ← first version (renamed when v2 arrives)
├── 2026-05-20.v2.md     ← second version
├── 2026-05-19.md        ← single version (never regenerated)
```

### Version Management Logic
```typescript
function saveSummaryFile(date: string, markdown: string, outputDir: string): string {
  const filePath = path.join(outputDir, `${date}.md`);
  
  if (fs.existsSync(filePath)) {
    // Find next version number
    let version = 1;
    while (fs.existsSync(path.join(outputDir, `${date}.v${version}.md`))) {
      version++;
    }
    // Rename current to versioned
    fs.renameSync(filePath, path.join(outputDir, `${date}.v${version}.md`));
  }
  
  // Write new as latest
  fs.writeFileSync(filePath, markdown, 'utf-8');
  return filePath;
}
```

### DB Schema Impact
The existing `summaries` table has a UNIQUE index on `date`. For version tracking:
- **Option A:** Remove UNIQUE, add `version INTEGER` column, query latest with `ORDER BY created_at DESC LIMIT 1`
- **Option B:** Keep UNIQUE on date (latest only in main table), add `summary_versions` table for history

**Recommendation:** Option A is simpler — single table, one migration removes the unique index and adds a version column.

## 5. Batch Processing — Concurrency Control

### p-limit Pattern (lightweight)
```typescript
import pLimit from 'p-limit';

const limit = pLimit(3);

const results = await Promise.all(
  dates.map(date => limit(() => processDate(date)))
);
```

**Note:** Adding `p-limit` as a dependency. Alternatively, implement a simple semaphore:

```typescript
async function batchWithConcurrency<T>(
  items: T[], maxConcurrency: number, fn: (item: T) => Promise<unknown>
) {
  const results: unknown[] = [];
  const executing = new Set<Promise<void>>();
  
  for (const item of items) {
    const p = fn(item).then(r => { results.push(r); executing.delete(p); });
    executing.add(p);
    if (executing.size >= maxConcurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}
```

**Recommendation:** Implement inline (avoid p-limit dependency) since it's <15 lines and the project minimizes dependencies.

## 6. Error Handling in MCP Tools

Tool errors should return `isError: true` in the CallToolResult:

```typescript
return {
  content: [{ type: 'text', text: `Error: ${message}` }],
  isError: true,
};
```

This is the MCP-standard way to signal tool failures without crashing the server.

## 7. Zod Schema Compatibility

MCP SDK v1.29 uses its own Zod-compatible layer via `server/zod-compat.js`. The tool registration accepts raw Zod shapes (e.g., `{ date: z.string() }`) — NOT wrapped `z.object(...)`. The SDK wraps it internally.

Import Zod from the project's dependency:
```typescript
import { z } from 'zod';
```

With Zod 4.4.3, the standard `z.string()`, `z.number()`, `z.boolean()`, `z.optional()` all work.

## 8. Migration: Remove UNIQUE on summaries.date

```sql
-- SQLite doesn't support DROP INDEX IF EXISTS + re-add without UNIQUE
-- Workaround: create new table, copy data, drop old, rename
CREATE TABLE summaries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  markdown TEXT NOT NULL,
  structured_json TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'api',
  models_used TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO summaries_new SELECT id, date, 1, markdown, structured_json, metadata, mode, models_used, created_at, updated_at FROM summaries;
DROP TABLE summaries;
ALTER TABLE summaries_new RENAME TO summaries;
CREATE INDEX idx_summaries_date ON summaries(date);
```

## 9. Pitfalls & Risks

1. **stdout pollution** — Any stray `console.log` or unhandled error printed to stdout will break the MCP protocol. Mitigation: use strict eslint rule `no-console`, or configure tsup to replace console calls.

2. **Hono `serve()` import** — On Node.js, use `@hono/node-server` (not the built-in Hono server):
   ```typescript
   import { serve } from '@hono/node-server';
   ```
   Need to check if this is already in dependencies.

3. **StdioServerTransport lifetime** — The transport must stay alive for the process duration. Do NOT call `transport.close()` unless shutting down.

4. **Async generator consumption** — `AdapterRegistry.gatherEvents()` returns an `AsyncGenerator`. Must be fully consumed into an array before passing to `generateSummary()` (which expects `NormalizedEvent[]`).

5. **DB UNIQUE constraint** — The migration must handle the existing UNIQUE index on `summaries.date`. SQLite doesn't support `ALTER TABLE DROP INDEX` directly.

6. **Date validation** — Tool inputs need date format validation. Invalid dates should return `isError: true` immediately, not propagate into the pipeline.

## 10. Dependencies Check

| Needed | Status | Notes |
|--------|--------|-------|
| @modelcontextprotocol/sdk | ✓ installed (1.29.0) | McpServer, StdioServerTransport |
| zod | ✓ installed (4.4.3) | Tool input schemas |
| @hono/node-server | ❓ check | Needed for HTTP dual transport |
| hono | ✓ in CLAUDE.md stack | HTTP framework |
| p-limit | ✗ not needed | Implement concurrency inline |

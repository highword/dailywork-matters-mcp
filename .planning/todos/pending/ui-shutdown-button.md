---
title: UI shutdown button — stop server and close page
priority: medium
category: feature
phase_target: 5
created: 2026-06-01
---

## Description

Add a shutdown control to the Web UI that:
1. Sends a POST request to a `/api/shutdown` endpoint
2. Server gracefully shuts down (closes HTTP listener, closes SQLite connection, exits process)
3. Frontend displays a "Server stopped" confirmation then closes the browser tab (`window.close()`)

## Placement

Settings page footer or sidebar bottom — a clear "Shutdown Server" button with a destructive-style confirmation dialog ("This will stop the server. You will need to restart it manually.").

## Technical Notes

- `process.exit(0)` after cleanup (close DB, flush logs)
- `window.close()` only works if the page was opened programmatically; fallback: show "You can close this tab" message
- Hono doesn't have a built-in graceful shutdown — use `server.close()` from `@hono/node-server`

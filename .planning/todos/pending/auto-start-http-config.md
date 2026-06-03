---
title: Auto-start HTTP server on Claude session open vs on-demand MCP trigger
priority: medium
created: 2026-06-03
source: user request
category: feature
---

## Description

Add a configuration option to control when the HTTP server (Web UI + API) starts:

- **Option A: Auto-start** — HTTP endpoint launches automatically whenever any Claude Code session starts (via hooks or MCP server init). User can immediately visit the Web UI without manually triggering anything.
- **Option B: On-demand** — HTTP endpoint only starts when an MCP tool is explicitly invoked. Lower resource usage but requires a trigger to access the Web UI.

## Implementation Notes

- New config field: e.g., `autoStartHttp: boolean` (default TBD)
- If auto-start: likely implemented via Claude Code hooks (`hooks.session_start`) or by making the MCP server always bind the HTTP port on stdio connection
- If on-demand: current behavior — HTTP starts only when the MCP server process is running
- Consider: should the server stay alive after the Claude session ends? Or shut down with it?
- Consider: if multiple Claude sessions open simultaneously, need to handle port-already-in-use gracefully (reuse existing instance)

## Open Questions

- What's the mechanism for "on Claude session open"? Claude Code hooks? A system-level daemon? A VS Code extension lifecycle event?
- Should there be a third option: "always running" (system service/daemon that starts on boot)?

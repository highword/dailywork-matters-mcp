---
title: Summaries page UX — tooltips, field explanations, and project path display
priority: medium
created: 2026-06-03
source: user request
category: ux
---

## Description

Three usability issues on the Summaries detail page:

### 1. Task time proportion lacks explanation

Each task shows a percentage (time proportion), but there's no indication of what it means, how it's calculated, or why it's useful. Users see "45%" next to a task and have no context.

**Fix:** Add a subtle tooltip or info icon next to the proportion that explains: "Estimated proportion of your working time spent on this task today, derived from session duration and event density."

### 2. Bottom metadata fields have no labels/descriptions

The four fields at the bottom of a summary (Projects, Sessions, Token Stats, etc.) are displayed without any explanation of what they represent or why they matter.

**Fix:** Add short descriptions or tooltips for each field. E.g.:
- Projects — "Repositories and directories you worked in today"
- Sessions — "Number of Claude Code sessions contributing to this summary"
- Tokens — "AI tokens consumed during summarization (input/output)"
- Files — "Total unique files touched across all tasks"

### 3. Projects field shows raw long path strings

Projects displays full paths like `C:\Users\I560679\Repositories\dailywork-matters-mcp` which are ugly and hard to scan.

**Fix:** Show only the last segment (repo/folder name) by default, with full path on hover/tooltip. E.g., display `dailywork-matters-mcp` with a tooltip showing the full path.

## Implementation Notes

- Use existing tooltip/title attributes or a lightweight tooltip component
- Keep it minimal — info icons (ⓘ) or `title` attributes may suffice
- Path shortening: `path.split(/[/\\]/).pop()` or similar logic in the renderer

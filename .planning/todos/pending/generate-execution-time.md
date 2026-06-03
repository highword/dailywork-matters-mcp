---
title: Generate page — display total execution time after generation
priority: medium
created: 2026-06-03
source: user request
category: feature
---

## Description

After clicking Generate on the Generate page, display the total execution time (from request start to completion) in a reasonable position on the page. This gives users feedback on how long AI summarization took.

## Implementation Notes

- Track `startTime = Date.now()` when generation begins
- On completion (SSE stream ends), calculate elapsed time: `(Date.now() - startTime) / 1000`
- Display as e.g., "Completed in 12.3s" near the result or status indicator
- Should be visible but not obtrusive — consider placing below the progress/status area or at the bottom of the result

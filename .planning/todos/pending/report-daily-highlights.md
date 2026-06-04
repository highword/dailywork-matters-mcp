---
created: 2026-06-04T12:00:00+08:00
title: Add daily highlights section to generated reports
area: api
files:
  - src/intelligence/summarizer.ts
---

## Problem

Generated daily work reports currently present a flat list of activities without calling out what's noteworthy. Users want an AI-curated "highlights" section that surfaces the most valuable, interesting, or standout moments from the day's work — things that deserve attention beyond routine tasks.

This should be an AI-analyzed section, not just a mechanical extraction. The AI should identify:
- Breakthrough moments or creative solutions
- Significant decisions made
- Non-obvious connections between tasks
- Learning moments or skill demonstrations
- High-impact contributions that might otherwise go unnoticed

## Solution

1. Add a "Daily Highlights" section to the summarizer's map-reduce pipeline output
2. In the reduce phase, instruct the AI to identify 2-5 highlights from the day's aggregated work
3. Each highlight should be a short sentence explaining WHY it's noteworthy (not just what happened)
4. Place the highlights section prominently near the top of the generated report (after summary, before detailed breakdown)
5. Update the report template/schema to include the highlights field

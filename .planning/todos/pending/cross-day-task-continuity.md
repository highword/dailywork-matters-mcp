---
title: Cross-day task continuity — identify and visualize multi-day tasks
priority: medium
created: 2026-06-03
source: user request
category: feature
---

## Description

In the Summaries view, tasks that span multiple days (e.g., a feature built over 3 days) currently appear as isolated entries under each day. Users have no way to see that "Day 1: scaffold auth module" and "Day 2: implement login flow" and "Day 3: add tests for auth" are the same ongoing task.

Two sub-problems:

1. **AI recognition** — How does the AI (during summarization) know that today's task is a continuation of yesterday's? Needs cross-day context: look at recent summaries and match by project/files/topic similarity.
2. **UI presentation** — How to visually connect related tasks across days? Options to explore:
   - A "thread" or "story" view that groups related tasks across dates
   - A visual indicator (color/icon/link) on tasks that continue from previous days
   - A timeline/Gantt-like view showing task spans
   - Clicking a multi-day task shows its full history across days

## Implementation Notes

- AI side: During summarization, pass recent N days of summary JSON as context. Prompt the AI to detect continuity and assign a `threadId` or `continuedFrom` field.
- Storage: May need a `task_threads` table or a `thread_id` column in summary task data.
- UI side: Summaries list could show a small badge "Day 2 of 3" or a thread icon that expands to show the full story.
- Edge cases: tasks that pause for days then resume; tasks that branch into sub-tasks; multiple people on same task (if multi-user ever supported).

## Open Questions

- Should continuity detection happen at generation time (baked into summary) or at query time (computed on-the-fly from stored summaries)?
- What's the minimum viable version? Perhaps just a `threadId` in summary output + a filter/group-by in UI.

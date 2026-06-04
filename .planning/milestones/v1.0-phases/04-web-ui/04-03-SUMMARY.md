---
phase: 04-web-ui
plan: 03
subsystem: frontend-pages
tags: [react, summaries, generate, sse, shadcn-ui, radix-ui]
dependency_graph:
  requires: [api-layer, react-scaffold, data-hooks, sidebar-navigation]
  provides: [summaries-page, generate-page, ui-primitives]
  affects: [src/ui/pages/*, src/ui/components/summaries/*, src/ui/components/generate/*, src/ui/components/ui/*]
tech_stack:
  added: [react-day-picker, "@radix-ui/react-scroll-area", "@radix-ui/react-popover", "@radix-ui/react-separator"]
  patterns: [master-detail-layout, sse-progress-stream, category-badge-variants, responsive-mobile-toggle]
key_files:
  created:
    - src/ui/components/ui/button.tsx
    - src/ui/components/ui/card.tsx
    - src/ui/components/ui/badge.tsx
    - src/ui/components/ui/scroll-area.tsx
    - src/ui/components/ui/skeleton.tsx
    - src/ui/components/ui/calendar.tsx
    - src/ui/components/ui/popover.tsx
    - src/ui/components/summaries/date-list.tsx
    - src/ui/components/summaries/summary-detail.tsx
    - src/ui/components/summaries/task-row.tsx
    - src/ui/components/generate/generate-form.tsx
    - src/ui/components/generate/progress-stream.tsx
  modified:
    - src/ui/pages/summaries.tsx
    - src/ui/pages/generate.tsx
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Built shadcn/ui primitives manually (no CLI init) using Radix + cva + cn patterns"
  - "Badge component uses variant-per-category approach with UI-SPEC colors embedded in cva"
  - "Calendar uses react-day-picker v10 (latest) with shadcn-style classNames API"
  - "Responsive: mobile uses show/hide toggle (max-md:hidden) not media query CSS breakpoints"
metrics:
  duration: "17min"
  completed: "2026-05-27T09:39:47Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 3: Summaries and Generate Pages Summary

Fully interactive Summaries page (master-detail with date list, task rows, category badges, time proportion bars) and Generate page (date picker, SSE progress stream, error/success states) using shadcn/ui primitives and TanStack Query hooks from Plan 02.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Install shadcn/ui components and build Summaries page | 2bf43f3 | Done |
| 2 | Build Generate page with SSE progress streaming | 08ef609 | Done |

## Key Implementation Details

### Summaries Page (Master-Detail)
- Left panel: 280px fixed width with ScrollArea-wrapped DateList
- Right panel: fluid width with SummaryDetail consuming `useSummaryDetail(date)`
- Auto-selects most recent date on load via `useEffect` + `navigate(replace: true)`
- Responsive: mobile shows only DateList or only SummaryDetail with back button
- TaskRow shows: mono task name, colored category Badge, outcome text, truncated files, time bar

### Generate Page (SSE Streaming)
- Date picker: Popover + Calendar (react-day-picker v10), defaults to today
- Generate button: loading state with Loader2 spinner, disabled during generation
- ProgressStream: animated event list with dot indicators, contextual error messages
- Success: toast notification + "View Summary" link navigating to result

### UI Primitives Created (shadcn/ui pattern)
- **Button**: 6 variants (default, destructive, outline, secondary, ghost, link) + 4 sizes
- **Card**: Card/CardHeader/CardTitle/CardContent with Hermes box-shadow
- **Badge**: 7 category-color variants matching UI-SPEC color map exactly
- **ScrollArea**: Radix ScrollArea with styled scrollbar
- **Skeleton**: Pulse animation loading placeholder
- **Calendar**: react-day-picker v10 with shadcn class overrides
- **Popover**: Radix Popover with slide/fade animations

### Security (T-04-08 Mitigated)
- All task names, outcomes, and files rendered as React text nodes (default escaping)
- No `dangerouslySetInnerHTML` used anywhere in summary rendering
- Error messages use template literals with React text node interpolation

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] src/ui/pages/summaries.tsx contains `useSummaryDates` and `useParams`
- [x] src/ui/pages/summaries.tsx contains `w-[280px]` (left panel width)
- [x] src/ui/components/summaries/date-list.tsx contains `ScrollArea`
- [x] src/ui/components/summaries/date-list.tsx contains `border-l-2 border-accent`
- [x] src/ui/components/summaries/summary-detail.tsx contains `useSummaryDetail`
- [x] src/ui/components/summaries/task-row.tsx contains `time_proportion` and width styling
- [x] src/ui/components/summaries/task-row.tsx contains category color logic (feature and bugfix)
- [x] src/ui/components/ui/button.tsx exists with variant definitions
- [x] src/ui/pages/generate.tsx contains `useGenerateSummary`
- [x] src/ui/components/generate/generate-form.tsx contains `Calendar` import
- [x] src/ui/components/generate/generate-form.tsx contains "Generate Summary" button text
- [x] src/ui/components/generate/progress-stream.tsx contains `progress` prop mapping
- [x] src/ui/components/generate/progress-stream.tsx contains "generation failed" error message
- [x] src/ui/components/ui/calendar.tsx exists
- [x] src/ui/components/ui/popover.tsx exists
- [x] Commits 2bf43f3 and 08ef609 exist in git log
- [x] TypeScript: 0 errors in plan files (13 pre-existing in out-of-scope chart-dashboard)

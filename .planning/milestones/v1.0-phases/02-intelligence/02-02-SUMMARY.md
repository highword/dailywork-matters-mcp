---
phase: 02-intelligence
plan: "02"
subsystem: intelligence
tags: [anthropic-sdk, ai-client, prompts, aggregation, window-processor, sliding-window]

requires:
  - phase: 02-intelligence
    plan: "01"
    provides: IntermediateEvent, Task, WindowResult types, compression pipeline
provides:
  - AIClient class with retry/backoff for Anthropic API
  - Prompt templates for structured JSON extraction (window + merge)
  - Event aggregation by project with timestamp ordering
  - Sliding window processor with carry-over context (D-01 cross-session merging)
affects: [02-03-PLAN]

tech-stack:
  added: [@anthropic-ai/sdk]
  patterns: [exponential-backoff-with-jitter, sliding-window-carry-over, adaptive-strategy]

key-files:
  created:
    - src/server/intelligence/ai-client.ts
    - src/server/intelligence/prompts.ts
    - src/server/intelligence/aggregation.ts
    - src/server/intelligence/window-processor.ts
  modified: []

key-decisions:
  - "Retry only on 429/5xx, immediate throw on 400/401"
  - "Window prompt uses carry-over pattern: previous tasks passed as context for merging"
  - "Adaptive strategy: single call <50K tokens, multi-window >=50K tokens"
  - "Partial failure per window: skip failed windows, continue with accumulated state"

patterns-established:
  - "AI client pattern: lazy instantiation, retry with backoff, JSON parse helper"
  - "Sliding window carry-over: each window receives previous window's output as context"

requirements-completed: [AI-02, AI-03]

duration: 5min
completed: 2026-05-20
---

# Phase 2 Plan 02: AI Client, Prompts, Aggregation, and Window Processor Summary

**Core AI processing engine: SDK client with retry, structured prompts, project-based aggregation, and sliding window processor with cross-session merging**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-20T03:40:00Z
- **Completed:** 2026-05-20T03:45:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- AIClient class wrapping Anthropic SDK with exponential backoff (jitter), lazy instantiation, JSON parsing with code fence stripping
- Window prompt template enforcing JSON-only output, 5-field task schema, outcome-oriented descriptions, carry-over context for cross-session merging
- Merge prompt template for combining per-project task lists with cross-project deduplication
- Event aggregation: groupByProject (timestamp-sorted), buildWindows (~30K token budget), needsMultiWindow threshold check
- Sliding window processor: adaptive single/multi-window strategy, sequential carry-over (D-01), partial failure resilience

## Task Commits

1. **Task 1: Create AI client wrapper with retry logic** - `7f80645` (feat)
2. **Task 2: Create prompt templates and aggregation logic** - `c1b00a9` (feat)
3. **Task 3: Implement sliding window processor with carry-over** - `6d27bf4` (feat)

## Files Created
- `src/server/intelligence/ai-client.ts` — AIClient class (call, parseJSON), AICallOptions, AICallResult interfaces
- `src/server/intelligence/prompts.ts` — buildWindowPrompt, MERGE_SYSTEM_PROMPT, formatWindowContent
- `src/server/intelligence/aggregation.ts` — groupByProject, buildWindows, needsMultiWindow
- `src/server/intelligence/window-processor.ts` — processProjectEvents (adaptive + carry-over)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WindowResult.tokens_used field name mismatch**
- **Found during:** Task 3 (Window processor)
- **Issue:** AICallResult returns `{ input_tokens, output_tokens }` but WindowResult expects `{ input, output }`
- **Fix:** Explicitly map `result.usage.input_tokens` → `input` in all return sites
- **Verification:** `pnpm exec tsc --noEmit` passes
- **Committed in:** 6d27bf4 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 type mismatch)
**Impact on plan:** Trivial field mapping. No scope creep.

## Self-Check

- [x] ai-client.ts exports AIClient with call and parseJSON
- [x] prompts.ts exports buildWindowPrompt, MERGE_SYSTEM_PROMPT, formatWindowContent
- [x] aggregation.ts exports groupByProject, buildWindows, needsMultiWindow
- [x] window-processor.ts exports processProjectEvents with adaptive strategy
- [x] Carry-over pattern: previousTasks passed to buildWindowPrompt
- [x] Partial failure: per-window try/catch with gaps array
- [x] `pnpm exec tsc --noEmit` passes

## Self-Check: PASSED

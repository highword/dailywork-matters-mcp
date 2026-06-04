# Phase 2: Intelligence — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The system can take raw normalized events (from Phase 1 adapters) and produce semantically meaningful, outcome-oriented task summaries with cross-session aggregation. This phase delivers the AI intelligence layer — aggregation logic, dual-mode AI processing, and structured output generation.

</domain>

<decisions>
## Implementation Decisions

### Aggregation Strategy
- **D-01:** Cross-session task merging uses **滑动窗口自然合并** — each window outputs a task list, next window receives the previous task list as context and naturally merges same-topic work. No separate rule-based pre-grouping step needed.
- **D-02:** Multiple sessions are organized **Project-first** — group events by project, then process each project's events in time-sequence through the sliding window. Multi-project users get clean separation; unrelated projects don't interfere in the same window.
- **D-03:** After per-project processing, a final **AI merge pass** combines all project task lists into one daily report — handles cross-project same-task detection, unified sorting, time proportion calculation, and daily outcome overview.

### Dual-Mode AI Interface
- **D-04:** **Zero-config (Host AI) mode** returns raw compressed data — per-project grouped compressed events + session metadata as a large JSON response. Host Claude handles all aggregation and summarization.
- **D-05:** **API key mode** uses **adaptive strategy** — small data (<50K effective tokens) uses a single API call; large data (>50K) automatically switches to multi-window processing. Transparent to user.
- **D-06:** **Layered model selection** — sliding window processing uses Haiku (fast, cheap, sufficient for structured extraction); final merge pass uses Sonnet (quality, best cost/quality ratio). User can override both via config. Opus available but not default (diminishing returns for summarization tasks).
- **D-07:** Config structure expands from single `model` field to:
  ```json
  {
    "ai": {
      "windowModel": "claude-haiku-4-5-20251001",
      "mergeModel": "claude-sonnet-4-6"
    }
  }
  ```

### Structured Output Format
- **D-08:** Task category uses **base 6 + open extension** — core categories: feature/bugfix/refactor/research/config/docs. AI may generate additional categories (e.g., review, devops, meeting) when appropriate. Charts/analytics group custom categories under "other" for aggregation.
- **D-09:** Time proportion calculated by **AI estimation** — AI comprehensively judges based on time span + event density + complexity, ensures total = 100%. No deterministic formula.
- **D-10:** **JSON is the single source of truth** — AI outputs structured JSON (task list + metadata), stored in DB. Server programmatically renders to Markdown and/or HTML files (never AI-generated HTML/Markdown).
- **D-11:** **Output format is user-configurable** — can produce Markdown only, HTML only, or both. At least one file output format must be active. MCP tool always returns JSON regardless of file output setting.

### Content Compression
- **D-12:** **Two-layer compression** — Adapter layer (Phase 1) handles deterministic removals (system prompts, permission confirmations, CLAUDE.md injections); Intelligence layer handles context-dependent compression (code truncation to first 3 lines, thinking block reduction to conclusion only, large tool output summarization).
- **D-13:** **Intermediate format** for sliding window input: structured wrapper + text content — each segment is `{ type, timestamp, content: string }` where content is human-readable compressed text. Balances traceability (structured metadata) with prompt-friendliness (text content).

### Claude's Discretion
- Specific prompt templates for window processing and merge pass (researcher/planner decide)
- Token counting heuristic for the <50K / >50K threshold
- Exact HTML template design (Phase 4 concern, but rendering logic in Phase 2 should output clean JSON)
- Error handling for partial AI failures mid-window (retry strategy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — Tech stack, constraints, key decisions (Config structure, packaging strategy)
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow diagram, service layer design
- `.planning/research/PITFALLS.md` — 23 domain-specific pitfalls (AI summarization, token limits, streaming)
- `.planning/research/STACK.md` — Version-specific library recommendations

### Phase 1 Foundation (dependency)
- `.planning/phases/01-foundation/01-CONTEXT.md` — NormalizedEvent schema (LOCKED), content processing strategy (LOCKED), sliding window design, database schema
- `src/shared/types.ts` — NormalizedEvent interface, DataSourceAdapter interface, Config interface
- `src/server/database.ts` — Database initialization, migration system, WAL mode setup
- `src/server/adapters/claude/jsonl-parser.ts` — Streaming JSONL parser, JSONLEntry type definition

### Requirements
- `.planning/phases/01-mvp/01-SPEC.md` — Full MVP specification (8 requirements, acceptance criteria)
- `.planning/REQUIREMENTS.md` — AI-01 through AI-05 requirement definitions

### Competitive Reference
- `code-recap` (NRB-Tech) — LLM report pipeline, HTML output, multi-model support. Best reference for report formatting.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/types.ts:NormalizedEvent` — 15-field event schema, direct input to intelligence layer
- `src/shared/types.ts:DataSourceAdapter` — AsyncGenerator pattern, intelligence layer consumes this
- `src/shared/types.ts:Config` — Already has `apiKey`, `model`, `httpPort` fields (need to extend for layered model config)
- `src/server/database.ts` — SQLite with WAL mode ready; `summaries` and `tasks` tables defined in migration
- `src/server/adapters/registry.ts` — Adapter registry pattern, potential model for AI engine registration

### Established Patterns
- **Streaming/Generator pattern** — adapters yield events via AsyncGenerator; intelligence layer should consume similarly
- **Singleton with init** — database uses `initDatabase()` → `getDatabase()` pattern
- **All logging to stderr** — via pino logger (`src/server/logger.ts`)
- **Path resolution** — `getConfigDir()` from `src/shared/paths.ts` handles cross-platform `~` expansion

### Integration Points
- Intelligence layer receives `NormalizedEvent[]` (or AsyncGenerator) from adapter registry
- Outputs structured JSON → stored in `summaries` table (date, markdown, structured JSON, metadata)
- Outputs denormalized tasks → stored in `tasks` table (for analytics)
- Config extended for `ai.windowModel` and `ai.mergeModel`
- New migration needed for any schema changes to support task storage

</code_context>

<specifics>
## Specific Ideas

- code-recap 的做法（Markdown 为源 → 程序化转 HTML）验证了我们的 "JSON 为源 + 派生" 方案的合理性
- 分层模型选择受 code-recap 的 LiteLLM multi-model 设计启发
- 用户强调 time proportion 应该是 AI 综合判断而非机械公式 — 这意味着 prompt 设计需要明确要求总和 = 100%

</specifics>

<deferred>
## Deferred Ideas

- 分层模型的成本追踪/报告（属于 v2 ENH-02 per-task token analysis）
- HTML 模板的具体视觉设计（Phase 4 Web UI 阶段处理）
- 压缩策略的 A/B 测试框架（v2 优化）

</deferred>

---

*Phase: 02-intelligence*
*Context gathered: 2026-05-19*

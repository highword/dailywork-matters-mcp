# Phase 2: Intelligence — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 02-intelligence
**Areas discussed:** Aggregation Strategy, Dual-Mode AI Interface, Structured Output Format, Content Compression

---

## Aggregation Strategy

### Cross-session merge mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 AI 判断 | AI 一次性看所有 events，自行判断哪些属于同一任务并合并 | |
| 规则预分组 + AI 精化 | 先用规则（同 project + 相似文件集）做粗分组，再让 AI 在每组内做精细合并 | |
| 滑动窗口自然合并 | 渐进式处理中 AI 自然合并 — 每个 window 返回任务列表，下一个 window 拿到上一轮的任务列表作为 context | ✓ |

**User's choice:** 滑动窗口自然合并
**Notes:** 和 Phase 1 CONTEXT 锁定的渐进式全量处理策略完全一致，无需额外机制。

### Window organization order

| Option | Description | Selected |
|--------|-------------|----------|
| 时间序混合 | 所有 session events 按时间排序后统一切窗口 | |
| Session-first 然后 merge | 每个 session 单独处理，最后做跨 session merge pass | |
| Project-first 分组 | 先按 project 分组，同一 project 的 sessions 合并后再时间序处理 | ✓ |

**User's choice:** Project-first 分组
**Notes:** 对多项目并行开发的用户效果更好，避免不相关 project 的 events 交织。

### Final merge strategy

| Option | Description | Selected |
|--------|-------------|----------|
| AI 做最终 merge | 所有 project 的 task lists 拼接后交给 AI 做统一处理 | ✓ |
| 代码拼接（无 AI） | 纯代码按 time proportion 排序、计算全天百分比 | |
| 代码优先 + 条件 AI fallback | 默认代码拼接，检测到文件重叠或相似 task name 时回退到 AI merge | |

**User's choice:** AI 做最终 merge
**Notes:** 能识别跨 project 的同一任务，如同一 bug 跨两个 repo 修复。

---

## Dual-Mode AI Interface

### Zero-config output format

| Option | Description | Selected |
|--------|-------------|----------|
| 原始压缩数据 | MCP tool 返回按 project 分组的压缩 events + session 元数据 | ✓ |
| 半处理 task 草稿 | Server 用规则做半结构化 task 提取，Host Claude 只填充语义字段 | |
| 完整处理 | Server 用 AI 完成全部处理（实际不可行，需要 API key） | |

**User's choice:** 原始压缩数据
**Notes:** Host Claude 负担重但保持 zero-config 纯粹性。

### API key prompt strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 多次调用（每窗口一次） | 每个滑动窗口一次 API call，前一窗口 task list 作为 context | |
| 单次大调用 | 所有压缩数据一次性送入 | |
| 自适应 | 小数据(<50K) 单次，大数据(>50K) 多窗口 | ✓ |

**User's choice:** 自适应
**Notes:** 和 Phase 1 CONTEXT 的 scaling strategy 一致。

### Model selection

| Option | Description | Selected |
|--------|-------------|----------|
| 用户配置的单模型 | 固定用 Config 中的 model 字段 | |
| 分层模型（窗口 Haiku + merge Sonnet） | 窗口用便宜模型，merge 用质量模型 | |
| 单模型 + 预留扩展点 | MVP 先单模型，代码结构预留分层 | |
| 分层模型，用户可配置 | 默认分层（Haiku + Sonnet），用户可覆盖每层模型选择 | ✓ |

**User's choice:** 分层模型，用户可配置（用户自定义选项）
**Notes:** 用户追问了 Opus 的必要性。结论：Opus 对日报摘要任务没有显著优势（Sonnet 性价比最佳），但用户可手动配置为 Opus。默认 Haiku + Sonnet。

---

## Structured Output Format

### Category enumeration

| Option | Description | Selected |
|--------|-------------|----------|
| 固定 6 枚举 | feature/bugfix/refactor/research/config/docs | |
| 基础 6 + 开放扩展 | 6 个核心 + AI 可生成自定义 category | ✓ |
| 固定 6 + other 兜底 | 不归类的全部进 other | |

**User's choice:** 基础 6 + 开放扩展
**Notes:** 灵活性优先，图表统计时可将自定义 category 归入 "other" 聚合。

### Time proportion calculation

| Option | Description | Selected |
|--------|-------------|----------|
| 时间跨度占比 | 最早到最晚 event 的时间跨度占全天活跃时间 | |
| Event/token 数量占比 | event 数或 token 数占全天总量 | |
| AI 估算（综合判断） | AI 综合时间跨度 + event 密度 + 复杂度判断，确保总和 = 100% | ✓ |

**User's choice:** AI 估算
**Notes:** 最智能但需要 prompt 明确约束总和 = 100%。

### Output format strategy

| Option | Description | Selected |
|--------|-------------|----------|
| JSON 为源 + 派生 Markdown + HTML | AI 输出 JSON，程序化渲染 Markdown 和 HTML | ✓ |
| JSON 为源 + 派生 Markdown（无 HTML） | 只派生 Markdown，HTML 展示交给 Web UI | |
| Markdown 为源 + 派生 HTML | AI 直接输出 Markdown，再转 HTML | |

**User's choice:** JSON 为源 + 默认派生 Markdown + HTML，可配置只使用一种或都使用，但必须要有一种（用户自定义选项）
**Notes:** 用户主动询问了行业实践和 HTML 可行性。调研发现 code-recap 和 claude-code-log 都支持 HTML 输出。用户确认 JSON 为源 + 可配置派生是最佳方案。

---

## Content Compression

### Compression layer

| Option | Description | Selected |
|--------|-------------|----------|
| Adapter 层（解析时压缩） | NormalizedEvent.content 存的就是压缩后内容 | |
| Intelligence 层（生成时压缩） | 从 DB 读原始 events 后压缩再送入窗口 | |
| 两层压缩（Adapter 基础 + Intelligence 智能） | Adapter 去确定无用内容，Intelligence 做上下文判断的压缩 | ✓ |

**User's choice:** 两层压缩
**Notes:** Adapter 层做 deterministic removals（system prompts, permission confirmations），Intelligence 层做 context-dependent compression（代码截断、thinking 精简）。

### Intermediate format

| Option | Description | Selected |
|--------|-------------|----------|
| 纯文本（prompt-ready） | 压缩后拼接为纯文本 transcript | |
| 结构化 JSON segments | 每个 segment 有 type/timestamp/content/files 等字段 | |
| 结构化包装 + 文本内容 | `{ type, timestamp, content: string }` 混合格式 | ✓ |

**User's choice:** 结构化包装 + 文本内容
**Notes:** 兼顾可追溯性（结构化 metadata）和 prompt 友好性（文本 content 直接作为 prompt 内容）。

---

## Claude's Discretion

- Specific prompt templates for window processing and merge pass
- Token counting heuristic for <50K / >50K threshold
- HTML template design details (Phase 4 concern)
- Error handling for partial AI failures mid-window

## Deferred Ideas

- 分层模型的成本追踪/报告 → v2 ENH-02
- HTML 模板的具体视觉设计 → Phase 4
- 压缩策略的 A/B 测试框架 → v2

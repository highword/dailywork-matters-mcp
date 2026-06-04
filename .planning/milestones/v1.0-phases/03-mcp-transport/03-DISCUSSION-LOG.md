# Phase 3: MCP Transport + Persistence — Discussion Log

**Date:** 2026-05-20
**Duration:** ~5 min
**Areas discussed:** 4/4

## Areas Discussed

### 1. Tool 行为细节

**Q: generate_daily_summary 应该返回什么格式？**
- Options: 内联完整结果 / JSON + 文件路径 / 仅 Markdown
- **Selected:** JSON + 文件路径
- Note: Host AI 同时拿到结构化数据和存储位置

**Q: zero-config 模式下如何处理持久化？**
- User raised: "无 API 配置时真的完全没办法调用模型生成文件吗？"
- Discussion: Host AI 本身就是模型，可以自己合成摘要；但 server 无法获取 host 的输出
- Options: 纯数据不持久化 / 两步交互 + save_summary tool / 不管持久化
- **Selected:** 两步交互 — 返回数据 + 提供 save_summary tool 让 host AI 回传结果
- Impact: Tool 从 5 个扩展为 6 个

### 2. 持久化策略

**Q: 同一天重复生成 summary 时怎么处理？**
- Options: 覆盖 / 版本追加 / 文件覆盖+DB保留历史
- **Selected:** 版本追加模式 — 旧版重命名为 .v{N}.md，最新版始终是 YYYY-MM-DD.md，DB 保留所有版本

### 3. MCP Server 启动与配置

**Q: 启动时是否同时启动 HTTP 服务？**
- Options: 纯 stdio / 同时 stdio + HTTP
- **Selected:** 同时启动 stdio + HTTP (端口 37888)
- Rationale: 项目架构已定义 "single process dual transport"，一次到位

**Q: MCP capabilities 声明哪些？**
- User concern: prompts 会不会对用户做其他任务时产生困扰
- Discussion: prompts 只在用户主动浏览时可见，按 server 分组展示，影响小
- Options: 仅 tools / tools + resources / tools + resources + prompts
- **Selected:** tools + resources + prompts（全部声明，功能最完整）

### 4. Batch 处理设计

**Q: 处理日期范围时顺序还是并行？**
- Options: 严格顺序 / 有限并发 max 3
- **Selected:** 有限并发 (max 3)

**Q: batch 模式下哪些日期应该跳过？**
- Options: 跳过已有 summary / 跳过已有+跳过无数据 / 全部重生成
- **Selected:** 全部重新生成（含已有），但跳过无数据日期

## Key Decisions Summary

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | Tool 返回 JSON + 文件路径 | Host AI 灵活使用 |
| D-02 | Zero-config 两步模式 + save_summary tool | 让无 API key 用户也能持久化 |
| D-03 | 6 tools 总计 | 原 5 + save_summary |
| D-04 | 版本追加持久化 | 保留历史，最新始终在固定路径 |
| D-07 | 双 transport 同时启动 | 架构一次到位 |
| D-10 | tools + resources + prompts | 功能完整 |
| D-11 | 有限并发 max 3 | 速度与 rate limit 平衡 |
| D-12 | Batch 全部重生成，跳过无数据 | 用户要最新结果 |

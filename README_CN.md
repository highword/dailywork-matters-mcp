<p align="center">
  <img src=".github/assets/banner.png" alt="Dailywork Matters" width="100%" />
</p>

<p align="center">
  <strong>AI 驱动的每日工作日志。零操作，全景呈现。</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dailywork-matters"><img src="https://img.shields.io/npm/v/dailywork-matters?color=4a7c8a&label=npm" alt="npm version" /></a>
  <a href="https://github.com/highword/dailywork-matters-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/highword/dailywork-matters-mcp?color=4a7c8a" alt="License" /></a>
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-4a7c8a" alt="Platform" />
  <img src="https://img.shields.io/badge/MCP-兼容-4a7c8a" alt="MCP Compatible" />
</p>

<p align="center">
  聚合你的 Claude Code 会话记录 + Git 提交历史，用 AI 生成智能、结果导向的每日工作总结。<br/>
  支持 <strong>MCP Server</strong>（任何兼容客户端）+ 本地 <strong>Web UI</strong> 浏览与生成报告。
</p>

<p align="center">
  中文 | <a href="./README.md">English</a>
</p>

---

## 痛点

你写了一天代码。下班时有人问"今天做了什么？"——你一片空白。站会笔记永远过时，时间追踪太繁琐，你最好的工作成果无人知晓。

## 解法

Dailywork Matters 读取你的 **Claude Code 会话日志** 和 **Git 历史记录**，用 AI 合成一份连贯的每日报告——聚焦*成果*，而非操作流水账。

```
"实现了 OAuth2 认证流程，修复了连接池中 3 个竞态条件，
 审阅了计费团队的 PR #142。"
```

而不是：

```
"编辑了 47 个文件。提交了 12 次。开了 6 个 Claude 会话。"
```

---

## 快速开始

```bash
npx dailywork-matters
```

就这样。打开 `http://localhost:37888` 即可使用。

### 配置为 MCP Server

添加到 Claude Code 配置 (`~/.claude.json`)：

```json
{
  "mcpServers": {
    "dailywork-matters": {
      "command": "npx",
      "args": ["dailywork-matters"]
    }
  }
}
```

然后对 Claude 说：*"帮我生成今天的工作总结"*

---

## 功能

### MCP 工具（6 个）

| 工具 | 说明 |
|------|------|
| `generate_daily_summary` | AI 驱动的每日总结生成 |
| `generate_batch_summary` | 批量处理日期范围（最大 3 并发） |
| `get_summary_by_date` | 获取已存储的总结 |
| `list_today_sessions` | 列出今日 Claude Code 会话 |
| `save_summary` | 将总结持久化为 Markdown |
| `configure_settings` | 通过 MCP 更新配置 |

### Web 界面

- **总结列表** — 浏览历史总结，查看完整详情
- **生成** — 为任意日期触发生成，SSE 实时流式展示进度
- **图表** — 分类分布、时间占比、8 种图表类型，可拖拽网格布局
- **设置** — 配置 API Key、模型选择、数据源、定时任务

### 智能引擎

- **双模式** — 无需 API Key 也能用（零配置模式返回结构化数据给 MCP 宿主合成）；有 Key 则独立生成完整 Markdown 报告
- **跨会话聚合** — 同一主题跨多个会话的工作合并为一条任务
- **结果导向** — 描述*完成了什么*，而不是执行了什么操作
- **流式解析** — 大 JSONL 文件不会一次性加载到内存

### 运维

- **定时生成** — 配置 `scheduleTime` 自动生成每日总结
- **启动补全** — 启动时自动生成缺失的日期（上限 30 天）
- **跨平台** — Windows、macOS、Linux
- **单依赖** — 运行时只需 `better-sqlite3`（其余全部打包）

---

## 工作原理

```
┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │     │   Git 历史      │
│  会话日志       │     │   (提交 +       │
│  (.jsonl)       │     │    Diff)        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│         适配器层（流式处理）              │
│   标准化 → NormalizedEvent 接口          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│            智能引擎                      │
│  压缩 → 窗口处理 → 合并 → 渲染          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  MCP     │   │  Web UI  │   │ Markdown │
│  工具    │   │ :37888   │   │  文件    │
└──────────┘   └──────────┘   └──────────┘
```

---

## 配置

配置文件位于 `~/.dailywork-matters/config.json`，可通过 Web UI 设置页或 MCP 工具修改。

```json
{
  "ai": {
    "apiKey": "sk-ant-...",
    "baseUrl": null,
    "windowModel": "claude-haiku-4-5-20251001",
    "mergeModel": "claude-sonnet-4-6-20250514"
  },
  "outputDir": "~/dailywork-matters/summaries",
  "scheduleTime": "18:00",
  "language": "zh",
  "gitIdentities": ["your@email.com"],
  "gitRepoScanDirs": ["~/projects"]
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `ai.apiKey` | Anthropic API Key（或代理 Key） | `null`（零配置模式） |
| `ai.baseUrl` | 自定义端点（代理/自托管） | `null`（使用 Anthropic 默认） |
| `ai.windowModel` | 窗口摘要模型 | `claude-haiku-4-5-20251001` |
| `ai.mergeModel` | 最终合并模型 | `claude-sonnet-4-6-20250514` |
| `scheduleTime` | 自动生成时间（HH:MM, 24h） | `null`（禁用） |
| `language` | 总结语言（`en` / `zh`） | `en` |
| `gitIdentities` | 按作者过滤提交 | `[]`（所有提交） |
| `gitRepoScanDirs` | 扫描 Git 仓库的目录 | `[]` |

---

## 开发

```bash
git clone https://github.com/highword/dailywork-matters-mcp.git
cd dailywork-matters-mcp
pnpm install

# 后端（HTTP-only，无 MCP stdio）
pnpm dev:http

# 前端（Vite HMR，/api 代理到 :37888）
pnpm dev:ui

# 构建
pnpm build

# 测试
pnpm test

# Lint
pnpm lint
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js 22+ |
| 服务端 | Hono + @hono/node-server |
| MCP | @modelcontextprotocol/sdk v1 |
| 数据库 | better-sqlite3 (WAL 模式) |
| AI | @anthropic-ai/sdk |
| 前端 | React 19 + Vite + Tailwind v4 |
| 图表 | Recharts + react-grid-layout |
| 打包 | tsup (服务端) + Vite (UI) |
| 测试 | Vitest |

---

## 隐私与数据

- **100% 本地运行。** 所有数据留在你的机器上。无遥测。无云同步。
- 会话日志从本地 `~/.claude/projects` 目录读取。
- 总结以纯 Markdown 文件存储在你配置的输出目录中。
- API Key 存储在本地配置文件，仅用于调用你配置的 AI 供应商。
- HTTP 服务仅绑定 `localhost` — 网络不可访问。

---

## 路线图

- [ ] 总结页日历视图
- [ ] 跨天任务连续性追踪
- [ ] UI 视觉全面升级
- [ ] 会话打开时自动启动 HTTP
- [ ] 更多数据源适配器（Cursor、VS Code 等）

---

## 许可证

MIT

---

<p align="center">
  <sub>为每天都在交付的打工人而造。</sub>
</p>

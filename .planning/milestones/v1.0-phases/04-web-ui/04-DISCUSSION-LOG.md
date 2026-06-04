# Phase 4: Web UI + HTTP API — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 04-web-ui
**Areas discussed:** 页面布局与导航, 图表可视化方案, REST API 设计, 构建与嵌入策略

---

## 页面布局与导航

### 导航形式

| Option | Description | Selected |
|--------|-------------|----------|
| 侧边栏导航 | 左侧固定侧边栏，显示 4 个页面入口 | ✓ |
| 顶部 Tab 栏 | 顶部水平导航栏（4 个 tab） | |
| 可折叠侧边栏 | 侧边栏 + 可折叠，默认收缩为 icon-only | |

**User's choice:** 侧边栏导航
**Notes:** 适合工具型应用

### 路由方案

| Option | Description | Selected |
|--------|-------------|----------|
| React Router v7 | ~18KB gzipped，库模式。生态最大，支持 loader/action、code splitting | ✓ |
| TanStack Router | ~12KB gzipped，类型安全极强。生态较小 | |
| 简单 hash 路由 | 零依赖但扩展性差，后续加页面需重写 | |

**User's choice:** React Router v7
**Notes:** 用户关心后续扩展性，经过研究对比后确认 v7 包体积可接受（~18KB），生态和扩展性最优

### Summary 页面布局

| Option | Description | Selected |
|--------|-------------|----------|
| Master-Detail 分栏 | 导航栏 \| 日期列表 \| 详情内容。窄屏退化为列表→详情切换 | ✓ |
| 平铺页面 | 列表和详情分开为独立路由 | |

**User's choice:** Master-Detail 分栏
**Notes:** 用户询问哪种方案最适合展示项目内容。Claude 分析后推荐 Master-Detail（信息密度匹配、浏览流程自然、扩展友好），用户确认

### 视觉风格

| Option | Description | Selected |
|--------|-------------|----------|
| System auto + Hermes 风格 | 跟随系统 light/dark + 有个性的设计语言 | ✓ |
| 明亮主题 | 白底 + 微影 + 圆角卡片 | |
| 暗色主题 | 深色背景固定 | |

**User's choice:** System auto + Hermes 美学
**Notes:** 用户明确不要千篇一律的简洁平面设计，要像 Hermes 那样有个人项目风格。确认方向：毛玻璃 + 层次感 + 精致排版 + 开发者工具锋利感

### 组件策略

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui + 自定义视觉层 | Radix 原语骨架 + 完全自定义设计 tokens | ✓ |
| 纯 Tailwind 手写 | 全部手写包括 a11y 和交互逻辑 | |

**User's choice:** shadcn/ui + 自定义视觉层
**Notes:** 用户询问哪种方案最适合想要的风格。Claude 解释 shadcn 本质是无样式骨架可完全定制，省掉 a11y 苦力活而不限制创意空间

### 状态管理

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack Query + useState | TanStack Query 管理服务端状态，局部 useState 处理 UI 状态 | ✓ |
| 原生 fetch + hooks | 零依赖但缓存/重试/loading 都要手写 | |

**User's choice:** TanStack Query + useState

### 触发生成页面

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 Generate 页面 | 独立的任务触发器页面，可选日期/范围，显示进度和结果 | ✓ |
| 嵌入 Summary 页内 | "生成"按钮在 Summary 页顶部工具栏 | |

**User's choice:** 独立 Generate 页面

### Settings 页面形式

| Option | Description | Selected |
|--------|-------------|----------|
| 表单式设置页 | 分区显示所有配置项，实时保存 | ✓ |
| JSON 编辑器风格 | 直接显示/编辑 config.json | |

**User's choice:** 表单式设置页

### 页面数量

| Option | Description | Selected |
|--------|-------------|----------|
| 严格 4 页 | Summaries、Generate、Charts、Settings，不加多余的 | ✓ |
| 加 Dashboard 首页 | 加一个今日概览 + 快捷操作的首页 | |

**User's choice:** 严格 4 页，不加

### 响应式

| Option | Description | Selected |
|--------|-------------|----------|
| 基础响应式 | 窄屏侧边栏收缩为汉堡菜单，Master-Detail 退化。够用就行 | ✓ |
| 不做移动端 | 仅桌面，不花精力做移动端适配 | |

**User's choice:** 基础响应式（够用就行）

### 默认落地页

| Option | Description | Selected |
|--------|-------------|----------|
| Summaries 页（最新日期） | 启动后直接看到最新工作内容 | ✓ |
| Charts 页 | 给用户全局概览 | |

**User's choice:** Summaries 页（最新日期）

---

## 图表可视化方案

### 图表库

| Option | Description | Selected |
|--------|-------------|----------|
| Recharts | React 生态最流行，声明式 API，~45KB gzipped | ✓ |
| Nivo (D3-based) | 极度可定制，学习曲线陡 | |
| 纯 SVG 手写 | 零依赖但开发量大 | |

**User's choice:** Recharts

### 图表类型

用户选择全部 4 个基础图表 + 要求推荐更多。Claude 推荐 4 个额外图表，用户全选：
1. 类别分布（Donut）✓
2. 时间占比（Bar）✓
3. 每日趋势（Line）✓
4. 类别趋势（Stacked Area）✓
5. 产出热力图（Heatmap）✓（额外推荐）
6. 文件活跃度 Top N（Bar）✓（额外推荐）
7. 工作时段分布（Radial）✓（额外推荐）
8. 项目时间分配（Treemap）✓（额外推荐）

### 时间范围控制

| Option | Description | Selected |
|--------|-------------|----------|
| 快捷按钮 + 自定义范围 | 预设 7d/14d/30d/90d + date picker | ✓ |
| 7/14/30/90 天切换 | 固定预设，无自定义 | |
| 自由日期范围 | 仅 date picker | |

**User's choice:** 快捷按钮 + 自定义范围

### 布局方式

| Option | Description | Selected |
|--------|-------------|----------|
| 可拖拽 Dashboard | 用户可拖拽/调整大小 chart cards | ✓ |
| 固定网格布局 | 8 个图表按逻辑分组固定排列 | |

**User's choice:** 可拖拽 Dashboard

### 布局持久化

| Option | Description | Selected |
|--------|-------------|----------|
| 保存布局 (localStorage) | 重新打开保持上次布局 | ✓ |
| 不保存 | 每次重置到默认 | |

**User's choice:** 保存布局 (localStorage)

### 交互层级

| Option | Description | Selected |
|--------|-------------|----------|
| 可交互（hover + click 联动） | Hover tooltip + 点击跳转到对应 Summary | ✓ |
| 仅 tooltip | 只有 hover 展示数据，不支持点击 | |

**User's choice:** 可交互（hover + click 联动）

---

## REST API 设计

### API 风格

| Option | Description | Selected |
|--------|-------------|----------|
| RESTful resource | GET /api/summaries, POST /api/summaries/generate 等 | ✓ |
| RPC 风格 | POST /api/rpc/generateSummary 等 | |

**User's choice:** RESTful resource 风格

### 生成反馈机制

| Option | Description | Selected |
|--------|-------------|----------|
| SSE 实时流 | POST 返回 SSE 流，推送 progress/done/error 事件 | ✓ |
| 同步等待 | 前端 loading 等 10-30s | |
| 异步 Job + 轮询 | 需要 job 表和状态管理 | |

**User's choice:** SSE 实时流
**Notes:** 用户初始问"异步 Job + 轮询 + SSE 可行吗"。Claude 分析后建议单独 SSE 就够（本地单用户无并发、实现更简单、Hono 原生支持），用户确认

### 图表数据端点

| Option | Description | Selected |
|--------|-------------|----------|
| 拆分多个端点 | /api/stats/categories, /trends, /files, /hours 按需加载 | ✓ |
| 单一聚合端点 | 一个 GET 返回所有图表数据 | |

**User's choice:** 拆分多个端点

### 错误响应格式

| Option | Description | Selected |
|--------|-------------|----------|
| 结构化错误响应 | { error: { code, message } } + HTTP status | ✓ |
| 纯 HTTP 状态码 | 仅状态码 + 文本 body | |

**User's choice:** 结构化错误响应

### API 前缀

| Option | Description | Selected |
|--------|-------------|----------|
| /api/ 前缀 | 所有 API 路由以 /api/ 开头 | ✓ |
| 无前缀 | API 和前端共享路径空间 | |

**User's choice:** /api/ 前缀

### CORS

**User's choice:** You decide
**Notes:** Claude discretion — Vite proxy 使 CORS 在开发时不必要，产线同源也不需要。如有需要可加 dev-only CORS header 作为 fallback。

---

## 构建与嵌入策略

### 构建产物结构

| Option | Description | Selected |
|--------|-------------|----------|
| Vite → dist/ui/ + tsup → dist/server.mjs | 两步构建，清晰分离 | ✓ |
| 全部 inline 到单文件 | 前端资源 inline 进服务端 bundle | |

**User's choice:** Vite → dist/ui/ + tsup → dist/server.mjs

### 开发联调

| Option | Description | Selected |
|--------|-------------|----------|
| Vite proxy → Hono | Vite dev server (:5173) proxy /api/* 到 :37888 | ✓ |
| Hono + Vite middleware | 单端口但配置复杂 | |

**User's choice:** Vite proxy → Hono

### 构建编排

| Option | Description | Selected |
|--------|-------------|----------|
| 串行 | vite build && tsup | ✓ |
| 并行 | concurrently 并行构建 | |

**User's choice:** 串行（vite build && tsup）

### 静态文件服务

| Option | Description | Selected |
|--------|-------------|----------|
| Hono serveStatic + SPA fallback | 内置能力，非 /api/ 路由回退到 index.html | ✓ |
| 手动文件服务 | 手动实现 | |

**User's choice:** Hono serveStatic + SPA fallback

### 前端资源分发

| Option | Description | Selected |
|--------|-------------|----------|
| dist/ui/ 随包分发 | npm 包含 UI 静态文件，零下载启动 | ✓ |
| 延迟下载 | 首次运行从 CDN 拉取 | |

**User's choice:** dist/ui/ 随包分发

### 前端目录结构

**User's choice:** You decide
**Notes:** Claude discretion — leaning src/ui/ (单包结构，共享 node_modules)

---

## Claude's Discretion

- 前端代码目录结构（src/ui/ vs ui/ workspace）
- CORS 处理方案（Vite proxy 使其不必要，dev-only CORS 作 fallback）
- 具体 Recharts 组件组合和图表样式细节
- 可拖拽网格库选择（react-grid-layout 或类似方案）
- API endpoint 精确命名和 query parameter 设计
- shadcn/ui 组件选择（需要哪些原语）

## Deferred Ideas

None — discussion stayed within phase scope

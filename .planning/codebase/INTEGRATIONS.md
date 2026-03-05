# External Integrations

**Analysis Date:** 2026-03-05

## APIs 与外部服务

### 1) Google Fonts（前端静态资源）
- 用途：页面字体加载（`Press Start 2P`、`VT323`）
- 集成方式：HTML `<link rel="preconnect">` + `<link rel="stylesheet">`
- 调用位置：`index.html`
- 端点：`https://fonts.googleapis.com`、`https://fonts.gstatic.com`
- 鉴权：无

### 2) Brave Search API（可选，仅 GSD CLI）
- 用途：`websearch` 命令的外部检索能力
- 调用位置：`.codex/get-shit-done/bin/lib/commands.cjs`（`cmdWebsearch`）
- 端点：`https://api.search.brave.com/res/v1/web/search`
- 鉴权方式：请求头 `X-Subscription-Token`，来源 `BRAVE_API_KEY`
- 失配行为：未设置 `BRAVE_API_KEY` 时返回 `available: false` 并静默回退
- 可选参数：`count`、`freshness`、`country=us`、`search_lang=en`

## 数据存储与持久化

### 业务应用（游戏）
- 未发现外部数据库/对象存储客户端（`src/` 与 `package.json` 无 DB/Storage SDK）
- 未发现浏览器持久化 API 调用（无 `localStorage`/`sessionStorage`/`indexedDB`/`document.cookie` 读写）
- 运行态状态主要在内存对象中维护：`src/main.js`

### 本地文件系统（测试与工具）
- Playwright 冒烟测试会落盘产物：`.planning/artifacts/phase-05/burst-latest.png`、`.planning/artifacts/phase-05/burst-latest.json`、`.planning/artifacts/phase-05/burst-console.json`（定义于 `tests/playwright-burst.test.js`）
- GSD CLI 读写规划配置与文档：`.planning/config.json`、`.planning/*`（如 `.codex/get-shit-done/bin/lib/config.cjs`、`.codex/get-shit-done/bin/lib/commands.cjs`）
- GSD CLI 读取用户级默认与 key 文件：`~/.gsd/defaults.json`、`~/.gsd/brave_api_key`（`.codex/get-shit-done/bin/lib/config.cjs`、`.codex/get-shit-done/bin/lib/init.cjs`）

## 认证与身份

### 终端用户认证（业务应用）
- 未发现登录/会话/OAuth/JWT 实现（`src/`、`tests/`、`package.json` 未出现对应服务 SDK 与路由）

### 服务级认证（工具链）
- Brave Search 使用 API Key：`BRAVE_API_KEY`
- 仅用于 GSD CLI 的 `websearch` 能力：`.codex/get-shit-done/bin/lib/commands.cjs`

## Webhooks 与回调

### HTTP Webhooks
- 未发现入站 webhook 端点（仓库无服务端路由目录/处理器，且未出现 `/api/webhooks/*` 的实现代码）
- 未发现出站业务 webhook 推送逻辑

### 非 HTTP 回调（内部事件）
- 应用存在大量浏览器事件回调（`keydown`、`keyup`、`focus`、`visibilitychange`、`fullscreenchange` 等），均为本地 UI/游戏循环逻辑：`src/main.js`

## 环境变量名（仅列名称，不含值）

### 在代码中确认使用
- `BRAVE_API_KEY`：Brave API 鉴权，见 `.codex/get-shit-done/bin/lib/commands.cjs`、`.codex/get-shit-done/bin/lib/config.cjs`、`.codex/get-shit-done/bin/lib/init.cjs`
- `HOME`：`~` 路径解析（引用校验）见 `.codex/get-shit-done/bin/lib/verify.cjs`

### 在测试进程中注入/覆盖
- `CI`：Playwright 测试拉起 dev server 时注入，见 `tests/playwright-burst.test.js`
- `FORCE_COLOR`：同上，设为 `0`，见 `tests/playwright-burst.test.js`

### 配置文件现状
- 未发现 `.env` / `.env.example` / `.env.local` 文件
- `.gitignore` 当前未包含 `.env*` 专项规则（仅见 `.DS_Store`、`node_modules/`、`output/`、`dist/`）：`.gitignore`

## 监控、观测与发布集成
- 未发现 Sentry/Datadog/Mixpanel 等第三方观测 SDK（`package.json` 与 `src/`）
- 错误观测主要依赖本地测试采样（`pageerror` 与 `console` 收集）：`tests/playwright-burst.test.js`
- 未发现 GitHub Actions / Vercel / Cloudflare 等部署配置文件（缺失 `.github/workflows/*.yml`、`vercel.json`、`wrangler.toml`）

## 集成清单（最终）
- 外部网络服务：Google Fonts、Brave Search API（可选）
- 外部数据库：无
- 外部缓存：无
- 外部认证提供方：无（仅工具链 API key）
- Webhook：无

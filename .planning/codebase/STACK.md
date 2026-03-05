# Technology Stack

**Analysis Date:** 2026-03-05

## 扫描范围
- 游戏应用运行代码：`index.html`、`src/main.js`、`src/control-rules.js`、`src/feedback-rules.js`、`src/determinism-harness.js`、`src/style.css`
- 自动化与回归测试：`tests/control-rules.test.js`、`tests/feedback-rules.test.js`、`tests/determinism-contract.test.js`、`tests/playwright-burst.test.js`
- 仓库内置工程化 CLI（GSD）：`.codex/get-shit-done/bin/gsd-tools.cjs`、`.codex/get-shit-done/bin/lib/*.cjs`、`.codex/config.toml`、`.planning/config.json`

## 语言与模块系统

### Primary
- JavaScript (ESM) 是主业务与测试语言：`package.json`（`"type": "module"`）、`src/main.js`、`tests/*.test.js`

### Secondary
- JavaScript (CommonJS) 用于仓库内置 CLI 工具链：`.codex/get-shit-done/bin/gsd-tools.cjs`、`.codex/get-shit-done/bin/lib/commands.cjs` 等
- HTML 用于页面入口与结构：`index.html`
- CSS 用于样式系统：`src/style.css`

### 未发现
- 未发现 TypeScript/Rust/Go/Python 运行时项目清单（缺失 `tsconfig*.json`、`Cargo.toml`、`go.mod`、`pyproject.toml`）

## 运行时与执行环境

### Browser Runtime（游戏本体）
- 浏览器模块入口：`index.html` -> `src/main.js`
- 图形运行依赖 WebGL（带降级）：`src/main.js`（`THREE.WebGLRenderer`，并在异常/测试标志下 fallback 到 `noop` renderer）
- 使用浏览器能力：Fullscreen API 与窗口焦点/可见性事件，见 `src/main.js`

### Node.js Runtime（开发/测试/工具）
- `npm run dev/build/preview` 驱动 Vite：`package.json`
- Node 原生测试运行器 `node:test`：`tests/control-rules.test.js`、`tests/determinism-contract.test.js`
- Playwright 冒烟脚本由 Node 直接执行：`package.json`（`test:burst`）、`tests/playwright-burst.test.js`
- 仓库内 GSD CLI 通过 `#!/usr/bin/env node` 运行：`.codex/get-shit-done/bin/gsd-tools.cjs`

### Node 版本约束（来自锁文件解析）
- `vite@7.3.1` 要求 Node `^20.19.0 || >=22.12.0`：`package-lock.json`（`node_modules/vite.engines.node`）
- `playwright@1.58.2` 要求 Node `>=18`：`package-lock.json`（`node_modules/playwright.engines.node`）
- `rollup@4.59.0` 要求 Node `>=18.0.0`：`package-lock.json`（`node_modules/rollup.engines.node`）

## 包管理与依赖

### 包管理
- npm（存在 `package-lock.json`，`lockfileVersion: 3`）：`package-lock.json`

### 核心依赖（Top-level）
- `three@^0.183.2`：3D/2.5D 渲染核心，见 `package.json`、`src/main.js`
- `playwright@^1.58.2`：浏览器自动化与回归，见 `package.json`、`tests/playwright-burst.test.js`
- `vite@^7.3.1`（devDependency）：本地开发服务器与构建，见 `package.json`

### 关键传递依赖（由构建链引入）
- `rollup@4.59.0`：Vite 打包底层能力，见 `package-lock.json`
- `esbuild@0.27.3`：Vite 转译/预构建链路，见 `package-lock.json`

### Node Built-ins（大量使用）
- `node:fs/promises`、`node:path`、`node:process`、`node:child_process`：`tests/playwright-burst.test.js`
- `fs`、`path`、`child_process`：`.codex/get-shit-done/bin/lib/*.cjs`

## 构建、运行与测试入口
- 开发：`npm run dev` -> `vite`（`package.json`）
- 生产构建：`npm run build` -> `vite build`（`package.json`）
- 本地预览：`npm run preview` -> `vite preview --host 0.0.0.0 --port 4173`（`package.json`）
- 确定性测试：`npm run test:determinism` -> `node --test tests/determinism-contract.test.js`（`package.json`）
- Playwright 冒烟：`npm run test:burst` -> `node tests/playwright-burst.test.js`（`package.json`）

## 配置面与工程开关
- Agent/多线程配置：`.codex/config.toml`
- 规划流程配置（mode、parallelization、workflow flags）：`.planning/config.json`
- 入口 HTML 直接加载 Google Fonts 与应用脚本：`index.html`

## 平台与部署形态
- 当前仓库是前端静态应用 + 本地 CLI 工具组合：`index.html`、`src/*`、`.codex/get-shit-done/bin/*`
- 未发现容器与 IaC：缺失 `Dockerfile*`、`docker-compose*.yml`、`*.tf`
- 未发现 CI 工作流：缺失 `.github/workflows/*.yml`
- 预期发布形态为静态资源（由 Vite 构建）+ Node 本地开发工具链（`npm` scripts 与 `.cjs` CLI）

## 补充观察
- GSD 内置版本为 `1.22.4`：`.codex/get-shit-done/VERSION`
- 安装清单与文件哈希存在：`.codex/gsd-file-manifest.json`

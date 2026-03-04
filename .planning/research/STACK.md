# Stack Research

**Domain:** Three.js 浏览器动作击杀游戏（HD pixel art）
**Researched:** 2026-03-04
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js LTS | 24.x (Krypton) | 本地开发运行时、包管理与构建执行环境 | 2026 年仍在 LTS 主线，生命周期更长；与 Vite 7 / Vitest 4 兼容窗口更稳，减少后续升级扰动 |
| Vite | 7.3.1 | 开发服务器、打包、生产构建 | 对原生 ESM 的浏览器游戏项目启动成本最低，HMR 快，配置面简洁，适合小团队高频迭代 |
| Three.js | 0.183.2 | 3D 渲染、场景管理、材质与动画能力 | Three.js 生态成熟、文档完整、示例覆盖广；对“3D 场景 + 像素风材质表现”可控性高 |
| Vanilla JavaScript (ES2023+) | 浏览器原生 | 游戏主循环、状态机、输入系统 | 当前项目约束明确为 Vanilla JS；避免过早引入框架抽象，先保证战斗循环和帧稳定 |
| Playwright Test | 1.58.2 | 自动化回归（输入回放、状态断言、截图对比） | 与项目“可自动化验证接口（render_game_to_text/advanceTime）”高度契合，可稳定做 E2E 回归 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| three-stdlib | 2.36.1 | 对 Three 常用扩展（controls/loaders/post utils）的 ESM 友好封装 | 需要 OrbitControls、GLTFLoader、更易维护的 examples 能力时引入 |
| postprocessing | 6.38.3 | 后处理效果（Bloom、Vignette、Outline） | 仅用于“击杀瞬间强化反馈”的少量效果；像素风项目应限制链路长度 |
| @tweenjs/tween.js | 25.0.0 | 轻量补间动画（hit-stop 后回弹、UI 数字跳动） | 需要确定性、可控时序的小动画，而非复杂骨骼动画系统时使用 |
| howler | 2.2.4 | 跨浏览器音频播放与管理（BGM/SFX） | 需要快速建立稳定音频层、避免直接操作 Web Audio 细节时使用 |
| vite-plugin-glsl | 1.5.5 | 在 Vite 中导入 `.glsl/.vert/.frag` | 当项目引入自定义像素风 shader（描边、抖动、闪白）时启用 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest 4.0.18 | 逻辑层单测（计分、冷却、刷新算法） | 推荐把纯逻辑从渲染层解耦，优先测试 deterministic 函数 |
| ESLint 10.0.2 + Prettier 3.8.1 | 代码质量与格式统一 | ESLint 负责错误发现，Prettier 负责格式，不混用职责 |
| Husky 9.1.7 + lint-staged 16.3.2 | 提交前质量门禁 | 在 pre-commit 执行 `eslint` + `vitest --run`，避免低级错误进入主线 |

## Installation

```bash
# 0) Runtime (recommended)
nvm install 24
nvm use 24
node -v

# 1) Bootstrap (if the repo is still empty)
npm create vite@latest poke-threes-hunter -- --template vanilla
cd poke-threes-hunter

# 2) Core runtime deps
npm install three@0.183.2 three-stdlib@2.36.1 postprocessing@6.38.3 @tweenjs/tween.js@25.0.0 howler@2.2.4 vite-plugin-glsl@1.5.5

# 3) Dev/test/tooling deps
npm install -D @playwright/test@1.58.2 vitest@4.0.18 eslint@10.0.2 prettier@3.8.1 husky@9.1.7 lint-staged@16.3.2 @types/three@0.183.1

# 4) Install Playwright browsers
npx playwright install --with-deps
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Three.js + Vanilla JS | React Three Fiber (R3F) | 当团队以 React 为主、UI 系统复杂、需要声明式组件化复用时 |
| Vite 7 | Rsbuild / Rspack | 当项目进入大型 monorepo、需要更激进的增量构建与统一构建平台时 |
| Playwright Test | Cypress | 当测试目标更偏传统业务表单 UI，而不是高频键盘输入与 canvas 游戏回放时 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| webpack 4 / 老旧脚手架 | 冷启动与增量构建慢，维护成本高，不适合快速迭代动作游戏 | Vite 7 |
| `three/examples/js` 全局脚本式引用 | 依赖隐式全局变量，tree-shaking 和模块边界差，后续维护困难 | `three/addons` 或 `three-stdlib` 的 ESM 引入 |
| Cannon.js（原仓库） | 长期缺乏维护，生态老化，问题排查成本高 | 轻量项目用自定义 AABB/网格碰撞；重物理场景用 Rapier（按需） |
| 全屏重后处理链（多级 bloom + TAA + FXAA 叠加） | 会稀释 HD pixel art 清晰边缘并抬高 GPU 开销，影响 60 FPS 稳定性 | 只保留 1-2 个关键反馈效果 + 像素对齐渲染策略 |

## Stack Patterns by Variant

**If 目标是 v1 快速验证（单场景、单人击杀闭环）:**
- Use `Three.js + Vanilla JS + fixed timestep loop + AABB hit detection`
- Because 复杂度最低，最容易保证 `render_game_to_text` 与 `advanceTime(ms)` 的确定性

**If 目标是 v1.5 高密度敌群与特效（200+ active entities）:**
- Use `object pooling + InstancedMesh + constrained postprocessing`
- Because 能显著降低 GC 抖动与 draw call 压力，保持动作手感稳定

**If 目标是移动端兼容优先:**
- Use `DPR clamp (1.0~1.5) + texture atlas + selective effects`
- Because 移动端带宽与热管理敏感，先保帧稳定再加视觉装饰

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@7.3.1` | `node@^20.19.0 || >=22.12.0` | 在 2026 建议直接使用 `node@24.x`，避免 Node 20 接近生命周期尾部 |
| `vitest@4.0.18` | `node@^20.0.0 || ^22.0.0 || >=24.0.0` | 与 Vite 7 一起在 Node 24 下可减少版本分裂 |
| `@playwright/test@1.58.2` | `node@>=18` | Node 24 fully covered；建议锁定 Playwright 主次版本，避免 browser binary 漂移 |
| `postprocessing@6.38.3` | `three@>=0.157.0 <0.184.0` | `three@0.183.2` 在兼容区间内 |
| `@types/three@0.183.1` | `three@0.183.2` | 即使主项目是 JS，编辑器类型提示仍建议保持同代版本 |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md` — 项目约束（Three.js + Vanilla JS + Vite + Playwright）
- [Node.js Release Schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json) — LTS 周期与 2026 推荐运行时
- [npm: three](https://www.npmjs.com/package/three) — 当前发布版本验证
- [npm: vite](https://www.npmjs.com/package/vite) — 当前发布版本与 engine 约束
- [npm: @playwright/test](https://www.npmjs.com/package/@playwright/test) — 当前发布版本与 engine 约束
- [npm: postprocessing](https://www.npmjs.com/package/postprocessing) — 与 three 的 peer compatibility
- [Vite Docs](https://vite.dev/guide/) — 构建与开发体验基线
- [Playwright Docs](https://playwright.dev/docs/intro) — 自动化测试能力基线

---
*Stack research for: Three.js browser action kill game (HD pixel art)*
*Researched: 2026-03-04*

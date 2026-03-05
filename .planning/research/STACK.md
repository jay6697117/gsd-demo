# Stack Research

**Domain:** v1.1 World & Growth Overhaul（地图扩展 + 建筑系统 + 掉落装备 + 等级成长 + 技能/天赋）
**Researched:** 2026-03-05
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| JavaScript (ESM, Vanilla) | Existing (project baseline) | 继续承载 gameplay loop、状态更新、规则模块 | 当前代码已围绕纯函数规则 + 固定步长建立确定性基础，v1.1 不应引入框架迁移风险 |
| Three.js | 0.183.2 (existing) | 世界渲染、建筑/道具可视化、像素风表达 | 当前渲染链已稳定（含测试时 noop renderer 路径），可直接承接地图与建筑扩展 |
| Vite | 7.3.1 (existing) | 开发/构建与本地验证入口 | 现有测试与运行脚本已对齐，保持不变可避免构建链扰动确定性回归 |
| Playwright + Node `node:test` | Playwright 1.58.2 (existing) | 端到端 burst 回归 + 规则/契约测试 | 已有 `advanceTime` 与 `render_game_to_text` 契约，适合继续扩展 v1.1 状态断言 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 | 对地图分区、建筑定义、掉落池、技能树配置做加载期 schema 校验 | 当 v1.1 把玩法从硬编码转为数据驱动时启用；只做“加载时校验”，不进入每帧热路径 |
| (No extra RNG/pathfinding runtime lib) | N/A | 保持当前内置 deterministic RNG 与简单追击逻辑 | v1.1 目标是可控扩展，不是重做 AI/导航系统；避免为暂不需要的复杂度付费 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript (check-only) | 用 `checkJs` + JSDoc 做数据结构静态检查 | 仅 `tsc --noEmit`，不做全量 TS 迁移；用于约束 `world config/drop table/talent` 结构一致性 |
| Existing deterministic harness | 保持确定性行为可验证 | 继续使用 `test:determinism` 与 `test:burst`，并扩展 v1.1 字段断言 |

## Integration Points (v1.1)

- **Content layer（建议新增目录）**：`src/content/` 放 `zones`, `buildings`, `breakables`, `drops`, `progression`, `talents` 配置；启动阶段一次性加载并用 `zod` 校验。
- **Simulation layer（现有主循环）**：`src/main.js` 内保持 fixed-step 更新，新增系统应以纯规则函数形式拆到 `src/*-rules.js`，禁止直接在渲染分支改核心状态。
- **Determinism contract**：`src/determinism-harness.js` 增加 v1.1 关键信息快照（例如 `worldState`, `progression`, `equipment`），并通过 schema version 显式演进（例如 `1.1.0`）。
- **Testing layer**：扩展 `tests/determinism-contract.test.js`（字段存在性、排序稳定、数值归一化）与 `tests/playwright-burst.test.js`（击破掉落、升级选择后的状态推进）。
- **RNG discipline**：继续分离 `simulationRng` 与 `visualRng`；掉落、经验、升级候选都必须走 simulation RNG，避免视觉随机污染可回放结果。

## Non-Goals for Stack Change

- 不做框架迁移（例如 React/TS 全量重写/ECS 大迁移）。
- 不引入重型物理引擎或导航网格库（当前需求不需要）。
- 不引入数据库、后端服务、联机同步栈（里程碑范围外）。
- 不把 schema 校验放进每帧更新路径（避免性能抖动与行为漂移）。

## Installation

```bash
# Core
# no change needed for existing core runtime stack

# Supporting
npm install zod@4.3.6

# Dev dependencies
npm install -D typescript@5.9.3
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `zod` 加载期校验 | `ajv` + JSON Schema | 当配置规模巨大、需要预编译 schema 或跨服务共享 schema 标准时 |
| TypeScript check-only (`checkJs`) | Full TypeScript migration | 当 v1.1 后模块持续扩张且团队确认可接受一次性迁移成本时 |
| 现有内置 LCG + seed 管理 | `seedrandom` 等外部 RNG 库 | 仅当需要跨项目统一 RNG 算法或与外部工具对齐同一随机序列时 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| 在玩法逻辑中直接使用 `Math.random()` | 破坏可回放与可断言，导致 harness 不稳定 | 统一走 simulation RNG（带 seed） |
| 立即引入 ECS/physics 大框架（如 bitecs/rapier） | v1.1 功能收益不足以覆盖重构与回归成本 | 延续当前轻量模块化规则系统 |
| 将地图/掉落/天赋继续硬编码在 `main.js` | 扩展成本高，且难做结构化测试 | 数据配置文件 + 加载期 schema 校验 |

## Stack Patterns by Variant

**If v1.1 只做固定地图扩展（非程序化生成）:**
- Use `static content config + zod load validation + deterministic spawn/drop tables`
- Because 可维护性提升最大，且不会破坏现有 deterministic harness

**If v1.1 需要可破坏物体与装备掉落联动:**
- Use `breakable-rules.js + drop-rules.js`（纯函数）
- Because 可在 `node:test` 直接验证“同 seed 同结果”，并保持渲染与规则解耦

**If v1.1 引入等级与技能/天赋三选一:**
- Use `progression-rules.js + talent-rules.js` + snapshot contract 扩展
- Because 升级选择属于核心状态转移，必须进入确定性快照与回归断言

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@7.3.1` | `node@^20.19.0 || >=22.12.0` | 来源于当前 lockfile，建议团队统一 Node 22+ 或 24 LTS |
| `playwright@1.58.2` | `node@>=18` | 现有脚本可继续使用；建议锁主次版本避免浏览器二进制漂移 |
| `typescript@5.9.3` | `node@>=14.17` | 仅 check-only 用途，对运行时零影响 |
| `zod@4.3.6` | current Node baseline | 用于加载期校验，避免进入每帧热点路径 |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md` — v1.1 目标与范围边界
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/STACK.md` — 现有栈与版本基线
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/ARCHITECTURE.md` — 现有分层与 deterministic hooks
- `/Users/zhangjinhui/Desktop/gsd-demo/package.json` — 当前依赖与脚本
- `/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json` — Vite engine compatibility（Node 约束）
- [npm: zod](https://www.npmjs.com/package/zod) — 版本与发布信息
- [npm: typescript](https://www.npmjs.com/package/typescript) — 版本与 engine 信息
- [npm: playwright](https://www.npmjs.com/package/playwright) — engine 与现有兼容性

---
*Stack research for: v1.1 world and growth overhaul on deterministic Three.js runtime*
*Researched: 2026-03-05*

# Phase 11: Automation & Determinism Hardening - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning
**Source:** roadmap, requirements, current codebase, and existing v1.1 regression artifacts

<domain>
## Phase Boundary

本阶段只交付自动化与 determinism 加固，不新增玩法、不调数值、不改成长规则。

范围包含：
- 冻结 v1.1 `render_game_to_text()` assertion contract
- 为跨地图 / 掉落 / 升级链路建立 deterministic replay 证明
- 抽取共享 Playwright 浏览器测试基座
- 加固 `breakable -> drop -> equip` 与 `kill -> xp -> levelup -> choose-upgrade` 两条端到端路线
- 新增专门的 restart parity 浏览器回归与统一回归命令入口

本阶段明确不交付：
- 新地图、建筑、掉落、装备、XP、升级选择的新玩法功能
- 测试框架迁移到 `@playwright/test`
- CI/CD 基建重做、截图视觉 diff 平台、远程报告服务
- Phase 12 之后的 meta automation 或 telemetry 系统

</domain>

<decisions>
## Implementation Decisions

### Automation Baseline
- 保留当前 `node tests/playwright-*.test.js` 的执行模型，不迁移到 `@playwright/test`。
- 现有 phase-specific 浏览器测试文件继续保留职责，不合并成单个 mega-script。
- Phase 11 新增共享 helper：`tests/helpers/playwright-game.js`，承载 dev server、browser/page lifecycle、snapshot 读取、artifact 写入、console gating、scripted timeline 支持。

### Determinism Contract
- `window.render_game_to_text()` 继续保留当前顶层 section：`world`、`lootState`、`equipmentState`、`progressionState`、`levelUpState`、`upgradeState`、`spawnState`。
- Phase 11 额外新增顶层 `rngState`，字段固定为：
  - `runSeed`
  - `spawnRngState`
  - `dropRngState`
  - `offerRngState`
- `DETERMINISM_SCHEMA_VERSION` 在本阶段显式 bump 到 `1.4.0`。
- 本阶段的目标不是更改 stepping 规则，而是证明 `window.advanceTime(ms)` 在跨系统链路上仍保持 determinism。

### Replay Scope
- deterministic replay 证明必须跨至少三个子系统：
  - sector traversal
  - breakable/drop/equip
  - levelup choice / reroll
- replay parity 必须在两个全新浏览器会话之间验证，不能只在同一会话内重复读取 state。
- normalization 只允许剔除非 gameplay 噪音字段，不允许忽略 gameplay-relevant 状态。

### Regression Scope
- `AUTO-06` 与 `AUTO-07` 通过各自独立的浏览器路线证明，不用 HUD 肉眼观察替代状态断言。
- `AUTO-08` 必须由专门的 restart parity 路线证明，且同时覆盖 equipment、loot、progression、level-up、upgrade reset。
- `package.json` 收敛为稳定的 v1.1 automation 入口，至少提供 `test:e2e:v11` 与 `test:regression:v11`。

### Headless Runtime Policy
- headless WebGL fallback 继续视为非阻塞项。
- 正确性判断以 deterministic text-state、console gating、route assertions 为准，不以截图视觉完全一致为依据。

### Claude's Discretion
- 共享 helper 的具体 API 命名与模块拆分方式
- replay 测试的 scripted timeline 组织形式
- artifact 文件名中的细节后缀与目录层级
- full regression 命令的具体脚本串联方式，只要最终入口稳定、清晰且不混淆职责

</decisions>

<specifics>
## Specific Ideas

- 当前 `playwright-burst`、`map-sectors`、`building-tactics`、`breakables-loot`、`progression-levels`、`levelup-choice` 六个浏览器脚本都重复实现了：
  - `waitForServer()`
  - `spawnDevServer()`
  - `isCriticalConsoleError()`
  - `advance()` / `readSnapshot()`
  - artifact 目录写入
- 当前 `package.json` 只有 `test:determinism` 和 `test:burst`，不适合作为 v1.1 全量回归入口。
- 当前 `tests/playwright-progression-levels.test.js` 已证明 progression reset，当前阶段要把 equipment / loot / level-up / upgrade reset 统一收口到专门 restart parity 路线。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/determinism-harness.js` 已经是 snapshot 的唯一 canonical bridge。
- `tests/determinism-contract.test.js` 已经对 `world.breakables`、`lootState`、`equipmentState`、`progressionState`、`levelUpState`、`upgradeState`、`spawnState` 做字段级断言。
- `tests/playwright-breakables-loot.test.js` 已证明 `breakable -> drop -> equip_compare -> equip`。
- `tests/playwright-levelup-choice.test.js` 已证明 `kill -> levelup_choice -> reroll -> choose -> resume`。
- `tests/playwright-progression-levels.test.js` 已覆盖 `kill -> xp -> level-up -> restart reset` 的一部分 restart parity。

### Established Patterns
- 项目继续使用 Node built-in test runner 与直接执行的 Playwright 脚本。
- 浏览器测试主断言面优先使用 `window.render_game_to_text()`，而不是 DOM 文本或像素截图。
- 运行时 determinism 以显式 schema version 和稳定排序的 snapshot section 作为证据。

### Integration Points
- snapshot bridge：`src/determinism-harness.js`
- dev server / browser lifecycle：当前各个 `tests/playwright-*.test.js`
- cross-pipeline replay 证据：`window.advanceTime(ms)` 与 `window.render_game_to_text()`
- regression entrypoint：`package.json` scripts

</code_context>

<deferred>
## Deferred Ideas

- 迁移到 `@playwright/test`
- CI 上的多环境 matrix 和 artifact 上传
- 视觉 diff / golden screenshot 系统
- 更细粒度的 telemetry 或 performance instrumentation

</deferred>

---
*Phase: 11-automation-determinism-hardening*
*Context gathered: 2026-03-07*

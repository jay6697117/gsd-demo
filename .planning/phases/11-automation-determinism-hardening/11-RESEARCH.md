# Phase 11: Automation & Determinism Hardening - Research

**Researched:** 2026-03-07  
**Domain:** snapshot contract freeze, cross-pipeline replay parity, shared Playwright automation helpers, restart reset regression  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `AUTO-04`: `window.render_game_to_text()` includes world/progression/equipment/offer/rng fields required for v1.1 assertions.
- `AUTO-05`: `window.advanceTime(ms)` preserves deterministic outcomes across map, drop, and level-up pipelines.
- `AUTO-06`: Automated tests cover `breakable -> drop -> equip` end-to-end flow.
- `AUTO-07`: Automated tests cover `kill -> xp -> levelup -> choose-upgrade` end-to-end flow.
- `AUTO-08`: Regression tests verify restart parity for progression and equipment state reset.

### Locked Decisions
- Phase 11 只做自动化和 observability hardening，不新增玩法或调数值。
- 不迁移测试框架；继续使用 Node + Playwright direct scripts。
- 现有 phase-specific browser routes 保留原文件名与职责，只抽公共 helper。
- 新增顶层 `rngState`，并将 determinism schema bump 到 `1.4.0`。
- replay parity 必须在两个全新浏览器会话中验证。
- restart parity 必须由专门路线同时覆盖 equipment 与 progression，而不是继续分散在局部脚本里。

### Phase Boundary
- 交付 shared Playwright helper、determinism replay route、restart parity route、统一 regression entrypoints。
- 不改掉落、装备、progression、level-up choice 的玩法语义，只补证据与自动化基座。

## Summary

当前仓库并不缺测试，而是缺一个统一、可维护、可扩展的 v1.1 automation contract。`determinism-contract.test.js` 已经覆盖了大量字段级断言，Phase 08/09/10 也分别有真实浏览器路线，但这些能力目前仍是“按 phase 堆叠出来的结果”，而不是一个收敛后的测试基座。

最明显的现实问题有四类：
1. **Playwright 脚本基建重复**：当前多个浏览器脚本重复实现 dev server、browser lifecycle、artifact 写入和 console gating。
2. **顶层 RNG 证据缺口**：snapshot 虽然已分散暴露 `spawnState`、`lootState`、`levelUpState`，但没有统一的顶层 `rngState` 来冻结 v1.1 assertion contract。
3. **跨管线 replay 证明缺口**：现在有局部 determinism contract，但缺一个贯穿 traversal、loot、level-up 的双会话 replay test。
4. **restart parity 证据仍分散**：`progression-levels` 已覆盖部分 reset，但 equipment / loot / level-up / upgrade reset 还没有一个专门、完整、稳定的专用路线。

因此，Phase 11 最稳的拆法不是重写现有测试，而是：
- 先冻结 snapshot contract，并抽出 helper 骨架
- 再补跨管线 deterministic replay 路线
- 再把已有关键 E2E 路线迁移到 helper 并加固字段级断言
- 最后补 restart parity 专项路线和统一 regression 入口

**Primary recommendation:** 维持 `4` 个串行 waves：`11-01 -> 11-02 -> 11-03 -> 11-04`。

## Planner-Critical Findings

### 1) `render_game_to_text()` 已接近完整，但缺 v1.1 冻结的顶层 RNG 摘要
- 现状：`spawnState`、`lootState`、`levelUpState` 已分别暴露不同 RNG 流的状态。
- 风险：没有顶层 `rngState` 时，跨管线 determinism 断言缺少统一 contract，后续 phase 很容易“字段存在但语义漂移”。
- 规划含义：`11-01` 必须在不删减现有 section 的前提下补齐 `rngState`，并 bump schema version。

### 2) 浏览器测试重复脚手架已经达到需要收敛的程度
- 现状：至少 6 个 Playwright 脚本重复 `waitForServer()`、`spawnDevServer()`、`advance()`、`readSnapshot()`、artifact 写入和 critical console error 过滤。
- 风险：后续如果修改 dev server、console gating 或 artifact 结构，需要同时改多份脚本，极易漂移。
- 规划含义：必须引入 `tests/helpers/playwright-game.js` 作为共享骨架，但不要一次性把所有业务路由也抽成高耦合 helper。

### 3) `AUTO-05` 需要“两个全新浏览器会话”的 replay 证明
- 现状：当前 determinism contract 主要在单次 snapshot 构造和单次 route 执行上做断言。
- 风险：同一会话内重复读取 state 无法证明完整 replay parity，尤其不能暴露潜在的 seed 初始化或 run reset 漂移。
- 规划含义：`11-02` 需要一个专门的 `playwright-determinism-replay.test.js`，在 run A / run B 两个全新浏览器会话中跑同一 scripted timeline 并比较 normalized final snapshot。

### 4) `AUTO-08` 现在只被局部覆盖，不是 phase-level 明确证明
- 现状：`playwright-progression-levels.test.js` 已覆盖 progression reset 与部分 level-up reset，但没有把 equipment / loot / upgrade reset 一并锁进同一条 restart parity 路线。
- 风险：如果以后某个 reset slice 漂移，现有分散证据会让问题定位变慢。
- 规划含义：`11-04` 需要新建专门 restart parity route，把所有 run-local state reset 一次性证明。

### 5) `package.json` 目前没有 v1.1 regression 的稳定入口
- 现状：仅有 `test:determinism` 和 `test:burst`。
- 风险：full regression 命令只能靠文档里的一长串 shell，不利于后续 phase 复用与 verifier 调用。
- 规划含义：Phase 11 必须把 v1.1 的 route/regression 收敛成可调用脚本入口。

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `node:test` | Node built-in | contract / unit assertions | 已是项目默认测试方式 |
| `playwright` | `1.58.2` | browser route regression | 已覆盖现有所有 E2E 脚本 |
| `vite` | `7.3.1` | build gate | 保持与现有 phase gate 一致 |

### Recommendation
- 不引入新测试框架、不引入 CI runner 抽象层、不引入外部 snapshot serializer。
- 共享 helper 只负责“运行浏览器测试的机械骨架”，业务 route 仍留在各自 phase test 文件中。

## Architecture Patterns

### Pattern 1: Snapshot-First Assertion Contract
**What:** 先冻结 snapshot 字段与 schema，再补 route 测试  
**Where:** `src/determinism-harness.js`, `tests/determinism-contract.test.js`  
**Why:** 让所有 Playwright 断言都以同一文本状态为依据，避免 DOM/截图依赖

### Pattern 2: Thin Shared Browser Harness
**What:** 抽取 dev server、browser lifecycle、artifact writer、console gating、advance/read helpers  
**Where:** `tests/helpers/playwright-game.js`  
**Why:** 去掉重复脚手架，但不把 route 逻辑藏进黑盒 helper

### Pattern 3: Dual-Session Replay Verification
**What:** 同一 scripted timeline 在两个全新浏览器会话中重放并比较 normalized snapshot  
**Where:** `tests/playwright-determinism-replay.test.js`  
**Why:** 这是 `AUTO-05` 最直接、最可解释的证据

### Pattern 4: Dedicated Restart Parity Route
**What:** 用单独路线覆盖 equipment、loot、progression、levelUp、upgrade reset  
**Where:** `tests/playwright-restart-parity.test.js`  
**Why:** 避免 restart reset 证据继续散落在多个半覆盖脚本里

### Pattern 5: Regression Entry Consolidation
**What:** 把 full regression 收敛到 `package.json` 脚本入口  
**Where:** `package.json`  
**Why:** 让 verifier、未来 phase 和开发者本地回归使用同一入口

## Proposed Contracts

### Snapshot Extension
```js
{
  schemaVersion: "1.4.0",
  world,
  lootState,
  equipmentState,
  progressionState,
  levelUpState,
  upgradeState,
  spawnState,
  rngState: {
    runSeed,
    spawnRngState,
    dropRngState,
    offerRngState,
  },
}
```

### Shared Playwright Helper Responsibilities
- `waitForServer()`
- `spawnDevServer()`
- `advance(page, ms)`
- `readSnapshot(page)`
- `collectConsoleMessages()` / critical error filtering
- `writeArtifacts()`
- `runScriptedTimeline()`
- `withGameSession()` or equivalent lifecycle wrapper

## Validation Architecture

### Wave 1 Validation
- `node --test tests/determinism-contract.test.js`
- `node --input-type=module -e "import('./tests/helpers/playwright-game.js')"`
- `npm run build`

### Wave 2 Validation
- `node tests/playwright-determinism-replay.test.js`
- `npm run build`

### Wave 3 Validation
- `node tests/playwright-breakables-loot.test.js`
- `node tests/playwright-levelup-choice.test.js`
- `node tests/playwright-progression-levels.test.js`
- `npm run build`

### Wave 4 Validation
- `node tests/playwright-restart-parity.test.js`
- `npm run test:e2e:v11`
- `npm run test:regression:v11`

### Phase Gate
- `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-map-sectors.test.js && node tests/playwright-building-tactics.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-determinism-replay.test.js && node tests/playwright-restart-parity.test.js`

## Requirement-to-Plan Hints

### Plan 11-01 (Wave 1, depends_on: none): Freeze Snapshot Contract + Helper Skeleton
**Primary requirement:** `AUTO-04`  
**Files (expected):**
- `src/determinism-harness.js`
- `tests/determinism-contract.test.js`
- `tests/helpers/playwright-game.js`

**Implementation hints:**
1. 保持现有 snapshot section 不变并补充顶层 `rngState`
2. schema 版本 bump 到 `1.4.0`
3. 先建立 helper skeleton，不提前抽业务 route

### Plan 11-02 (Wave 2, depends_on: 11-01): Cross-Pipeline Deterministic Replay
**Primary requirement:** `AUTO-05`  
**Files (expected):**
- `tests/helpers/playwright-game.js`
- `tests/playwright-determinism-replay.test.js`

**Implementation hints:**
1. 让 helper 支持 scripted timeline 和双会话 replay
2. route 必须覆盖 traversal、loot、level-up 三条链路
3. final normalized snapshot 在 run A / run B 深度一致

### Plan 11-03 (Wave 3, depends_on: 11-02): Harden Existing End-to-End Routes
**Primary requirements:** `AUTO-06`, `AUTO-07`  
**Files (expected):**
- `tests/helpers/playwright-game.js`
- `tests/playwright-breakables-loot.test.js`
- `tests/playwright-levelup-choice.test.js`
- `tests/playwright-progression-levels.test.js` (if needed)

**Implementation hints:**
1. 把现有 route 切到 shared helper
2. 强化 `lootState`、`equipmentState`、`progressionState`、`levelUpState`、`upgradeState` 的字段级断言
3. 保持每条路线职责清晰，不做 mega-route

### Plan 11-04 (Wave 4, depends_on: 11-03): Restart Parity + Unified Regression Entry
**Primary requirement:** `AUTO-08`  
**Files (expected):**
- `tests/playwright-restart-parity.test.js`
- `tests/helpers/playwright-game.js`
- `package.json`

**Implementation hints:**
1. 用独立 route 证明 restart 后 equipment/progression/levelup/upgrade/loot 全部 reset
2. 在 `package.json` 中提供 v1.1 E2E 和 regression 的稳定入口
3. 为 `11-VERIFICATION.md` 准备统一的自动化证据命令

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| shared browser flow | per-test copy/paste helpers | one thin `tests/helpers/playwright-game.js` | 降低 drift |
| replay parity | same-session duplicate reads | two fresh browser sessions with identical timeline | 才能真正证明 determinism |
| restart reset proof | partial assertions in unrelated routes | dedicated restart parity route | 证据闭环更完整 |
| regression entry | long one-off shell pasted in docs | named `package.json` scripts | verifier 和开发者都能复用 |

## Common Pitfalls

### Pitfall 1: helper 抽过头，把业务路线也黑盒化
**Avoid:** helper 只抽机械骨架，业务断言与 route 仍留在各 phase test 文件中

### Pitfall 2: 为了 replay 一致性，偷偷忽略 gameplay-relevant 字段
**Avoid:** normalization 只能剔除非游戏噪音，不能绕过真实状态差异

### Pitfall 3: 把 `AUTO-08` 继续留给 `playwright-progression-levels.test.js`
**Avoid:** 新增专门 restart parity route，同时覆盖 progression 与 equipment reset

### Pitfall 4: package scripts 只覆盖新测试，不覆盖旧 route
**Avoid:** `test:e2e:v11` 和 `test:regression:v11` 必须把现有 v1.1 关键 route 一并纳入

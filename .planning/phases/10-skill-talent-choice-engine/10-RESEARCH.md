# Phase 10: Skill/Talent Choice Engine - Research

**Researched:** 2026-03-06  
**Domain:** pending level-up event consumption, deterministic choice generation, level-up modal flow, reroll, upgrade application, snapshot expansion  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `TAL-01`: 每次升级展示恰好 3 个 upgrade choices
- `TAL-02`: 用户必须恰好选择 1 个，并在选择后恢复战斗，且不能出现 input lock
- `TAL-03`: choice pool 同时支持 `skill` 与 `talent` 两类升级，且带 eligibility / exclusion 约束
- `TAL-04`: 单次 offer 中无重复、无无效项
- `TAL-05`: 应用 upgrade 后必须立即产生可测量的战斗效果
- `TAL-06`: reroll 与 pool constraints 必须 deterministic

### Locked Decisions
- 直接从当前 roadmap/requirements 继续规划，不单独跑 discuss-phase
- Phase 10 新增 `levelup_choice` mode，并冻结战斗推进
- `pendingLevelUps` 是唯一升级事件来源
- `offerRngState` 独立于 spawn / drop / progression RNG
- 选择面板一次只消费一个 pending event
- `Escape` 不关闭 level-up panel；`Enter` / `Space` 负责确认；`R` 负责 reroll

### Phase Boundary
- 本阶段交付 choice engine，不再改 XP 阈值、掉落系统、地图系统
- 不做 persistent progression、meta economy、稀有升级系统
- 不做 Phase 11 的全量测试/观测硬化，只准备必须的 snapshot 与 browser evidence

## Summary

Phase 09 已经把 Phase 10 最关键的前置准备好了：`pendingLevelUps` 队列、稳定 `eventSeq`、HUD progression 展示、restart parity、deterministic snapshot bridge。Phase 10 不需要重新发明成长入口，它的任务是**消费**这条 queue，并把“升级到达”转成“稳定可选且可验证的 3 选 1 决策”。

当前代码库里最重要的现实约束有 4 个：
1. `main.js` 已有多个 mode 和输入分派，新增 `levelup_choice` 时不能破坏 `equip_compare`、pause、restart、fullscreen；
2. 现有效果计算已经有 equipment modifiers 汇入点，upgrade effect 最好沿同一条 derived/effective 计算链扩展；
3. deterministic harness 当前 schema 已经到 `1.2.0`，Phase 10 继续扩展 offer/upgrade 摘要时必须明确 bump 版本；
4. 浏览器回归已经完全依赖 `render_game_to_text()`，所以 choice engine 的所有关键状态都必须先进入 snapshot，再谈 Playwright。

因此，最稳的拆法不是“先做 UI 再补规则”，而是：
- 先锁 catalog、eligibility、exclusion、unique-offer 这些**纯规则**
- 再接 `levelup_choice` mode 与确认流
- 再把 upgrade effect 真正接入 combat/state 与 snapshot
- 最后把 reroll 和 full regression 收口

**Primary recommendation:** 维持 `4` 个串行 waves：`10-01 -> 10-02 -> 10-03 -> 10-04`。

## Planner-Critical Findings

### 1) `pendingLevelUps` 必须是唯一消费源，不能从 `level` 值反推
- 现状：Phase 09 已经把阈值跨越转成显式 pending queue
- 风险：如果 Phase 10 只看 `level`，多阈值跨越时会丢失 event 数量与顺序
- 规划含义：`10-02` 必须从 queue 头部消费升级事件，并把 `activeEventId` 明确写入 level-up state

### 2) `levelup_choice` 会成为第二个强接管模式，必须明确与 `equip_compare` 的优先级
- 现状：`equip_compare` 已经接管 `Enter` / `Space` / `Escape`
- 风险：如果不定义优先级，升级与装备替换会出现输入语义冲突
- 规划含义：Phase 10 需要写死 precedence：已进入 `equip_compare` 时先完成 compare；新进入 `levelup_choice` 后阻止新的 auto pickup/compare

### 3) choice engine 需要独立 RNG，否则 reroll 不可解释
- 现状：spawn、loot、progression 都已经分离出独立随机流
- 风险：如果 Phase 10 复用现有随机流，reroll 会污染怪物生成或掉落 determinism
- 规划含义：需要单独的 `offerRngState` 和 `offerSeq`

### 4) `TAL-03` / `TAL-04` 是纯规则问题，应该先于 UI
- 现状：一旦面板 UI 先落地，后面再修 pool/duplicate/filtering 会反复返工浏览器脚本
- 规划含义：`10-01` 应先把 catalog、eligibility、exclusion、max-rank、unique-offer 规则锁定

### 5) upgrade effect 不能靠改 base constants 实现
- 现状：`PLAYER_ATTACK_DAMAGE`、`PLAYER_MAX_HP`、`PLAYER_BASE_SPEED` 仍是 base 常量；equipment 已经通过 derived/effective helper 汇入
- 风险：直接修改 base 常量会把 equipment、progression、future talent 逻辑耦死
- 规划含义：Phase 10 必须扩展 effective helper，使 equipment + upgrade modifiers 共存

### 6) Playwright 必须读 `levelUpState` / `upgradeState`，不能只看 panel 文本
- 现状：已有 Playwright 脚本用 `render_game_to_text()` 作为主断言面
- 风险：只看 DOM 文本会让 reroll/eligibility 的错误不可诊断
- 规划含义：`10-03` 先把 snapshot 接上，`10-04` 再写 browser route

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `node:test` | Node built-in | pure offer generation / upgrade application verification | 已与 determinism harness 对齐 |
| `playwright` | `1.58.2` | level-up choose / reroll / resume 浏览器回归 | 已是项目标准 E2E 基础 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vite` | `7.3.1` | build gate | 每个 wave 完成后执行 |
| existing feedback / overlay pipeline | local runtime | level-up panel / cue 复用 | 避免额外 UI 框架 |

### Recommendation
- 不引入状态库、事件总线或 UI 框架；维持 `src/*.js` 平铺模块和 `main.js` 组合根模式

## Architecture Patterns

### Pattern 1: Offer Generator as a Pure Deterministic Reducer
**What:** 用纯函数从 `activeEventId + upgrade state + offerRngState` 生成恰好 3 个合法选项  
**Where:** `src/levelup-system.js`  
**Why:** 方便校验 eligibility / exclusion / unique-offer / reroll

### Pattern 2: Split Transient Offer State from Applied Upgrade State
**What:** `state.levelUp` 只承载当前 panel/offer；`state.upgrades` 承载已应用效果  
**Where:** runtime state in `src/main.js`  
**Why:** panel 关闭后不污染已持久于本 run 的升级效果

### Pattern 3: One Event, One Offer Cycle
**What:** 每次只消费一个 `pendingLevelUps[0]`，完成选择后再看下一项  
**Where:** `src/main.js` + `src/levelup-system.js`  
**Why:** 满足 `TAL-02` 的精确定义，避免一次性弹出多级选择

### Pattern 4: Effect Application Through Derived Modifiers
**What:** 技能/天赋效果汇入 `effectiveAttackDamage` / `effectiveMaxHp` / `effectiveMoveSpeed` / attack geometry helper  
**Where:** `src/main.js`  
**Why:** 保持与 equipment modifiers 一致的组合方式

### Pattern 5: Snapshot-First Level-Up Evidence
**What:** `levelUpState` / `upgradeState` 先进入 snapshot，再写浏览器回归  
**Where:** `src/determinism-harness.js`  
**Why:** 让 reroll、offer filtering、selection apply 都能通过文本状态解释

## Proposed Runtime Contracts

### `state.levelUp`
```js
{
  activeEventId,
  currentOfferId,
  offeredChoices,
  selectedIndex,
  rerollsRemaining,
  offerSeq,
  offerRngState
}
```

### `state.upgrades`
```js
{
  appliedChoices,
  skillModifiers,
  talentModifiers
}
```

### Snapshot Extensions
- `levelUpState`
  - `activeEventId`
  - `currentOfferId`
  - `offeredChoices`
  - `selectedIndex`
  - `rerollsRemaining`
  - `offerSeq`
  - `offerRngState`
- `upgradeState`
  - `appliedChoices`
  - `skillModifiers`
  - `talentModifiers`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offer choices | ad-hoc array shuffling in UI | pure offer generator with explicit pool rules | deterministic and testable |
| Upgrade application | mutate base constants | derived modifiers on top of existing effective helpers | keeps equipment and upgrades composable |
| Queue consumption | infer from `level` | consume `pendingLevelUps[0]` | preserves multi-threshold correctness |
| Reroll | `Math.random()` in panel code | dedicated `offerRngState` | replay-safe |
| Browser validation | DOM text only | `render_game_to_text()` + Playwright | diagnosable and stable |

## Common Pitfalls

### Pitfall 1: `equip_compare` 和 `levelup_choice` 同时抢占 `Space`
**Avoid:** 明确 mode precedence；`levelup_choice` 期间阻止新的 pickup/compare 进入

### Pitfall 2: 不足 3 个 eligible choices 时偷偷重复选项
**Avoid:** catalog 必须足够大；offer generator 必须显式过滤 duplicates 和 invalid entries

### Pitfall 3: reroll 改写了 spawn/drop/progression RNG
**Avoid:** 独立 `offerRngState`

### Pitfall 4: 选择了 upgrade 但效果只写在 UI 文本里
**Avoid:** 选择后立刻更新 runtime modifiers，并通过 snapshot 证明 effect 已生效

### Pitfall 5: choice panel 退出后 pending queue 没正确减少
**Avoid:** 选择确认必须同时完成 `dequeue event + append applied choice + recompute modifiers + resume playing`

## Requirement-to-Plan Hints

### Plan 10-01 (Wave 1, depends_on: none): Catalog + Deterministic Offer Rules
**Primary requirements:** `TAL-03`, `TAL-04`  
**Files (expected):**
- `src/upgrade-catalog.js` (new)
- `src/levelup-system.js` (new)
- `tests/levelup-system.test.js` (new)

**Implementation hints:**
1. 定义 skill/talent catalog、typed effect descriptors、eligibility/exclusion/max-rank 规则
2. 生成恰好 3 个 unique eligible choices
3. 先锁纯规则和 deterministic offer ordering，不接 runtime UI

### Plan 10-02 (Wave 2, depends_on: 10-01): Level-up Mode + Choice Panel Consumption
**Primary requirements:** `TAL-01`, `TAL-02`  
**Files (expected):**
- `src/main.js`
- `src/style.css`
- `src/levelup-system.js`
- `tests/levelup-system.test.js`

**Implementation hints:**
1. 新增 `levelup_choice` mode，消费 queue 头部 event
2. 显示 3 选 1 面板，支持 focus 移动和确认
3. 确认后关闭 panel 并恢复战斗，不能产生 input lock

### Plan 10-03 (Wave 3, depends_on: 10-02): Immediate Upgrade Effects + Snapshot Bridge
**Primary requirements:** `TAL-05`  
**Files (expected):**
- `src/main.js`
- `src/levelup-system.js`
- `src/determinism-harness.js`
- `tests/levelup-system.test.js`
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. 让 skill/talent 选择立即改写 combat-relevant modifiers
2. 扩展 snapshot 输出 `levelUpState` / `upgradeState`
3. 必须能从 text-state 直接看出选择结果与效果变化

### Plan 10-04 (Wave 4, depends_on: 10-03): Reroll + Browser Route + Full Regression
**Primary requirements:** `TAL-06`  
**Files (expected):**
- `src/main.js`
- `src/levelup-system.js`
- `tests/levelup-system.test.js`
- `tests/playwright-levelup-choice.test.js` (new)
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. 加入 deterministic reroll 与剩余次数管理
2. 浏览器路线验证 `kill -> levelup_choice -> reroll(optional) -> confirm -> combat effect`
3. full regression 继续覆盖 Phase 06/07/08/09

## Validation Architecture

### Nyquist Strategy (for `10-VALIDATION.md`)
- 每个 task 都必须带自动化命令，不能让 3 个连续 task 没有 `<automated>`
- `10-01` 先建立纯 offer system 测试
- `10-02` 每个 UI/runtime task 后至少跑一次 build gate
- `10-03` 必须把 snapshot 合同补齐，不能只靠 panel/HUD 肉眼验证
- `10-04` 必须同时跑浏览器路线与 full regression

### Required Verification Commands
```bash
node --test tests/levelup-system.test.js
node --test tests/levelup-system.test.js tests/determinism-contract.test.js
node tests/playwright-levelup-choice.test.js
npm run build
```

### Suggested Full Suite Command
```bash
npm run build && \
node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && \
node tests/playwright-breakables-loot.test.js && \
node tests/playwright-progression-levels.test.js && \
node tests/playwright-levelup-choice.test.js
```

### Requirement Evidence Map
| Requirement | Automated Evidence | Manual Evidence |
|-------------|--------------------|-----------------|
| `TAL-01` | levelup system tests + browser route | panel readability spot-check |
| `TAL-02` | browser route + restart/resume assertions | none |
| `TAL-03` | pure offer generator tests | none |
| `TAL-04` | pure offer generator tests | none |
| `TAL-05` | deterministic contract + browser route | none |
| `TAL-06` | reroll tests + browser route + full suite | none |

## Open Questions For Planner

None.  
当前 requirements 足够支撑 Phase 10 的 plan 拆分，剩余只是实现取舍，不构成 blocker。

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/09-xp-level-progression-core/09-VERIFICATION.md`
- `src/main.js`
- `src/progression-system.js`
- `src/determinism-harness.js`
- `tests/determinism-contract.test.js`
- `tests/playwright-progression-levels.test.js`


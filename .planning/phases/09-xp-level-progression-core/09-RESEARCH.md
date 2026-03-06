# Phase 09: XP & Level Progression Core - Research

**Researched:** 2026-03-06  
**Domain:** 独立 XP 模型、等级阈值、pending level-up event、HUD progression 显示、restart parity、snapshot 扩展  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `PROG-01`: 用户从怪物击杀中获得 XP。
- `PROG-02`: 用户在 XP 超过可配置阈值时升级。
- `PROG-03`: 每次阈值跨越只产生一个升级事件。
- `PROG-04`: HUD 在战斗中持续显示等级和 XP 进度。
- `PROG-05`: 新 run / restart 会完整重置 run-local progression state。

### Locked Decisions (planning directive)
- 本轮直接规划并写入 `09-CONTEXT.md`，不再插入额外交互式 discuss-phase。
- XP 使用独立 XP 值，不复用 `score` 或 `enemy.points`。
- 升级在 Phase 09 只表现为 pending level-up event 队列 + HUD 提示；不暂停战斗，不进入 choice panel。
- 本阶段只做 run-local progression core，不做技能/天赋选择、不做自动属性成长、不做持久化成长。
- 新模块保持 `src/*.js` 扁平风格：`progression-config.js`、`progression-system.js`。
- `window.render_game_to_text()` 必须新增 `progressionState`；`window.advanceTime(ms)` 语义保持不变。

### Phase Boundary
- 本阶段只做：XP config、等级阈值解析、kill-driven XP gain、pending event queue、HUD progression 显示、snapshot 可观测性、restart parity。
- 不做：level-up modal、talent/skill offer、reroll、persistent meta progression、与装备联动的成长收益。

## Summary

当前仓库已经具备 Phase 09 的 4 个关键前置：
1. `src/main.js` 的敌人死亡链路已经稳定集中处理 `score` 和 `kills`，适合作为 XP 的唯一入口；
2. `startRun()` 已经是 run-local state 的重置中心，适合统一挂 progression reset；
3. `updateHud()` 当前已经持续输出战斗关键指标，扩展 `Lvl` / `XP` 的成本很低；
4. `src/determinism-harness.js` 已经承载 world / spawn / loot / equipment 摘要，progression 继续沿用这条桥最稳。

当前缺失也很明确：
1. 运行时没有 `state.progression`；
2. 没有独立 XP 表与阈值配置；
3. 现有 kill 流程只记 `kills` / `score`，没有 level-up queue；
4. HUD 和 snapshot 都没有 progression 证据面；
5. restart parity 目前只覆盖 world / loot / equipment，不覆盖 XP/level。

因此 Phase 09 的正确拆法不是“顺手在 kill 时加个 level 字段”，而是：先锁定 progression config 与纯函数，再接 runtime kill pipeline 和 event queue，再接 HUD/snapshot，最后用 restart parity + Playwright 回归收口。

**Primary recommendation:** 保持 4 个 plans、4 个串行 waves：`09-01@Wave1 -> 09-02@Wave2 -> 09-03@Wave3 -> 09-04@Wave4`。Wave 1 定义 progression contract；Wave 2 接 kill pipeline；Wave 3 接 HUD 和 snapshot；Wave 4 收口 reset 与浏览器回归。

## Planner-Critical Findings

### 1) 敌人死亡结算循环是 XP 的唯一正确入口
- 现状：`src/main.js` 在敌人死亡后同步写入 `state.score` 与 `state.kills`。
- 影响：Phase 09 如果从别处写 XP，就会制造“击杀数、分数、经验”三条并行链路，破坏 determinism 和可解释性。
- 规划含义：`09-02` 必须把 XP gain 挂在当前敌人死亡结算循环，而不是 HUD/脚本/定时器侧面更新。

### 2) XP 必须与 score 解耦
- 现状：enemy 模板当前只有 `points`，它服务于 score，而不是 progression。
- 风险：如果 Phase 09 直接复用 `points` 作为 XP，后续调 score 就会联动破坏成长 pacing。
- 规划含义：需要单独的 `XP_VALUES_BY_ENEMY_KIND`，由 progression config 持有。

### 3) `PROG-03` 需要显式事件队列，而不是只改 `level`
- 现状：需求写的是“exactly one level-up decision event per threshold crossing”，而不是“等级数值变化即可”。
- 风险：如果只存当前 `level`，Phase 10 无法知道有几个待消费的升级事件，也无法解释一次 XP 增长跨越多个阈值的情况。
- 规划含义：Phase 09 必须引入 `pendingLevelUps` 与 `eventSeq`，并在单次 gain 中稳定生成多个事件。

### 4) Phase 09 不需要也不应该引入新 mode
- 现状：`state.mode` 已被 Phase 04 和 Phase 08 稳定收束；`equip_compare` 已经占用了“暂停但非 pause”的特殊态。
- 风险：如果 Phase 09 再发明 `levelup` mode，会提前侵入 Phase 10 的选择流程，并与现有暂停语义冲突。
- 规划含义：升级提示应该只通过 HUD / banner 暴露，保持战斗继续进行。

### 5) `startRun()` 是 restart parity 的唯一可信重置点
- 现状：restart/new run 统一走 `startRun()`，里面已经重建 world、spawn、loot、equipment。
- 风险：如果 progression reset 分散在多个位置，`PROG-05` 很容易漏掉 queue、eventSeq 或 level/XP 某个字段。
- 规划含义：`09-04` 必须把所有 progression reset 明确收口到 `startRun()`。

### 6) progression 也必须先进入 deterministic snapshot，再谈 Playwright
- 现状：现有 Playwright 路线全部依赖 `window.render_game_to_text()` 做稳定断言。
- 风险：如果 Phase 09 先写浏览器脚本，再补 snapshot，会把 regression 变成 HUD 文案猜测。
- 规划含义：`09-03` 必须先把 `progressionState` 接入 snapshot，`09-04` 再写浏览器路线。

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `three` | `0.183.2` | HUD 与 runtime 继续沿用现有渲染结构 | 无需为 progression 额外引入 UI 框架 |
| `node:test` | Node built-in | progression 纯函数、reset parity、snapshot 合约验证 | 已与 determinism harness 深度对齐 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playwright` | `1.58.2` | kill -> xp -> level-up cue 浏览器回归 | `09-04` 作为最终路线证明 |
| `vite` | `7.3.1` | build gate | 每个 wave 完成后执行 |

### Recommendation
- 不引入状态库、事件总线或额外 HUD 组件框架；Phase 09 的关键是 kill/XP/level 的确定性契约，不是 UI 技术栈升级。

## Architecture Patterns

### Pattern 1: Progression Config as an Authored Contract
**What:** 用独立配置定义 XP 值与等级阈值窗口。  
**Where:** `src/progression-config.js`。  
**Why:** 让 pacing 调整停留在显式常量，不污染 score 或 runtime 控制流。

### Pattern 2: Kill-Driven XP Intake
**What:** XP 只在敌人死亡结算时进入 progression system。  
**Where:** `src/main.js` + `src/progression-system.js`。  
**Why:** 保持与当前 `kills` / `score` 一致的 fixed-step 语义，避免旁路写入。

### Pattern 3: Queue-Based Level-Up Events
**What:** 阈值跨越生成稳定顺序的 pending event 队列，而不是立即触发 UI。  
**Where:** `src/progression-system.js`。  
**Why:** 满足 `PROG-03`，同时为 Phase 10 预留消费接口。

### Pattern 4: HUD-as-Surface, Not Mode
**What:** progression 通过 HUD 和 feedback cue 可见，但不改变 `state.mode`。  
**Where:** `src/main.js`。  
**Why:** 保持战斗节奏和控制语义稳定，避免 Phase 09 侵入 choice flow。

### Pattern 5: Snapshot-First Progression Evidence
**What:** `progressionState` 先进入 deterministic snapshot，再由 Playwright 消费。  
**Where:** `src/determinism-harness.js`。  
**Why:** 确保升级事件队列、阈值窗口和 XP 总量都能被文本状态解释。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XP 模型 | 直接复用 `score` / `enemy.points` | 独立 `XP_VALUES_BY_ENEMY_KIND` | 保持成长 pacing 与分数解耦 |
| 升级表现 | 新的 `levelup` mode / modal | pending queue + HUD cue | 避免提前侵入 Phase 10 |
| 等级曲线 | 隐式公式无上界说明 | 显式阈值数组 + overflow delta | 便于测试和调参 |
| 浏览器验证 | 只看 HUD 文本 | `progressionState` + Playwright route | 保证 determinism 和可调试性 |
| reset | 多处分散重置 | `startRun()` 单点重建 | 提高 `PROG-05` 可验证性 |

## Common Pitfalls

### Pitfall 1: XP 和 score 共享同一数值来源
这样会把“成长 pacing”绑死在“计分 pacing”上，后续平衡会互相牵连。  
**Avoid:** 独立 XP 配置表只按 enemy kind 提供 XP。

### Pitfall 2: 单次 XP gain 跳过多个阈值时只升一级
这会直接违反 `PROG-03`，并让 Phase 10 的 choice queue 数量错误。  
**Avoid:** progression system 必须按阈值顺序生成多个 pending event。

### Pitfall 3: level-up cue 通过 mode 冻结战斗
这样会提前把 choice flow 逻辑塞进 Phase 09，并与 pause / equip_compare 语义冲突。  
**Avoid:** cue 只走 HUD / feedback，事件留在队列中等待后续 phase 消费。

### Pitfall 4: restart 只重置 `level`，没重置 `pendingLevelUps` / `eventSeq`
这会让 restart parity 表面正常、实际队列泄漏。  
**Avoid:** 统一重建整个 `state.progression`。

### Pitfall 5: `progressionState` 不进入 snapshot
这样 Playwright 只能读 HUD 文本，无法解释为何一次击杀后升级事件数量发生漂移。  
**Avoid:** `09-03` 就把 progression 摘要固定进 determinism harness。

## Requirement-to-Plan Hints

### Plan 09-01 (Wave 1, depends_on: none): Progression Config + Pure Threshold Logic
**Primary requirements:** `PROG-02`  
**Files (expected):**
- `src/progression-config.js` (new)
- `src/progression-system.js` (new)
- `tests/progression-system.test.js` (new)

**Implementation hints:**
1. 定义独立 XP 值表和显式累计等级阈值数组。  
2. 提供 `getLevelForXp`、`getCurrentLevelWindow`、`applyXpGain` 或等效纯 helper。  
3. 单次 XP 增长跨多个阈值时，必须按顺序产生多个 pending event。  
4. 测试只聚焦纯规则和数据契约，不接 runtime。

### Plan 09-02 (Wave 2, depends_on: 09-01): Canonical Kill Pipeline + Pending Event Queue
**Primary requirements:** `PROG-01`, `PROG-03`  
**Files (expected):**
- `src/main.js`
- `src/progression-system.js`
- `src/progression-config.js`
- `tests/progression-system.test.js`

**Implementation hints:**
1. 把 XP gain 接入敌人死亡循环，确保 kill 是唯一 XP 来源。  
2. 初始化 `state.progression = { level, totalXp, pendingLevelUps, eventSeq }`。  
3. threshold crossing 必须稳定地产生一个 event；多 threshold crossing 稳定地产生多个 event。  
4. 不引入 choice panel、pause、自动属性成长。

### Plan 09-03 (Wave 3, depends_on: 09-02): HUD Progression Surface + Snapshot Bridge
**Primary requirements:** `PROG-04`  
**Files (expected):**
- `src/main.js`
- `src/determinism-harness.js`
- `tests/progression-system.test.js`
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. HUD 持续显示 `Lvl` 与 `XP current/next`。  
2. 复用现有 feedback/banner 机制做非阻塞 `LEVEL UP` 提示。  
3. `progressionState` 必须进入 snapshot，并锁定字段与排序。  
4. 不引入新 mode，也不修改 `advanceTime()` contract。

### Plan 09-04 (Wave 4, depends_on: 09-03): Restart Parity + Browser Regression + Full Suite
**Primary requirements:** `PROG-05`  
**Files (expected):**
- `src/main.js`
- `src/progression-system.js`
- `tests/progression-system.test.js`
- `tests/determinism-contract.test.js`
- `tests/playwright-progression-levels.test.js` (new)

**Implementation hints:**
1. 在 `startRun()` / restart 路径完整重建 `state.progression`。  
2. 浏览器路线至少验证一次从击杀到首次升级 cue 的真实链路。  
3. full regression 继续覆盖 Phase 06/07/08，防止 traversal、building、loot/equipment 回退。  
4. `must_haves` 要直接支撑未来 `09-VERIFICATION.md` 的 goal-backward 验证。

## Validation Architecture

### Nyquist Strategy (for `09-VALIDATION.md`)
- 每个 `<task type="auto">` 都必须有 `<automated>` 命令，不能出现连续 3 个 task 没有自动验证。
- `09-01` 先建立 progression system 纯测试；`09-02` 开始每个 wave 至少带一个 build gate。
- `09-03` 不能只靠 HUD 文本肉眼确认，必须把 `progressionState` 纳入 deterministic contract。
- `09-04` 必须用 Playwright + full regression 双证据面证明 `PROG-05` 与旧 phase 无回退。
- 最大反馈时延控制在 `150` 秒以内，和现有浏览器回归成本保持同量级。

### Required Verification Commands
```bash
node --test tests/progression-system.test.js
node --test tests/progression-system.test.js tests/determinism-contract.test.js
node tests/playwright-progression-levels.test.js
npm run build
```

### Suggested Full Suite Command
```bash
npm run build && \
node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/determinism-contract.test.js && \
node tests/playwright-breakables-loot.test.js && \
node tests/playwright-progression-levels.test.js
```

### Requirement Evidence Map
| Requirement | Automated Evidence | Manual Evidence |
|-------------|--------------------|-----------------|
| `PROG-01` | `tests/progression-system.test.js` + runtime kill-pipeline coverage | None |
| `PROG-02` | `tests/progression-system.test.js` threshold and level-window assertions | None |
| `PROG-03` | `tests/progression-system.test.js` multi-threshold crossing and queue ordering assertions | None |
| `PROG-04` | `tests/determinism-contract.test.js` + HUD/browser route checks | level-up cue readability spot-check |
| `PROG-05` | restart parity assertions + `tests/playwright-progression-levels.test.js` + full suite | None |

## Open Questions For Planner

None.  
XP model、level-up event 语义、非阻塞 HUD surface、restart parity 边界都已经锁定。

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/08-breakables-loot-and-equipment/08-CONTEXT.md`
- `.planning/phases/08-breakables-loot-and-equipment/08-RESEARCH.md`
- `.planning/phases/08-breakables-loot-and-equipment/08-VALIDATION.md`
- `src/main.js`
- `src/determinism-harness.js`

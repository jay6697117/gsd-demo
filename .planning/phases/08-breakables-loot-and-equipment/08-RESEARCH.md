# Phase 08: Breakables, Loot, and Equipment - Research

**Researched:** 2026-03-06  
**Domain:** 可破坏道具、确定性装备掉落、自动拾取、槽位装备替换、比较暂停模式、快照契约扩展  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `LOOT-01`: 用户可以在正常战斗中伤害并击破被标记的 breakable props。
- `LOOT-02`: 被摧毁的 props 通过加权确定性掉落表生成装备掉落。
- `LOOT-03`: 用户可以拾取装备并放入固定槽位 `weapon`、`core`、`charm`。
- `LOOT-04`: 替换已装备物品时，必须显示清晰的属性变化反馈。
- `LOOT-05`: 相同 seed + 相同输入时间线必须复现相同掉落结果。

### Locked Decisions (planning directive)
- 本轮直接生成 `08-CONTEXT.md`，不再插入交互式 discuss-phase。
- Phase 08 只做“single-run breakable -> drop -> equip 主链”，不做 inventory、stash、economy、currency、material、consumable。
- breakable 是 authored static prop，不是建筑子类型，不参与阻挡碰撞，也不复用 Phase 07 的战术 building 语义。
- 装备拾取固定为自动拾取；空槽位直装，非空槽位进入 `equip_compare`。
- `equip_compare` 暂停战斗、刷怪与敌人更新；`Enter` / `Space` 接受，`Escape` 拒绝。
- 被拒绝物品保留在地上，但必须“离开再进入 pickup radius”才再次触发。
- 装备只做基础 stat：`weapon -> attackDamage`，`core -> maxHp`，`charm -> moveSpeed`。
- rarity 固定为 `common`、`rare`、`epic`；掉落只产出装备。
- 新模块保持 `src/*.js` 平铺风格：`breakable-catalog.js`、`breakable-system.js`、`drop-tables.js`、`drop-system.js`、`equipment-system.js`。

### Phase Boundary
- 本阶段只做：breakable data contract、打碎判定、deterministic drop resolver、ground drop state、自动拾取、compare mode、derived stat 回写、snapshot/contract/e2e regression。
- 不做：装备词缀、保底机制、区域掉落偏置、长期经济、经验升级、技能/天赋、额外输入系统。

## Summary

当前仓库已经具备 Phase 08 所需的三块核心前置：
1. `src/main.js` 仍然是唯一组合根，适合继续集中接入 breakable / loot / equipment 流程；
2. `src/main.js#doAttack()` 已经是玩家输出行为的确定性入口，适合复用为 breakable 受击接入点；
3. `src/determinism-harness.js#buildDeterministicSnapshot()` 已稳定承担回放与断言职责，可以继续扩展 `world.breakables`、`lootState`、`equipmentState`。

当前缺失也很明确：
1. 运行时没有 `state.world.breakables`、`state.loot.*`、`state.equipment.*`；
2. `state.mode` 里还没有 `equip_compare`；
3. 快照只覆盖 world / spawn / control / player / enemy 等现有字段，没有 loot/equipment 证据面；
4. 当前测试只覆盖世界、建筑、确定性与现有 burst 路径，没有 breakable/drop/equip 验证入口。

因此 Phase 08 不能被规划成“加几个 item 对象”的轻补丁。正确拆法是：先锁定 breakable 数据与受击生命周期，再接 deterministic 掉落流，再接 compare mode 与 stat 回写，最后用 snapshot + Playwright 收口。这样 `LOOT-01..05` 才能一一找到对应的计划和证据面。

## Planner-Critical Findings

### 1) `doAttack()` 是唯一正确的 breakable 受击入口
- 现状：玩家攻击和敌人受击都集中在 `src/main.js#doAttack()` 的固定步长链路里处理。
- 含义：Phase 08 规划必须要求同一斩击可同时命中 enemy 和 breakable，并按稳定顺序处理，不能额外引入“点击交互”或独立 weapon hit scan。
- 结果：`08-01` 必须显式把 breakable 命中并入现有攻击链，而不是留给执行期自由发挥。

### 2) breakable 必须与 Phase 07 building 规则完全解耦
- 现状：Phase 07 已建立 building colliders、战术读图和 enemy steering 合同。
- 风险：如果 breakable 被规划成“可破坏建筑”或“阻挡物”，执行期会把掉落系统耦合到 building collision 与 steering，直接扩大 Phase 08 边界。
- 结果：research 必须明确 breakable 是纯非阻挡 world prop，只承担被打碎、掉落与视觉反馈职责。

### 3) 掉落 RNG 必须独立于 spawn RNG
- 现状：Phase 06 已对 spawn determinism 建立 `spawnState` 契约；Phase 07 又把 building/tactics 接入同一快照桥。
- 风险：如果 drop resolver 共享 spawn RNG，任何掉落或 compare UI 的小变化都会改写怪物生成结果，破坏 `LOOT-05`。
- 结果：`08-02` 必须把 `dropRngState` 作为独立状态流进入 snapshot。

### 4) ground drop 与 compare overlay 本质上是确定性状态机，不是 UI 偶发事件
- 现状：当前 runtime mode 只有 `start / playing / paused / gameover / restart_pending`。
- 风险：如果 compare 行为只用 DOM 标志位或临时变量驱动，`advanceTime()` / `render_game_to_text()` 无法解释为什么某一帧战斗冻结、为什么物品被拒绝后不重弹。
- 结果：`08-03` 必须把 compare 流程锁进 `state.mode = "equip_compare"` 和 `state.loot.pendingPickupId` 等显式状态字段。

### 5) snapshot 必须能解释“同 seed 为什么掉同一件物品”
- 现状：现有 determinism harness 已经在世界、控制、建筑层提供稳定排序摘要。
- 风险：如果 snapshot 只记“地上有个掉落”，而不记 `dropRngState`、`sourcePropId`、slot/stat 摘要，就无法定位掉落差异。
- 结果：`08-04` 必须收口 `world.breakables`、`lootState`、`equipmentState` 三块摘要，并保证排序和字段命名稳定。

### 6) 当前代码结构仍然适合扁平模块增量扩展
- 现状：`world-sectors.js`、`world-collision.js`、`spawn-director.js`、`building-system.js` 都放在 `src/` 根目录。
- 风险：如果 Phase 08 同时做目录重构，checker 很容易把 scope 评为过大。
- 结果：research 必须把新文件锁在 `src/*.js`，避免把组织改造混进功能规划。

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `three` | `0.183.2` | breakable/drop/equip 可视化同步 | 现有 runtime 稳定，不需要为掉落系统引入新渲染栈 |
| `node:test` | Node built-in | breakable/drop/equipment 纯规则与 contract test | 已与 determinism harness 深度对齐 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playwright` | `1.58.2` | 打碎 -> 掉落 -> 比较 -> 装备 生效的端到端验证 | `08-04` 作为最终路线证明 |
| `vite` | `7.3.1` | build gate | 每个 wave 完成后执行 |

### Recommendation
- 不引入新 UI 框架、状态管理库、物理引擎或数据 schema 库；Phase 08 的关键是确定性链路，不是技术栈升级。

## Architecture Patterns

### Pattern 1: Breakable Catalog as Non-Blocking Content Contract
**What:** 用纯数据 catalog 定义 `crate`、`cache` 等 breakable 的 `id`、`hp`、shape、visual token、掉落表 key。  
**Where:** `src/breakable-catalog.js`。  
**Why:** 保证 breakable 生命周期、掉落表选择与 snapshot 摘要都引用同一事实源。

### Pattern 2: Attack-Driven Break Resolution
**What:** breakable 受击跟随 `doAttack()` 的同一攻击窗口处理，支持同一斩击同时命中 enemy 和 prop。  
**Where:** `src/main.js` + `src/breakable-system.js`。  
**Why:** 避免引入第二套伤害入口，从而保持固定步长和 determinism。

### Pattern 3: Domain-Separated Drop Resolver
**What:** breakable 销毁事件进入纯 `drop-system`，读取 `drop-tables.js` 并消费独立 `dropRngState`。  
**Where:** `src/drop-system.js` + `src/drop-tables.js`。  
**Why:** 掉落变化不能污染 Phase 06 的 spawn 结果，也不能依赖 UI 消费顺序。

### Pattern 4: Mode-Gated Equip Comparison
**What:** 非空槽位拾取时进入 `equip_compare` mode，冻结战斗推进，只等待 accept / reject。  
**Where:** `src/main.js` + `src/equipment-system.js` + `src/style.css`。  
**Why:** compare 是 run 内重大决策点，必须是显式状态机而不是边缘 DOM 交互。

### Pattern 5: Snapshot-First Evidence Surface
**What:** 所有 breakable / loot / equipment 关键状态都必须先进入 deterministic snapshot，再写 E2E 断言。  
**Where:** `src/determinism-harness.js`。  
**Why:** `LOOT-05` 不能靠肉眼；必须让文本快照解释掉落与装备分歧。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 掉落系统 | currency/material/consumable 三套奖励经济 | 仅装备 descriptor | 避免本阶段 scope 爆炸 |
| breakable 交互 | 专用拾取键或点击交互 | 自动拾取 + compare mode | 保持动作节奏和输入面稳定 |
| 装备复杂度 | affix、reroll、套装、分解 | 槽位 + 单 stat 值 | 先打通 deterministic 主链 |
| compare 逻辑 | DOM-only modal state | 显式 `state.mode = "equip_compare"` | 保证 pause/replay 可解释 |
| 掉落解释 | 只看画面和粒子 | snapshot 中的 `lootState` / `equipmentState` | 便于 contract 和回放调试 |

## Common Pitfalls

### Pitfall 1: 同一 breakable 被多次结算掉落
如果 breakable 的 `broken` 标志和掉落事件序号没有绑定，同一帧多重命中或重复遍历会生成双份装备。  
**Avoid:** 生命周期只允许 `alive -> broken` 单向跃迁，并在销毁时一次性写入事件序号。

### Pitfall 2: compare 模式只暂停 UI，不暂停模拟
如果 compare modal 只是显示层开关，战斗和刷怪继续推进，玩家会在选装备期间被打或改变掉落场景。  
**Avoid:** 把 compare 设计成 `state.mode` 的新分支，并在固定步长 update 前做 mode gate。

### Pitfall 3: 拒绝后物品在半径内每帧重弹
如果没有“离开再进入”的 re-arm 规则，被拒绝的装备会导致 modal 频闪或输入卡死。  
**Avoid:** 记录 `pendingPickupId` 与 re-entry arm 状态，只有离开 pickup radius 后才重新激活。

### Pitfall 4: `dropRngState` 没进入 snapshot
这会让 `LOOT-05` 只能看到结果不同，却无法定位随机流从哪一帧开始漂移。  
**Avoid:** 在 `08-02` 就要求 `dropRngState` 入快照，而不是拖到 `08-04` 临时补。

### Pitfall 5: breakable 预设与 building footprint 混用
这样执行期很容易让 spawn-exclusion、enemy steering 或 building tactics 被动回归。  
**Avoid:** 规划中明确 breakable 非阻挡、非建筑子类、非 steering 障碍。

## Requirement-to-Plan Hints

### Plan 08-01 (Wave 1, depends_on: none): Breakable Catalog + Attack Lifecycle Foundation
**Primary requirements:** `LOOT-01`  
**Files (expected):**
- `src/breakable-catalog.js` (new)
- `src/breakable-system.js` (new)
- `src/main.js`
- `src/determinism-harness.js`
- `tests/breakable-system.test.js` (new)

**Implementation hints:**
1. 至少定义两类非阻挡 breakable archetype，如 `crate`、`cache`。  
2. breakable 预设按稳定 `id` 顺序实例化，并与 sector 或 authored world 布局绑定。  
3. `doAttack()` 支持 breakable 与 enemy 的同帧并行命中，但 breakable 处理顺序稳定。  
4. snapshot 先暴露最小 `world.breakables` 摘要，为后续掉落和 compare 铺路。

### Plan 08-02 (Wave 2, depends_on: 08-01): Deterministic Drop Resolver + Ground Drop State
**Primary requirements:** `LOOT-02`  
**Files (expected):**
- `src/drop-tables.js` (new)
- `src/drop-system.js` (new)
- `src/determinism-harness.js`
- `tests/drop-system.test.js` (new)
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. 用加权表从 `common / rare / epic` 中解析掉落 descriptor。  
2. `groundDrops` 需要稳定 `id / order / position / slot / rarity / stat`。  
3. `dropRngState` 与 `eventSeq` 必须在本计划就进入 runtime + snapshot。  
4. 不要引入 pity、affix、zone bias；它们都应在 research 中被标成 out of scope。

### Plan 08-03 (Wave 3, depends_on: 08-02): Auto Pickup + Equip Compare + Derived Stats
**Primary requirements:** `LOOT-03`, `LOOT-04`  
**Files (expected):**
- `src/equipment-system.js` (new)
- `src/main.js`
- `src/style.css`
- `tests/equipment-system.test.js` (new)

**Implementation hints:**
1. 自动拾取半径逻辑要与 compare mode 解耦，避免拒绝后连续重弹。  
2. 空槽位直接装备；非空槽位进入 `equip_compare` 并冻结战斗推进。  
3. compare overlay 必须展示旧/新 stat delta，并即时回写 `attackDamage / maxHp / moveSpeed`。  
4. 如果 checker 认为任务量边缘过大，优先在同一 plan 内细分任务，而不是把 Phase 09/10 的成长系统拉进来。

### Plan 08-04 (Wave 4, depends_on: 08-03): Snapshot Closure + E2E + Regression Gate
**Primary requirements:** `LOOT-05`  
**Files (expected):**
- `src/determinism-harness.js`
- `tests/determinism-contract.test.js`
- `tests/playwright-breakables-loot.test.js` (new)
- `src/main.js`

**Implementation hints:**
1. snapshot 要统一输出 `world.breakables`、`lootState`、`equipmentState`，并锁定排序。  
2. Playwright 路线必须固定为“打碎 -> 自动拾取 -> 比较接受/拒绝 -> 装备生效”。  
3. 回归命令必须继续覆盖 Phase 06/07 的 world/building 契约，防止 loot loop 破坏既有 determinism。  
4. `must_haves` 需要直接支撑未来 `08-VERIFICATION.md` 的 goal-backward 验证。

## Validation Architecture

### Nyquist Strategy (for `08-VALIDATION.md`)
- 每个 `<task type="auto">` 都必须有 `<automated>` 命令，不能出现连续 3 个 task 没有自动验证。
- `08-01` 先建立 breakable 与最小 snapshot 测试壳；`08-02` 开始每个 wave 都要带上 contract 或 build gate。
- `08-03` 不能只靠 overlay 肉眼确认，必须有 `equipment-system.test.js` 覆盖空槽位直装、比较接受、比较拒绝后 re-entry。
- `08-04` 必须用 deterministic contract + Playwright 双证据面证明 `LOOT-05`，不能只保留 node:test。
- Phase 08 的全量回归应继续串上 Phase 06/07 现有 world/building tests，确保 loot loop 没把旧约束回退。
- 最大反馈时延保持在 `135` 秒以内，和现有浏览器回归成本相匹配。

### Required Verification Commands
```bash
node --test tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js
node --test tests/determinism-contract.test.js
node tests/playwright-breakables-loot.test.js
npm run build
```

### Suggested Full Suite Command
```bash
npm run build && \
node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/determinism-contract.test.js && \
node tests/playwright-breakables-loot.test.js
```

### Requirement Evidence Map
| Requirement | Automated Evidence | Manual Evidence |
|-------------|--------------------|-----------------|
| `LOOT-01` | `tests/breakable-system.test.js` + `08-01` task verifies | None |
| `LOOT-02` | `tests/drop-system.test.js` + snapshot assertions | None |
| `LOOT-03` | `tests/equipment-system.test.js` pickup/equip cases | None |
| `LOOT-04` | `tests/equipment-system.test.js` compare accept/reject + optional overlay spot-check | compare overlay readability spot-check |
| `LOOT-05` | `tests/determinism-contract.test.js` + `tests/playwright-breakables-loot.test.js` | None |

## Recommended Plan Count / Waves
- `08-01@Wave1`
- `08-02@Wave2`
- `08-03@Wave3`
- `08-04@Wave4`

这个拆法的优点是：
- requirement coverage 一对一清晰；
- 每个 wave 都有明确的自动化出口；
- `08-03` 虽然承担 `LOOT-03` 和 `LOOT-04`，但仍保持在 2-3 个 task 内可控；
- `08-04` 专门负责 determinism / E2E / regression，不把验证压力挤到执行后期临时补洞。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Breakable attack integration | HIGH | `doAttack()` 已是稳定入口，扩展方向明确 |
| Deterministic drop resolver | HIGH | 独立 RNG 流和稳定 descriptor 结构边界清晰 |
| Equip compare mode | HIGH | 现有 mode state machine 足以承接 `equip_compare` |
| Snapshot / regression closure | HIGH | determinism harness 与 Playwright 基础已存在 |

**Overall confidence:** HIGH

## Gaps to Watch During Planning
- compare overlay 的视觉呈现细节仍需保持最小化，不要因为 UI 文案膨胀导致 `08-03` scope 失控。
- breakable authored preset 的具体放置密度要在 plan 中写成“确定性预设”，不能模糊成 procedural spawn。
- `STATE.md` 当前有非阻塞文档漂移，但本轮不要顺手修 unrelated docs，避免污染 planning commit。

---
*Research completed: 2026-03-06*
*Ready for planning: yes*

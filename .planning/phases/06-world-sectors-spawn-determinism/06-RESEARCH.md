# Phase 06: World Sectors & Spawn Determinism - Research

**Researched:** 2026-03-05  
**Domain:** 分区地图拓扑、边界碰撞稳定性、确定性刷怪分配、战斗可读性信号  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `MAP-01`: 单局内可进入并穿越至少 3 个连通分区。
- `MAP-02`: 玩家移动与敌人追击在分区边界保持碰撞稳定。
- `MAP-03`: 刷怪分布遵循分区规则，并在相同 seed + 时间线下可复现。
- `MAP-04`: 战斗中可清晰辨识安全通道与 choke 区域。

### Locked Decisions (from `06-CONTEXT.md`)
- 地图拓扑采用 `Hub + 环线`，分区间无缝连续过渡。
- 通行结构采用“每区 1 条主通道 + 1-2 条绕行道”。
- 刷怪采用“热度权重分配 + 全局上限 + 分区软上限”。
- 快照需要包含分区摘要、分区刷怪状态、`spawn RNG` 状态与分区事件序号。
- HUD 只做最小补充，不引入完整小地图。

### Phase Boundary
- 本阶段只做“分区地图 + 通行规则 + 分区刷怪确定性 + 可读性信号”。
- 不引入建筑战术层、掉落装备、成长与天赋系统（属于 Phase 07+）。

## Summary

当前实现（`src/main.js`）仍是单矩形 arena + 四边刷怪模型：  
1) 没有分区拓扑数据模型；  
2) 玩家/敌人只做全局矩形 `clamp`，没有“分区边界 + 通道”规则；  
3) 刷怪不感知分区，只按全局强度与随机边缘点生成；  
4) `render_game_to_text()` 尚未输出任何分区/刷怪权重字段。

因此 Phase 06 不能只做“视觉分区涂色”，必须把“分区拓扑、移动约束、刷怪调度、快照字段”作为同一套契约落地，否则 `MAP-01~04` 无法稳定验收。

**Primary recommendation:** 将执行拆成 4 个计划（拓扑与遍历 -> 边界碰撞稳定 -> 刷怪确定性 -> 可读性与阶段回归门禁），并按串联波次推进：`06-01@Wave1 -> 06-02@Wave2 -> 06-03@Wave3 -> 06-04@Wave4`。

## Planner-Critical Findings

### 1) 当前边界模型无法表达“分区通行规则”
- 现状：`src/main.js` 中玩家与敌人均通过 `clamp` 限定在全局矩形内。
- 影响：只能满足“外框不越界”，不能表达“分区边界可穿越、非通道硬回弹、choke 几何”。
- 规划含义：Phase 06 必须先建立分区拓扑与可行走区域模型，再改造移动/追击。

### 2) `spawn` 逻辑仍是“全局冷却 + 四边出生”
- 现状：`updateSpawning()` 只看全局 `MAX_ACTIVE_ENEMIES`，`spawnEnemy()` 按四边随机落点。
- 影响：无法证明“分区规则驱动刷怪”，也无法输出分区权重证据。
- 规划含义：需要独立 `spawn director`，把分区权重、软上限、事件序号收敛为可测试纯函数。

### 3) `spawn RNG` 状态当前不可观测
- 现状：仿真随机源是闭包 `simulationRng`，`render_game_to_text()` 无法输出内部 RNG 状态。
- 影响：与上下文要求的“`spawn RNG` 状态可观测”不一致；调试 deterministic 漂移会困难。
- 规划含义：要么把 RNG 改为显式状态机（推荐），要么至少把 spawn 相关随机状态镜像到 `state.determinism`。

### 4) 边界碰撞已有潜在稳定性缺陷
- 现状：`updateEnemies()` 用移动前 `len` 做伤害碰撞判定（旧距离），在边界附近会放大抖动体感。
- 影响：`MAP-02` 验收时会出现“明明接触却延后一帧伤害”的不稳定感知。
- 规划含义：分区边界改造时应一并修复“先积分后判碰”或“重算距离”。

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `three` | `0.183.2` | 场景渲染与 sprite 世界同步 | 现有 runtime 基础，不需要替换 |
| `node:test` | Node built-in | 纯规则与确定性契约测试 | 低成本、适合纯函数验证 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playwright` | `1.58.2` | 分区穿越与可读性 e2e 断言 | 验证 `MAP-01/04` 的运行态行为 |
| `vite` | `7.3.1` | 构建回归门禁 | 每波任务结束做 build gate |

### Recommendation
- 不新增地图/寻路外部库；Phase 06 用“静态拓扑 + 规则函数”即可满足目标并保持确定性。

## Architecture Patterns

### Pattern 1: Sector Topology as Data Contract
**What:** 用静态数据定义 `Hub + Ring` 分区、邻接关系、主通道与绕行道、choke 区域。  
**Where:** `src/world-sectors.js`（新增）。  
**Why:** 让 `MAP-01/02/04` 共用同一事实源，避免“碰撞几何”和“视觉编码”不一致。

### Pattern 2: Deterministic Boundary Resolver
**What:** 用纯函数对玩家/敌人位移做“通道放行 + 非通道回弹/滑移”求解。  
**Where:** `src/world-collision.js`（新增），`src/main.js` 接入。  
**Why:** 分离副作用，便于单测边界稳定性。

### Pattern 3: Spawn Director with Explicit State
**What:** `updateSpawning` 只驱动一个分区刷怪调度器，调度器输出“何时刷/刷到哪区/原因权重”。  
**Where:** `src/spawn-director.js`（新增），`src/main.js` 调用。  
**Why:** `MAP-03` 需要“规则可解释 + 结果可复现 + 快照可断言”。

### Pattern 4: Single Snapshot Contract for World + Spawn
**What:** 扩展 `buildDeterministicSnapshot()` 输出分区与刷怪摘要。  
**Where:** `src/determinism-harness.js`。  
**Why:** 后续 `06-VALIDATION.md`、Phase 11 自动化都依赖可机读字段。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 分区几何表达 | 即时随机网格生成器 | 固定拓扑配置（静态 JSON/JS 常量） | 可复现、可审计、便于断言 |
| 敌人跨区追击 | 全量 A* 或 navmesh 系统 | 线性追击 + 分区边界解析器 | Phase 06 不需要高成本路径规划 |
| 分区刷怪证明 | 仅观察肉眼战斗体验 | 快照字段 + 单测 + e2e 组合 | `MAP-03` 需要可证据化 |

## Common Pitfalls

### Pitfall 1: 几何规则与视觉编码分离
如果通道/choke 只画在地面纹理而未接入碰撞，`MAP-04` 会“看起来可走但走不通”。  
**Avoid:** 通道定义只保留一份，渲染与碰撞都读取 `src/world-sectors.js`。

### Pitfall 2: 分区权重含隐式随机
把视觉 RNG 或 `Date.now()` 混入 spawn 决策会破坏确定性。  
**Avoid:** spawn 仅使用 simulation RNG + 明确输入（时间、分区计数、玩家分区）。

### Pitfall 3: 迭代顺序不稳定导致快照漂移
按对象键枚举分区计数可能产生断言抖动。  
**Avoid:** 所有分区输出按 `sectorId` 排序；敌人仍按 `id` 排序。

### Pitfall 4: 边界“吸附-抖动”回归
直接在边界上做双轴硬夹会出现角落卡顿。  
**Avoid:** 采用“先尝试完整位移 -> 失败后轴向分离滑移 -> 最后回弹”顺序。

## Requirement-to-Plan Hints

### Plan 06-01 (Wave 1, depends_on: none): Sector Topology + Traversal State Core
**Primary requirements:** `MAP-01`  
**Files (expected):**
- `src/world-sectors.js` (new)
- `src/main.js`
- `tests/world-sectors.test.js` (new)

**Implementation hints:**
1. 建立至少 4 个分区（`hub + 3 outer`），满足“至少 3 个连通分区可穿越”。  
2. 在 `state.world` 记录 `currentSectorId`, `visitedSectorIds`, `transitionSeq`。  
3. 先完成分区切换状态与可观测字段，不在该计划内引入边界求解器。  
4. 保持 fixed-step 主循环不变，避免引入时间语义漂移。

### Plan 06-02 (Wave 2, depends_on: 06-01): Deterministic Boundary Collision
**Primary requirements:** `MAP-02`  
**Files (expected):**
- `src/world-collision.js` (new)
- `src/main.js`
- `tests/world-sectors.test.js`

**Implementation hints:**
1. 以纯函数实现边界放行/回弹/滑移，覆盖玩家与敌人的共享规则。  
2. 运行时移动统一调用边界解析器，避免“玩家逻辑”和“追击逻辑”分叉。  
3. 修复边界附近碰撞判定使用旧距离导致的抖动感知问题。  
4. 用 `tests/world-sectors.test.js` 覆盖 corner slide、lane crossing、pursuit stability 场景。

### Plan 06-03 (Wave 3, depends_on: 06-01): Sector Spawn Director + Deterministic State
**Primary requirements:** `MAP-03`  
**Files (expected):**
- `src/spawn-director.js` (new)
- `src/main.js`
- `src/determinism-harness.js`
- `tests/spawn-director.test.js` (new)
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. 将“分区权重计算、软上限分配、sector 选择”下沉到 `spawn-director` 纯函数模块。  
2. `state.spawnDirector` 至少包含：`eventSeq`, `sectorWeights`, `sectorEnemyCounts`, `lastSpawnSectorId`, `spawnCooldown`。  
3. 在快照中输出可断言的 spawn 状态（含稳定排序字段）并扩展 determinism contract。  
4. 确保同 seed + 同 `advanceTime`/输入序列得到同样 sector spawn 序列。

### Plan 06-04 (Wave 4, depends_on: 06-02, 06-03): Combat Readability + Phase Regression Gate
**Primary requirements:** `MAP-04`  
**Files (expected):**
- `src/main.js`
- `src/style.css`
- `src/determinism-harness.js`
- `tests/playwright-map-sectors.test.js` (new)
- `tests/world-sectors.test.js`
- `tests/spawn-director.test.js`
- `tests/determinism-contract.test.js`

**Implementation hints:**
1. 地面纹理编码主通道、绕行道、choke 密度，并与拓扑契约保持同源。  
2. HUD 仅增加 `Sector` 与 `Pressure` 两行最小信息，避免 UI 扩展失控。  
3. Playwright 脚本验证“可穿越 3 区 + 可读性指标存在 + 无关键运行时错误”。  
4. 以 phase-level full suite 作为最终门禁，统一回归 `MAP-01..MAP-04`。

## Validation Architecture

### Nyquist Strategy (for `06-VALIDATION.md`)
- 每个任务必须有 `<automated>` 命令；禁止连续 3 个任务无自动验证。
- Wave 结束必须跑 full suite（含 build + deterministic + e2e）。
- 快速反馈目标：任务级验证 < 45s，wave 级验证 < 120s。
- `MAP-04` 允许少量人工可读性检查，但不得替代自动化行为断言。

### Required Verification Commands
```bash
node --test tests/world-sectors.test.js
node --test tests/spawn-director.test.js tests/determinism-contract.test.js
node tests/playwright-map-sectors.test.js
npm run build
```

### Suggested Full Suite Command
```bash
npm run build && \
node --test tests/world-sectors.test.js tests/spawn-director.test.js tests/determinism-contract.test.js && \
node tests/playwright-map-sectors.test.js
```

### Requirement Evidence Map
| Requirement | Automated Evidence | Manual Evidence |
|-------------|--------------------|-----------------|
| `MAP-01` | `tests/world-sectors.test.js` 连通性与跨区序列断言；Playwright 脚本断言访问 >= 3 区 | 手动跑图确认无切屏/停顿 |
| `MAP-02` | `tests/world-sectors.test.js` 边界滑移/回弹与追击稳定性断言 | 边界极限移动体感 spot-check |
| `MAP-03` | `tests/spawn-director.test.js` + `tests/determinism-contract.test.js` 比较同 seed 序列一致性 | 无（应完全自动化） |
| `MAP-04` | Playwright 断言 HUD/地面编码信号存在且随分区变化 | 目测 safe lane / choke 对比度 |

## Code Examples

### Sector topology contract
```javascript
export const SECTORS = [
  { id: "hub", bounds: { minX: -8, maxX: 8, minY: -5, maxY: 5 }, neighbors: ["north", "east", "south"] },
  { id: "north", bounds: { minX: -7, maxX: 7, minY: -15, maxY: -5 }, neighbors: ["hub", "east"] },
  { id: "east", bounds: { minX: 8, maxX: 18, minY: -5, maxY: 5 }, neighbors: ["hub", "south", "north"] },
  { id: "south", bounds: { minX: -7, maxX: 7, minY: 5, maxY: 15 }, neighbors: ["hub", "east"] },
];
```

### Spawn director pure API
```javascript
export function pickSpawnSector({ sectors, playerSectorId, sectorEnemyCounts, heatState, rngValue }) {
  const weights = computeSectorWeights({ sectors, playerSectorId, sectorEnemyCounts, heatState });
  return chooseWeightedSector(weights, rngValue);
}
```

### Snapshot extension skeleton
```javascript
world: {
  currentSectorId: state.world.currentSectorId,
  visitedSectorIds: [...state.world.visitedSectorIds].sort(),
  transitionSeq: state.world.transitionSeq,
},
spawnState: {
  eventSeq: state.spawnDirector.eventSeq,
  sectorWeights: sortedSectorWeights(state.spawnDirector.sectorWeights),
  sectorEnemyCounts: sortedSectorCounts(state.spawnDirector.sectorEnemyCounts),
  spawnRngState: state.determinism.spawnRngState,
}
```

## Open Questions For Planner

1. `Hub + 环线` 的最终分区数量是否固定为 4（`hub + 3 outer`）还是 5（`hub + 4 outer`）。  
2. choke 宽度阈值（例如按玩家半径的多少倍）由哪个常量统一管理。  
3. `MAP-04` 的自动化断言粒度是否需要读取像素采样，还是 HUD + 拓扑字段即可关闭风险。

## Sources

### Primary (HIGH confidence)
- `.planning/phases/06-world-sectors-spawn-determinism/06-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
- `src/main.js`
- `src/determinism-harness.js`
- `tests/determinism-contract.test.js`
- `tests/playwright-burst.test.js`

---

*Phase: 06-world-sectors-spawn-determinism*  
*Research completed: 2026-03-05*  
*Ready for planning: yes*

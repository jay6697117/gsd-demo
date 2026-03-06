# Phase 07: Building Tactical Layer - Research

**Researched:** 2026-03-06  
**Domain:** 战术建筑 archetype、静态障碍碰撞、敌人绕障 steering、刷怪排除、确定性快照扩展  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `BLD-01`: 至少 3 类建筑 archetype（`blocker`, `funnel`, `soft-cover`）以明确战术角色出现。
- `BLD-02`: 玩家可利用建筑完成稳定的 `line-break`、`kite pivot`、`retreat window`。
- `BLD-03`: 敌人绕障追击不出现持续卡墙、死循环或穿模。
- `BLD-04`: 建筑接入后不破坏确定性战斗状态与回放契约。

### Locked Decisions (planning directive)
- 本次规划直接基于现有 `ROADMAP.md`、`REQUIREMENTS.md` 和全局 research，不创建 `07-CONTEXT.md`。
- Phase 07 只做“纯战术建筑层”，不包含掉落、奖励、可破坏建筑、成长收益或交互键扩展。
- `soft-cover` 固定定义为“临时缓压口袋”：通过稀疏或半包围静态几何制造短时 `line-break` 与 `retreat pocket`。
- 建筑采用 sector-authored 固定 preset，不做 procedural building generation，不改变 Phase 06 的 sector graph。
- 玩家和敌人继续共享可解释的确定性移动规则；不引入玩家/敌人非对称穿透或地形 buff/debuff。

### Phase Boundary
- 本阶段只做：建筑 catalog、layout preset、障碍碰撞、spawn-exclusion、敌人绕障、最小 HUD/快照可观测性、回归测试。
- 不做：建筑奖励、掉落、可破坏、装备、经验、升级、天赋（分别属于 Phase 08+ / 09+ / 10+）。

## Summary

当前实现只具备“sector 拓扑 + sector 边界解析 + sector 刷怪 + sector 可读性”能力：
1. `src/main.js` 没有建筑实体或建筑运行时状态切片；
2. `src/world-collision.js` 只理解 sector bounds / lane gate，不理解 sector 内部静态障碍；
3. 刷怪采样没有建筑 footprint 排除；
4. `render_game_to_text()` 只有 `world` 与 `spawnState` 的分区级摘要，没有 building/tactics 字段；
5. 敌人追击仍是“直线目标 -> 边界解析”，没有 building-aware steering / unstuck 逻辑。

因此 Phase 07 不能只加几块视觉几何。必须把“建筑 archetype 数据、实例化顺序、碰撞查询、刷怪排除、steering 选择、快照字段”收敛成一套确定性契约，否则 `BLD-01~04` 只能靠肉眼感受，无法稳定验收。

**Primary recommendation:** 拆成 4 个计划、3 个 waves：`07-01@Wave1 -> 07-02/07-03@Wave2 -> 07-04@Wave3`。Wave 1 提供建筑数据契约；Wave 2 分别落地玩家战术利用与敌人绕障；Wave 3 做 determinism / Playwright / full regression 收口。

## Planner-Critical Findings

### 1) 当前空间规则缺少“内部障碍占用”层
- 现状：Phase 06 的空间规则只描述 sector bounds 与 lane。
- 影响：玩家/敌人一旦进入 sector 内部，运动是“空旷平面”，无法表达 blocker / funnel / pocket。
- 规划含义：需要一层稳定的 building collider / occupancy query，且它不能破坏现有 sector traversal 规则。

### 2) 刷怪入口仍未感知建筑 footprint
- 现状：`resolveSpawnPointForSector()` 只按 sector 边界与 lane 选点。
- 影响：建筑接入后，敌人可能生成在建筑内部，直接破坏 `BLD-04`。
- 规划含义：Wave 1 就必须暴露 spawn-exclusion query；Wave 2/3 只能消费这个接口，不能各自重写排除逻辑。

### 3) 敌人追击目前只有“目标点直追 + boundary resolver”
- 现状：敌人速度向量只看玩家方向，之后丢给 `resolveEnemyBoundaryMovement()`。
- 影响：只要 sector 内引入建筑，敌人就会在建筑边缘抖动或反复顶墙。
- 规划含义：需要 deterministic steering 策略，但不值得引入 navmesh/A*；应采用轻量“方向采样 + 侧移偏好 + unstuck fallback”。

### 4) 现有 HUD/readability 已有最小扩展通道
- 现状：Phase 06 已有 `Sector` / `Pressure` HUD 和 `world.readability`。
- 影响：Phase 07 不需要新建建筑 UI 面板，只需把 building/tactics 作为最小补充并接入现有 text bridge。
- 规划含义：`BLD-02` 的用户可感知反馈应走“最小 HUD + tactical summary + Playwright route”，而不是新系统 UI。

### 5) 当前代码结构仍适合“平铺模块”增量扩展
- 现状：Phase 06 新模块都在 `src/` 根下（`world-sectors.js`, `world-collision.js`, `spawn-director.js`）。
- 影响：如果在 Phase 07 同时引入 `src/world/` 大迁移，会把“规划边界”变成“架构重构”。
- 规划含义：Phase 07 的新模块优先保持平铺：`src/building-catalog.js`, `src/building-system.js`，避免把目录重构混入战术建筑交付。

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `three` | `0.183.2` | 建筑渲染与 scene sync | 现有 runtime 基础，足够表达静态建筑几何与像素风标记 |
| `node:test` | Node built-in | 规则、碰撞、steering 与确定性测试 | 已在 Phase 06 证明适合纯函数与 fixed-step 场景 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playwright` | `1.58.2` | 建筑战术 e2e 与 artifact capture | 证明 `BLD-02/04` 在运行时可重复发生 |
| `vite` | `7.3.1` | build gate | 每个 wave 完成后的构建门禁 |

### Recommendation
- 不引入 navmesh、A*、物理引擎或新的内容 schema 库；Phase 07 目标是“轻量静态战术地形”，不是通用导航框架。

## Architecture Patterns

### Pattern 1: Building Catalog as Tactical Contract
**What:** 用静态 catalog 定义 `blocker` / `funnel` / `soft-cover` 的几何尺寸、role、视觉元数据、摘要标签。  
**Where:** `src/building-catalog.js`（新增）。  
**Why:** 让渲染、碰撞、快照、测试都共享同一事实源。

### Pattern 2: Sector-Authored Layout Presets
**What:** 每个 sector 用固定 preset 声明建筑实例及顺序，building system 负责实例化与 query。  
**Where:** `src/building-system.js`（新增）。  
**Why:** 固定 preset 比 procedural generation 更容易保证 determinism、spawn-exclusion 和 Playwright 复现。

### Pattern 3: Building-Aware Movement Extension
**What:** 继续复用现有 sector boundary resolver，但在 sector 内部加入 building collider 命中、slide、rebound。  
**Where:** `src/world-collision.js` + `src/main.js`。  
**Why:** 复用 Phase 06 的稳定边界模型，避免重新发明两套移动规则。

### Pattern 4: Deterministic Steering Without Navmesh
**What:** 敌人先计算目标方向，再按固定候选方向序列尝试可行向量；连续受阻时走确定性 `unstuck` 回退。  
**Where:** `src/building-system.js` 纯辅助 + `src/main.js` 调用。  
**Why:** 足够满足 `BLD-03`，且不会引入高成本寻路系统或不可控随机。

### Pattern 5: Tactical Snapshot as Runtime Contract
**What:** `render_game_to_text()` 扩展 `world.buildings` / `world.tactics`，输出当前 sector 建筑分布与战术摘要。  
**Where:** `src/determinism-harness.js`。  
**Why:** Phase 07 的验收不能只靠截图；需要机器可断言的 building/tactics 证据。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 建筑导航 | 完整 navmesh / A* | 轻量 steering + collider sampling | 当前地图规模小，完全没必要引入重型导航 |
| 建筑分布 | 程序化随机布局 | sector-authored 固定 preset | 便于测试与战术场景复现 |
| `soft-cover` | 非对称穿透或减速场 | 半包围静态几何口袋 | 保持规则简单、可观测、可解释 |
| 战术反馈 | 新 overlay 面板 | 现有 HUD/readability 最小扩展 | 控制 Phase 07 范围，不挤占 Phase 09/10 UI 空间 |

## Common Pitfalls

### Pitfall 1: 建筑几何与碰撞查询分离
如果视觉上有建筑，但 spawn / movement 用的是另一套 bounds，测试一定会出现“看上去能走、实际上卡住”或“敌人出生在柱子里”。  
**Avoid:** catalog → layout → collider → snapshot 全链路只保留一套 building shape 定义。

### Pitfall 2: `soft-cover` 被做成“伪墙”或“减速区”
这样会把 `soft-cover` 从“战术口袋”变成新的地形规则系统。  
**Avoid:** 把它限定成稀疏或半包围静态几何，仅通过已有移动规则产生缓压窗口。

### Pitfall 3: steering 使用额外随机数
如果敌人绕障选择混入 `Math.random()` 或视觉 RNG，会直接破坏 `BLD-04`。  
**Avoid:** steering 候选方向序列和 unstuck fallback 全部由显式输入和固定顺序计算。

### Pitfall 4: Wave 2 把“战术利用”和“敌人绕障”混成一团
这会让失败时无法判断是玩家碰撞场景错、还是敌人 steering 错。  
**Avoid:** `07-02` 聚焦玩家战术利用与 runtime cues；`07-03` 聚焦 enemy steering / unstuck。

## Requirement-to-Plan Hints

### Plan 07-01 (Wave 1, depends_on: none): Building Catalog + Layout Query Foundation
**Primary requirements:** `BLD-01`  
**Files (expected):**
- `src/building-catalog.js` (new)
- `src/building-system.js` (new)
- `src/determinism-harness.js`
- `tests/building-system.test.js` (new)

**Implementation hints:**
1. 先定义 3 个 archetype 的固定 role、shape、visual token，不引入互动收益字段。  
2. 每个 sector 至少有一组固定 building preset，顺序稳定，可被 snapshot 序列化。  
3. building system 需要暴露：`getBuildingsForSector`, `getBuildingCollidersForSector`, `isPointInsideBuilding`, `findSpawnCandidateOutsideBuildings` 或等效接口。  
4. 快照只输出最小 building summary，不输出 Three.js scene object 细节。

### Plan 07-02 (Wave 2, depends_on: 07-01): Runtime Integration + Player Tactical Use
**Primary requirements:** `BLD-02`  
**Files (expected):**
- `src/main.js`
- `src/world-collision.js`
- `src/style.css`
- `tests/building-tactics.test.js` (new)

**Implementation hints:**
1. 把 building preset 接入 runtime scene 与 `state.world.buildings` / `state.world.tactics`。  
2. 玩家移动使用 building-aware collision，并保留 Phase 06 的 sector traversal 契约。  
3. 三类 archetype 作用固定：`blocker` 负责断线、`funnel` 负责窄口转向、`soft-cover` 负责 pocket。  
4. 自动测试必须能用固定走位重现 `line-break`、`kite pivot`、`retreat pocket`。

### Plan 07-03 (Wave 2, depends_on: 07-01): Enemy Steering + Unstuck Stability
**Primary requirements:** `BLD-03`  
**Files (expected):**
- `src/building-system.js`
- `src/main.js`
- `tests/building-steering.test.js` (new)

**Implementation hints:**
1. steering 采用固定方向候选序列与确定性侧移优先级，不引入 navmesh。  
2. `unstuck` 逻辑必须明确触发阈值与回退行为，避免敌人在口袋和 funnel 入口抖动。  
3. 覆盖 `stress pursuit`, `corner squeeze`, `funnel chase`, `spawn-near-building` 四类用例。  
4. 保证相同 seed + 同步 fixed-step 输入下得到相同追击轨迹摘要。

### Plan 07-04 (Wave 3, depends_on: 07-02, 07-03): Snapshot + E2E + Full Regression Gate
**Primary requirements:** `BLD-04`  
**Files (expected):**
- `src/determinism-harness.js`
- `tests/determinism-contract.test.js`
- `tests/playwright-building-tactics.test.js` (new)
- `src/main.js`

**Implementation hints:**
1. 快照新增 `world.buildings` / `world.tactics` 稳定摘要字段，并锁定排序。  
2. Playwright 至少验证一次“三分区 traversal + 建筑 tactical use” 的完整路径。  
3. Full suite 必须同时覆盖 Phase 06 与 Phase 07，证明建筑没有破坏原有 traversal / collision / spawn / readability。  
4. 产出的 `must_haves` 需要直接支撑 `07-VERIFICATION.md` 的 goal-backward 验证。

## Validation Architecture

### Nyquist Strategy (for `07-VALIDATION.md`)
- 每个 task 都必须有 `<automated>` 命令，不能出现连续 3 个 task 没有自动验证。
- Wave 1 先补 building test shell；Wave 2 开始每个 wave 都要跑 build gate。
- `BLD-03` 必须有纯规则 stress tests；不能只靠 Playwright 目测敌人是否绕障。
- `BLD-02` 允许保留一项“体感可读性”人工 spot-check，但不能替代自动 tactical route 断言。
- 反馈延迟上限维持在 120 秒内，保持与 Phase 06 一致。

### Required Verification Commands
```bash
node --test tests/building-system.test.js
node --test tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js
node --test tests/determinism-contract.test.js
node tests/playwright-building-tactics.test.js
npm run build
```

### Suggested Full Suite Command
```bash
npm run build && \
node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/determinism-contract.test.js && \
node tests/playwright-building-tactics.test.js
```

### Requirement Evidence Map
| Requirement | Automated Evidence | Manual Evidence |
|-------------|--------------------|-----------------|
| `BLD-01` | `tests/building-system.test.js` 断言 archetype、preset、query、spawn-exclusion 稳定 | 无 |
| `BLD-02` | `tests/building-tactics.test.js` + Playwright tactical route | 目测建筑 role 区分度与 pocket 可读性 |
| `BLD-03` | `tests/building-steering.test.js` 固定步进 stress pursuit | 无 |
| `BLD-04` | `tests/determinism-contract.test.js` + full suite + Playwright artifact | 无 |

## Open Questions For Planner

None.  
`soft-cover` 语义、纯战术边界、固定 preset、无奖励/无掉落/无破坏性都已经锁定。

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/phases/06-world-sectors-spawn-determinism/06-VERIFICATION.md`
- `src/main.js`
- `src/world-sectors.js`
- `src/world-collision.js`
- `tests/world-sectors.test.js`
- `tests/playwright-map-sectors.test.js`

---

*Phase: 07-building-tactical-layer*  
*Research completed: 2026-03-06*  
*Ready for planning: yes*

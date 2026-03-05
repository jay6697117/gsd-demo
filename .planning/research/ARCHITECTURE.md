# Architecture Research

**Domain:** Three.js Browser Action Game v1.1 (World & Growth Overhaul)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Experience Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Start/GameUI │  │ HUDView      │  │ LevelUpPanel │  │ InputAdapter │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │           │
├─────────┴─────────────────┴─────────────────┴─────────────────┴───────────┤
│                      Runtime Orchestration Layer                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ main.js loop │  │ Mode Machine │  │ Event Router │  │ Scene Sync    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │           │
├─────────┴─────────────────┴─────────────────┴─────────────────┴───────────┤
│                         Gameplay Domain Layer                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ MapSystem    │  │ BuildingSys  │  │ Prop/DropSys │  │ GrowthSystem │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │           │
├─────────┴─────────────────┴─────────────────┴─────────────────┴───────────┤
│                      Determinism & Verification Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │ Snapshot API │  │ ContractTest │  │ Burst E2E     │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/main.js` (MODIFIED) | 继续作为组合根；按固定顺序调度地图、建筑、道具、掉落、成长、渲染 | fixed-step loop + explicit update pipeline |
| `src/world/map-system.js` (NEW) | 地图分区、地块边界、刷新点候选、碰撞查询 | data-driven zone graph + pure query functions |
| `src/world/building-system.js` (NEW) | 建筑实体生成、阻挡体积、可交互入口与收益触发 | building catalog + occupancy/collision helpers |
| `src/loot/prop-system.js` (NEW) | 可破坏道具生命周期（spawn/hit/break/despawn） | deterministic HP/armor rules + entity arrays |
| `src/loot/drop-system.js` (NEW) | 道具破坏后的掉落判定与掉落实体管理 | seeded weighted table + rarity tiers |
| `src/loot/equipment-system.js` (NEW) | 装备拾取、装备槽、属性聚合与替换策略 | slot-based equipment model + stat aggregation |
| `src/progression/growth-system.js` (NEW) | 击杀经验、升级判定、升级待选状态机 | xp curve + level transition events |
| `src/progression/talent-system.js` (NEW) | 天赋池定义、升级选择应用、冲突校验 | talent registry + idempotent apply function |
| `src/determinism-harness.js` (MODIFIED) | 扩展快照契约，暴露地图/装备/等级/天赋状态 | schema version bump + normalized serialization |
| `tests/*.test.js` (MODIFIED/NEW) | 规则、契约、端到端回归扩展到新成长链路 | node:test + Playwright deterministic bursts |

### New vs Modified Components (Explicit)

| Type | File Path | Integration Purpose |
|------|-----------|---------------------|
| NEW | `src/world/map-layout.js` | 定义分区、地块、spawn anchors、建筑预设位 |
| NEW | `src/world/map-system.js` | 统一提供 `isWalkable`、`sampleSpawnPoint`、`getZoneAt` |
| NEW | `src/world/building-catalog.js` | 建筑类型、碰撞尺寸、交互收益、稀有事件权重 |
| NEW | `src/world/building-system.js` | 建筑实例化与交互冷却管理 |
| NEW | `src/loot/prop-system.js` | 可破坏道具实体与受击判定 |
| NEW | `src/loot/drop-tables.js` | 掉落池、稀有度、装备词条模板 |
| NEW | `src/loot/drop-system.js` | 基于 deterministic RNG 产出掉落 |
| NEW | `src/loot/equipment-system.js` | 装备槽与属性叠加/替换策略 |
| NEW | `src/progression/xp-rules.js` | 等级曲线与经验阈值 |
| NEW | `src/progression/growth-system.js` | 击杀转经验、升级状态和待选项生成 |
| NEW | `src/progression/talent-tree.js` | 天赋定义与前置条件 |
| NEW | `src/progression/talent-system.js` | 选择应用与冲突约束 |
| NEW | `src/ui/level-up-overlay.js` | 升级时 3 选 1 面板渲染与输入桥接 |
| MODIFIED | `src/main.js` | 注入新状态切片、调用新系统、处理新 mode=`levelup` |
| MODIFIED | `src/control-rules.js` | 增加 `KeyE`、`Digit1/2/3`、`Escape` 在 `levelup` 模式行为 |
| MODIFIED | `src/feedback-rules.js` | 增加 `LEVEL UP`、`EPIC DROP`、`NEW TALENT` 反馈规则 |
| MODIFIED | `src/determinism-harness.js` | 快照新增 world/loot/growth 字段并升级 schema |
| MODIFIED | `src/style.css` | HUD 与 level-up overlay 样式 |
| MODIFIED | `tests/determinism-contract.test.js` | 断言新快照字段稳定且可重放 |
| MODIFIED | `tests/playwright-burst.test.js` | 新增升级选择与掉落拾取路径验证 |
| NEW | `tests/world-map.test.js` | 地图 walkable 与 spawn 采样一致性测试 |
| NEW | `tests/growth-loot.test.js` | kill-xp-levelup 与 prop-drop-equipment 组合测试 |

## Recommended Project Structure

```text
src/
├── main.js                         # Orchestration entry (keep as composition root)
├── control-rules.js                # Input edge helpers and mode-intent rules
├── feedback-rules.js               # Combat/level/drop feedback decisions
├── determinism-harness.js          # Snapshot schema and deterministic stepping
├── world/                          # World topology and building domain
│   ├── map-layout.js               # Zone and tile definitions
│   ├── map-system.js               # Walkability, zone queries, spawn sampling
│   ├── building-catalog.js         # Building archetypes and interaction metadata
│   └── building-system.js          # Building lifecycle and interaction processing
├── loot/                           # Breakable props and equipment drops
│   ├── prop-system.js              # Breakable prop state and hit/break updates
│   ├── drop-tables.js              # Rarity pools and affix templates
│   ├── drop-system.js              # Drop generation and ground loot state
│   └── equipment-system.js         # Equip/pickup/stat aggregation rules
├── progression/                    # Kill-based leveling and talents
│   ├── xp-rules.js                 # XP curve and level thresholds
│   ├── growth-system.js            # XP accumulation and level-up transitions
│   ├── talent-tree.js              # Talent definitions and prerequisites
│   └── talent-system.js            # Talent application and conflict guards
└── ui/
    └── level-up-overlay.js         # Level-up choice panel rendering + selection
```

### Structure Rationale

- **`src/main.js`:** 保留单一组合根，避免一次性大重构；通过“系统模块化 + 调度顺序固定”把复杂度外移。
- **`src/world/`:** 地图、建筑都属于空间拓扑领域，统一目录能减少跨模块循环依赖。
- **`src/loot/`:** 道具破坏、掉落、装备拾取是同一条战利品链路，内聚管理更利于平衡调参。
- **`src/progression/`:** 经验、等级、天赋共享成长状态，拆分后可独立测试升级决策正确性。
- **`src/ui/level-up-overlay.js`:** 把升级面板从 `main.js` 拆离，防止 UI 状态污染战斗判定逻辑。

## Architectural Patterns

### Pattern 1: Deterministic Domain Pipeline

**What:** 在 `updateGameStep` 内固定调用顺序：`combat -> prop -> drop -> growth -> feedback`，每步只读写自己的 state slice。
**When to use:** 需要 `window.advanceTime` 与 `window.render_game_to_text` 在同一输入下恒定输出时。
**Trade-offs:** 可测性与可回放性强；但要求严格约束系统间 side effect。

**Example:**
```javascript
export function updateWorldStep(state, dt, ctx) {
  runCombatStep(state, dt, ctx);
  runPropStep(state, dt, ctx);
  runDropStep(state, dt, ctx);
  runGrowthStep(state, dt, ctx);
  runFeedbackStep(state, dt, ctx);
}
```

### Pattern 2: Data-Driven Content Catalogs

**What:** 地图分区、建筑类型、掉落池、天赋池都由 catalog 描述，不在 `main.js` 写 if/else 分支。
**When to use:** v1.1 之后继续扩图、加建筑、加装备、调成长曲线时。
**Trade-offs:** 新内容迭代快；但需要更强的 schema 校验与默认值策略。

**Example:**
```javascript
export const BUILDING_CATALOG = {
  shrine: { blockRadius: 1.4, interactRange: 1.8, reward: "heal_pulse" },
  forge: { blockRadius: 1.6, interactRange: 1.9, reward: "reroll_one_affix" },
  watchtower: { blockRadius: 2.0, interactRange: 2.4, reward: "vision_boost" },
};
```

### Pattern 3: Event-to-Choice Progression Gate

**What:** 击杀事件先进入成长系统；仅当升级发生时切换到 `levelup` 模式并冻结战斗推进，等待玩家选择。
**When to use:** 升级选择必须可感知、可决策，不能被战斗帧吞没时。
**Trade-offs:** 玩家决策体验更清晰；但会让 loop 需要额外 mode 分支。

**Example:**
```javascript
if (growthResult.levelUp) {
  state.mode = "levelup";
  state.levelupChoices = buildLevelupChoices(state, growthResult.level);
}

if (state.mode === "levelup" && consumeEdge(pressedThisStep, "Digit1")) {
  applyTalentChoice(state, state.levelupChoices[0]);
  state.mode = "playing";
}
```

## Data Flow

### Request Flow

```text
[Keyboard Input]
    ↓
[src/control-rules.js] → [src/main.js:updateGameStep] → [Domain Systems] → [state slices]
    ↓                            ↓                          ↓               ↓
[UI/Overlay] ← [src/feedback-rules.js] ← [event results] ← [deterministic RNG]
```

### State Management

```text
[state in src/main.js]
    ↓ (pass slices)
[world/* + loot/* + progression/* systems]
    ↓ (emit result/events)
[main.js reducer stage]
    ↓
[HUD + level-up overlay + deterministic snapshot]
```

### Key Data Flows

1. **Kill → XP → Levelup → Talent Flow:** `src/main.js` 在击杀后调用 `src/progression/growth-system.js`；升级时写入 `state.levelupChoices`，由 `src/ui/level-up-overlay.js` 展示并通过 `src/progression/talent-system.js` 应用。
2. **Attack → Break Prop → Drop Equipment Flow:** `doAttack` 命中可破坏物后进入 `src/loot/prop-system.js`，破坏事件调用 `src/loot/drop-system.js`（读取 `src/loot/drop-tables.js`）生成掉落，再由 `src/loot/equipment-system.js` 处理拾取与属性合并。
3. **Map Zone → Spawn Distribution Flow:** `updateSpawning` 改为调用 `src/world/map-system.js:sampleSpawnPoint`，并由 `src/world/building-system.js` 提供阻挡查询，避免敌人出生在建筑内部。
4. **Deterministic Contract Flow:** 任意新增状态最终都经 `src/determinism-harness.js:buildDeterministicSnapshot` 序列化，`tests/determinism-contract.test.js` 与 `tests/playwright-burst.test.js` 共同验证。

## Recommended Build Order (Dependency-Aware)

| Order | Scope | Depends On | New Files | Modified Files | Exit Check |
|------|-------|------------|-----------|----------------|------------|
| 1 | 地图分区与空间查询基础 | none | `src/world/map-layout.js`, `src/world/map-system.js` | `src/main.js` | 玩家与敌人都使用 `isWalkable`，旧玩法无回归 |
| 2 | 建筑系统与交互框架 | 1 | `src/world/building-catalog.js`, `src/world/building-system.js` | `src/main.js` | 建筑可阻挡/可交互且不破坏现有碰撞 |
| 3 | 可破坏道具系统 | 1,2 | `src/loot/prop-system.js` | `src/main.js` | 攻击可击破道具并正确清理渲染对象 |
| 4 | 掉落池与装备系统 | 3 | `src/loot/drop-tables.js`, `src/loot/drop-system.js`, `src/loot/equipment-system.js` | `src/main.js`, `src/feedback-rules.js` | 掉落概率可重复、拾取后属性即时生效 |
| 5 | 击杀经验与等级状态机 | 4 (属性回路已存在) | `src/progression/xp-rules.js`, `src/progression/growth-system.js` | `src/main.js`, `src/style.css` | 击杀可稳定升级，HUD 显示等级/经验 |
| 6 | 天赋选择与升级面板 | 5 | `src/progression/talent-tree.js`, `src/progression/talent-system.js`, `src/ui/level-up-overlay.js` | `src/main.js`, `src/control-rules.js`, `src/style.css` | 升级时进入 `levelup` 模式并完成 3 选 1 |
| 7 | 确定性契约与自动化回归收口 | 1-6 | `tests/world-map.test.js`, `tests/growth-loot.test.js` | `src/determinism-harness.js`, `tests/determinism-contract.test.js`, `tests/playwright-burst.test.js` | 新快照字段稳定，burst 测试可覆盖成长闭环 |

### Build Order Notes

1. 先做 **空间层（地图+建筑）**，因为道具刷点、敌人刷新、可交互区域都依赖空间查询。
2. 再做 **道具与掉落**，让“破坏 -> 掉落 -> 拾取”链路先跑通，后续成长系统直接消费装备属性。
3. 最后做 **升级与天赋**，因为它依赖“击杀事件稳定”和“装备属性已可叠加”的前置条件。
4. 每一步都同步更新 `src/determinism-harness.js` 的快照字段草案，避免最后集中改 schema 引入大回归。

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| v1.1 baseline (single map expansion) | 保持浏览器单体；通过 `world/*`, `loot/*`, `progression/*` 分层替代 `main.js` 堆逻辑 |
| content-heavy (multi-zone + 20+ buildings + 50+ items) | 地图、建筑、掉落、天赋全部 catalog 化并加 schema 校验；引入轻量 object pooling |
| long-run balance tuning | 把经验曲线与掉落权重外置到独立配置模块，支持 deterministic seed 回放对比 |

### Scaling Priorities

1. **First bottleneck:** `src/main.js` 继续膨胀导致维护成本失控；优先把系统逻辑外提到 `world/loot/progression`。
2. **Second bottleneck:** 高频实体创建导致 GC 抖动；优先为 props/drops/particles 增加复用池。

## Anti-Patterns

### Anti-Pattern 1: Keep Adding Branches Directly in `main.js`

**What people do:** 地图、建筑、掉落、升级全写进 `updateGameStep` 的 if/else。
**Why it's wrong:** 调度顺序不可读、回归点难定位、并行开发冲突高。
**Do this instead:** `main.js` 只做编排，规则下沉到 `src/world/*`, `src/loot/*`, `src/progression/*`。

### Anti-Pattern 2: Mixing Visual RNG With Gameplay RNG

**What people do:** 掉落/升级选择复用视觉抖动随机源，导致回放不稳定。
**Why it's wrong:** `window.advanceTime` 在同输入下不能保证同输出，自动化断言会漂移。
**Do this instead:** 战斗/掉落/成长仅使用 simulation RNG；视觉特效继续使用 visual RNG。

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `three` renderer | `src/main.js` 统一持有 `scene/camera/renderer`，系统模块只回传数据结果 | 避免系统模块直接创建/销毁渲染器 |
| Browser Fullscreen/Visibility API | 继续经 `src/control-rules.js` + `src/main.js` 管理 | `levelup` 模式也要遵守焦点丢失自动暂停 |
| Playwright runtime | 通过 `tests/playwright-burst.test.js` 调用 `window.advanceTime` 与 `window.render_game_to_text` | 保障升级与掉落路径可回归 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `src/main.js` ↔ `src/world/map-system.js` | direct function calls (`isWalkable`, `sampleSpawnPoint`, `getZoneAt`) | 仅传输纯数据，不传 `THREE.Mesh` |
| `src/main.js` ↔ `src/world/building-system.js` | update result object (`colliders`, `interactions`, `events`) | 建筑阻挡与交互都走统一返回结构 |
| `src/main.js` ↔ `src/loot/prop-system.js` | attack hit list + prop state mutations | 攻击判定与道具受击共享同一 tick |
| `src/loot/prop-system.js` ↔ `src/loot/drop-system.js` | `PropBroken` domain event | 破坏事件必须包含 `source`, `zone`, `seedCursor` |
| `src/loot/drop-system.js` ↔ `src/loot/equipment-system.js` | pickup event + item descriptor | 装备系统只接收标准化 item schema |
| `src/main.js` ↔ `src/progression/growth-system.js` | kill summary input, level-up output | 升级是 mode 切换触发器，不直接改 UI |
| `src/progression/growth-system.js` ↔ `src/progression/talent-system.js` | level-up choices + selected option id | 天赋应用必须幂等，防止重复按键双应用 |
| `src/main.js` ↔ `src/determinism-harness.js` | snapshot serialization contract | 新增字段先加 contract test 再加 E2E 断言 |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/ARCHITECTURE.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/STRUCTURE.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- `/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js`
- `/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js`
- `/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js`
- `/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js`
- `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`

---
*Architecture research for: v1.1 World & Growth Overhaul integration*
*Researched: 2026-03-05*

# Phase 08: Breakables, Loot, and Equipment - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付“单局内 deterministic breakable -> drop -> equip”主链。
范围包含：可破坏道具、确定性掉落表、地面掉落、自动拾取、装备槽位、替换对比与快照可观测性。

本阶段明确不交付：背包/仓库/经济、货币/材料/消耗品、词缀系统、保底/pity、zone bias、经验/等级/技能/天赋，以及可破坏建筑与建筑奖励融合设计。

</domain>

<decisions>
## Implementation Decisions

### Breakable 语义
- breakable 是 authored static prop，不是建筑系统子类型，不复用建筑战术语义。
- breakable 不参与阻挡碰撞，不改变 Phase 07 建立的建筑路径与战术层规则。
- Phase 08 至少提供两类 breakable archetype，例如 `crate` 与 `cache`。
- breakable 生命周期固定为 `hp`、`maxHp`、`broken`，不加入护甲、耐久分层或敌人交互收益。

### 掉落与拾取链路
- 掉落拾取方式固定为靠近自动拾取，不新增专用拾取键。
- 被打碎的 breakable 只掉装备，不掉货币、材料、消耗品。
- 掉落稀有度固定为 `common`、`rare`、`epic`。
- 掉落 RNG 与刷怪 RNG 分离，使用独立 `dropRngState`。

### 装备替换与比较模式
- 装备槽位固定为 `weapon`、`core`、`charm`。
- 空槽位拾取后直接装备；同槽位已有装备时进入 `equip_compare`。
- `equip_compare` 模式暂停战斗、刷怪和敌人更新，直到玩家做出选择。
- 输入固定为：`Enter` / `Space` 装备新物品，`Escape` 保留旧物品。
- 若拒绝替换，新物品留在地上，玩家必须离开并重新进入 pickup radius 后才允许再次触发比较。

### 装备模型与属性回写
- 本阶段装备模型只做“槽位 + 基础数值”，不做 affix、set bonus、词条池或 reroll。
- `weapon` 只影响 `attackDamage`。
- `core` 只影响 `maxHp`。
- `charm` 只影响 `moveSpeed`。
- 每件装备字段固定为：`id`、`slot`、`rarity`、`statKey`、`statValue`、`sourcePropId`。

### 可观测性与快照契约
- `window.render_game_to_text()` 必须新增稳定排序的 `world.breakables`。
- 快照必须新增 `lootState`，至少覆盖 `groundDrops`、`pendingPickupId`、`dropRngState`、`eventSeq`。
- 快照必须新增 `equipmentState`，至少覆盖 `slots`、`derivedStats`、当前比较候选。
- `window.advanceTime(ms)` 保持现有语义，不为掉落或比较模式引入新接口。

### Claude's Discretion
- breakable 与 ground drop 的具体视觉 token、颜色和微反馈实现。
- compare overlay 的文案、排版和 stat delta 呈现细节。
- breakable 预设在各个 sector 中的具体数量、位置和稀有度权重，只要不破坏确定性与非阻挡约束。
- `lootState` / `equipmentState` 的精确字段命名和排序方式，只要稳定且可断言。

</decisions>

<specifics>
## Specific Ideas

- 维持“单键移动 + 自动拾取”的轻交互密度，不让装备系统抢走动作游戏节奏。
- 比较弹窗必须是明确暂停态，不能让玩家在敌人继续推进时被迫做装备选择。
- 被拒绝的装备不应每帧重弹；必须通过“离开再进入”实现确定性的重新触发。
- 可观测性优先级高于视觉花样，必须让同 seed 下的掉落与装备状态能通过文本快照解释。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.js#doAttack` 已是玩家攻击命中链入口，Phase 08 应在这里接 breakable 受击判定，而不是新开第二套攻击通道。
- `src/main.js` 现有 mode 状态机已覆盖 `start`、`playing`、`paused`、`gameover`、`restart_pending`，适合在同一框架内新增 `equip_compare`。
- `src/determinism-harness.js#buildDeterministicSnapshot` 是新增 `world/loot/equipment` 摘要字段的唯一正确出口。
- `src/main.js` 已暴露 `window.render_game_to_text()` 与 `window.advanceTime(ms)`，现有自动化测试链可以直接扩展到掉落与装备。

### Established Patterns
- 仓库延续 `src/*.js` 平铺模块风格；Phase 08 不应顺手做 `src/loot/` 或 `src/world/` 目录重构。
- 纯规则与数据契约优先抽到独立模块，`src/main.js` 保持组合根角色。
- 确定性状态必须通过排序稳定的快照字段暴露，而不是依赖渲染对象或随机遍历顺序。
- 现有测试栈是 `node:test` + Playwright + deterministic harness，Phase 08 应继续沿用。

### Integration Points
- breakable 受击与销毁：`src/main.js#doAttack`
- 模式切换与暂停语义：`src/main.js` 当前 mode state machine
- 快照扩展：`src/determinism-harness.js#buildDeterministicSnapshot`
- HUD / compare overlay：`src/main.js` + `src/style.css`

</code_context>

<deferred>
## Deferred Ideas

- affix / prefix / suffix / set bonus
- pity / guaranteed slot recovery
- zone bias / biome-specific drop shaping
- XP / level / skill / talent growth
- inventory / stash / economy / dismantle / trading
- breakable 与建筑系统的统一可破坏建模

</deferred>

---
*Phase: 08-breakables-loot-and-equipment*
*Context gathered: 2026-03-06*

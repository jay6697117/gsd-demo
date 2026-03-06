# Phase 09: XP & Level Progression Core - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付 run-local 的 `kill -> xp -> level -> pending level-up event -> HUD -> restart reset` 主链。
范围包含：独立 XP 模型、可配置等级阈值、升级事件队列、HUD 持续显示、deterministic snapshot 扩展，以及 restart/new run 的 progression reset。

本阶段明确不交付：技能/天赋选择面板、升级暂停模式、自动属性成长、持久化 progression、meta 经济或任何 choice pool 逻辑。

</domain>

<decisions>
## Implementation Decisions

### XP 模型
- XP 使用独立 XP 值，不复用 `score` 或 `enemy.points`。
- XP 来源固定为敌人死亡结算链路，不能通过 HUD、测试脚本或其他旁路直接写入 progression state。
- `XP_VALUES_BY_ENEMY_KIND` 固定由配置承载，默认采用 `leafling: 1`、`sparkowl: 1`、`embercub: 2`。
- 等级阈值使用显式累计数组，默认前几级为 `0, 4, 10, 18, 28, 40`；超过已定义阈值后按最后一级增量延续，避免隐式封顶。

### 升级事件模型
- Phase 09 的升级只表现为 pending level-up event 队列，不显示选择面板，不暂停战斗。
- `pendingLevelUps` 固定为稳定顺序队列，元素形态固定为 `{ id, reachedLevel, thresholdXp }`。
- 单次 XP 增长跨过多个阈值时，必须按阈值顺序排入多个 pending event。
- event id 固定由 `eventSeq` 派生，确保队列顺序和 snapshot 可解释性稳定。

### 运行时与 HUD 语义
- 不新增 `state.mode = levelup`，也不复用 `paused`；Phase 09 只通过 HUD / banner 暴露非阻塞 `LEVEL UP` 提示。
- HUD 必须持续显示 `Lvl`、当前 XP、当前等级起点阈值和下一等级阈值。
- pending level-up event 会保留在 run-local state 中，等待 Phase 10 消费生成技能/天赋选择。

### Reset 与可观测性契约
- progression state 必须在 `startRun()` / restart 路径中一次性重建，不允许沿用上局残留数据。
- `window.render_game_to_text()` 必须新增 `progressionState`，至少包含 `level`、`totalXp`、`currentLevelStartXp`、`nextLevelXp`、`pendingLevelUpCount`、`pendingLevelUps`、`eventSeq`。
- `window.advanceTime(ms)` 保持现有语义，不为 XP/level 系统增加新调试入口。

### Claude's Discretion
- HUD 中 `Lvl` / `XP` 文案的排版、分隔符和精确呈现样式。
- `LEVEL UP` banner 的措辞、持续时间和与现有 feedback cue 的整合细节。
- threshold overflow 的具体 helper 命名与内部实现，只要保持显式、可测试、可回放即可。

</decisions>

<specifics>
## Specific Ideas

- 首次升级应该在短局内就能稳定触发，默认节奏锁定为约 3-4 次常规击杀内达到首个 level-up。
- 升级提示必须是“看得见但不打断战斗”的轻提示，而不是新的 modal 流程。
- Phase 10 需要消费 Phase 09 的 pending 队列，因此本阶段必须把事件队列做成 snapshot 可解释的显式状态。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.js` 的敌人死亡结算链路已经集中处理 `kills` 和 `score`，它是 Phase 09 接 XP 的唯一正确入口。
- `src/main.js#startRun()` 已经集中重置 world、spawn、loot、equipment，适合作为 progression reset 的唯一收口点。
- `src/main.js#updateHud()` 已有稳定 HUD 文本拼装路径，适合直接扩展 `Lvl` / `XP` 显示，不需要新面板系统。
- `src/determinism-harness.js#buildDeterministicSnapshot()` 是新增 `progressionState` 的唯一正确出口。

### Established Patterns
- 仓库继续采用 `src/*.js` 平铺模块风格；Phase 09 不做目录重构。
- 纯规则优先放入独立模块，由 `src/main.js` 保持 runtime 组合根角色。
- 现有 determinism contract 已覆盖 world / spawn / loot / equipment；progression 也必须沿用同一 snapshot bridge。
- 当前 `state.mode` 语义已经被 Phase 04 和 Phase 08 稳定化，本阶段不应再引入新的暂停态。

### Integration Points
- kill -> XP 接入点：`src/main.js` 敌人死亡结算循环
- progression reset：`src/main.js#startRun()`
- HUD 显示：`src/main.js#updateHud()`
- snapshot 扩展：`src/determinism-harness.js#buildDeterministicSnapshot()`

</code_context>

<deferred>
## Deferred Ideas

- Level-up choice panel / skill & talent selection
- choice pool 约束、reroll、eligibility/exclusion
- automatic stat boosts on level-up
- persistent progression / stash / meta economy
- any Phase 10 UI or modal control semantics

</deferred>

---
*Phase: 09-xp-level-progression-core*
*Context gathered: 2026-03-06*

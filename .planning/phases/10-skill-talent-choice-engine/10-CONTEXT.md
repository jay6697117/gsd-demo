# Phase 10: Skill/Talent Choice Engine - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** plan-phase assumptions from roadmap, requirements, and current codebase

<domain>
## Phase Boundary

本阶段只交付 `pendingLevelUps -> deterministic offer generation -> level-up choice panel -> select one upgrade -> immediate combat impact -> resume combat` 主链。

范围包含：技能/天赋 catalog、offer 生成与过滤、`levelup_choice` 模式、确定性 reroll、upgrade application、snapshot 扩展，以及真实浏览器路线验证。

本阶段明确不交付：新地图/建筑内容、经济系统、持久化成长、复杂 meta progression、新的掉落循环、Phase 11 的全量 observability hardening。

</domain>

<decisions>
## Implementation Decisions

### Level-up Flow
- Phase 10 新增 `state.mode = "levelup_choice"`，用于承载选择面板并冻结战斗推进。
- `pendingLevelUps` 继续沿用 Phase 09 的稳定顺序队列；每次只消费队首一个 event。
- 进入 `levelup_choice` 后，敌人更新、刷怪、攻击冷却推进、auto pickup 和 compare 触发都暂停；确认选择后恢复 `playing`。
- 已经处于 `equip_compare` 时，不强行插入 level-up 面板；compare 先结束，再消费 pending level-up event。反过来，进入 `levelup_choice` 后阻止新的 auto pickup/compare 触发。

### Offer Model
- 每次 level-up 必须显示**恰好 3 个**候选项。
- choice pool 同时支持 `skill` 和 `talent` 两类项。
- offer 生成必须使用独立 `offerRngState`，不能复用 spawn / drop / progression RNG。
- offer 生成必须保证：无重复、满足 eligibility、满足 exclusion / max-rank / pool 约束。
- reroll 属于本阶段范围，默认每个 level-up event 至少有 `1` 次 deterministic reroll 机会。

### Input Semantics
- `ArrowLeft` / `KeyA`：选择左侧选项
- `ArrowRight` / `KeyD`：选择右侧选项
- `Enter` / `Space`：确认当前选项
- `KeyR`：reroll 当前 offer（如果剩余次数 > 0）
- `Escape` 不用于退出 level-up panel；全屏退出仍保持原有语义

### Upgrade Model
- `skill`：主动战斗形态修饰，例如 attack radius / attack arc / cooldown behavior 等
- `talent`：被动成长项，例如 `attackDamage` / `maxHp` / `moveSpeed` 等
- 所有 upgrade 效果都必须在本阶段**立即可测量**，不能只是把选择结果存档到 run state 中等待后续 phase 生效。
- 不允许直接修改 base tuning 常量；upgrade 影响必须通过显式 modifiers / derived state 汇入现有效果计算路径。

### State & Snapshot Contract
- 新增 transient state：`state.levelUp = { activeEventId, currentOfferId, offeredChoices, selectedIndex, rerollsRemaining, offerSeq, offerRngState }`
- 新增 applied state：`state.upgrades = { appliedChoices, skillModifiers, talentModifiers }`
- `window.render_game_to_text()` 必须新增：
  - `levelUpState`
  - `upgradeState`
- `window.advanceTime(ms)` 语义保持不变

### Claude's Discretion
- 初始 skill / talent catalog 的具体命名和数值，只要能稳定提供 3 个合法选项并立即影响战斗即可
- 选择面板的视觉布局、文案措辞和焦点高亮样式
- reroll 的默认次数和 UI 展示形式，只要 deterministic 且可断言即可

</decisions>

<specifics>
## Specific Ideas

- 建议用一个小而完整的 catalog 起步：至少 3 个 `skill` + 3 个 `talent`
- `skill` 可优先选择对现有攻击逻辑侵入较小的项，例如 `wide_slash`、`quick_slash`、`edge_control`
- `talent` 可优先复用现有 `attackDamage`、`maxHp`、`moveSpeed` 的已知有效计算链
- 当前阶段的重点是“稳定的 choice engine”，不是大量内容；catalog 数量应以 deterministic 和可测试为先

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `state.progression.pendingLevelUps` 已经在 Phase 09 落地，是 Phase 10 的唯一升级事件来源
- `src/main.js` 已经有 `equip_compare` 模式，可复用其“特殊 mode + 输入接管 + HUD/overlay”模式
- `src/main.js` 里 `getEffectiveAttackDamage()`、`getEffectiveMaxHp()`、`getEffectiveMoveSpeed()` 已经承接 equipment modifiers，是 upgrade modifiers 最自然的汇入点
- `src/determinism-harness.js` 已经稳定导出 `progressionState`、`lootState`、`equipmentState`，继续扩展 `levelUpState` / `upgradeState` 风险最低

### Established Patterns
- 纯规则优先放入平铺 `src/*.js` 模块，`src/main.js` 保持 runtime 组合根
- 浏览器 E2E 继续以 `window.render_game_to_text()` 为主断言面，不依赖 HUD 肉眼判断
- 现有 mode 语义稳定：`start`、`playing`、`paused`、`equip_compare`、`restart_pending`、`gameover`；Phase 10 只能新增一个与 level-up 直接对应的 mode

### Integration Points
- level-up 入口：`state.progression.pendingLevelUps`
- 面板模式：`src/main.js#updateGameStep()` 与输入处理
- HUD/overlay：现有 feedback/banner + compare overlay 模式
- snapshot：`src/determinism-harness.js#buildDeterministicSnapshot()`

</code_context>

<deferred>
## Deferred Ideas

- 更大规模的 skill tree / talent tree
- 持久化解锁、稀有升级、meta currency
- 复杂动画与音效 polish
- Phase 11 的 observability hardening 与 offer/rng 字段最终收口

</deferred>

---
*Phase: 10-skill-talent-choice-engine*
*Context gathered: 2026-03-06*

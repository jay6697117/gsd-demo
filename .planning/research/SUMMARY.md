# Project Research Summary

**Project:** PokeThrees Hunter
**Domain:** Deterministic Three.js browser action-survivor (`v1.1 World & Growth Overhaul`)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

本次研究结论是：`v1.1` 不需要做技术栈迁移，应该在现有确定性战斗基线之上，完成“世界扩展 + 成长闭环”的垂直切片。最稳妥路径是延续 `Vanilla JS + Three.js + Vite + Playwright + node:test`，并把新增复杂度集中在内容层与规则层（地图分区、建筑类型、可破坏道具、掉落装备、经验升级、技能/天赋选择），而不是引入新框架或大规模重构。

推荐方案的关键增量是“轻量约束而非重型重写”：新增 `zod` 做加载期 schema 校验、用 TypeScript `checkJs` 做静态结构检查、把 world/loot/progression 从 `main.js` 里模块化拆分，并扩展 determinism contract 覆盖 `worldState/progression/equipment/rng streams`。这样能在保持迭代速度的同时，显著降低 v1.1 常见失控点（随机污染、升级重入、掉落失衡、回归不可复现）。

主风险不在“功能是否可实现”，而在“功能叠加后是否仍可重复验证与可平衡调参”。因此路线必须把风险预防前置到阶段出口：统一 kill->xp 事件契约、分离 RNG 域、升级选择边界化、掉落经济预算化、快照字段完整化。只有这样，v1.1 才能从“能玩”变成“可持续演进”。

## Key Findings

### Recommended Stack

栈结论是“核心不变，新增两项约束工具与一套内容组织方式”。现有运行时已经满足 v1.1 所需吞吐和可测性，主要问题是未来扩展时的结构一致性与确定性保护，因此应优先补齐数据校验和契约测试，而非迁移框架。

**Stack additions for v1.1 (重点):**
- `zod@4.3.6`: 对 `zones/buildings/drops/progression/talents` 配置做加载期校验，防止坏数据进入模拟循环。
- `typescript@5.9.3` (`tsc --noEmit` + `checkJs`): 在保留 JS 运行时的前提下，约束配置和状态切片结构。
- `src/content/*` 数据化组织: 把地图、建筑、掉落、成长参数从硬编码迁移到 catalog/config，提升可维护性和调参效率。

**Core technologies:**
- `JavaScript (ESM, Vanilla)`: gameplay loop 与规则实现 — 保持当前确定性基础，避免迁移风险。
- `Three.js 0.183.2`: 世界渲染与建筑/掉落表现 — 现有渲染链稳定，可直接承载新系统可视化。
- `Vite 7.3.1`: 开发与构建 — 现有脚本已对齐，维持低扰动交付。
- `Playwright 1.58.2 + node:test`: burst 回归与规则验证 — 能直接覆盖升级、掉落、快照契约路径。
- `Deterministic harness`: `advanceTime`/`render_game_to_text` 回放基线 — v1.1 需扩展字段但不改接口语义。

### Expected Features

v1.1 的特征分层非常清晰：先补齐该品类的 table stakes，再用有限差异化功能提升中长局可玩性，明确拒绝会引发范围失控的“伪高价值需求”。

**Must have (table stakes):**
- Kill-based XP 与稳定升级节奏 — 品类基础成长预期。
- 升级 `3` 选 `1`（pick-one）流程 — run 内构筑核心交互。
- 可扩展地图分区与可读路径 — 支撑中后期走位与风筝空间。
- 建筑碰撞/遮挡可解释 — 降低“不公平命中”感知。
- 可破坏道具 -> 掉落 -> 拾取闭环 — 提供地图互动收益。

**Should have (differentiators):**
- 可破坏道具掉落“有槽位语义”的装备（weapon/core/charm）— 把地图互动与成长绑定。
- 建筑驱动的战术微循环（funnel/line break/retreat windows）— 强化空间决策而非纯数值堆叠。
- Skill vs Talent 双轨升级设计 — 提高构筑方向感，降低随机漂移。
- Zone-specific drop bias（轻 biome 差异）— 让地图扩展产生实际收益差异。

**Defer (v2+):**
- 无限程序化地图流式生成。
- 持久化背包/仓库经济系统。
- 全地形物理可破坏。
- 6-8 选项的重升级面板与复杂 reroll/banish 机制。

### Architecture Approach

架构建议是“组合根保留在 `src/main.js`，领域复杂度外提到 `world/loot/progression`，并用固定调度顺序维持确定性”。运行时按 `combat -> prop -> drop -> growth -> feedback` 管线推进，升级进入显式 mode（`playing/levelup/paused`），避免 UI 与模拟重入耦合。所有新增关键状态都进入 deterministic snapshot contract，作为回归与调参共同基线。

**Major components:**
1. `MapSystem` — 分区、地块、walkable 查询、spawn 采样。
2. `BuildingSystem` — 建筑原型、阻挡体积、交互收益。
3. `Prop/DropSystem` — 可破坏道具生命周期与掉落解析。
4. `EquipmentSystem` — 装备槽、替换与属性聚合。
5. `Growth/TalentSystem` — kill->xp->levelup->choice 的状态机与规则。
6. `Determinism Harness` — 快照 schema 版本化与回放断言。

### Critical Pitfalls

1. **XP 发放分散且重复计入** — 统一 kill event reducer，加入 `(entityId,tickId)` 幂等防重。
2. **升级选择在同 tick 内重入应用** — 升级排队到帧边界处理，使用严格 mode state machine。
3. **单 RNG 流污染 spawn/drop/offer** — 分离 `spawnRng/dropRng/upgradeRng`，并序列化其状态。
4. **升级池无 eligibility/exclusion 约束** — 在采样前执行 `requires/excludes/maxRank/tags` 过滤并保证唯一候选。
5. **掉落经济挤压 kill 成长主链** — 建立每分钟期望收益预算与保底机制，限制 prop power share。
6. **快照未覆盖成长关键字段** — contract 强制包含 `xp/level/offers/equipment/rng`，缺字段即测试失败。
7. **重开流程泄漏上局成长状态** — `newRunState(seed)` 工厂化重建并做重启一致性测试。

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Event Contract & Data Foundations
**Rationale:** 先锁 kill/xp 与内容 schema 契约，避免后续功能叠加时出现隐性漂移。
**Delivers:** canonical kill event、progression state schema、`zod` content validation、初版 `src/content/*` 目录。
**Addresses:** kill-based leveling、地图/建筑/掉落/天赋数据化入口。
**Avoids:** XP 双计或漏计、坏配置导致的隐性行为分叉。

### Phase 2: Deterministic World Runtime Integration
**Rationale:** 地图/建筑/道具/掉落先跑通且保持回放稳定，是成长系统的前置条件。
**Delivers:** `MapSystem` + `BuildingSystem` + `Prop/DropSystem` 集成，域分离 RNG，固定更新顺序。
**Uses:** existing Three.js runtime、Vanilla rules、deterministic harness。
**Implements:** world & loot domain boundary。

### Phase 3: Skill/Talent Choice Engine
**Rationale:** 在世界与掉落稳定后接入升级选择，可更清楚定位平衡和状态机问题。
**Delivers:** XP curve、levelup trigger、3-option panel、skill/talent eligibility/exclusion rules。
**Uses:** growth/talent modules + input mode transitions。
**Implements:** progression decision layer。

### Phase 4: Balance Calibration (World × Growth)
**Rationale:** 功能闭环后再做数值治理，减少“调一次坏一片”。
**Delivers:** TTK guardrails、drop EV budgets、zone bias tuning、canonical build sweeps。
**Addresses:** power runaway、crate-farming 偏置、seed 间方差失控。
**Avoids:** 地图策略价值被纯数值吞没。

### Phase 5: Regression Harness & Observability Hardening
**Rationale:** 在里程碑收口前锁定行为基线，确保后续小改不破坏核心成长链路。
**Delivers:** snapshot schema `1.1.0`、contract tests、burst E2E 覆盖升级与掉落路径。
**Uses:** `node:test` + Playwright + deterministic APIs。
**Implements:** fail-fast regression safety net。

### Phase 6: Lifecycle Hardening & Release Gate
**Rationale:** 发布前处理重开/恢复一致性与长局稳定性，防止线上隐性偏差。
**Delivers:** `newRunState(seed)` reset factory、restart parity tests、state migration checks。
**Addresses:** run state leakage、seed replay mismatch。
**Avoids:** “看起来完成但不可复现”的发布风险。

### Phase Ordering Rationale

- 先合同（contract）后功能：先把事件与 schema 锁住，减少后续返工半径。
- 先空间/掉落再成长选择：升级系统依赖稳定的战斗与战利品输入。
- 先正确性再平衡：没有 deterministic baseline 的调参不可复验。
- 先测试可观测再发布：收口阶段以契约测试和重开一致性作为硬门禁。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4:** 平衡策略需要补充统计指标定义（TTK、incoming DPS、build variance）与种子采样方法。
- **Phase 5:** 快照 schema 的归一化/排序规则与容差策略需进一步细化，避免 CI 偶发波动。
- **Phase 6:** restart/resume 生命周期边界需补充故障注入场景（focus loss、pause、instant restart）。

Phases with standard patterns (skip research-phase):
- **Phase 1:** schema validation、event idempotency、content catalog 化有成熟工程模式。
- **Phase 2:** 固定步长调度与域分离 RNG 是确定性游戏常规做法。
- **Phase 3:** 升级 3 选 1 + eligibility filtering 属于成熟品类模式。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 以现有稳定栈为主，新增工具为低风险约束层。 |
| Features | HIGH | table stakes 与 differentiators 边界清晰，且与里程碑目标一致。 |
| Architecture | HIGH | 组件职责、依赖顺序、集成边界已明确可执行。 |
| Pitfalls | HIGH | 风险、预警信号、预防手段与阶段映射完整。 |

**Overall confidence:** HIGH

### Gaps to Address

- **Drop fairness target 未量化:** 在 Phase 4 冻结“每分钟成长预算”和 seed 间方差阈值。
- **Snapshot evolution policy 未固化:** 在 Phase 5 明确 schema 版本升级与兼容策略。
- **Long-run performance baseline 未入本次研究主轴:** 在实现期补充 props/drops 高频场景下的 GC 与帧时间门槛。

## Sources

### Primary (HIGH confidence)
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/STACK.md` — 现有栈、v1.1 栈增量与禁用项。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/FEATURES.md` — table stakes/differentiators、MVP 与反特性边界。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/ARCHITECTURE.md` — 分层、组件职责、构建顺序与数据流。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/PITFALLS.md` — 关键风险、预警信号、预防与恢复策略。

### Secondary (MEDIUM confidence)
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md` — v1.1 目标与范围约束对齐。
- 类型基线对照（Vampire Survivors / Halls of Torment / Brotato）— 仅用于品类预期校准。

### Tertiary (LOW confidence)
- 无新增低可信外部来源；当前结论主要来自项目内研究文档归纳。

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*

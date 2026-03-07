# PokeThrees Hunter

## Current Milestone: v1.1 World & Growth Overhaul (Shipped)

**Goal:** Extend the original deterministic combat prototype into a replay-safe world-and-growth loop with map scale, tactical space, loot, progression, and upgrade choices.

**Delivered features:**
- Modular multi-sector world traversal with deterministic spawn/readability behavior
- Tactical building layer with blocker, funnel, and soft-cover roles
- Breakable props, deterministic loot drops, equipment compare/equip flow
- Kill-driven XP progression, visible HUD progression, and pending level-up queueing
- Deterministic level-up choice/reroll flow with immediate applied upgrade effects
- Milestone-wide replay, restart parity, and named regression commands

## What This Is

这是一个基于 Three.js 的浏览器动作小游戏：玩家在 3D 场景中操控像素风训练师，在可扩展分区地图中穿行、拉扯怪物、利用建筑制造战术空间、击破可破坏物获取装备、通过击杀获得经验并触发升级选择。当前代码库已经具备单局内完整的地图与成长闭环，并且关键状态可通过 `window.render_game_to_text()` 与 `window.advanceTime(ms)` 做确定性回放和自动化验证。

## Core Value

玩家在 30 秒内就能感受到“清晰可读的像素美术 + 准确响应的战斗操作 + 明确成长反馈”的核心乐趣。

## Requirements

### Validated

- ✓ Three.js + Vite 的可运行单局战斗循环（开始、战斗、结算重开）— v1.0
- ✓ 键盘操作与状态切换稳定（移动、攻击、暂停、全屏、重开）— v1.0
- ✓ HD pixel art 视觉基线与战斗反馈链路（命中/击杀反馈）— v1.0
- ✓ 可观测与可回归自动化接口（`window.render_game_to_text`, `window.advanceTime`）— v1.0
- ✓ 确定性回归工装（Playwright burst + artifact）— v1.0
- ✓ 模块化地图分区、稳定边界碰撞、分区化刷怪与可读性信号 — v1.1
- ✓ 建筑战术层（`blocker` / `funnel` / `soft-cover`）与稳定 enemy steering — v1.1
- ✓ 可破坏物、确定性掉落、装备槽位与 compare/equip 主链 — v1.1
- ✓ 击杀经验、等级成长、pending level-up queue 与 HUD progression — v1.1
- ✓ 技能/天赋选择、一次性 reroll、即时升级效果与统一 deterministic snapshot — v1.1
- ✓ v1.1 端到端 replay parity、restart parity 与 named regression commands — v1.1

### Active

- [ ] Define the next shipped milestone with `$gsd-new-milestone`.

### Out of Scope

- 官方版权素材复刻（角色与贴图使用原创像素风表达）— 避免版权风险
- 联机对战与账号系统 — 当前仍聚焦单机动作成长闭环
- 长剧情关卡与任务树 — 先保持高可重玩性的系统型战斗循环
- 复杂背包交易与经济系统 — 已明确推迟到未来 milestone
- 全局破坏地形物理 — 仍与确定性移动/寻路约束冲突

## Context

项目当前已从 v1.0 的稳定战斗基线，演进到 v1.1 的“地图 + 成长”完整闭环。现有代码库约 10,720 行 JS/TS/Python，核心验证面已经集中到 text-state contract、browser routes 与 named regression scripts，而不是依赖人工看图。下一轮工作不应该继续往 v1.1 堆功能，而应该先定义新的 milestone 边界、需求和验证策略。

## Constraints

- **Tech stack**: Three.js + Vanilla JavaScript + Vite — 保持快速迭代和浏览器可回放性
- **Testing**: 继续以 deterministic harness + Playwright 为一等能力 — 新功能必须进统一回归链
- **Visual style**: HD pixel art（非模糊插值）— 保持当前视觉识别度
- **Compatibility**: `render_game_to_text()` 和 `advanceTime(ms)` 仍是核心调试/验证接口 — 新功能不能绕开它们单独造调试面
- **Scope discipline**: milestone 必须按闭环能力切分 — 避免把 meta/economy/persistence 和当前主循环耦在一起

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Three.js 而非纯 2D Canvas | 用户明确要求 3D 场景与后续视觉扩展空间 | ✓ Good |
| 将 `render_game_to_text()` + `advanceTime(ms)` 作为核心验证接口 | 降低回归成本，支撑 deterministic browser assertions | ✓ Good |
| sector topology/readability 作为地图主契约 | 统一 traversal、collision、spawn、readability 的真相源 | ✓ Good |
| building 与 breakable 语义严格隔离 | 避免 blocker/steering 规则污染 loot loop | ✓ Good |
| effective combat stats 采用 base + delta 模型 | 让 equipment 和 upgrades 可叠加而不改写基础常量 | ✓ Good |
| progression queue 与 level-up choice panel 分层 | 让 XP ingress、pending event、choice consumption 各自保持确定性 | ✓ Good |
| v1.1 regression 以 named scripts 为主入口 | 降低 verifier 依赖长命令串和人工拼接成本 | ✓ Good |

---
*Last updated: 2026-03-07 after v1.1 milestone completion*

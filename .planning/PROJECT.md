# PokeThrees Hunter

## Current Milestone: v1.2 Meta Challenge Layer

**Goal:** 在已交付的 deterministic world-and-growth baseline 之上，补齐本地 meta layer：run history、best-score surfaces 和 daily seeded challenge，但不引入后端、账号或持久成长系统。

**Target features:**
- 本地 best-score history 与有边界的 run summary 存储
- 从开始界面直接进入 daily seeded challenge，并显示 challenge identity
- 标准 run 与 daily run 分离的结果记录与 best-of-day 表达
- meta state 进入 `render_game_to_text()`，继续保持 deterministic regression 可验证

## What This Is

这是一个基于 Three.js 的浏览器动作小游戏：玩家在 3D 场景中操控像素风训练师，在可扩展分区地图中穿行、拉扯怪物、利用建筑制造战术空间、击破可破坏物获取装备、通过击杀获得经验并触发升级选择。v1.1 已经交付完整的单局地图与成长闭环；v1.2 的任务不是继续往 run 内叠系统，而是在其外层补齐一个轻量、可回放、可比较的 meta shell，让玩家能看到历史成绩，并且每天都能进入同一份 deterministic challenge。

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

- [ ] Standard run 完成后，本地可以持续保存历史 summary，并跨 reload/browser restart 读回。
- [ ] 玩家可以查看 best-score history 和关键 run metadata，而不需要离开当前游戏壳层。
- [ ] 玩家可以从开始界面进入 daily seeded challenge，并看到稳定的 challenge identity。
- [ ] daily run 的结果与 standard run 分桶管理，且 challenge 相关状态继续进入 deterministic text-state。

### Out of Scope

- 官方版权素材复刻（角色与贴图使用原创像素风表达）— 避免版权风险
- 联机对战与账号系统 — v1.2 明确保持本地单机 meta layer
- 云端 leaderboard / server-authored daily ops — 需要后端与统一时钟，不属于本 milestone
- 持久成长树、长期装备库存与 stash — 这属于更重的跨 run progression，留给后续 milestone
- 长剧情关卡与任务树 — 仍优先保持高可重玩性的系统型战斗循环

## Context

项目当前已经完成 v1.1 的 world-and-growth 闭环，代码里已经有 `randomSeed`、game-over summary、restart parity、`render_game_to_text()` 和命名回归命令，但还没有本地 meta state、run history 或 daily challenge 入口。下一轮工作应该复用现有 run lifecycle，而不是再改写战斗主链：把“每局发生了什么”以轻量、本地、可验证的形式沉淀下来，再基于稳定的 day-seed 暴露 daily challenge。

## Constraints

- **Tech stack**: Three.js + Vanilla JavaScript + Vite — 保持当前快速迭代与浏览器验证路径
- **Persistence**: 仅使用本地浏览器存储，不引入后端、账号或网络同步 — 控制范围并避免新基础设施
- **Determinism**: `render_game_to_text()` 和 `advanceTime(ms)` 仍是核心验证接口 — meta state 不能绕开它们单独造调试面
- **UX shell**: 新入口必须贴合现有 start/game-over 流程 — 避免为了 meta layer 重写整套壳层 UI
- **Scope discipline**: v1.2 只做 meta shell，不做 persistent progression/stash — 防止把本地历史和长期成长耦在一起

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
| v1.2 meta persistence 先使用 local-only storage | 本 milestone 数据量小、结构稳定，没必要引入 async database 或 backend | — Pending |
| daily challenge 先基于 UTC day key 派生 deterministic run seed | 让 challenge identity 在 reload、restart 和自动化中保持稳定 | — Pending |
| standard 与 daily history 分离存储与展示 | 避免不同 run mode 互相污染 best-score 语义 | — Pending |

---
*Last updated: 2026-03-07 after milestone v1.2 kickoff*

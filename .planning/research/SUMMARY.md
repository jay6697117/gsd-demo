# Project Research Summary

**Project:** PokeThrees Hunter
**Domain:** Three.js 浏览器动作击杀游戏（HD pixel art）
**Researched:** 2026-03-04
**Confidence:** HIGH

## Executive Summary

这是一个以“30 秒内形成可感知爽感”为目标的单人动作击杀游戏，核心是把 **高清像素艺术表达**、**稳定战斗手感** 和 **自动化可回归能力** 一起交付，而不是只追求视觉或只追求功能闭环。研究结果表明，该类型产品在工程上最容易失败的地方不是“功能不够多”，而是渲染清晰度、时间步进一致性和输入状态管理三者没有统一基线。

推荐路线是：采用 `Three.js + Vanilla JS + Vite + Playwright` 的轻量组合，先完成固定步长战斗循环与状态机，再构建 HD pixel art 渲染基线，随后补齐自动化观测接口（`render_game_to_text` / `advanceTime(ms)`）并在此基础上做平衡与性能加固。该顺序能最小化返工，且与当前 greenfield 条件和 v1 单人闭环范围完全一致。

关键风险集中在 5 类：像素风被渲染链路悄悄模糊、帧率驱动逻辑导致手感漂移、视觉命中与逻辑命中不一致、自动化不可稳定回归、长局资源泄漏导致性能崩溃。应对策略是将这些风险前置到阶段出口标准，而不是在末期统一“补修”。

## Key Findings

### Recommended Stack

推荐技术栈优先“确定性 + 低复杂度 + 可维护”：`Node.js 24.x LTS` 保证生命周期稳定，`Vite 7` 负责快速迭代与构建，`Three.js 0.183.2` 提供成熟渲染能力，`Vanilla JavaScript` 保持核心战斗循环简洁可控，`Playwright` 负责输入回放与端到端回归。该组合与项目约束高度一致，能在不引入额外框架负担的前提下交付可玩闭环。

辅助库采用“按需启用”策略：`three-stdlib`（扩展模块）、`postprocessing`（有限特效）、`@tweenjs/tween.js`（小型补间）、`howler`（音频层）、`vite-plugin-glsl`（shader 导入）。总体原则是先保 60 FPS 与像素清晰，再叠加视觉装饰。

**Core technologies:**
- `Node.js 24.x LTS`: 本地运行时与构建执行环境 — 与 Vite 7 / Vitest 4 兼容稳定、升级扰动低。
- `Vite 7.3.1`: dev server 与生产构建 — 启动快、配置轻，适合高频玩法迭代。
- `Three.js 0.183.2`: 场景渲染与视觉反馈基础 — 生态成熟、可控性高，适配 3D + 像素风融合表达。
- `Vanilla JavaScript (ES2023+)`: 游戏循环与规则实现 — 避免过早框架化，优先保证规则确定性。
- `@playwright/test 1.58.2`: 自动化回归验证 — 直接支撑时间推进与文本快照断言。

### Expected Features

v1 必须围绕“战斗可读、可控、可回归”构建，先满足 table stakes，再逐步引入差异化机制。研究显示，若在 v1 提前加入联机、重 RPG 系统或重后处理特效，会显著拉高复杂度并降低交付确定性。

**Must have (table stakes):**
- 核心输入与移动 + 攻击判定 — 用户对动作游戏的基础预期。
- 敌人刷新与基础 AI — 没有持续敌压就无法形成击杀循环。
- 死亡/重开状态机闭环 — 支撑失败重试与节奏重置。
- HUD（HP/score/timer/kill count） — 保证即时反馈可读。
- HD pixel art 基础管线 — 满足“高清像素风”硬性要求。
- 自动化接口（`render_game_to_text`、`advanceTime(ms)`） — 支撑稳定回归。

**Should have (competitive):**
- 连击倍率（Kill Chain）系统 — 提升高质量操作收益。
- 击杀瞬间电影化反馈（hit-stop/震动/粒子） — 强化主观爽感。
- 局内轻量成长（三选一） — 提供短周期策略变化。

**Defer (v2+):**
- 每日挑战与种子排行榜 — 增强重玩目标但非首发必需。
- 多场景主题轮换 — 内容扩展项，不影响核心乐趣验证。
- 手柄适配与按键重映射 UI — 设备覆盖增强项。

### Architecture Approach

推荐采用三层分离架构：Experience 层负责输入与 HUD 展示，Gameplay 编排层负责循环、战斗、刷新和状态转换，Domain/Runtime 层负责实体存储、事件总线、配置和调试桥接。关键模式是“固定步长模拟 + 渲染插值”“事件驱动击杀反馈”“规则与渲染解耦”，以保证同一输入在不同设备帧率下仍能得到一致结果，并可被自动化稳定验证。

**Major components:**
1. `GameLoop` — 固定步长驱动模拟与渲染插值，保障判定确定性。
2. `SceneDirector` — 管理 `menu/combat/gameover` 生命周期与切换。
3. `CombatSystem` — 负责命中计算、伤害结算、击杀事件发射与得分更新。
4. `SpawnSystem` — 控制刷怪频率、类型权重与难度曲线。
5. `DebugAPI` — 暴露文本快照与时间推进接口用于测试桥接。

### Critical Pitfalls

1. **HD pixel art 管线被模糊化** — 统一 DPR/缩放/采样策略，限制不兼容后处理，并做多 DPR 视觉回归。
2. **帧率驱动战斗逻辑导致手感漂移** — 使用固定步长模拟、受控时间状态机和可重复输入回放。
3. **视觉命中与逻辑命中不一致** — 建立可视化 hitbox 调试层与数据驱动判定窗口。
4. **自动化可观测性缺失** — 将调试接口作为一等能力，定义稳定 schema 与快照规则。
5. **资源生命周期失控导致长局掉帧** — 对象池 + 资源注册/释放协议 + 性能门禁。

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Runtime Skeleton & Pixel Baseline
**Rationale:** 先建立可运行骨架和像素渲染基线，避免后续玩法迭代建立在不稳定底座上。
**Delivers:** `GameLoop` 初版、`SceneDirector` 状态机、基础输入映射、nearest sampling/DPR 策略、原创美术风格边界清单。
**Addresses:** v1 状态机闭环、HD pixel art 基础要求。
**Avoids:** Pitfall 1（渲染模糊）、Pitfall 8（版权边界风险）。

### Phase 2: Deterministic Combat Core
**Rationale:** 在最早阶段验证“可玩”与“可重复”是否同时成立。
**Delivers:** 玩家移动与攻击、敌人刷新与基础追击、命中判定、HP/死亡/重开、计分。
**Uses:** `Three.js` 核心渲染、`Vanilla JS` 规则层、固定步长时间推进。
**Implements:** `CombatSystem`、`SpawnSystem`、`ScoreSystem`。

### Phase 3: Feedback & Difficulty Tuning
**Rationale:** 核心可玩后再强化爽感与节奏，降低调参返工。
**Delivers:** 命中与击杀反馈分层（flash/shake/particles）、难度曲线与刷怪表、连击倍率 v1。
**Addresses:** 差异化体验（Kill Chain、战斗节奏）。
**Avoids:** Pitfall 4（难度雪崩或过平）、Pitfall 3（命中可解释性差）。

### Phase 4: Input/State Integration Hardening
**Rationale:** 将失焦、暂停、全屏切换这类“偶发高痛点”问题提前系统化治理。
**Delivers:** 集中式 Input Manager、焦点与全屏状态重置、暂停/重开一致性修复、HUD 可读性强化。
**Addresses:** 完整键盘操作与状态一致性。
**Avoids:** Pitfall 7（输入粘滞与状态冲突）。

### Phase 5: Automation & Regression Harness
**Rationale:** 在功能趋于稳定时建立回归护栏，防止后续优化破坏核心手感。
**Delivers:** `window.render_game_to_text`、`window.advanceTime(ms)`、关键流程 Playwright E2E、golden snapshots。
**Uses:** `@playwright/test`、稳定 state schema、可注入随机源。
**Implements:** `DebugAPI` 与测试桥接层。

### Phase 6: Performance Hardening & Polish
**Rationale:** 在规则和测试稳定后再做性能压榨，收益最大且风险最可控。
**Delivers:** 对象池、draw-call audit、热点路径零分配、长局压力测试、音频与 UI 抛光。
**Addresses:** 60 FPS 稳定性目标。
**Avoids:** Pitfall 6（内存泄漏与长局性能衰退）。

### Phase Ordering Rationale

- 依赖顺序决定先后：没有稳定循环与状态机，就无法有效验证战斗、视觉和测试接口。
- 先做“确定性规则”再做“视觉增强”：否则会被特效噪声掩盖玩法缺陷。
- 输入/状态集成放在中前期：可提前消灭高频偶发 bug，避免后期集中爆雷。
- 自动化在性能优化前完成：先锁行为基线，再做性能改动，便于快速识别回归。
- 性能加固收尾：对象池与资源治理需要相对稳定的数据路径，后置可减少重复重构。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** 难度导演器与参数搜索策略（需补充 Monte Carlo 输入模型与目标分布定义）。
- **Phase 5:** 文本快照容差与随机源注入协议（需明确跨环境稳定性策略）。
- **Phase 6:** 中端设备性能门槛与压测样本（需定义设备矩阵与 FPS/GC 阈值）。

Phases with standard patterns (skip research-phase):
- **Phase 1:** 固定步长循环、状态机、像素采样基线均有成熟实践。
- **Phase 2:** 基础移动/攻击/刷怪闭环属于标准动作游戏首发路径。
- **Phase 4:** 输入管理与焦点状态治理属于浏览器游戏常规工程问题。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 关键版本与兼容关系已有官方文档支撑，且与项目约束一致。 |
| Features | HIGH | table stakes 与差异化分层清晰，优先级与范围边界明确。 |
| Architecture | HIGH | 分层边界、模式与构建顺序完整，能直接指导 phase 设计。 |
| Pitfalls | HIGH | 风险类型与触发信号具体，且已映射到阶段预防策略。 |

**Overall confidence:** HIGH

### Gaps to Address

- **目标设备矩阵未冻结:** 在 Phase 6 前确定最低/推荐设备基线，并据此设定性能门禁。
- **玩法数值尚无真实玩家分布:** 在 Phase 3 增加小样本 playtest 与回放统计，校正难度曲线。
- **自动化 schema 细节未定稿:** 在 Phase 5 明确字段稳定性、随机种子策略与快照容差。
- **美术版权边界需外部审查:** 在 Phase 1 完成原创差异化清单后，执行一次发布前法律审查。

## Sources

### Primary (HIGH confidence)
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/STACK.md` — 技术栈版本、兼容性与禁用项。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/FEATURES.md` — 功能分层、依赖关系与 MVP 范围。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/ARCHITECTURE.md` — 分层架构、组件边界与阶段顺序。
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/PITFALLS.md` — 高风险陷阱、预警信号与恢复策略。
- [Three.js Docs](https://threejs.org/docs/) — 渲染与资源管理基线。
- [Vite Guide](https://vite.dev/guide/) — 构建与开发流程基线。
- [Playwright Docs](https://playwright.dev/docs/intro) — 自动化与回归能力基线。

### Secondary (MEDIUM confidence)
- 品类对标：Vampire Survivors、Brotato、Soulstone Survivors — 用于功能分层与节奏设计对照。
- 浏览器游戏工程通用实践（输入焦点、固定步长、对象池）— 与研究结论一致但需按项目实测校验。

### Tertiary (LOW confidence)
- “30 秒心流形成阈值”与“60-120 秒可玩区间”属于经验性目标，需要在内部 playtest 中验证并迭代。

---
*Research completed: 2026-03-04*
*Ready for roadmap: yes*

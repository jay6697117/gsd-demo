# PokeThrees Hunter

## What This Is

这是一个基于 Three.js 的浏览器动作小游戏：玩家在 3D 场景中操控像素风训练师，击杀持续刷新的宝可梦风格敌人并存活更久。项目强调“高清像素艺术（HD pixel art）+ 流畅击杀反馈 + 可自动化回归测试”的统一交付。目标用户是希望快速获得爽感战斗循环的轻度动作游戏玩家与开发演示受众。

## Core Value

玩家在 30 秒内就能感受到“清晰可读的像素美术 + 准确响应的战斗操作 + 明确成长反馈”的核心乐趣。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 提供可直接运行的 Three.js 游戏主循环（开始页、战斗中、结束重开）
- [ ] 实现宝可梦风格像素敌人、玩家攻击与击杀计分逻辑
- [ ] 实现 HD pixel art 视觉语言（近邻采样、清晰轮廓、分层背景）
- [ ] 支持键盘完整操作（移动、攻击、暂停、重开、全屏）
- [ ] 暴露 `window.render_game_to_text` 与 `window.advanceTime(ms)` 以支持自动化验证

### Out of Scope

- 官方版权素材复刻（角色与贴图使用原创像素风表达）— 避免版权风险
- 联机对战与账号系统 — 不属于 v1 核心玩法闭环
- 长剧情关卡与任务树 — 首版先聚焦可重复游玩的战斗核心

## Context

用户要求“threes.js 宝可梦 高清 像素艺术 HD pixel art 击杀游戏”。仓库当前为空目录，属于 greenfield。为降低后续阶段漂移，初始化时同步规划研发文档、需求可追踪性和阶段路线图；实现阶段采用小步修改 + Playwright 自动动作回放，保证视觉与状态一致。

## Constraints

- **Tech stack**: Three.js + Vanilla JavaScript + Vite — 快速交付并保持浏览器兼容
- **Testing**: 必须接入 Playwright 客户端脚本 — 保证可重复、可回归的交互验证
- **Visual style**: HD pixel art（非模糊插值）— 满足用户明确的美术方向
- **Scope**: v1 只做单人战斗闭环 — 控制复杂度，优先完成可玩性

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Three.js 而非纯 2D Canvas | 用户明确要求 threes.js，且便于后续扩展光照与镜头动效 | — Pending |
| 先交付单场景高完成度战斗循环 | 先验证核心乐趣，再考虑内容扩展 | — Pending |
| 将自动化可观测性作为一等需求（text state + advanceTime） | 降低回归成本，提升迭代稳定性 | — Pending |

---
*Last updated: 2026-03-04 after initialization*

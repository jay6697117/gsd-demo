# Feature Research

**Domain:** Three.js 浏览器动作击杀游戏（HD pixel art）
**Researched:** 2026-03-04
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

缺少这些能力时，玩家会直接判断“这不是一个完整可玩的动作击杀游戏”。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 稳定的移动与攻击输入（键盘） | 动作游戏的最低交互门槛是“按下即响应” | MEDIUM | 支持移动、攻击、暂停、重开、全屏；输入缓冲保持手感一致 |
| 明确的命中判定与受击反馈 | 玩家需要知道攻击是否生效 | MEDIUM | 近战判定盒 + 命中特效 + 音效 + 轻微屏幕震动 |
| 敌人刷新、追击与基础 AI | 没有持续敌压就无法形成击杀循环 | MEDIUM | 分波次或时间驱动刷新，行为保持可读而非复杂博弈 |
| 生命值、死亡、重开闭环 | “失败-重试”是爽感循环的一部分 | LOW | 死亡态冻结输入，展示结算并支持快速重开 |
| 分数与存活时长反馈 | 玩家默认会用分数衡量表现 | LOW | HUD 实时显示 score/time/kill count |
| HD pixel art 渲染一致性 | 用户明确要求高清像素美术，不接受模糊插值 | MEDIUM | 贴图使用 nearest filter、像素对齐、分层背景与轮廓光 |
| 可预测性能（60 FPS 目标） | 战斗手感依赖帧稳定 | MEDIUM | 首版控制对象数量，避免昂贵后处理；提供性能降级开关 |
| 可自动化验证接口 | 项目目标包含自动回归能力 | LOW | 暴露 `window.render_game_to_text` 与 `window.advanceTime(ms)` |

### Differentiators (Competitive Advantage)

这些能力不是“能玩”的底线，但决定“为什么值得持续玩”。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 击杀连锁（Kill Chain）与节奏倍率 | 让“高质量连续击杀”明显优于无脑清怪 | MEDIUM | 连续击杀提升得分倍率与短时攻速，断链后回落 |
| 像素风宝可梦灵感敌群剪影系统 | 在不触碰版权素材前提下建立强识别度 | HIGH | 用原创轮廓语言映射“属性感”（火/草/电） |
| 击杀瞬间电影化反馈 | 提升每次命中的主观爽感 | MEDIUM | 关键帧冻结（hit-stop）、定向抖动、像素粒子爆裂 |
| “30 秒可读成长”构建 | 轻度玩家快速进入心流 | HIGH | 小型升级三选一，优先提升攻击范围/冷却/生存 |
| 可回放的确定性战斗步进 | 同时服务玩法调参与自动化测试 | HIGH | 时间推进与随机种子可控，便于重现边界问题 |

### Anti-Features (Commonly Requested, Often Problematic)

这些需求看起来“更大更全”，但在当前阶段会显著伤害交付质量。

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 联机 PVP / 协作 | 玩家直觉上认为动作游戏“多人更好玩” | 网络同步、反作弊、延迟补偿会吞噬核心玩法迭代 | 先做本地排行榜 + 每日挑战种子 |
| 官方宝可梦资产复刻 | IP 熟悉度高，传播快 | 高版权风险，且限制美术可控性 | 保持“灵感来源”但坚持原创像素角色库 |
| 开放世界探索 + 主线剧情 | 看起来更“完整” | 内容制作成本远超战斗系统，验证周期过长 | 采用单场景高重玩战斗 + 轻叙事文案 |
| 深度装备/背包系统 | 常见 RPG 心智，认为可提升长期留存 | 复杂状态和 UI 会干扰动作主循环 | 使用局内短时构筑（run-based upgrades） |
| 全屏重后处理特效管线 | 视觉上“更高级” | 像素风易被糊化且 GPU 成本高 | 少量定制像素级特效（粒子/闪白/描边） |

## Feature Dependencies

```text
[Core Input + Movement]
    └──requires──> [Game State Machine]
                       └──requires──> [Scene Bootstrap + Asset Loading]

[Combat Hit Detection]
    └──requires──> [Core Input + Movement]
    └──requires──> [Enemy Spawn + Basic AI]

[Kill Chain Multiplier]
    └──requires──> [Combat Hit Detection]
    └──requires──> [Score System]

[HD Pixel Art Fidelity]
    └──requires──> [Asset Pipeline + Nearest Sampling]
    └──enhances──> [Combat Readability]

[Deterministic Time Advance API]
    └──requires──> [Game Loop Clock Abstraction]
    └──enhances──> [Automated Regression Tests]

[Heavy Post-Processing]
    └──conflicts──> [HD Pixel Art Fidelity]
    └──conflicts──> [60 FPS Stability]
```

### Dependency Notes

- **Combat Hit Detection requires Enemy Spawn + Basic AI:** 没有可交互敌人就无法验证命中判定与击杀回路。
- **Kill Chain Multiplier requires Score System:** 连击本质是对得分模型的时间窗口扩展，必须先有基础计分。
- **Deterministic Time Advance API requires Game Loop Clock Abstraction:** 只有统一时钟抽象后，自动化脚本才能稳定推进战斗状态。
- **HD Pixel Art Fidelity conflicts with Heavy Post-Processing:** 大量后处理会破坏像素边缘清晰度，与目标视觉语言冲突。
- **Heavy Post-Processing conflicts with 60 FPS Stability:** 在敌群高密度阶段，性能抖动会直接损伤动作手感。

## MVP Definition

### Launch With (v1)

最小可行目标：验证“高清像素动作击杀循环”是否成立。

- [ ] 核心状态机（开始页 / 战斗中 / 死亡结算 / 重开） — 形成完整可运行闭环
- [ ] 键盘移动 + 主攻击 + 命中判定 + 击杀记分 — 验证核心乐趣
- [ ] 敌人持续刷新与基础追击行为 — 形成稳定压力曲线
- [ ] HUD（HP / score / timer / kill count） — 提供即时反馈
- [ ] HD pixel art 基础管线（贴图采样、像素对齐、分层背景） — 满足明确视觉要求
- [ ] 自动化接口（`render_game_to_text`、`advanceTime(ms)`） — 支撑回归测试与调参

### Add After Validation (v1.x)

在核心循环稳定后，提升留存与可玩深度。

- [ ] 连击倍率与击杀播报系统 — 当基础击杀循环通过可玩性验证后加入
- [ ] 局内三选一成长（小型 rogue-lite） — 当首轮玩家反馈认为“后期变化不足”时加入
- [ ] 敌人类型扩展（远程/冲锋/自爆） — 当单一敌人导致策略单调时加入
- [ ] 音频层级优化与动态混音 — 当战斗信息密度上升时加入

### Future Consideration (v2+)

仅在证明核心体验具有持续吸引力后再投入。

- [ ] 每日挑战与种子排行榜 — 用于提升重复游玩目标
- [ ] 多场景主题轮换（昼夜/天气） — 强化内容新鲜度
- [ ] 手柄适配与按键重映射 UI — 扩展设备覆盖
- [ ] 轻社交异步对比（好友分数影子） — 在不引入实时联机成本下增加竞争感

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 核心输入与移动 | HIGH | MEDIUM | P1 |
| 命中判定与击杀反馈 | HIGH | MEDIUM | P1 |
| 敌人刷新与基础 AI | HIGH | MEDIUM | P1 |
| 状态机与重开闭环 | HIGH | LOW | P1 |
| HUD 与计分计时 | MEDIUM | LOW | P1 |
| HD pixel art 基础管线 | HIGH | MEDIUM | P1 |
| 自动化可观测接口 | HIGH | LOW | P1 |
| 连击倍率系统 | HIGH | MEDIUM | P2 |
| 局内三选一成长 | HIGH | HIGH | P2 |
| 多敌人行为扩展 | MEDIUM | MEDIUM | P2 |
| 每日挑战排行榜 | MEDIUM | MEDIUM | P3 |
| 多场景主题轮换 | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Vampire Survivors) | Competitor B (Brotato) | Our Approach |
|---------|-----------------------------------|-------------------------|--------------|
| 战斗节奏 | 高频刷怪 + 自动攻击压力曲线 | 小地图强压缩 + 波次生存 | 保留高压节奏，但强调手动攻击命中爽感 |
| 成长机制 | 局内升级与 build 叠加 | 武器与属性快速组合 | v1 先不复杂化，v1.x 再引入轻量三选一成长 |
| 视觉风格 | 复古 2D 像素群战 | 卡通化俯视射击 | 采用 Three.js 3D 场景 + HD pixel art 混合表达 |
| 可测试性 | 玩家向产品，自动化可见性较弱 | 同上 | 从 v1 起内置 deterministic API 供自动回归 |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md`
- `get-shit-done/templates/research-project/FEATURES.md` 模板结构与约束
- 参考品类：Vampire Survivors、Brotato、Soulstone Survivors（玩法分层与节奏设计）

---
*Feature research for: Three.js browser action kill game (HD pixel art)*
*Researched: 2026-03-04*

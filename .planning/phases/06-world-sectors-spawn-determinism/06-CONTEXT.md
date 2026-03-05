# Phase 06: World Sectors & Spawn Determinism - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付“可扩展分区地图 + 可穿越通行 + 确定性刷怪规则”基线，并保持既有固定步长与回放能力兼容。
不引入装备掉落、等级成长或技能天赋能力（这些属于后续阶段）。

</domain>

<decisions>
## Implementation Decisions

### 区域拓扑与通行规则
- 地图拓扑采用 `Hub + 环线`，以中心区连接外圈分区，形成可回环路线。
- 分区过渡采用“无缝连续过渡”，不切屏、不停顿。
- 通行空间采用“中密度主辅通道”：每区 `1` 条主通道 + `1-2` 条绕行道。
- 边界行为采用“硬边界 + 清晰回弹”，保持规则直观和可验证性。

### 分区刷怪分布与节奏
- 刷怪分配采用“热度权重分配”：结合玩家位置与近期战斗热度动态决定分区权重。
- 整体节奏采用“时间递进 + 上限夹持”，延续现有强度曲线思路。
- 并发预算采用“全局上限 + 分区软上限”，避免局部过载。
- 当玩家被压入狭窄区域时启用“侧向缓冲”救济，短时间降低前向分区权重。

### 分区可读性信号
- 路线提示采用“中强度地面编码”，通过地面色块/纹理区分主通道与绕行道。
- 边界提示采用“常驻细边 + 触碰强化”。
- 危险区提示采用“色相 + 密度双信号”，不依赖单一颜色编码。
- HUD 仅做最小补充：显示当前分区与压力级，不引入完整小地图。

### 回放可观测与断言风格
- 地图快照采用“分区摘要级”粒度，不记录全量网格细节。
- 刷怪快照字段至少包含：各分区敌人数、当前分区权重、刷新冷却。
- 确定性标记至少包含：`spawn RNG` 状态与分区事件序号。
- 自动化断言采用“结构严格 + 数值容差”策略。

### Claude's Discretion
- 具体分区数量、连接图参数、每区几何尺寸与命名。
- 热度计算公式、救济触发阈值与恢复窗口时长。
- 地面编码与边界强化的视觉细节（颜色、频率、透明度）。
- 快照字段命名、排序约定与容差数值。

</decisions>

<specifics>
## Specific Ideas

- 保持单循环战斗节奏，不引入切场打断。
- 分区差异优先通过空间结构和刷怪权重体现，而不是重 UI 导航。
- 读图信息必须“看得懂但不喧宾夺主”。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.js#updateSpawning`: 已有强度递进与冷却更新路径，可扩展为分区权重调度。
- `src/main.js#spawnEnemy`: 已有敌人创建与 ID 递增路径，可接入分区入口选择。
- `src/main.js#updateEnemies` + `clamp`: 已有位置更新与边界夹持，可升级为分区边界规则。
- `src/main.js#syncVisuals` + `createGroundTexture`: 已有地面渲染与视觉同步落点，可承载分区可读性编码。
- `src/determinism-harness.js#buildDeterministicSnapshot`: 已有快照契约，适合增量扩展分区/刷怪字段。

### Established Patterns
- 固定步长驱动（`FIXED_STEP = 1/60`）是核心约束，Phase 06 必须保持。
- 运行时单源状态集中在 `state`，渲染引用集中在 `world`。
- 可观测接口 `window.render_game_to_text` 与 `window.advanceTime(ms)` 已作为回归基线。

### Integration Points
- 地图分区模型与通行规则：`src/main.js`（建议抽出 `world-rules` 子模块）。
- 刷怪分区权重与预算分配：`src/main.js#updateSpawning`。
- 分区可读性表现：`src/main.js#syncVisuals` 与 `src/style.css`（HUD 最小补充）。
- 回放字段扩展与断言：`src/determinism-harness.js` + `tests/determinism-contract.test.js`。

</code_context>

<deferred>
## Deferred Ideas

- 完整小地图面板（后续可作为信息层增强阶段）。
- 全量网格细节快照与逐敌生成轨迹记录（后续调试强化阶段）。
- 分区触发式切场或单向门机制（后续玩法强化阶段评估）。

</deferred>

---
*Phase: 06-world-sectors-spawn-determinism*
*Context gathered: 2026-03-05*

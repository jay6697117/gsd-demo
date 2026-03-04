# Phase 2: Deterministic Combat Core - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

该阶段只交付：可生存的确定性战斗主循环，包括移动/攻击、敌人持续施压、命中与受伤规则、HUD 实时更新、死亡与重开闭环。
不扩展新能力（如升级分支、新玩法系统、meta 养成）。

</domain>

<decisions>
## Implementation Decisions

### 命中判定与确定性
- 战斗逻辑采用严格固定步推进（`1/60`），不使用可变步长逻辑。
- 输入采样保持“边沿 + 持续”双通道：持续输入处理移动，边沿输入处理触发类动作。
- 近战命中保持前向扇区判定（方向性保留，不改为全圆）。
- 每局重置固定 seed，确保同输入序列下可复现。

### 敌人压力曲线
- 刷怪强度采用渐进增强并设上下限，避免前期过压或后期失控。
- 同屏敌人数设置硬上限，保障可读性与性能稳定。
- 保留短无敌窗口（i-frame）用于受击后容错。
- 敌人类型配比采用固定概率抽样，优先可复现与平衡可控。

### HUD 信息更新
- HUD 每个逻辑步实时刷新，保证状态同步和可测试性。
- 数值格式统一为：HP 整数、时间 1 位小数（其余保持简洁整数）。
- 信息布局采用“生存优先”：HP 与状态最优先，分数与击杀次级。
- 暂停与结束状态保持 HUD 可见，支持复盘。

### 死亡与重开闭环
- Game Over 总结保留 `Time + Score + Kills` 三项核心指标。
- 重开入口采用“按钮 + 热键”并行（`R/Enter/Space`）。
- 重开前保留约 `0.8s` 过渡，再回到战斗。
- 进入 game-over 后冻结战斗状态，防止结算漂移。

### Claude's Discretion
- 敌人硬上限的具体数值与阶段性调度策略。
- 前向扇区判定的角度/半径精确参数。
- 0.8s 过渡的具体演出与输入禁用窗口细节。

</decisions>

<specifics>
## Specific Ideas

- 战斗核心必须优先保证“可复现可回归”，再追求更复杂动态性。
- 重开体验允许短过渡，但仍需保持高循环节奏。
- HUD 要服务战斗决策，而不是堆叠展示。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.js#updateGameStep` + `FIXED_STEP` + accumulator：已具备固定步驱动骨架。
- `src/main.js#doAttack` / `updateEnemies`：已有攻击与受击主路径，可在此处强化确定性和判定细节。
- `src/main.js#updateSpawning`：已有刷怪节奏函数，可直接承接压力曲线策略。
- `src/main.js#updateHud` / `enterGameOver` / `startRun`：已具备 HUD、结算、重开闭环骨架。

### Established Patterns
- 全局 `state` 单源状态，模式切换清晰（`playing`/`paused`/`gameover`）。
- 对象生命周期显式管理（spawn/update/remove + dispose）。
- 已暴露 `window.render_game_to_text` 与 `window.advanceTime(ms)`，天然支持确定性验证。

### Integration Points
- `applyPlayerInput()`：移动确定性与输入采样规则的主落点。
- `doAttack()`：攻击几何、命中判定、击杀计分的主落点。
- `updateSpawning()`：压力曲线与敌人上限策略的主落点。
- `updateHud()` 与 `enterGameOver()`：HUD 可读性和死亡闭环展示的主落点。

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-deterministic-combat-core*
*Context gathered: 2026-03-04*

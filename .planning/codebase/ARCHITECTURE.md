# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** 单入口前端单体（browser game monolith），采用“固定步长模拟 + Three.js 渲染 + DOM 叠层 UI + 自动化可观测桥接”架构。

**Key Characteristics:**
- 组合根（composition root）集中在 `src/main.js`，负责启动、调度、渲染、状态同步。
- 纯函数规则模块拆分在 `src/control-rules.js`、`src/feedback-rules.js`、`src/determinism-harness.js`，用于降低核心规则耦合。
- 自动化入口通过 `window.render_game_to_text` 与 `window.advanceTime(ms)` 暴露，契约由 `tests/determinism-contract.test.js` 与 `tests/playwright-burst.test.js` 双层覆盖。
- 运行时降级策略内建：当 WebGL 不可用或被测试禁用时，`createRendererRuntime()` 回退到 noop renderer（`src/main.js`）。

## Layers And Module Boundaries

### Layer 1: Presentation Shell
- **Purpose:** 承载 Canvas、HUD、开始/结束覆盖层、反馈叠层视觉元素。
- **Primary Files:** `index.html`, `src/style.css`
- **Depends on:** 浏览器 DOM API、`src/main.js` 暴露的行为绑定。
- **Used by:** 玩家交互（点击、按键）与可访问性语义（ARIA live/label）。
- **Boundary Rule:** 该层不直接修改游戏实体数据，只提供渲染容器和 UI 节点。

### Layer 2: Runtime Orchestrator
- **Purpose:** 统一驱动固定步长循环、输入消费、状态机流转、渲染同步。
- **Primary File:** `src/main.js`
- **Depends on:** `three`、规则层模块（`src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`）。
- **Used by:** 整个游戏运行时，是当前唯一执行主线。
- **Boundary Rule:** 该层拥有主状态对象（`state`）和三维对象索引（`world`），是唯一允许做跨子系统协调的层。

### Layer 3: Domain Rule Helpers (Pure/Mostly Pure)
- **Purpose:** 提供可复用、可测试的判定规则与快照构建逻辑。
- **Primary Files:** `src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`
- **Depends on:** JavaScript 标准库；不依赖 Three.js 场景对象。
- **Used by:** `src/main.js` 与 `tests/*.js`。
- **Boundary Rule:** 规则模块不触碰 DOM、不触碰渲染对象、不维护外部可变状态。

### Layer 4: Verification And Automation Harness
- **Purpose:** 校验行为确定性、控制逻辑、反馈规则与端到端运行稳定性。
- **Primary Files:** `tests/control-rules.test.js`, `tests/feedback-rules.test.js`, `tests/determinism-contract.test.js`, `tests/playwright-burst.test.js`
- **Depends on:** Node test runner、Playwright、Vite dev server。
- **Used by:** 回归验证与阶段产物采集（`.planning/artifacts/phase-05`）。
- **Boundary Rule:** 测试层只通过公开 API（模块导出和 `window.*` 钩子）驱动系统，不直接篡改内部闭包变量。

## Key Data Flows

### 1) Boot And Start Flow
1. 浏览器加载 `index.html`，挂载 `<canvas id="game-canvas">` 与 UI 覆盖层。
2. ESM 入口 `src/main.js` 初始化 renderer、scene、camera、state、world。
3. `requestAnimationFrame(frame)` 启动循环（`src/main.js`）。
4. 玩家点击 `#start-btn` 触发 `startRun()`，进入 `state.mode = "playing"`。

### 2) Fixed-Step Simulation Flow
1. `frame(now)` 计算 `elapsed` 并累积到 `accumulator`（`src/main.js`）。
2. 每达到一个 `FIXED_STEP`（`1/60`），执行 `updateGameStep(FIXED_STEP)`。
3. `updateGameStep` 内按顺序处理输入、玩法更新、反馈更新、HUD 更新、视觉同步。
4. `syncVisuals()` 最终调用 `renderer.render(scene, camera)`。

### 3) Combat Resolution Flow
1. 输入边沿由 `pressedThisStep` 记录，`consumeEdge(..., "Space")` 判定攻击触发（`src/control-rules.js` + `src/main.js`）。
2. `doAttack()` 执行扇形范围判定、前向夹角过滤、敌人扣血与击杀结算（`src/main.js`）。
3. 击中/击杀事件触发 `triggerHitFeedback()`/`triggerKillFeedback()`，并调用 `getComboMilestone()` 决定里程碑文案（`src/feedback-rules.js`）。
4. 状态回写到 `state.enemies`, `state.score`, `state.kills`, `state.chain`，随后 HUD 与 overlay 渲染。

### 4) Pause/Focus/Fullscreen Control Flow
1. 原始浏览器事件在 `window.addEventListener(...)` 中采集（`src/main.js`）。
2. 控制意图由纯函数解析：`resolvePauseMode`, `resolveFocusLossMode`, `resolveFullscreenToggleIntent`（`src/control-rules.js`）。
3. 结果写入 `state.control.*`，并通过 `updateHud()` 和 banner 提示反馈给用户。
4. 全屏切换通过 Promise `.catch()` 回写 `lastError/failureCount`，不污染核心玩法状态。

### 5) Determinism/Automation Flow
1. `window.advanceTime(ms)` 将运行切到 manual stepping，调用 `computeAdvanceSteps(ms, FIXED_STEP)`（`src/determinism-harness.js`）。
2. 循环执行固定步数 `updateGameStep(FIXED_STEP)` 并累积确定性元数据。
3. `window.render_game_to_text()` 通过 `buildDeterministicSnapshot(...)` 导出稳定 JSON。
4. `tests/playwright-burst.test.js` 读取该 JSON、写入 `.planning/artifacts/phase-05/burst-latest.json` 并断言关键字段。

## Key Abstractions

### `state` (single runtime state object)
- **Location:** `src/main.js`
- **Purpose:** 聚合模式状态、玩家、敌人、反馈、控制与确定性元数据。
- **Strength:** 单一事实来源（single source of truth）便于快照序列化与回归。
- **Cost:** 当前文件内聚度高，随功能增长会进一步放大 `src/main.js` 复杂度。

### `world` (render object registry)
- **Location:** `src/main.js`
- **Purpose:** 维护 `playerSprite`、`enemyRoot`、`slashRoot`、`particleRoot` 等 Three.js 句柄。
- **Boundary:** 渲染对象生命周期与业务数据分离，但仍在同文件并行维护。

### Deterministic Snapshot Contract
- **Location:** `src/determinism-harness.js`
- **Purpose:** 定义稳定 schema（`DETERMINISM_SCHEMA_VERSION`）与数据归一化/排序规则。
- **Verification:** `tests/determinism-contract.test.js` 验证结构、排序、重复输入一致性。

### Control Rule Set
- **Location:** `src/control-rules.js`
- **Purpose:** 输入边沿消费、暂停/焦点/全屏意图转换、状态标签格式化。
- **Verification:** `tests/control-rules.test.js` 覆盖所有导出函数。

## Entry Points

- **Runtime Entry:** `index.html` -> `<script type="module" src="/src/main.js">`
- **Frame Loop Entry:** `requestAnimationFrame(frame)` in `src/main.js`
- **Player Interaction Entry:** `#start-btn`, `#restart-btn`, keyboard events in `src/main.js`
- **Automation Entry:** `window.render_game_to_text`, `window.advanceTime` in `src/main.js`
- **Test Entry:** `tests/*.js` via `node --test` and `node tests/playwright-burst.test.js`

## Error Handling And Resilience Strategy

- 渲染层：`createRendererRuntime()` 包含 `try/catch`，异常时返回 noop renderer，确保逻辑与自动化仍可执行（`src/main.js`）。
- 全屏层：Promise 失败写入 `state.control.fullscreen.lastError` 与计数器，不触发模式损坏（`src/main.js`）。
- 确定性层：`computeAdvanceSteps()` 对输入毫秒值、步长做归一化与上限裁剪（`src/determinism-harness.js`）。
- 输入层：`consumeEdge()` 保证一次性按键消费，避免重复触发（`src/control-rules.js`）。
- 资源层：敌人/粒子/斩击对象在移除时显式 `dispose()`，降低渲染资源泄漏风险（`src/main.js`）。

## Architectural Risks And Evolution Boundaries

### Current Risks
- `src/main.js` 体量较大（承担 boot + loop + combat + feedback + UI sync），变更冲突与回归面会持续扩大。
- 玩法规则与可视对象同步逻辑同文件共存，后续扩展敌人行为时容易引入耦合回归。

### Recommended Incremental Boundaries (new code placement)
- 保持 `src/main.js` 为 composition root，仅负责装配与时序调度。
- 新增运行时骨架代码放入 `src/runtime/`：
  - `src/runtime/game-loop.js`
  - `src/runtime/game-state.js`
- 新增玩法系统放入 `src/systems/`：
  - `src/systems/combat-system.js`
  - `src/systems/spawn-system.js`
  - `src/systems/feedback-system.js`
- 新增渲染映射放入 `src/render/`：
  - `src/render/sprite-factory.js`
  - `src/render/overlay-sync.js`
- 规则与纯函数继续放入现有模式：
  - `src/*-rules.js` 或 `src/determinism-harness.js`

## Verification Focus For Future Changes

- 规则层改动必须同步更新对应单测：
  - `src/control-rules.js` -> `tests/control-rules.test.js`
  - `src/feedback-rules.js` -> `tests/feedback-rules.test.js`
  - `src/determinism-harness.js` -> `tests/determinism-contract.test.js`
- 自动化契约或入口行为改动后，必须回归 `tests/playwright-burst.test.js`，并检查 `.planning/artifacts/phase-05/*.json` 输出稳定性。

---
*Architecture analysis: 2026-03-05*
*Update when runtime layering or module boundaries change*

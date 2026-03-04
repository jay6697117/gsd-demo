# Phase 1: Runtime Skeleton & Pixel Baseline - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

该阶段只交付：可从开始页快速进入战斗的基础流程、HD 像素清晰基线、前后景可读分层，以及开战前控制提示。
不扩展新玩法能力（例如新攻击类型、成长系统、关卡系统）。

</domain>

<decisions>
## Implementation Decisions

### 像素清晰策略
- 渲染分辨率采用自适应容器尺寸，不切到固定逻辑分辨率。
- `renderer.setPixelRatio` 上限保持 `1.5`。
- 纹理采样采用全局最近邻策略（含后续资源），并禁用 mipmaps，防止模糊回归。
- 渲染前对精灵与相机进行像素网格对齐，降低子像素抖动。
- UI 文字保持像素字体强约束，维持统一视觉语言。
- Phase 1 禁用后处理（Bloom/FXAA/色调滤镜等），先锁定纯净像素基线。
- 在 Phase 1 即建立素材网格规范（角色/敌人/特效尺寸倍率）。
- 建立可重复视觉基线截图用于像素清晰回归检查。

### 开场进入流程
- 保留“按钮 + 热键”并行入口（Start 按钮 + Enter/Space）。
- 从开始页切入战斗使用约 `1s` 演出过渡。
- 开始后立即锁定游戏输入并清理残留按键状态，避免首秒误操作。
- Fullscreen 请求失败不阻塞开战主流程，忽略失败并继续进入战斗。

### 场景分层可读性
- 背景弱化优先，前景战斗实体可读性优先于氛围表现。
- 玩家/敌人使用“轮廓 + 亮度对比”双保障，确保复杂背景下可辨识。
- 特效可见但不得遮挡主实体核心轮廓。
- 保留弱提示型边界线（rim），用于空间感与走位参考。

### 提示信息呈现
- 开战前提示采用最小必需信息，不在首屏堆叠过多指令。
- 提示仅在开始页展示，进入战斗后不常驻。
- 文案采用短词命令式（高扫描效率）。
- 每次开局都展示提示，保证一致可达。

### Claude's Discretion
- 1s 过渡演出的具体动画形式与节奏细节。
- 背景弱化与实体对比的具体阈值参数。
- 像素网格对齐的最终实现方式（逻辑层或渲染层）。

</decisions>

<specifics>
## Specific Ideas

- 像素风必须“清晰不糊”，即使在不同设备密度下也要保持稳定边缘。
- 开场允许短演出（约 1 秒），但不能破坏“快速开打”的主感受。
- 控制提示应简洁高扫描，不应成为视觉噪音。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main.js#createRng` + `state.randomSeed`: 已有确定性随机入口，可直接复用于基线回放。
- `src/main.js#makeCanvasTexture` / `pixelTextureFromPattern`: 已统一 `NearestFilter` 与无 mipmaps 的贴图生成路径。
- `src/main.js#resizeRenderer`: 已有视口缩放与 `setPixelRatio` 控制点。
- `index.html` 中 `start-screen` / `start-btn` 与 `src/style.css` overlay 样式：可直接承载开场流程和提示信息策略。

### Established Patterns
- 单文件集中状态机：`state.mode`（`start`/`playing`/`paused`/`gameover`）驱动界面与逻辑。
- 输入模型已采用 `keyboardDown`（持续）+ `pressedThisStep`（边沿）双通道。
- 视觉层通过 `world` 分组（enemy/slash/particle）统一管理对象生命周期。

### Integration Points
- `startRun()`：开场流程、过渡与输入初始化的主落点。
- `resizeRenderer()`：像素清晰策略（分辨率/像素比）的主落点。
- `syncVisuals()`：像素网格对齐与前后景显示优先级的主落点。
- `updateGameStep()`：开始页提示展示与模式切换的主落点。

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-runtime-skeleton-pixel-baseline*
*Context gathered: 2026-03-04*

# Phase 12: Local Run History Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付 `META-01`、`META-02`：为 standard run 建立本地持久化 history 与 best-score surface。
范围包含：completed run summary 的稳定化、本地持久化、best/recent 双结构、开始页与结算页的 history 摘要和展开视图。

本阶段明确不交付：daily challenge、challenge identity、daily result bucket、cloud leaderboard、persistent progression、inventory/stash 或新的独立 meta 页面。

</domain>

<decisions>
## Implementation Decisions

### Best-score 规则
- `best-score` 默认按 `Score first` 排序。
- 同分 tie-break 固定为：`Time > Kills > Level`。
- best 排名规则必须稳定、可解释，不引入组合评分或隐藏权重。
- Phase 12 的 run summary 至少稳定包含：`score`、`time`、`kills`、`level`、`seed`、`playedAt`。

### History 结构与保留策略
- history 固定为 `Best + Recent` 双结构，不做单榜单，也不做纯 run journal。
- retention 固定为：`Top 10 + Recent 20`。
- Phase 12 只覆盖 `standard run`；daily run 的分桶与 challenge identity 明确留给 Phase 13。
- history 的排序与 best digest 必须在相同本地数据下保持 deterministic。

### 展示入口与默认可见性
- history 默认同时出现在 `start-screen` 和 `gameover-screen`。
- 不新增第三个独立 meta screen。
- history 默认采用 `collapsed panel`，先显示摘要和展开入口，不做常驻大列表。
- 展开后的结构固定为 `Best first, Recent below`，不用 tab，也不把 recent 放在 best 前面。

### 记录密度与阅读顺序
- 每条记录采用 `Compact 2-line` 密度。
- 第一行以 `score/time` 为主。
- 第二行包含 `kills/level/seed/playedAt`。
- 默认先强调 best-score 结果，再补充 run metadata，不做大卡片式重展示。

### Claude's Discretion
- `playedAt` 的精确格式与时区呈现方式。
- `seed` 的展示形式（完整值、简写或带标签）。
- collapsed panel 的视觉样式、展开按钮文案、摘要行措辞。
- `Best` / `Recent` 标题、分隔样式与空状态文案，只要不违背已锁定的信息结构。

</decisions>

<specifics>
## Specific Ideas

- history 应该像轻量 meta shell，而不是新的后台页面。
- 玩家在开始前可以快速回看成绩，打完一局后也能立即对照当前结果。
- 列表信息必须“足够解释这局表现”，但不能把 start/gameover 版面压成信息墙。
- 当前阶段优先保证 summary schema 和排序规则稳定，再谈更复杂的 meta 能力。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.html#start-screen` 与 `#gameover-screen`：现有唯一天然壳层，适合承载 history 摘要与展开面板。
- `src/main.js#enterGameOver()`：当前稳定生成 run 结束摘要，是 normalized run summary 的最佳写入边界。
- `src/main.js#startRun()` / `requestRestart()`：已有明确的 run 生命周期入口，可区分新局与重开，不必另造生命周期。
- `src/main.js#renderGameToText()` + `src/determinism-harness.js`：现有真相源，后续可增量扩展 `metaState`，不需要新调试接口。

### Established Patterns
- 当前项目的状态与验证主线都围绕 `state` + `render_game_to_text()`，meta layer 也应沿用这一模式。
- 已有 `score`、`kills`、`time`、`randomSeed` 和 progression/equipment snapshot 字段，可直接复用为 run summary 的数据来源。
- 现有 UI 壳层保持轻量 overlay 风格；Phase 12 不应为了 history 打破 start/gameover 的主流程。
- 项目已明确锁定 local-only meta，不引入 backend、账号或持久成长系统。

### Integration Points
- completed run summary 生成与持久化：`src/main.js#enterGameOver()` 附近的结算边界。
- start/gameover 的 history 摘要与展开入口：`index.html` 对应 overlay 结构 + `src/main.js` 文本同步路径。
- deterministic 可观测性扩展：`src/determinism-harness.js`，后续 planner 应在这里补 `metaState` 而不是旁路读取存储。

</code_context>

<deferred>
## Deferred Ideas

- daily challenge 入口、challenge key、daily result bucket —— Phase 13
- cloud leaderboard / account sync —— future milestone
- persistent progression / inventory / stash —— future milestone
- richer history filtering, tabbed views, or dedicated meta screen —— later if v1.2 proves the shell valuable

</deferred>

---
*Phase: 12-local-run-history-foundation*
*Context gathered: 2026-03-07*

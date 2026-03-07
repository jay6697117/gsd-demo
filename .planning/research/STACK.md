# Stack Research

**Domain:** v1.2 Meta Challenge Layer（local run history + daily seeded challenge）
**Researched:** 2026-03-07
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| JavaScript (ESM, Vanilla) | Existing (project baseline) | 继续承载 meta shell、history store 和 challenge orchestration | 当前项目已经围绕显式状态切片与 deterministic contracts 运转，v1.2 不需要为了少量 meta logic 引入框架迁移风险 |
| Three.js | 0.183.2 (existing) | 维持现有 start/combat/game-over 视觉壳层 | meta layer 只是扩展已有壳层入口和结果展示，不需要重建渲染体系 |
| Vite | 7.3.1 (existing) | 保持构建、开发和浏览器测试入口 | 现有命令链已稳定，继续使用可避免工具链噪声污染本次 milestone |
| Browser `localStorage` | Web standard | 保存本地 run history、best-score summary、daily result buckets | v1.2 数据量小、访问路径简单、无需异步事务或服务端依赖，最适合本地 meta shell |
| Playwright + Node `node:test` | Existing | 覆盖 local persistence、daily mode entry 和 text-state contract | v1.1 已证明这套验证链可靠，v1.2 只需扩展 meta 场景而不是再造新工装 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new runtime dependency | N/A | 保持实现面最小 | history normalization、seed derivation、bucket sorting 都可以用现有 JS 能力完成 |
| Existing deterministic seed helpers | Existing | 复用 run seed / salted seed 的既有思路 | daily challenge 需要 date key -> run seed 的可解释映射时使用 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Existing deterministic harness | 暴露 `metaState`、challenge identity、history summary | 继续通过 `render_game_to_text()` 验证，而不是靠人工看界面 |
| Existing Playwright helpers | 走 start screen、run complete、restart、reload 路径 | 非常适合 daily challenge 和 history persistence 这类 UI + state 混合场景 |

## Integration Points (v1.2)

- **Start screen shell**：现有开始界面已经能启动 run；v1.2 只需扩展 mode selection 与 challenge label，而不是改写整套壳层。
- **Game-over summary boundary**：run completion 已有稳定的 summary 生成点，是把本局结果标准化并写入 local history 的最佳入口。
- **Run seed lifecycle**：当前 runtime 已有 `randomSeed`、salted RNG 与 restart parity，daily challenge 应在 run start 前决定 seed，而不是在战斗过程中补写。
- **Determinism contract**：`src/determinism-harness.js` 需要补 `metaState`，至少能暴露 active run mode、challenge key、history digest 和 local best summary。
- **Regression surface**：优先继续用 named scripts 与 browser routes 覆盖 “complete run -> persist -> reload -> read back” 和 “same day -> same challenge key/seed” 两条主线。

## Installation

```bash
# Core
# no new packages required for v1.2 meta layer

# Supporting
# no additional runtime libraries required

# Dev dependencies
# no additional dev dependencies required
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `localStorage` + bounded JSON summaries | IndexedDB | 只有当要保存大量 run replay blobs、复杂查询或跨-tab 事务语义时才值得上 IndexedDB |
| Date-keyed deterministic seed derivation | Hard-coded rotating challenge list | 只有在需要人工策划每日规则或服务端运营时才需要更重的内容管线 |
| 复用现有 deterministic harness | 独立 meta debug panel | 只有当 meta 数据完全脱离 runtime 时才需要额外调试面；当前不成立 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| IndexedDB as the first persistence layer | API 异步、测试复杂度更高，超出 v1.2 数据规模需要 | `localStorage` with versioned, bounded summaries |
| `Math.random()` for daily challenge identity | 会破坏同日 challenge 的稳定复现 | date key + deterministic seed derivation |
| One shared storage bucket for all modes | standard 和 daily best-score 语义会互相污染 | separate buckets plus shared normalized summary shape |
| Screenshot-only verification | meta layer 很容易“界面看起来对、状态实际错” | `render_game_to_text()` + Playwright assertions |

## Stack Patterns by Variant

**If v1.2 保持 local-only meta shell（推荐）:**
- Use `localStorage + normalized run summary + bounded history lists`
- Because 这能在不引入后端与异步存储复杂度的前提下完成 best-score 与 daily challenge 闭环。

**If future milestone moves to cross-device sync:**
- Keep the same normalized summary schema and replace only the storage adapter
- Because v1.2 先把数据模型和 deterministic contract 固定下来，后续才有空间切换存储后端。

## Sources

- Current codebase inspection (`src/main.js`, `src/determinism-harness.js`) — verified existing run seed, game-over summary, and snapshot surfaces
- Archived milestone requirements (`.planning/milestones/v1.1-REQUIREMENTS.md`) — carried forward `META-01` / `META-02`
- Archived milestone roadmap (`.planning/milestones/v1.1-ROADMAP.md`) — verified v1.1 boundaries that v1.2 should not reopen

---
*Stack research for: v1.2 Meta Challenge Layer*
*Researched: 2026-03-07*

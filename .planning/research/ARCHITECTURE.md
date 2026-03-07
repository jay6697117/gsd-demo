# Architecture Research

**Domain:** Three.js browser action game meta shell (`v1.2 Meta Challenge Layer`)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Experience Layer                            │
├──────────────────────────────────────────────────────────────────────┤
│  Start Screen  │  Daily Challenge Entry  │  History View  │ Game Over │
├──────────────────────────────────────────────────────────────────────┤
│                      Runtime Orchestration Layer                    │
├──────────────────────────────────────────────────────────────────────┤
│                 main.js startRun / completeRun / restart            │
├──────────────────────────────────────────────────────────────────────┤
│                         Meta Domain Layer                           │
├──────────────────────────────────────────────────────────────────────┤
│  Meta History Store  │  Daily Challenge Resolver  │  Summary Normalizer │
├──────────────────────────────────────────────────────────────────────┤
│                   Determinism & Verification Layer                  │
├──────────────────────────────────────────────────────────────────────┤
│      render_game_to_text      │      Playwright + node:test         │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/main.js` (modified) | 继续作为组合根，在 start/game-over 边界连接 run mode、summary persistence 和 UI surfaces | fixed lifecycle hooks + explicit mode metadata |
| `src/meta-history.js` (new) | 归一化 completed run summary、读写 local storage、维护 bounded history and best buckets | pure helpers + storage adapter |
| `src/daily-challenge.js` (new) | 解析 UTC day key、派生 challenge key 与 run seed、生成 challenge label | pure deterministic functions |
| `src/determinism-harness.js` (modified) | 扩展 `metaState`，输出 active mode、challenge key、history digest | normalized snapshot serialization |
| `tests/meta-history.test.js` / Playwright route (new) | 验证 persistence、bucket isolation、reload parity | node:test + browser flow assertions |

## Recommended Project Structure

```text
src/
├── main.js                 # runtime composition root
├── determinism-harness.js  # snapshot contract
├── meta-history.js         # local meta persistence + summary normalization
├── daily-challenge.js      # day-key and challenge-seed derivation
└── ...existing gameplay systems

tests/
├── meta-history.test.js
├── daily-challenge.test.js
└── playwright-daily-challenge.test.js
```

### Structure Rationale

- **Flat `src/*.js` additions:** 当前仓库仍以平铺模块为主，v1.2 不值得为了两个新模块强推目录重构。
- **Pure helper modules for meta logic:** daily seed 和 history normalization 都应该脱离 DOM 与 renderer，方便 deterministic tests。
- **`main.js` only as integration boundary:** start/run/end/restart flow 仍在主循环收口，避免多处旁路写入 history 或 mode。

## Architectural Patterns

### Pattern 1: Normalized Run Summary at Completion Boundary

**What:** 只在 run 完成边界把 runtime state 压缩成稳定 summary，再交给 storage。
**When to use:** 保存 best score、history entries、daily result buckets。
**Trade-offs:** summary 模型需要前期想清楚，但能避免存 raw snapshot 带来的 schema 膨胀。

### Pattern 2: Deterministic Day-Key Resolver

**What:** 用 UTC date string 作为 challenge day key，再映射到稳定 challenge seed。
**When to use:** daily seeded challenge、best-of-day lookup、automation assertions。
**Trade-offs:** 放弃本地时区“自然日”体验，但换来更稳定的自动化与跨设备解释性。

### Pattern 3: Mode-Aware Meta Buckets

**What:** standard runs 和 daily runs 用同一 summary shape，但落在不同 buckets。
**When to use:** 任何需要比较 standard vs daily best 的 UI 或 snapshot。
**Trade-offs:** 存储结构略复杂，但可避免不同 mode 的 best-score 互相污染。

## Data Flow

### Run Completion Flow

```text
[Combat/Game Over]
    ↓
[main.js completion boundary]
    ↓
[normalizeRunSummary]
    ↓
[meta-history write]
    ↓
[history/best bucket update]
    ↓
[start screen + game over UI refresh]
```

### Daily Challenge Flow

```text
[current UTC day]
    ↓
[resolveChallengeKey]
    ↓
[deriveChallengeSeed]
    ↓
[startRun(mode=daily, seed)]
    ↓
[metaState + HUD/game-over label]
```

### Key Data Flows

1. **Standard history flow:** completed standard run -> normalized summary -> standard history list -> best-score digest.
2. **Daily challenge flow:** UTC day key -> challenge seed -> daily run -> daily result bucket -> best-of-day digest.
3. **Determinism flow:** runtime meta state -> snapshot digest -> Playwright/reload assertions.

---
*Architecture research for: v1.2 Meta Challenge Layer*
*Researched: 2026-03-07*

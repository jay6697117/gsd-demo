# Project Research Summary

**Project:** PokeThrees Hunter
**Domain:** Deterministic browser action game meta shell (`v1.2 Meta Challenge Layer`)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Executive Summary

v1.2 最合理的方向不是继续改 run 内战斗，而是在 v1.1 已交付的 deterministic world-and-growth loop 外侧补一层轻量 meta shell：本地 run history、best-score digest 和 daily seeded challenge。这样既能提高重复游玩的动机，又不会立刻把项目拖进 backend、auth、persistent progression 这类重系统。

研究结论很明确：这个 milestone 不需要技术栈迁移，也不需要新的重型依赖。最稳妥的做法是继续使用现有 `Vanilla JS + Three.js + Vite + Playwright + node:test`，并把新增复杂度限制在两个纯模块上：一个负责本地 history/persistence，一个负责 daily challenge key/seed contract。关键风险不在“能不能做出来”，而在“做完以后能不能稳定解释、稳定回放、稳定验证”。

因此路线必须围绕三个原则展开：只持久化 normalized run summaries；daily challenge identity 必须由稳定的 UTC day key 派生；meta state 必须进入 `render_game_to_text()`。只要这三条守住，v1.2 就能成为后续 persistent progression 或 cloud meta 的安全前置层。

## Key Findings

### Recommended Stack

v1.2 不需要新增框架或运行时依赖。现有项目已经有稳定的 run seed、start/game-over 边界和 deterministic snapshot，只要补齐本地存储与 challenge identity 纯函数，就足以支撑这次 milestone。

**Core technologies:**
- `JavaScript (ESM, Vanilla)`: 继续承载 meta state orchestration — 保持与现有 runtime 一致。
- `Browser localStorage`: 本地保存 bounded run summaries — 足以覆盖 v1.2 的数据规模。
- `Three.js + existing shell`: 承载 start/game-over surfaces — 不重写壳层，只做增量入口与摘要展示。
- `Playwright + node:test`: 覆盖 persistence、reload、daily challenge route — 保持现有验证主线。

### Expected Features

v1.2 的 table stakes 很集中：玩家需要看见历史成绩、进入每日挑战，并且理解这两种模式的边界。任何超出这个边界的能力，都很容易把 milestone 从“meta shell”拉成“长期 meta platform”。

**Must have (table stakes):**
- Local best-score history and bounded run summaries.
- Daily seeded challenge entry from the start screen.
- Stable day-key -> challenge-seed contract.
- Separate standard vs daily result buckets.
- Meta state visible in deterministic text snapshot.

**Should have (competitive):**
- Best-of-day summary beside the active daily challenge.
- Compact run journal fields such as seed, level, kills, and survival time.

**Defer (v1.3+):**
- Persistent cross-run progression.
- Long-term equipment stash/inventory.
- Cloud-backed leaderboards or server-authored daily ops.

### Architecture Approach

架构上最稳妥的方案是保留 `src/main.js` 作为 run lifecycle 的组合根，把 v1.2 的新增复杂度收敛到两个纯模块：`meta-history` 和 `daily-challenge`。这样 run completion、start screen entry、restart parity 和 snapshot export 仍沿用当前主链，只是在明确边界上挂载 meta state，而不会重新打开战斗主循环。

**Major components:**
1. `meta-history` — normalize completed runs, persist bounded local history, derive best digests.
2. `daily-challenge` — resolve UTC day key, derive challenge key and run seed, label active challenge.
3. `main.js` integration — connect start/game-over boundaries, mode-aware run start, and UI refresh.
4. `determinism-harness` extension — expose `metaState` so reload/history assertions do not depend on screenshot reading.

### Critical Pitfalls

1. **Persisting raw runtime state** — only persist normalized summaries at the completion boundary.
2. **Unstable day-key or restart-based seeds** — derive challenge identity from a fixed UTC day contract.
3. **Mixing standard and daily score buckets** — keep mode-aware storage buckets and best digests.
4. **Meta state missing from snapshot** — extend `render_game_to_text()` so browser tests can verify persistence and challenge identity directly.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 12: Local Run History Foundation
**Rationale:** history persistence is the smallest, most isolated meta slice and establishes the summary schema that all later meta features depend on.
**Delivers:** normalized run summary model, bounded local history, best-score digest, and read-back surface.
**Addresses:** local best-score history and core meta persistence behavior.
**Avoids:** raw state persistence and unbounded localStorage growth.

### Phase 13: Daily Challenge Seed Contract
**Rationale:** once summary/persistence shape exists, daily challenge can reuse it while introducing a deterministic day-key and mode-aware run start.
**Delivers:** UTC day key contract, challenge label, mode selection, and stable daily seed derivation.
**Uses:** existing run seed lifecycle and restart boundaries.
**Implements:** `daily-challenge` resolver plus start-screen integration.

### Phase 14: Meta Surfaces & Regression
**Rationale:** after history and daily mode are both real, the final phase should separate daily results, expose `metaState`, and freeze the regression path.
**Delivers:** separate daily best/result surfaces, snapshot coverage, browser reload assertions, and named regression entrypoints if needed.
**Addresses:** mode bucket isolation and automation confidence.

### Phase Ordering Rationale

- 先定 summary schema，再上 daily mode，避免 daily result 反向绑定一个尚未稳定的 history shape。
- 把 snapshot/regression 收口放在最后，可以用真实实现反推最小、稳定的 `metaState` contract。
- 整个顺序都尽量不触碰 v1.1 的战斗、掉落、升级主链，只在 run lifecycle 边界接入新逻辑。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 13:** 需要明确 UTC day key 与 UI 文案如何解释，避免“今天”概念和本地时区认知冲突。
- **Phase 14:** 需要明确 history digest 进入 snapshot 的最小字段集，避免过度暴露 localStorage 内部结构。

Phases with standard patterns (skip research-phase):
- **Phase 12:** 本地 bounded history + normalized summary 是成熟、低风险模式。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 不需要新基础设施，现有运行时与测试链已足够 |
| Features | HIGH | `META-01` / `META-02` 已在 v1.1 归档里被提前锁定 |
| Architecture | HIGH | 新增点明确落在 start/game-over 和 snapshot 边界 |
| Pitfalls | HIGH | 风险集中在 summary schema、day key contract 和 bucket isolation |

**Overall confidence:** HIGH

### Gaps to Address

- 需要在 phase planning 时明确 history retention policy（例如 top N + recent N），避免实现时临场拍脑袋。
- 需要在 phase planning 时明确 daily challenge 的显示字段和 snapshot 最小字段集。

---
*Research summary for: v1.2 Meta Challenge Layer*
*Researched: 2026-03-07*

---
phase: 08-breakables-loot-and-equipment
plan: 01
subsystem: combat
tags: [breakables, loot-foundation, determinism, snapshot]
requires:
  - phase: 07-building-tactical-layer
    provides: deterministic world traversal, building tactics, and snapshot bridge patterns
provides:
  - deterministic authored breakable archetypes and sector presets
  - pure breakable attack-resolution helpers
  - runtime world.breakables state wired into combat and snapshot output
affects: [08-02, 08-03, 08-04, 08-verification]
tech-stack:
  added: []
  patterns:
    - authored non-blocking props stay outside building collision semantics
    - breakable lifecycle state is computed through pure helpers and serialized through determinism-harness
key-files:
  created:
    - src/breakable-catalog.js
    - src/breakable-system.js
    - tests/breakable-system.test.js
  modified:
    - src/main.js
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Kept breakables non-blocking and authored per sector so Phase 08 does not leak back into Phase 07 building semantics."
  - "Routed breakable damage through resolveBreakableAttackStep() so combat logic and snapshot evidence consume one canonical lifecycle source."
patterns-established:
  - "world.breakables is now the single mutable runtime slice for prop hp/broken state."
  - "Breakable visuals are derived from authored data and synced from runtime state rather than storing render objects in snapshot data."
requirements-completed: [LOOT-01]
duration: 4 min
completed: 2026-03-06
---

# Phase 08 Plan 01: 可破坏物基础与攻击链总结

**Deterministic non-blocking breakables now exist as authored world props, resolve through the attack chain, and surface stable `world.breakables` snapshot evidence for later loot work.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T15:56:00+08:00
- **Completed:** 2026-03-06T15:59:59+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 新增 `crate` / `cache` 两类 authored 非阻挡 breakable archetype，并按 sector 固定预设和顺序实例化。
- 新增纯函数 `resolveBreakableAttackStep()`，让同一斩击可在同一步内处理 enemy 与 breakable，且 breakable 只会从 `hp > 0` 进入一次 `broken`。
- 把 `state.world.breakables` 接入运行时和 `buildDeterministicSnapshot()`，使 `render_game_to_text()` 可以稳定输出 breakable 生命周期摘要。

## Task Commits

1. **Task 1: Define deterministic non-blocking breakable catalog and authored presets** - `faf1cab` (feat)
2. **Task 2: Integrate breakable hit resolution into the existing attack chain and snapshot summary** - `0da345c` (feat)

## Files Created/Modified

- `src/breakable-catalog.js` - 定义 `crate` / `cache` archetype、视觉 token 和 sector-authored preset。
- `src/breakable-system.js` - 提供 breakable 实例化、sector query、稳定排序、攻击命中解析和 snapshot summary。
- `src/main.js` - 新增 `state.world.breakables`、breakable visuals、attack-chain 接入和 break feedback hooks。
- `src/determinism-harness.js` - 新增 `world.breakables` 规范化快照输出。
- `tests/breakable-system.test.js` - 覆盖 catalog、preset order、pure attack resolution、snapshot summary。
- `tests/determinism-contract.test.js` - 覆盖 `world.breakables` 在 deterministic snapshot 中的结构和稳定字段。

## Decisions Made

- breakable 继续采用 sector-authored 固定布局，而不是 procedural prop generation。这样后续 Playwright 路线和掉落重放都能依赖稳定坐标。
- 视觉层在 Wave 1 就补了最小 breakable visuals。这样 Wave 2/4 的实时浏览器验证不需要再为“物件可见性”返工基础渲染。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 无功能性阻塞。构建阶段仍然只有 Vite 的 chunk-size warning，但它不影响 Wave 1 的功能正确性或测试通过。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/breakable-system.test.js`
- [x] `node --test tests/breakable-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `08-02` 现在可以直接把 breakable destroy event 接到独立的 `dropRngState` 和 `groundDrops`。
- `world.breakables` 已经进入 snapshot，后续 `lootState` 和 `equipmentState` 只需要沿用同一个 determinism bridge 扩展。

---
*Phase: 08-breakables-loot-and-equipment*
*Completed: 2026-03-06*

---
phase: 09-xp-level-progression-core
plan: 03
subsystem: observability
tags: [hud, snapshot, banner, determinism]
requires:
  - phase: 09-xp-level-progression-core
    provides: runtime progression state and kill-driven pending level-up queue
provides:
  - hud-visible level and xp progress
  - non-blocking level-up cue through the existing feedback banner channel
  - deterministic snapshot coverage for progressionState
affects: [09-04, 09-verification]
tech-stack:
  added: []
  patterns:
    - gameplay cues reuse the existing feedback/banner system instead of adding a new mode
    - deterministic snapshot owns progression observability for tests and browser routes
key-files:
  created: []
  modified:
    - src/main.js
    - src/determinism-harness.js
    - src/progression-system.js
    - tests/progression-system.test.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Used the existing center-banner channel for LEVEL UP so progression feedback stays non-blocking and mode-free."
  - "Bumped the determinism schema to 1.2.0 because progressionState expands the external text-state contract."
patterns-established:
  - "progressionState is now the canonical snapshot surface for level, xp, thresholds, pending queue, and event sequence."
  - "HUD reads progression from runtime state while snapshot uses the same summarized contract, preventing divergent observability layers."
requirements-completed: [PROG-04]
duration: 4 min
completed: 2026-03-06
---

# Phase 09 Plan 03: HUD 与可观测性总结

**Level progression is now observable in both the live HUD and deterministic text-state, with a non-blocking `LEVEL UP` cue that does not introduce any new gameplay mode.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T23:34:00+08:00
- **Completed:** 2026-03-06T23:38:00+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 扩展 HUD 持续显示 `Lvl`、当前 XP、下一阈值和 pending queue 数量。
- 复用现有 `setCenterBanner()` 通道，在升级发生时显示非阻塞 `LEVEL UP · LV n` cue，并保持 `state.mode` 不变。
- 把 `progressionState` 接入 `buildDeterministicSnapshot()`，同时把 schema version 升到 `1.2.0`，让文本快照可以稳定解释成长状态。

## Task Commits

1. **Task 1-2: Surface progression state through HUD, feedback banner, and deterministic snapshot** - `478036f` (feat)

## Files Created/Modified

- `src/main.js` - 新增 progression HUD 行和 `LEVEL UP` banner 触发逻辑。
- `src/determinism-harness.js` - 新增 `progressionState` 快照输出并升级 schema version。
- `src/progression-system.js` - 新增 `summarizeProgressionStateForSnapshot()`，统一 snapshot summary contract。
- `tests/progression-system.test.js` - 覆盖 progression snapshot summary 的稳定字段。
- `tests/determinism-contract.test.js` - 覆盖 `progressionState` 字段和 schema `1.2.0` 合约。

## Decisions Made

- `LEVEL UP` cue 只在 kill pipeline 产出新 event 时触发一次，不从 pending queue 长期驻留状态反复重放。这样既保留 Phase 10 所需队列，又不会让 HUD 每帧重复刷提示。
- HUD 文案显示为 `XP total/nextThreshold`，而不是把百分比或条形图逻辑提前塞进 Phase 09。这样既满足可读性，也避免在当前阶段引入更多视觉状态同步点。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 无功能性阻塞。determinism contract 因 schema version 变更需要同步更新到 `1.2.0`，这属于预期内的 snapshot surface 演进。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/progression-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `09-04` 现在可以基于 `progressionState` 直接写 Playwright 路线和 restart parity 断言，不需要再依赖 HUD 字符串做主判断。
- Phase 10 后续如果要消费 `pendingLevelUps`，已经有稳定的 queue 与 event ids 可用。

---
*Phase: 09-xp-level-progression-core*
*Completed: 2026-03-06*

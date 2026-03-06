---
phase: 09-xp-level-progression-core
plan: 04
subsystem: verification
tags: [restart, playwright, regression, progression]
requires:
  - phase: 09-xp-level-progression-core
    provides: runtime progression state, hud exposure, and snapshot contract
provides:
  - deterministic restart parity evidence for progression state
  - browser route proving kill -> xp -> first level-up cue
  - cumulative regression evidence across phases 06-08
affects: [09-verification]
tech-stack:
  added: []
  patterns:
    - browser assertions read render_game_to_text instead of trusting hud text alone
    - restart parity is validated from the same startRun path used by gameplay
key-files:
  created:
    - tests/playwright-progression-levels.test.js
  modified:
    - tests/progression-system.test.js
key-decisions:
  - "Used a short scripted opening combat route instead of generic pathfinding because the deterministic seed already exposes a stable level-up path in the first few swings."
  - "Kept restart parity evidence centered on progressionState reset rather than adding new debug hooks or privileged runtime entry points."
patterns-established:
  - "Phase 09 browser evidence now proves level-up progression and restart reset from one deterministic route."
  - "Progression reset remains implicit in the canonical startRun path and is asserted through text-state, not bespoke reset APIs."
requirements-completed: [PROG-05]
duration: 4 min
completed: 2026-03-06
---

# Phase 09 Plan 04: Restart Parity 与浏览器验证总结

**Phase 09 now has browser evidence for `kill -> xp -> first level-up cue` and deterministic restart parity, plus a full regression gate that keeps Phases 06-08 green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T23:40:00+08:00
- **Completed:** 2026-03-06T23:44:12+08:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 新增 `tests/playwright-progression-levels.test.js`，用真实浏览器路线证明开局击杀 -> 获得 XP -> 到达首个 level-up cue。
- 扩展 `tests/progression-system.test.js`，把 progression baseline reset 也锁成纯规则契约。
- 跑通 full regression，确认 Phase 09 没有回退 Phase 06/07/08 的 traversal、building、loot、equipment 与 determinism 合同。

## Task Commits

1. **Task 1-2: Add restart parity assertions, browser progression route, and cumulative regression evidence** - `e8a2e14` (test)

## Files Created/Modified

- `tests/playwright-progression-levels.test.js` - 覆盖 deterministic opening combat、首次升级 cue、gameover -> restart -> progression reset 路线。
- `tests/progression-system.test.js` - 覆盖 fresh progression baseline reset 和 snapshot baseline summary。

## Decisions Made

- 浏览器路线采用固定的三次开局攻击脚本，而不是泛化寻路器。因为当前 deterministic seed 下，这条路线最短且最稳，能直接命中 Phase 09 的 must-have 证据。
- restart parity 通过真实 `gameover -> restart-btn -> startRun()` 链路验证，而不是暴露新的 debug/reset API。这样证据更贴近真实用户流。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Headless 环境仍然走 WebGL fallback，因此截图只保留为调试工件；功能正确性以 `render_game_to_text()` 和自动化命令为准。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/progression-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`
- [x] `node tests/playwright-progression-levels.test.js`
- [x] `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js`

## Next Phase Readiness

- Phase 10 现在可以直接消费 `pendingLevelUps` 队列来生成 deterministic choice panel，而不需要补 Phase 09 的 progression reset 或 browser evidence。
- `progressionState` 已经有浏览器与 snapshot 双重证据，后续 talent/choice 只需要在其上扩展，不必重做 XP core。

---
*Phase: 09-xp-level-progression-core*
*Completed: 2026-03-06*

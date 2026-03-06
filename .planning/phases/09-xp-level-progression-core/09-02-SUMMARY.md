---
phase: 09-xp-level-progression-core
plan: 02
subsystem: runtime-progression
tags: [kills, xp, queue, runtime]
requires:
  - phase: 09-xp-level-progression-core
    provides: deterministic xp values, thresholds, and pure progression reducers
provides:
  - explicit runtime progression state on the main game state tree
  - canonical enemy-death to xp intake path
  - stable pending level-up queue updates without introducing a new gameplay mode
affects: [09-03, 09-04, 09-verification]
tech-stack:
  added: []
  patterns:
    - kills are the only runtime ingress for progression changes
    - runtime consumes the same pure reducer that tests already lock
key-files:
  created: []
  modified:
    - src/main.js
    - src/progression-system.js
    - tests/progression-system.test.js
key-decisions:
  - "Kept score and progression fully separate: score still comes from enemy points, while XP is resolved from enemy kind through the progression reducer."
  - "Did not introduce any new gameplay mode in Wave 2; runtime only mutates progression queue and level numbers."
patterns-established:
  - "state.progression is now a first-class runtime slice reset by startRun and updated only inside the canonical enemy-death loop."
  - "applyEnemyKillXp() is the single bridge between runtime kills and the pure progression reducer."
requirements-completed: [PROG-01, PROG-03]
duration: 3 min
completed: 2026-03-06
---

# Phase 09 Plan 02: 击杀驱动 XP 接线总结

**Enemy kills now feed deterministic XP progression through one canonical runtime path, while score remains independent and combat flow stays modal-free.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T23:30:00+08:00
- **Completed:** 2026-03-06T23:33:00+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 在主状态树上新增 `state.progression`，包含 `level`、`totalXp`、`pendingLevelUps`、`eventSeq`，并接入 `startRun()` 重置。
- 把 XP 唯一入口锁定到敌人死亡结算链路，确保 progression 只在 kill 发生时更新，不复用 `score`。
- 新增 `applyEnemyKillXp()` helper，让 runtime 继续复用 Wave 1 的纯 reducer，同时稳定生成 level-up queue。

## Task Commits

1. **Task 1-2: Wire progression state into enemy death resolution and emit pending level-up queue events** - `5b2f612` (feat)

## Files Created/Modified

- `src/main.js` - 新增 `state.progression` 初始化与 reset，并把 XP gain 接入敌人死亡结算循环。
- `src/progression-system.js` - 新增 `applyEnemyKillXp()`，把 enemy kind 到 XP gain 的桥接保持在纯 reducer 层。
- `tests/progression-system.test.js` - 新增 kill-driven XP 测试，锁定 enemy kind 到 progression queue 的契约。

## Decisions Made

- XP 解析继续依赖 `enemy.kind`，而不是复用 `enemy.points`。这样分数调优和成长调优可以完全独立演进。
- 多个敌人在同一斩击中死亡时，仍按既有敌人 `id` 稳定顺序处理；因此 XP gain 和 level-up queue 顺序也保持稳定。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 无功能性阻塞。Wave 2 仍只依赖纯测试和构建 gate；构建输出依旧只有既有的 Vite chunk-size warning。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/progression-system.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `09-03` 现在可以安全把 `state.progression` 暴露到 HUD 和 deterministic snapshot，而不需要再回头定义 XP 来源。
- `pendingLevelUps` 已经在 runtime 中稳定排队，下一波只需要增加可观测性，不需要改 kill pipeline 语义。

---
*Phase: 09-xp-level-progression-core*
*Completed: 2026-03-06*

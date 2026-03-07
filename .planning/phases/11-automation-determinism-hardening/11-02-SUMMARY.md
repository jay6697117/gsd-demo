---
phase: 11-automation-determinism-hardening
plan: 02
subsystem: dual-session deterministic replay proof
tags: [determinism, replay, playwright, automation]
requires:
  - phase: 11-automation-determinism-hardening
    provides: schema `1.4.0` snapshot contract and shared Playwright lifecycle helper
provides:
  - dual-session replay parity evidence across traversal, loot/equipment, and level-up choice
  - scripted browser timeline primitives for predicate-driven movement and state waits
  - phase-11 replay artifacts under `.planning/artifacts/phase-11/`
affects: [11-verification]
tech-stack:
  added: []
  patterns:
    - replay proof compares normalized final snapshots from two fresh browser sessions
    - normalization strips only non-gameplay timestamp noise, not gameplay-relevant state
key-files:
  created:
    - .planning/phases/11-automation-determinism-hardening/11-02-SUMMARY.md
    - tests/playwright-determinism-replay.test.js
  modified:
    - tests/helpers/playwright-game.js
key-decisions:
  - "The replay route is assembled from already-proven subpaths: early level-up, hub weapon auto-equip, then three-sector traversal."
  - "Replay normalization keeps gameplay state intact and only zeros noisy timestamp fields like focus/pause/fullscreen lastAt."
patterns-established:
  - "Shared helper now supports predicate-driven advance and key-hold loops, so browser routes can express deterministic timelines without duplicating boilerplate."
  - "Replay parity is proven across two fresh browser sessions rather than same-session re-reads, closing the AUTO-05 gap."
requirements-completed: [AUTO-05]
duration: 9 min
completed: 2026-03-07
---

# Phase 11 Plan 02: 双会话 deterministic replay 总结

**Phase 11 在这一波把 `AUTO-05` 变成了真实可回归证据：同一 seed、同一输入时间线，在两个全新浏览器会话里得到完全一致的最终 normalized snapshot。**

## Performance

- **Duration:** 9 min
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 扩展 `tests/helpers/playwright-game.js`，新增 `startGame()`、`advanceUntil()`、`holdKeyUntil()`，并让 `runScriptedTimeline()` 支持带 predicate 的 `holdKey` step。
- 新增 `tests/playwright-determinism-replay.test.js`，把一条跨 `level-up -> reroll -> choose -> breakable -> auto-equip -> sector traversal` 的路线在两个全新浏览器会话中执行两次。
- replay 脚本会分别写出 run A / run B 的 screenshot、snapshot、console artifacts，供 `11-VERIFICATION.md` 后续引用。
- normalized 比较只去掉 `pauseState.lastAt`、`fullscreenState.lastAt`、`focusState.lastAt` 这类时间噪音，没有剔除任何 gameplay-relevant 字段。

## Files Created/Modified

- `tests/helpers/playwright-game.js` - 新增 predicate-driven timeline primitives，并扩展 scripted timeline step 形态。
- `tests/playwright-determinism-replay.test.js` - 双会话 deterministic replay 回归脚本。

## Decisions Made

- replay 路线不重新发明复杂路径，而是直接串接仓库里已经被验证过的早期升级、hub 武器自动装备、三分区 traversal 子路径。
- 双会话 replay 证明使用同一 dev server、两个全新 browser session；证据重点放在 state parity，而不是重复启动不同 server 进程。

## Verification

- [x] `node --input-type=module -e "import('./tests/helpers/playwright-game.js')"`
- [x] `node tests/playwright-determinism-replay.test.js`
- [x] `npm run build`

## Artifacts

- `.planning/artifacts/phase-11/determinism-replay-run-a.json`
- `.planning/artifacts/phase-11/determinism-replay-run-a-console.json`
- `.planning/artifacts/phase-11/determinism-replay-run-a.png`
- `.planning/artifacts/phase-11/determinism-replay-run-b.json`
- `.planning/artifacts/phase-11/determinism-replay-run-b-console.json`
- `.planning/artifacts/phase-11/determinism-replay-run-b.png`

## Next Wave Readiness

- Wave 3 现在可以把 `playwright-breakables-loot`、`playwright-levelup-choice`、`playwright-progression-levels` 迁到 shared helper，同时把断言升级到字段级。
- Wave 4 可以直接复用同一 helper 新增 restart parity route，并把 package 回归入口收敛成稳定命令。

---
*Phase: 11-automation-determinism-hardening*
*Completed: 2026-03-07*

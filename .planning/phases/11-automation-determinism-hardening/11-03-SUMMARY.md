---
phase: 11-automation-determinism-hardening
plan: 03
subsystem: hardened browser routes for loot and level-up
tags: [automation, playwright, loot, progression, levelup]
requires:
  - phase: 11-automation-determinism-hardening
    provides: shared Playwright helper and replay-proven deterministic route primitives
provides:
  - helper-backed loot/equipment browser evidence for `AUTO-06`
  - helper-backed progression/level-up browser evidence for `AUTO-07`
  - field-level assertions across drop, compare, reroll, queue, and applied-upgrade state
affects: [11-verification]
tech-stack:
  added: []
  patterns:
    - phase-specific browser tests keep their route ownership while importing shared lifecycle utilities
    - assertions target stable snapshot fields instead of relying on HUD text or screenshots alone
key-files:
  created:
    - .planning/phases/11-automation-determinism-hardening/11-03-SUMMARY.md
  modified:
    - tests/playwright-breakables-loot.test.js
    - tests/playwright-levelup-choice.test.js
    - tests/playwright-progression-levels.test.js
    - tests/playwright-determinism-replay.test.js
key-decisions:
  - "Shared helper migration preserves each browser script as an independent route; Phase 11 does not collapse them into a mega-test."
  - "Loot assertions were tightened to the real runtime contract: first-destroy proof uses eventSeq + dropRngState because the initial drop can be auto-consumed in the same route."
patterns-established:
  - "Loot, compare, progression queue, reroll budget, and applied upgrade effects are all asserted from snapshot fields, not inferred from HUD wording."
  - "Every helper-backed browser script now waits for the dev server explicitly before opening the page."
requirements-completed: [AUTO-06, AUTO-07]
duration: 12 min
completed: 2026-03-07
---

# Phase 11 Plan 03: 路线加固总结

**Phase 11 在这一波把现有三条浏览器路线迁到了 shared helper，同时把断言提升到字段级，补齐了 `AUTO-06` 和 `AUTO-07` 的独立自动化证据。**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 重写 `tests/playwright-breakables-loot.test.js`，复用 shared helper 完成 server/browser lifecycle、artifact 写入和 runtime error gating。
- loot route 现在直接断言：`world.breakables`、`lootState.eventSeq`、`lootState.pendingPickupId`、`lootState.groundDrops`、`lootState.dropRngState`、`equipmentState.slots.weapon`、`equipmentState.compareCandidate`、`equipmentState.derivedStats`。
- 重写 `tests/playwright-levelup-choice.test.js`，直接断言 queue head、`currentOfferId`、`offerRngState`、`rerollsRemaining`、`offeredChoices`、`upgradeState.appliedChoices` 与 applied modifier 的一致性。
- 重写 `tests/playwright-progression-levels.test.js`，把 Phase 09 的路线也迁到 shared helper，并把 `pendingLevelUps -> activeEventId -> confirm -> restart reset` 这条链路改成字段级验证。
- 顺手补强 `tests/playwright-determinism-replay.test.js`，在 route 前显式 `waitForServer()`，消除对 Vite 冷启动速度的隐式依赖。

## Files Created/Modified

- `tests/playwright-breakables-loot.test.js` - helper 化并强化 `AUTO-06` 断言。
- `tests/playwright-levelup-choice.test.js` - helper 化并强化 `AUTO-07` 断言。
- `tests/playwright-progression-levels.test.js` - helper 化并强化 progression queue / restart 断言。
- `tests/playwright-determinism-replay.test.js` - 显式等待 dev server ready。

## Decisions Made

- `AUTO-06` 的首个 drop 不能再强行断言“地上一定还能看到物品”，因为初始路线里自动拾取可能在同一帧完成；更稳定的真相源是 `eventSeq`、`dropRngState` 和最终 equip state。
- progression route 仍然保留“升级 -> 确认 -> gameover -> restart”的职责，不和 `levelup-choice` route 合并。

## Verification

- [x] `node tests/playwright-breakables-loot.test.js`
- [x] `node tests/playwright-levelup-choice.test.js`
- [x] `node tests/playwright-progression-levels.test.js`
- [x] `npm run build`

## Next Wave Readiness

- Wave 4 现在可以在同一 helper 基座上新增 restart parity 专项路线，而不必复制任何 Playwright boilerplate。
- `package.json` 的统一 `test:e2e:v11` / `test:regression:v11` 入口可以直接复用当前已经 helper 化的 browser routes。

---
*Phase: 11-automation-determinism-hardening*
*Completed: 2026-03-07*

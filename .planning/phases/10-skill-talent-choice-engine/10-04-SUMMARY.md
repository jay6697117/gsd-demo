---
phase: 10-skill-talent-choice-engine
plan: 04
subsystem: level-up choice engine
tags: [reroll, browser-evidence, regression, deterministic-offers]
requires:
  - phase: 10-skill-talent-choice-engine
    provides: active modal session state, applied upgrade effects, snapshot-visible offer state
provides:
  - deterministic one-shot reroll per level-up event
  - browser route for `kill -> levelup_choice -> reroll -> choose -> resume`
  - Phase 06-09 cumulative regression evidence after Phase 10 integration
affects: [10-verification]
tech-stack:
  added: []
  patterns:
    - reroll mutates only `levelUpState.offerRngState` and never touches spawn/drop/progression randomness
    - legacy browser routes are upgraded to understand the new modal instead of disabling it
key-files:
  created:
    - .planning/phases/10-skill-talent-choice-engine/10-04-SUMMARY.md
    - tests/playwright-levelup-choice.test.js
  modified:
    - src/main.js
    - src/levelup-system.js
    - tests/levelup-system.test.js
    - tests/playwright-progression-levels.test.js
key-decisions:
  - "Each active level-up event gets exactly one reroll, tracked through `rerollsRemaining` and enforced by pure state transitions."
  - "Regression browser tests now consume the new level-up panel instead of pretending Phase 09 still has no modal."
patterns-established:
  - "rerollLevelUpChoice() is the only legal path that advances offer identity without consuming the pending level-up event."
  - "Browser evidence for Phase 10 uses `render_game_to_text()` as the primary oracle, with screenshots kept as secondary debugging artifacts."
requirements-completed: [TAL-06]
duration: 7 min
completed: 2026-03-07
---

# Phase 10 Plan 04: 单次重抽与浏览器回归总结

**Phase 10 now closes with a deterministic one-shot reroll, a real browser route for the choice panel, and a cumulative regression gate that keeps Phases 06-09 green under the new modal semantics.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-07T01:22:10+08:00
- **Completed:** 2026-03-07T01:28:31+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 在 `src/levelup-system.js` 中新增 `rerollLevelUpChoice()`，把“每事件恰好 1 次”重抽预算做成纯状态转移，而不是 runtime 特判。
- 在 `src/main.js` 里接入 `KeyR` 的一次性 reroll 分支，并把剩余重抽次数显示进 level-up subtitle。
- 新增 `tests/playwright-levelup-choice.test.js`，覆盖真实战斗进入面板、单次 reroll、确认选择、应用升级并恢复 `playing` 的完整浏览器链路。
- 更新 `tests/playwright-progression-levels.test.js`，让 Phase 09 的旧路线在 Phase 10 之后主动消费 `levelup_choice`，继续验证 restart parity，而不是把新 modal 当成回归。
- 完整跑过 Phase 06-10 的累计 regression gate，确认地图、建筑、掉落装备、XP progression 和新 choice panel 没有相互踩坏。

## Task Commits

1. **Task 1-2 combined: add deterministic reroll plus browser choice route** - `30aacaa` (feat)

## Files Created/Modified

- `src/levelup-system.js` - 新增纯 reroll 逻辑。
- `src/main.js` - 接入 `KeyR` reroll 输入和剩余次数展示。
- `tests/levelup-system.test.js` - 覆盖“每事件恰好 1 次” reroll 契约。
- `tests/playwright-levelup-choice.test.js` - 新增 Phase 10 专用浏览器路线。
- `tests/playwright-progression-levels.test.js` - 升级旧 progression 路线以兼容新的 modal。

## Decisions Made

- Reroll 只改变 offer-state RNG 和 current offer identity，不消费 pending event，也不污染 spawn/drop/progression 的随机流。
- 旧的 progression 浏览器验证脚本不被废弃，而是升级为理解 Phase 10 的新 modal，这样 full regression 才真正反映跨 phase 的真实兼容性。

## Deviations from Plan

- 同步修改了 `tests/playwright-progression-levels.test.js`。这不是额外扩 scope，而是为了让累计 regression gate 在 Phase 10 新 modal 下继续表达原本的 restart parity 意图。

## Issues Encountered

- 使用 `develop-web-game` 的 client 做额外 smoke 时，脚本没有稳定打到首个 level-up，所以 client 只作为“无新增 runtime/console 错误”的补充证据；正式功能证明仍以 Playwright 专用路线和 full regression 为准。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/levelup-system.test.js tests/determinism-contract.test.js`
- [x] `node tests/playwright-levelup-choice.test.js`
- [x] `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js`

## Next Phase Readiness

- `10-VERIFICATION.md` 现在可以直接基于 4 份 summary、Phase 10 browser artifacts，以及累计 regression 输出做 requirement-by-requirement 审计。
- Phase 11 可以把更重的自动化/观测工作建立在已经稳定的 `levelUpState` / `upgradeState` snapshot 合同之上。

---
*Phase: 10-skill-talent-choice-engine*
*Completed: 2026-03-07*

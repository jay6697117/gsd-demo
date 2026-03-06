---
phase: 10-skill-talent-choice-engine
plan: 03
subsystem: level-up choice engine
tags: [upgrades, combat-modifiers, deterministic-snapshot, observability]
requires:
  - phase: 10-skill-talent-choice-engine
    provides: active `levelup_choice` runtime mode and deterministic offer session state
provides:
  - immediate combat-effective application of selected upgrades
  - stable `levelUpState` and `upgradeState` snapshot sections
  - schema-bumped deterministic text state for Phase 10 browser assertions
affects: [10-04, 10-verification]
tech-stack:
  added: []
  patterns:
    - base tuning constants stay immutable while upgrades flow through explicit effective-value helpers
    - deterministic snapshot serialization comes from levelup-system summarizers, not duplicated UI-specific export code
key-files:
  created:
    - .planning/phases/10-skill-talent-choice-engine/10-03-SUMMARY.md
  modified:
    - src/main.js
    - src/levelup-system.js
    - src/determinism-harness.js
    - tests/levelup-system.test.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Upgrade effects are additive deltas over immutable base combat constants, just like equipment, so future progression layers can stack cleanly."
  - "Snapshot now treats `levelUpState` and `upgradeState` as first-class deterministic contracts with an explicit schema bump."
patterns-established:
  - "getUpgradeModifierTotals() is the single runtime bridge from selected upgrades into effective combat numbers."
  - "summarizeLevelUpStateForSnapshot() and summarizeUpgradeStateForSnapshot() own the machine-readable offer/applied-choice export contract."
requirements-completed: [TAL-05]
duration: 6 min
completed: 2026-03-07
---

# Phase 10 Plan 03: 升级即时生效与快照桥总结

**Selected upgrades now immediately affect effective combat numbers, while deterministic snapshot output can explain both the active level-up panel and the persistent applied-upgrade state.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-07T01:16:13+08:00
- **Completed:** 2026-03-07T01:22:09+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 把 `state.upgrades` 接入有效战斗参数：`attackDamage`、`maxHp`、`moveSpeed` 之外，还把 `attackRadius`、`attackArc`、`attackCooldown` 接进了真实攻击路径。
- `confirmLevelUpChoice()` 返回的 upgrade 现在会通过 `getUpgradeModifierTotals()` 立即影响 `doAttack()`、HUD 和玩家最大生命上限裁剪逻辑，而不是只停留在面板状态。
- 在 `src/levelup-system.js` 中新增 snapshot summarizer，把 `levelUpState` 与 `upgradeState` 的稳定字段合同固定下来。
- 在 `src/determinism-harness.js` 中显式把 schema 从 `1.2.0` bump 到 `1.3.0`，并新增 `levelUpState` / `upgradeState` 输出。
- 用 `tests/determinism-contract.test.js` 和 `tests/levelup-system.test.js` 锁定新的 schema、升级派生修正和 snapshot 字段。

## Task Commits

1. **Task 1-2 combined: apply chosen upgrade effects immediately and serialize deterministic upgrade state** - `702717c` (feat)

## Files Created/Modified

- `src/main.js` - 把 upgrade modifiers 接进有效攻击/移动/生命值计算与 HUD。
- `src/levelup-system.js` - 新增 `summarizeLevelUpStateForSnapshot()` 与 `summarizeUpgradeStateForSnapshot()`。
- `src/determinism-harness.js` - bump schema version 并输出 `levelUpState` / `upgradeState`。
- `tests/levelup-system.test.js` - 覆盖 upgrade modifier 派生与 snapshot helper。
- `tests/determinism-contract.test.js` - 覆盖 schema `1.3.0` 和新增 snapshot sections。

## Decisions Made

- 升级效果通过“immutable base constants + upgrade deltas”的方式进入 runtime，不直接改写基础常量，也不塞进 `equipmentState`。
- `levelUpState` 和 `upgradeState` 的文本证据通过 determinism harness 暴露，这样浏览器路线和 contract tests 读的是同一份机器可断言状态。

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- Phase 09 的浏览器 progression 路线仍然停留在旧假设上，暂时看不到 `levelup_choice` 之后的继续行为；这会在 Wave 4 的浏览器用例和回归脚本里统一收敛。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/levelup-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `10-04` 现在可以在稳定的 `levelUpState` 上增加“每事件恰好 1 次”的 reroll，而不会破坏 spawn/drop/progression RNG。
- 浏览器路线已经具备足够的 text-state 字段去断言当前 panel、当前 offer、已应用选择以及即时效果。

---
*Phase: 10-skill-talent-choice-engine*
*Completed: 2026-03-07*

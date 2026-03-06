---
phase: 10-skill-talent-choice-engine
plan: 01
subsystem: level-up choice engine
tags: [upgrades, skills, talents, deterministic-offers]
requires:
  - phase: 09-xp-level-progression-core
    provides: pending level-up queue, deterministic progression event ids, restart parity
provides:
  - authored skill/talent catalog with explicit requires/excludes/max-rank metadata
  - pure eligibility filtering decoupled from runtime panel code
  - deterministic 3-offer generator with stable ordering and isolated offer seed
affects: [10-02, 10-03, 10-04, 10-verification]
tech-stack:
  added: []
  patterns:
    - pure upgrade rules stay separate from runtime mode and UI rendering
    - offer selection uses an isolated seed stream rather than spawn/drop/progression randomness
key-files:
  created:
    - src/upgrade-catalog.js
    - src/levelup-system.js
    - tests/levelup-system.test.js
  modified: []
key-decisions:
  - "Catalog constraints are now authored data, not inferred from panel UI state."
  - "Offer generation is deterministic and isolated behind createOfferSeed() plus pure filtering/generation helpers."
patterns-established:
  - "getEligibleUpgrades() is the canonical pure filter for requires/excludes/max-rank checks."
  - "generateUpgradeOffers() guarantees exactly 3 unique choices while covering both skill and talent pools when possible."
requirements-completed: [TAL-03, TAL-04]
duration: 10 min
completed: 2026-03-07
---

# Phase 10 Plan 01: 升级目录与纯规则总结

**Deterministic level-up offers now have a pure rules contract: authored skill/talent entries, explicit filtering constraints, and a stable 3-choice generator are in place before any runtime modal wiring begins.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-07T00:53:00+08:00
- **Completed:** 2026-03-07T01:03:21+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 新增 `upgrade-catalog`，把 skill/talent 的 `requires`、`excludes`、`maxRank`、`tags` 和 effect descriptor 固定为显式数据合同。
- 新增纯模块 `levelup-system`，提供 upgrade state 归一化、eligibility filtering、offer seed 派生和 deterministic 3-offer generation。
- 用 `tests/levelup-system.test.js` 锁定 catalog metadata、约束过滤以及固定 seed 下的 3 选项稳定输出，为后续 `levelup_choice` mode 接线提供无 UI 依赖的规则层基础。

## Task Commits

1. **Task 1: Define a deterministic skill/talent catalog with explicit constraints** - `f347725` (feat)
2. **Task 2: Generate exactly 3 unique eligible offers from the pending level-up event** - `3588b38` (feat)

## Files Created/Modified

- `src/upgrade-catalog.js` - 定义 skill/talent catalog、显式约束元数据和 isolated offer seed salt。
- `src/levelup-system.js` - 提供 upgrade state 初始化、eligibility filtering 和 deterministic offer generation。
- `tests/levelup-system.test.js` - 覆盖 catalog contract、约束过滤和固定 seed 选项稳定性。

## Decisions Made

- 约束过滤只看显式 catalog metadata 和已应用 upgrade state，不从 HUD、mode 或 panel 层反推合法性。这样 Wave 2 只负责 mode/UI 接线，不需要重新发明规则。
- offer generator 使用独立 `createOfferSeed()` 流，避免污染 Phase 06/08/09 已存在的 spawn/drop/progression determinism 契约。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 无功能性阻塞。构建阶段仍只有既有的 Vite chunk-size warning，不影响本计划正确性。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/levelup-system.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `10-02` 现在可以直接从 `pendingLevelUps[0]` 进入 `levelup_choice` mode，而不需要在 runtime 层手写 pool/filter 逻辑。
- `10-03` 可以复用当前 offer choice payload 结构，把选择结果直接桥接到 `levelUpState` / `upgradeState` snapshot 字段。

---
*Phase: 10-skill-talent-choice-engine*
*Completed: 2026-03-07*

---
phase: 08-breakables-loot-and-equipment
plan: 03
subsystem: equipment
tags: [equipment, compare-mode, auto-pickup, stats]
requires:
  - phase: 08-breakables-loot-and-equipment
    provides: deterministic ground drops, loot state, and independent drop RNG
provides:
  - slot-based equipment state with derived stats
  - compare-mode runtime freeze and leave/re-enter rearm behavior
  - user-visible compare overlay and runtime-effective combat stats
affects: [08-04, 08-verification]
tech-stack:
  added: []
  patterns:
    - compare decisions are handled by an explicit runtime mode instead of DOM-only state
    - player combat stats are derived from equipment deltas rather than mutating base constants
key-files:
  created:
    - src/equipment-system.js
    - tests/equipment-system.test.js
  modified:
    - src/main.js
    - src/style.css
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Kept equipment slots minimal (`weapon`, `core`, `charm`) and mapped them directly onto attackDamage, maxHp, and moveSpeed."
  - "Implemented compare replacement as `state.mode = equip_compare` so combat freeze is enforced by the main fixed-step loop rather than by UI convention."
patterns-established:
  - "All effective player stats now read base constant plus `state.equipment.derivedStats`."
  - "Rejected drops remain on the ground with explicit rearm flags, making retrigger behavior deterministic and snapshot-explainable."
requirements-completed: [LOOT-03, LOOT-04]
duration: 4 min
completed: 2026-03-06
---

# Phase 08 Plan 03: 自动拾取、装备槽位与比较模式总结

**Ground drops now auto-equip into empty slots, occupied slots enter a deterministic compare freeze, and accepted gear immediately rewrites effective combat stats.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T16:11:30+08:00
- **Completed:** 2026-03-06T16:15:31+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 新增 `equipment-system` 纯状态机，覆盖槽位归一化、derived stat 聚合、自动拾取、compare candidate、接受/拒绝分支。
- 把 `equip_compare` 接入主固定步长循环，确保 compare 期间冻结攻击、刷怪和敌人推进。
- 将 `attackDamage`、`maxHp`、`moveSpeed` 改为运行时 effective 值读取，并新增 compare overlay 与地面掉落视觉同步。

## Task Commits

1. **Task 1: Add slot-based equipment state and auto-pickup handling** - `a3d7694` (feat)
2. **Task 2: Implement deterministic compare mode, reject re-entry rules, and stat-delta feedback** - `7773e4d` (feat)

## Files Created/Modified

- `src/equipment-system.js` - 纯 equipment/compare/rearm 状态机与 snapshot summary。
- `tests/equipment-system.test.js` - 覆盖 empty-slot auto equip、compare 触发、accept、reject rearm、snapshot summary。
- `src/main.js` - 接入 `state.equipment`、`equip_compare` mode、effective stat helpers、auto pickup、compare input、drop visuals 和 compare overlay 渲染。
- `src/style.css` - 新增 compare overlay 样式。
- `src/determinism-harness.js` - 新增 `equipmentState` snapshot 输出。
- `tests/determinism-contract.test.js` - 新增 `equipmentState` 合约断言。

## Decisions Made

- 保持 base 常量不变，通过 `getEffectiveAttackDamage()` / `getEffectiveMaxHp()` / `getEffectiveMoveSpeed()` 聚合装备增量。这样后续再接成长系统时不会把基础值和装备值混在一起。
- compare 模式下没有再复用 pause 语义，而是单独使用 `equip_compare`。这是为了保证“冻结战斗但仍可通过 snapshot 解释当前决策态”，并避免把 Phase 04 的 pause/focus/fullscreen 语义污染掉。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added simple ground-drop visuals in the runtime**
- **Found during:** Task 2 (Implement deterministic compare mode, reject re-entry rules, and stat-delta feedback)
- **Issue:** 仅有文本快照而没有地面视觉标记，会让 reject 后留地的装备在实际游戏中不可感知。
- **Fix:** 在 `src/main.js` 增加了轻量 drop visual 同步，不改变 determinism 或 pickup 语义。
- **Files modified:** `src/main.js`
- **Verification:** `node --test tests/equipment-system.test.js tests/determinism-contract.test.js`, `npm run build`
- **Committed in:** `7773e4d`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 这是保证玩法可见性的必要补足，没有引入 inventory、economic 或 itemization 新范围。

## Issues Encountered

- 无新的功能性阻塞。构建仍然只有 Vite chunk-size warning，不影响 Phase 08 当前行为。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/equipment-system.test.js`
- [x] `node --test tests/equipment-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `08-04` 现在只需要收口完整 snapshot 字段、Playwright loot route 和 full regression，不需要再返工 compare 状态机。
- deterministic text state 已经能暴露 `lootState.pendingPickupId` 和 `equipmentState.compareCandidate`，后续 E2E 可以直接对照 live browser 行为断言。

---
*Phase: 08-breakables-loot-and-equipment*
*Completed: 2026-03-06*

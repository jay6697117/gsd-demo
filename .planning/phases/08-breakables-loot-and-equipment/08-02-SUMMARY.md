---
phase: 08-breakables-loot-and-equipment
plan: 02
subsystem: loot
tags: [drops, rng, snapshot, determinism]
requires:
  - phase: 08-breakables-loot-and-equipment
    provides: deterministic authored breakables and runtime breakable destroy events
provides:
  - weighted deterministic equipment drop tables
  - runtime loot state with groundDrops, eventSeq, and dropRngState
  - snapshot-visible loot evidence for replay parity
affects: [08-03, 08-04, 08-verification]
tech-stack:
  added: []
  patterns:
    - drop RNG is isolated from spawn RNG and serialized separately
    - breakable destroy events resolve into pure descriptor-level ground drops before any equipment logic
key-files:
  created:
    - src/drop-tables.js
    - src/drop-system.js
    - tests/drop-system.test.js
  modified:
    - src/breakable-catalog.js
    - src/breakable-system.js
    - src/main.js
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Added preset-level dropTableId so live routes can deterministically trigger same-slot replacement without procedural table overrides."
  - "Ground drop ids are event-sequenced (`drop-000x-sourcePropId`) to keep replay debugging human-readable and order-stable."
patterns-established:
  - "state.loot is now the only mutable drop pipeline state: ground drops, event sequencing, and dedicated RNG all live there."
  - "Snapshot now explains loot parity from dropRngState and descriptor fields, not from scene inspection."
requirements-completed: [LOOT-02]
duration: 3 min
completed: 2026-03-06
---

# Phase 08 Plan 02: 掉落解析与地面掉落状态总结

**Destroyed breakables now resolve into deterministic equipment drops with an isolated loot RNG stream and snapshot-visible `lootState` evidence.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T16:02:00+08:00
- **Completed:** 2026-03-06T16:05:00+08:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 新增 profile-based weighted drop tables，并限定为 Phase 08 的纯装备 descriptor 掉落，不引入 currency/material/consumable。
- 新增 `state.loot` 运行时切片，持有 `groundDrops`、`dropRngState`、`eventSeq`、`pendingPickupId`，并由 breakable destroy event 驱动。
- 扩展 `buildDeterministicSnapshot()` 输出 `lootState`，让相同 seed 下的掉落序列可以被文本快照直接解释和断言。

## Task Commits

1. **Task 1: Define weighted deterministic equipment drop tables and resolver primitives** - `6f41456` (feat)
2. **Task 2: Persist ground drops and serialize loot RNG state through the deterministic snapshot** - `182280c` (feat)

## Files Created/Modified

- `src/drop-tables.js` - 定义 weighted equipment drop profiles 和 rarity/slot contract。
- `src/drop-system.js` - 提供独立 drop RNG、loot state 初始化、destroyed-breakable drop resolver、snapshot summary。
- `tests/drop-system.test.js` - 覆盖 weighted tables、stable ground drop ordering、independent RNG state 和 snapshot summary。
- `src/breakable-catalog.js` - 给 authored breakables 补上 `dropTableId`，为后续 compare 路线提供稳定 drop profile。
- `src/breakable-system.js` - 把 `dropTableId` 携带进 runtime breakable instances。
- `src/main.js` - 在 run reset 与攻击链中接入 `state.loot` 和 breakable destroy -> groundDrops 的状态流。
- `src/determinism-harness.js` - 新增 `lootState` 快照输出。
- `tests/determinism-contract.test.js` - 新增 `lootState` 合约断言。

## Decisions Made

- 采用 preset-level `dropTableId`，而不是从 archetype 或 sector 临时推导掉落类型。这样同一个 breakable 的掉落意图在 authored 数据层就被锁定，后续 Playwright 路线不会受实现细节漂移影响。
- `dropRngState` 沿用和 spawn 相同的 LCG 形式，但保持独立 salt 和独立状态字段。这样 deterministic 行为一致、实现简单，同时不会污染 Phase 06 的 spawn stream。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added preset-level dropTableId to breakables**
- **Found during:** Task 1 (Define weighted deterministic equipment drop tables and resolver primitives)
- **Issue:** 仅靠 archetype 无法稳定保证后续 compare 路线需要的同槽位掉落顺序。
- **Fix:** 在 authored breakable preset 和 runtime breakable instance 中补了 `dropTableId`。
- **Files modified:** `src/breakable-catalog.js`, `src/breakable-system.js`
- **Verification:** `node --test tests/drop-system.test.js`
- **Committed in:** `6f41456`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 这是后续 deterministic compare 路线所需的低层修正，没有扩大 Phase 08 的功能边界。

## Issues Encountered

- 无新的功能性阻塞。构建仍然只有 Vite chunk-size warning，不影响 Wave 2 的运行正确性。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/drop-system.test.js`
- [x] `node --test tests/drop-system.test.js tests/determinism-contract.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `08-03` 现在可以在 `state.loot.groundDrops` 之上直接实现自动拾取、槽位装配和 compare freeze，而不需要再返工掉落来源或 RNG 解释链。
- 两个 hub breakables 已经分别绑定 `starter-weapon` 与 `upgrade-weapon`，后续 live route 可以稳定触发同槽位替换流程。

---
*Phase: 08-breakables-loot-and-equipment*
*Completed: 2026-03-06*

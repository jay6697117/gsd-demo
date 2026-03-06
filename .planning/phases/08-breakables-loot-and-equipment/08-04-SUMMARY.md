---
phase: 08-breakables-loot-and-equipment
plan: 04
subsystem: verification
tags: [determinism, playwright, regression, loot-loop]
requires:
  - phase: 08-breakables-loot-and-equipment
    provides: breakables, deterministic loot state, equipment compare runtime
provides:
  - schema-bumped snapshot contract for breakable/loot/equipment replay evidence
  - end-to-end browser regression for breakable -> loot -> equip
  - phase-wide regression gate spanning world, buildings, loot, and equipment
affects: [08-verification, phase-complete]
tech-stack:
  added: []
  patterns:
    - schema version changes are explicit when snapshot surface expands
    - browser route assertions read deterministic text state, with screenshots kept as debugging artifacts
key-files:
  created:
    - tests/playwright-breakables-loot.test.js
  modified:
    - src/determinism-harness.js
    - src/main.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Bumped the determinism schema to 1.1.0 because Phase 08 materially expands snapshot coverage."
  - "Kept Playwright assertions text-state-driven because headless WebGL fallback can blank the canvas in CI-like runs."
patterns-established:
  - "Phase-level loot regressions now prove breakable destruction, compare resolution, and equipped-state parity end-to-end."
  - "Regression commands continue to include world/building suites so later progression work cannot silently break Phase 06/07 contracts."
requirements-completed: [LOOT-05]
duration: 4 min
completed: 2026-03-06
---

# Phase 08 Plan 04: 快照收口与端到端回归总结

**Phase 08 now has schema-versioned deterministic evidence for breakables, loot, and equipment, plus a live browser route that proves break -> pickup -> compare -> equip end to end.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T16:17:00+08:00
- **Completed:** 2026-03-06T16:20:49+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 把 determinism schema 明确升级到 `1.1.0`，为 `world.breakables`、`lootState`、`equipmentState` 的扩展给出清晰版本边界。
- 新增 `tests/playwright-breakables-loot.test.js`，在真实浏览器里验证两次 hub breakable 击破、首件武器自动装备、第二件武器触发 compare 并接受替换。
- 跑通完整回归命令，确认 Phase 08 的 loot loop 没有破坏 Phase 06 的 world/spawn contract 和 Phase 07 的 building tactics contract。

## Task Commits

1. **Task 1: Extend deterministic snapshot contract for breakables, loot, and equipment** - `4fa4d39` (test)
2. **Task 2: Add Playwright route and full regression gate for the complete loot loop** - `7cabb0d` (test)

## Files Created/Modified

- `src/determinism-harness.js` - schema version bump 到 `1.1.0`。
- `tests/determinism-contract.test.js` - 锁定 `1.1.0` 合约并继续断言 breakable/loot/equipment snapshot。
- `tests/playwright-breakables-loot.test.js` - 新增 breakable -> loot -> compare -> equip 浏览器回归路线。
- `src/main.js` - 修复运行时 `formatStatValue()` 对缺失 helper 的引用错误，保障浏览器验证可以真实执行。

## Decisions Made

- 明确把 schema bump 作为 Wave 4 的一部分，而不是让新增 snapshot 字段继续挂在 `1.0.0` 下。这避免后续阶段在回放工件里混淆“新增字段”与“旧版本合同”。
- Playwright 路线最终采用“文本状态为主、截图为辅”的断言策略。原因是 headless Chromium 在当前环境中会退化到 `noop-fallback` 渲染路径，截图只稳定保留 HUD，而 determinism JSON 仍能完整解释战斗和装备状态。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing numeric helper referenced by compare HUD formatting**
- **Found during:** Task 2 (Add Playwright route and full regression gate for the complete loot loop)
- **Issue:** 浏览器运行时在 `formatStatValue()` 内抛出 `ReferenceError: toFiniteNumber is not defined`，导致 Playwright 路线首次失败。
- **Fix:** 在 `src/main.js` 中补上本地 `toFiniteNumber()` helper，并重新执行浏览器回归。
- **Files modified:** `src/main.js`
- **Verification:** `node tests/playwright-breakables-loot.test.js`, full regression command
- **Committed in:** `7cabb0d`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 这是我在 Wave 3/4 接入 HUD 时引入的本地缺陷，已在同一 wave 内修复，没有改变 Phase 08 范围。

## Issues Encountered

- Headless browser artifacts仍然会因为 WebGL context fallback 而出现“HUD 可见、场景留白”的截图。实际断言已改为依赖 `render_game_to_text()` 的 deterministic state；该现象被记录在 `.planning/artifacts/phase-08/` 中，作为调试上下文保留但不作为通过/失败依据。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/determinism-contract.test.js`
- [x] `node tests/playwright-breakables-loot.test.js`
- [x] `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js`

## Next Phase Readiness

- `08-04` 已经把 breakable/loot/equipment 的 deterministic evidence 和 browser regression 都补齐，下一步可以直接进入 `08-VERIFICATION.md` 的 phase-level must-have 审核。
- `.planning/artifacts/phase-08/` 中保留了浏览器 JSON、console 和 screenshot 工件，可供 verifier 或后续调试使用，但不会纳入代码提交。

---
*Phase: 08-breakables-loot-and-equipment*
*Completed: 2026-03-06*

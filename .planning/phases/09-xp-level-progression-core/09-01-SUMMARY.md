---
phase: 09-xp-level-progression-core
plan: 01
subsystem: progression
tags: [xp, levels, thresholds, determinism]
requires:
  - phase: 08-breakables-loot-and-equipment
    provides: deterministic runtime/snapshot patterns and stable text-state evidence
provides:
  - explicit xp-value and threshold contracts independent from score
  - pure level-window helpers for current and next threshold lookup
  - deterministic pending level-up event generation for multi-threshold xp gains
affects: [09-02, 09-03, 09-04, 09-verification]
tech-stack:
  added: []
  patterns:
    - progression rules stay pure and decoupled from runtime ui/mode state
    - level-up events are derived from threshold crossings rather than hud bookkeeping
key-files:
  created:
    - src/progression-config.js
    - src/progression-system.js
    - tests/progression-system.test.js
  modified: []
key-decisions:
  - "Locked XP values into a dedicated progression config so score and progression cannot drift into the same contract."
  - "Used explicit cumulative thresholds plus a fixed overflow delta so future pacing changes stay data-only."
patterns-established:
  - "applyXpGain() is now the canonical pure reducer for level calculation, queue growth, and eventSeq advancement."
  - "pendingLevelUps use deterministic `lvlup-000x` ids so runtime and snapshot layers can consume the same queue later."
requirements-completed: [PROG-02]
duration: 3 min
completed: 2026-03-06
---

# Phase 09 Plan 01: XP 阈值合同与纯规则总结

**Deterministic progression rules now exist as a pure contract: XP values are decoupled from score, level windows are stable, and multi-threshold gains emit ordered pending level-up events.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T23:26:00+08:00
- **Completed:** 2026-03-06T23:29:19+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 新增独立的 `progression-config`，把敌人 XP 值、累计阈值和 overflow 增量从 `score` 契约中彻底拆开。
- 新增纯函数 `progression-system`，统一处理 level 计算、当前窗口/下一阈值查找和 XP gain reducer。
- 用 `tests/progression-system.test.js` 锁定多阈值跨越时的 event 顺序与 `eventSeq` 递增行为，为后续 runtime kill pipeline 接线提供稳定基础。

## Task Commits

1. **Task 1-2: Define progression config and resolve XP gains into deterministic pending level-up events** - `bbec38f` (feat)

## Files Created/Modified

- `src/progression-config.js` - 定义独立 XP values、显式累计阈值和 overflow delta。
- `src/progression-system.js` - 提供 progression state 初始化、level/window 解析、XP gain reducer 和稳定 level-up event id 生成。
- `tests/progression-system.test.js` - 覆盖 config contract、threshold lookup、overflow 规则和 multi-threshold queue 行为。

## Decisions Made

- 使用显式累计阈值数组而不是从公式隐式推导等级曲线。这样后续要调 pacing，只需要改数据常量，不需要碰 reducer 或 snapshot 契约。
- event id 直接由 `eventSeq` 生成 `lvlup-000x`。这样运行时、HUD 和 deterministic snapshot 后续都可以共享同一份排队事件证据。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 无功能性阻塞。Wave 1 只涉及纯模块和测试，构建阶段仍只有既有的 Vite chunk-size warning，不影响本计划正确性。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/progression-system.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `09-02` 现在可以把 `applyXpGain()` 直接接入敌人死亡链路，而不需要在 runtime 里手写 level/threshold 逻辑。
- `pendingLevelUps` 的稳定结构已经确定，后续 HUD、snapshot 和 Playwright 路线都可以围绕同一份队列合同扩展。

---
*Phase: 09-xp-level-progression-core*
*Completed: 2026-03-06*

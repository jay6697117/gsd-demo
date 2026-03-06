---
phase: 10-skill-talent-choice-engine
plan: 02
subsystem: level-up choice engine
tags: [upgrades, levelup-choice, input-routing, modal-runtime]
requires:
  - phase: 10-skill-talent-choice-engine
    provides: deterministic offer generation, authored upgrade constraints
provides:
  - deterministic `levelup_choice` runtime mode driven by the pending progression queue
  - exactly-one-choice panel with stable focus movement and confirm path
  - control semantics that preserve `equip_compare` precedence and ignore `KeyP` inside the panel
affects: [10-03, 10-04, 10-verification]
tech-stack:
  added: []
  patterns:
    - queue-head level-up consumption opens one active modal session at a time
    - modal input is isolated from gameplay controls via explicit mode gating instead of ad-hoc key suppression
key-files:
  created:
    - .planning/phases/10-skill-talent-choice-engine/10-02-SUMMARY.md
  modified:
    - src/main.js
    - src/style.css
    - src/levelup-system.js
    - src/control-rules.js
    - tests/levelup-system.test.js
    - tests/control-rules.test.js
key-decisions:
  - "Pending level-up events remain in the progression queue until explicit confirm, so the modal is driven by queue head without losing determinism."
  - "`equip_compare` keeps priority over `levelup_choice` by opening compare first during auto-pickup, then entering the level-up panel only if gameplay is still active."
patterns-established:
  - "beginLevelUpChoice() is the canonical queue-to-session bridge for runtime modal entry."
  - "resolvePauseMode() now treats `levelup_choice` as pause-immune, which preserves the Phase 10 control contract without breaking fullscreen escape behavior."
requirements-completed: [TAL-01, TAL-02]
duration: 13 min
completed: 2026-03-07
---

# Phase 10 Plan 02: 升级选择模式总结

**The runtime now consumes one pending level-up event at a time into a deterministic `levelup_choice` panel, with stable focus movement, exactly-one confirmation, and control semantics that stay compatible with compare/fullscreen behavior.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-07T01:03:22+08:00
- **Completed:** 2026-03-07T01:16:12+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 在 `src/levelup-system.js` 中补齐了 `createLevelUpState()`、`beginLevelUpChoice()`、`moveLevelUpSelection()`、`confirmLevelUpChoice()`，把 queue-head event 到 active modal session 的状态机固定下来。
- 在 `src/main.js` 中接入 `state.levelUp` / `state.upgrades`，并把 `pendingLevelUps[0]` 桥接到新的 `levelup_choice` mode；该 mode 会冻结战斗、刷怪和自动拾取，直到玩家确认一个选项。
- 新增最小面板 UI（`src/style.css` + runtime overlay creation），现在能显示 3 个候选项、当前焦点、事件号和操作提示。
- 在 `src/control-rules.js` 中锁定 `KeyP` 在 `levelup_choice` 下被忽略，同时保留 `Escape` 只做 fullscreen exit 的全局语义。
- 用 `tests/levelup-system.test.js` 和 `tests/control-rules.test.js` 锁定 queue/session/open/confirm 与 pause-control 契约。

## Task Commits

1. **Task 1-2 combined: add deterministic `levelup_choice` mode and exactly-one confirm flow** - `bb6345a` (feat)

## Files Created/Modified

- `src/main.js` - 新增 `state.levelUp` / `state.upgrades`，把 queue head 接到 `levelup_choice` mode，并加上 panel input handling。
- `src/style.css` - 新增 level-up panel 的样式与选中态。
- `src/levelup-system.js` - 实现 modal session 的纯状态机 API。
- `src/control-rules.js` - 固定 `KeyP` 在 `levelup_choice` 中不切 pause。
- `tests/levelup-system.test.js` - 覆盖 open / move / confirm 行为。
- `tests/control-rules.test.js` - 覆盖 `resolvePauseMode("levelup_choice")` 契约。

## Decisions Made

- 升级事件只有在确认选择后才从 `pendingLevelUps` 中移除，这样 reroll 和 snapshot 可以始终绑定到同一个事件身份。
- `levelup_choice` 的打开时机放在 auto-pickup 之后、战斗输入之前，这样 `equip_compare > levelup_choice > playing` 的优先级不会被 runtime 顺序破坏。

## Deviations from Plan

- 额外修改了 `src/control-rules.js` 和 `tests/control-rules.test.js`，因为 `KeyP` 在 `levelup_choice` 中保持无效不是 UI 细节，而是 Phase 10 的显式控制契约。

## Issues Encountered

- 现有 `tests/playwright-progression-levels.test.js` 会因为新引入的 `levelup_choice` 停在升级面板上，而不是继续假设“升级后直接进入战斗”。这不是回退；需要在 Wave 4 把浏览器路线升级为理解新的 choice flow。

## User Setup Required

None - no external service configuration required.

## Verification

- [x] `node --test tests/levelup-system.test.js`
- [x] `node --test tests/control-rules.test.js`
- [x] `npm run build`

## Next Phase Readiness

- `10-03` 现在可以把确认结果立即桥接进 combat-effective helpers，并把 `levelUpState` / `upgradeState` 接入 deterministic snapshot。
- `10-04` 可以在当前 active session 状态机之上增加“每事件恰好 1 次”的 reroll，不需要重写 modal 基础结构。

---
*Phase: 10-skill-talent-choice-engine*
*Completed: 2026-03-07*

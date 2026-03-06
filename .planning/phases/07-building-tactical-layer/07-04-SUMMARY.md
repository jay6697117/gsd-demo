---
phase: 07-building-tactical-layer
plan: 04
subsystem: verification
tags: [determinism, playwright, buildings, tactics, regression]
requires: [07-02, 07-03]
provides:
  - stable world.buildings and world.tactics snapshot evidence for BLD-04
  - end-to-end tactical route coverage across three sectors with retreat-pocket usage
  - full regression gate spanning Phase 06 traversal and Phase 07 tactical building guarantees
affects: [07-verification, phase-complete]
tech-stack:
  added: []
  patterns:
    - deterministic snapshot surfaces runtime building and tactic state without inspecting scene objects
    - Playwright tactical coverage uses advanceTime-driven fixed-step routing instead of ad-hoc sleeps
key-files:
  created:
    - tests/playwright-building-tactics.test.js
  modified:
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Serialized world.tactics through determinism-harness rather than adding a second debug/export path in main.js."
  - "Drove the tactical E2E route through fixed-step key holds and south-pocket activation to keep building evidence deterministic."
patterns-established:
  - "Snapshot contracts now carry both authored building summaries and live tactical cues for goal-backward verification."
  - "Browser E2E tests store local artifacts under phase-specific planning folders while commits stay limited to source and docs."
requirements-completed: [BLD-04]
duration: 4 min
completed: 2026-03-06
---

# Phase 07 Plan 04: 建筑快照与端到端验证总结

**Phase 07 现在同时具备 machine-readable 的 building/tactics 快照证据、三分区战术路线端到端覆盖，以及不回退 Phase 06 保证的整体验证门禁。**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T11:28:14+08:00
- **Completed:** 2026-03-06T11:31:52+08:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- 在 `src/determinism-harness.js` 中把 `world.tactics` 纳入稳定快照输出，确保 `render_game_to_text()` 可以同时暴露 authored building summary 和 live tactical cue。
- 在 `tests/determinism-contract.test.js` 中补了 `world.tactics` 结构、顺序和 replay parity 断言，防止后续阶段改坏战术建筑可观测契约。
- 新增 `tests/playwright-building-tactics.test.js`，以 fixed-step route 验证 `hub -> north -> south` 三分区穿越、south retreat pocket 激活、HUD `Tactic POCKET` 文本、spawn event 与运行时稳定性。
- 跑通 `07-04` 计划规定的 full regression gate，确认建筑系统没有破坏 Phase 06 的 traversal、collision、spawn 和 readability 契约。

## Task Commits

1. **Tasks 1-3: 快照契约扩展、Playwright 战术路线、全量回归锁定** - `89ded1a` (test)

## Files Created/Modified

- `src/determinism-harness.js` - 新增 `world.tactics` 归一化输出，保证 building/tactical summary 都以稳定结构进入 deterministic snapshot。
- `tests/determinism-contract.test.js` - 为 `world.tactics` 增加结构、顺序和重复运行一致性断言。
- `tests/playwright-building-tactics.test.js` - 固定步长浏览器路线，验证三分区 traversal、south pocket 使用、HUD cue 与 runtime 错误门禁。

## Decisions Made

- 选择在 `determinism-harness` 内序列化 `world.tactics`，而不是在 `main.js` 里再维护一套专门的 debug 导出逻辑。这样快照桥保持单一，后续 verifier 只需要消费一个证据面。
- Playwright 路线改用 `window.advanceTime()` 配合按键保持，而不是真实时间 sleep。这样既保留了真实浏览器运行时，又保证路线和断言可重复。

## Deviations from Plan

- `07-04-PLAN.md` 列出了 `src/main.js`，但本次没有改它。原因是 `07-02` 已经把 `world.tactics` 稳定维护在运行时状态里，`07-04` 只需扩展 snapshot/export 与 E2E 覆盖，不应该为了“命中文件列表”人为引入多余改动。
- 三个任务合并成一个实现提交。原因是 snapshot contract、Playwright route 和 full regression gate 必须共同形成一份不可分割的验证证据；拆分提交没有额外审阅收益。

## Issues Encountered

- 无新的实现性阻塞。构建阶段仍然只有 Vite 的 chunk size warning，这不是本阶段的功能性失败，也没有阻止验证通过。

## User Setup Required

- 无。该计划没有新增外部服务、环境变量或面板配置步骤。

## Verification

- [x] `node --test tests/determinism-contract.test.js`
- [x] `npm run build`
- [x] `node tests/playwright-building-tactics.test.js`
- [x] `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/determinism-contract.test.js && node tests/playwright-building-tactics.test.js`

## Next Phase Readiness

- `07-04` 已经把 `BLD-04` 的 deterministic evidence 和 E2E evidence 补齐，下一步可以直接进入 `07-VERIFICATION.md` 的 phase-level goal-backward 校验。
- 当前 `.planning/artifacts/phase-07/` 中已有浏览器截图和 JSON artifact，可供 verifier 或后续调试参考，但不会纳入代码提交范围。

---
*Phase: 07-building-tactical-layer*
*Completed: 2026-03-06*

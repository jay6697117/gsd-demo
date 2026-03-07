---
phase: 11-automation-determinism-hardening
plan: 01
subsystem: snapshot contract and browser helper foundation
tags: [determinism, snapshot, automation, playwright-helper]
requires:
  - phase: 10-skill-talent-choice-engine
    provides: stable `levelUpState` / `upgradeState` snapshot sections and browser route inventory
provides:
  - schema `1.4.0` with top-level `rngState`
  - field-level v1.1 snapshot assertions
  - shared Playwright helper skeleton for future phase routes
affects: [11-verification]
tech-stack:
  added: []
  patterns:
    - snapshot contract grows by extension only; existing sections are not removed or renamed
    - browser route scripts share lifecycle/helpers without hiding route-specific assertions
key-files:
  created:
    - .planning/phases/11-automation-determinism-hardening/11-01-SUMMARY.md
    - tests/helpers/playwright-game.js
  modified:
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Phase 11 bumps determinism schema to `1.4.0` and adds a top-level `rngState` instead of scattering RNG proof only across nested sections."
  - "Shared browser infrastructure is extracted as a thin helper module, not a mega-harness that swallows route logic."
patterns-established:
  - "`rngState` mirrors the canonical run-local random streams: run seed, spawn, drop, and level-up offer RNG."
  - "Browser route scripts can import one helper for server/browser lifecycle, artifact writing, and runtime error gating."
requirements-completed: [AUTO-04]
duration: 8 min
completed: 2026-03-07
---

# Phase 11 Plan 01: Snapshot 合同与浏览器基座总结

**Phase 11 先把 v1.1 的 text-state 合同冻结下来，再给后续 replay / restart parity 路线提供共享的 Playwright 机械骨架。**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 在 `src/determinism-harness.js` 中把 `DETERMINISM_SCHEMA_VERSION` 从 `1.3.0` 升到 `1.4.0`。
- 为 snapshot 新增顶层 `rngState`，明确暴露 `runSeed`、`spawnRngState`、`dropRngState`、`offerRngState`。
- 更新 `tests/determinism-contract.test.js`，把 v1.1 contract 校验从 section existence 提升到字段级断言。
- 新增 `tests/helpers/playwright-game.js`，统一承载 server/browser lifecycle、`advance()`、`readSnapshot()`、artifact writer、runtime error gating，以及后续 scripted timeline 的基础支持。

## Files Created/Modified

- `src/determinism-harness.js` - schema 升级并新增顶层 `rngState`。
- `tests/determinism-contract.test.js` - 新增 `rngState` 和 `1.4.0` 断言。
- `tests/helpers/playwright-game.js` - 共享 Playwright 基础设施。

## Decisions Made

- `rngState` 只做现有随机流的稳定摘要，不引入任何新的随机状态。
- shared helper 只抽机械骨架，不抽业务 route，避免后续测试被黑盒化。

## Verification

- [x] `node --test tests/determinism-contract.test.js`
- [x] `node --input-type=module -e "import('./tests/helpers/playwright-game.js')"`
- [x] `npm run build`

## Next Wave Readiness

- Wave 2 现在可以直接建立双会话 deterministic replay route。
- 后续 `playwright-breakables-loot`、`playwright-progression-levels`、`playwright-levelup-choice` 都可以迁移到同一 helper，而不再重复 server/browser boilerplate。

---
*Phase: 11-automation-determinism-hardening*
*Completed: 2026-03-07*

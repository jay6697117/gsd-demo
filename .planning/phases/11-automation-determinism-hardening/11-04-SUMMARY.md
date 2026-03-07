---
phase: 11-automation-determinism-hardening
plan: 04
subsystem: restart parity and stable regression entrypoints
tags: [automation, restart-parity, regression, package-scripts]
requires:
  - phase: 11-automation-determinism-hardening
    provides: helper-backed browser routes and deterministic replay evidence
provides:
  - dedicated restart parity browser evidence for `AUTO-08`
  - stable `test:e2e:v11` and `test:regression:v11` entrypoints
  - stricter but environment-aware runtime console gating
affects: [11-verification]
tech-stack:
  added: []
  patterns:
    - restart parity compares post-restart sections against a real start-of-run baseline snapshot
    - named package scripts replace ad-hoc verifier shell chains
key-files:
  created:
    - .planning/phases/11-automation-determinism-hardening/11-04-SUMMARY.md
    - tests/playwright-restart-parity.test.js
  modified:
    - tests/helpers/playwright-game.js
    - package.json
key-decisions:
  - "Restart parity resets the run-local growth slices and their RNG streams, but does not require spawnRngState to match a pre-restart snapshot taken at a different elapsed time."
  - "Console gating now ignores the specific offline resource error `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` while keeping other resource failures visible."
patterns-established:
  - "Phase-level automation verification can now call `npm run test:e2e:v11` and `npm run test:regression:v11` directly."
  - "Restart proof is centralized in one cross-system browser route instead of being partially inferred from progression-only coverage."
requirements-completed: [AUTO-08]
duration: 11 min
completed: 2026-03-07
---

# Phase 11 Plan 04: Restart parity 与回归入口总结

**Phase 11 最后一波把 restart parity 单独拉成了专门路线，并把 v1.1 的浏览器 / 回归验证收敛成两个稳定命令入口。**

## Performance

- **Duration:** 11 min
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 新增 `tests/playwright-restart-parity.test.js`，用一条真实浏览器路线证明：在拿到 equipment 变化和 progression / upgrade 变化之后，restart 会把 `equipmentState`、`lootState`、`progressionState`、`levelUpState`、`upgradeState` 全部回到基线。
- 新增 `package.json` 脚本：`test:e2e:v11` 与 `test:regression:v11`。
- 调整 `tests/helpers/playwright-game.js` 的 console gating，只忽略已知的 headless/offline 非阻塞噪音：`Failed to load resource: net::ERR_INTERNET_DISCONNECTED`。
- 实际跑通：`node tests/playwright-restart-parity.test.js`、`npm run test:e2e:v11`、`npm run test:regression:v11`。

## Files Created/Modified

- `tests/playwright-restart-parity.test.js` - dedicated restart parity route。
- `package.json` - 新增 Phase 11 稳定回归入口。
- `tests/helpers/playwright-game.js` - 收紧但环境可接受的 runtime console 过滤。

## Decisions Made

- restart parity 比较的是“重启后 section 与真实 start-of-run baseline section 一致”，而不是用散乱常量分开断言。
- `spawnRngState` 不进入 restart parity 的强相等断言，因为它受被动刷怪推进影响，不属于 `AUTO-08` 要证明的 run-local growth reset 核心。

## Verification

- [x] `node tests/playwright-restart-parity.test.js`
- [x] `npm run test:e2e:v11`
- [x] `npm run test:regression:v11`

## Next Wave Readiness

- Phase 11 现在已经具备完整的 phase-level 证据面，可以直接生成 `11-VERIFICATION.md`。
- 后续阶段可以直接复用 `test:e2e:v11` / `test:regression:v11` 作为回归基线，而不是复制长命令串。

---
*Phase: 11-automation-determinism-hardening*
*Completed: 2026-03-07*

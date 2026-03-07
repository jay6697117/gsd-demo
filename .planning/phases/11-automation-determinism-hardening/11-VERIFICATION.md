---
phase: 11-automation-determinism-hardening
verified: 2026-03-07T08:28:51+08:00
status: passed
score: 5/5 must-haves verified
---

# Phase 11: Automation & Determinism Hardening — Verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `window.render_game_to_text()` now exposes the frozen v1.1 assertion contract under schema `1.4.0`, including top-level `rngState` and the existing world/loot/equipment/progression/level-up/upgrade/spawn sections. | passed | `node --test tests/determinism-contract.test.js` passed; `11-01-SUMMARY.md` records the `src/determinism-harness.js` schema bump plus field-level contract assertions. |
| 2 | The same seed and scripted input timeline replay to an identical normalized final snapshot across two fresh browser sessions, spanning sector traversal, breakable/drop/equip, and level-up choice/reroll. | passed | `node tests/playwright-determinism-replay.test.js` passed; `11-02-SUMMARY.md` records dual-session replay parity and the artifact pair under `.planning/artifacts/phase-11/`. |
| 3 | Automated browser evidence now covers `breakable -> drop -> equip` with machine-readable assertions for broken props, drop queue state, compare flow, and derived equipment stats. | passed | `node tests/playwright-breakables-loot.test.js` passed; `11-03-SUMMARY.md` records explicit assertions over `world.breakables`, `lootState`, and `equipmentState`. |
| 4 | Automated browser evidence now covers `kill -> xp -> levelup -> choose-upgrade` with field-level assertions for pending queue consumption, offer identity, reroll budget, RNG advancement, and applied upgrade effects. | passed | `node tests/playwright-levelup-choice.test.js` and `node tests/playwright-progression-levels.test.js` passed; `11-03-SUMMARY.md` records queue-head, reroll, and applied-upgrade state assertions. |
| 5 | Restart parity and full v1.1 regression are both callable through stable named commands, and restart resets run-local loot/equipment/progression/level-up/upgrade state back to baseline. | passed | `node tests/playwright-restart-parity.test.js`, `npm run test:e2e:v11`, and `npm run test:regression:v11` all passed; `11-04-SUMMARY.md` records the dedicated restart route and the new `package.json` entrypoints. |

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/determinism-harness.js` | Frozen v1.1 snapshot contract with schema `1.4.0` and top-level RNG summary | passed | Present and exports the canonical text-state used by contract tests and browser routes. |
| `tests/determinism-contract.test.js` | Field-level assertion contract for v1.1 snapshot sections | passed | Present and green. |
| `tests/helpers/playwright-game.js` | Shared browser lifecycle/timeline/artifact/error-gating helper | passed | Present and reused by replay, loot, progression, level-up, and restart routes. |
| `tests/playwright-determinism-replay.test.js` | Dual-session replay parity evidence | passed | Present and green. |
| `tests/playwright-breakables-loot.test.js` | `AUTO-06` browser evidence | passed | Present and green with helper-backed field assertions. |
| `tests/playwright-progression-levels.test.js` | Progression queue and restart browser evidence | passed | Present and green with helper-backed field assertions. |
| `tests/playwright-levelup-choice.test.js` | `AUTO-07` level-up choice browser evidence | passed | Present and green with reroll and applied-upgrade assertions. |
| `tests/playwright-restart-parity.test.js` | Dedicated `AUTO-08` restart parity route | passed | Present and green. |
| `package.json` | Stable `test:e2e:v11` and `test:regression:v11` entrypoints | passed | Present and green. |
| `.planning/phases/11-automation-determinism-hardening/11-01-SUMMARY.md` | `AUTO-04` execution evidence | passed | Present and verified. |
| `.planning/phases/11-automation-determinism-hardening/11-02-SUMMARY.md` | `AUTO-05` execution evidence | passed | Present and verified. |
| `.planning/phases/11-automation-determinism-hardening/11-03-SUMMARY.md` | `AUTO-06` and `AUTO-07` execution evidence | passed | Present and verified. |
| `.planning/phases/11-automation-determinism-hardening/11-04-SUMMARY.md` | `AUTO-08` execution evidence | passed | Present and verified. |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/determinism-harness.js` | `tests/determinism-contract.test.js` | schema `1.4.0` + top-level `rngState` | passed | Contract tests now assert field-level v1.1 snapshot content instead of section existence only. |
| `tests/helpers/playwright-game.js` | `tests/playwright-determinism-replay.test.js` | shared lifecycle + predicate-driven scripted timeline | passed | Replay proof reuses one helper while keeping route logic explicit in the test file. |
| `tests/playwright-determinism-replay.test.js` | final normalized snapshot parity | dual-session route A/B comparison | passed | Replay proof is based on two fresh browser sessions, not same-session re-reads. |
| `tests/playwright-breakables-loot.test.js` | `equipmentState` / `lootState` truth | break -> drop -> compare -> equip route | passed | Field-level assertions cover pending pickup, ground drops, compare candidate, and derived stats. |
| `tests/playwright-levelup-choice.test.js` + `tests/playwright-progression-levels.test.js` | `progressionState` / `levelUpState` / `upgradeState` truth | kill -> xp -> level-up queue -> reroll/choose | passed | Queue head, offer identity, reroll budget, applied choice, and restart reset are all asserted from snapshot fields. |
| `tests/playwright-restart-parity.test.js` | `package.json` entrypoints | dedicated restart route -> named scripts | passed | Restart parity is now reusable through `npm run test:e2e:v11` and included in `npm run test:regression:v11`. |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| AUTO-04 | passed | |
| AUTO-05 | passed | |
| AUTO-06 | passed | |
| AUTO-07 | passed | |
| AUTO-08 | passed | |

## Human Verification Required

No blocking human gate remains. Headless/WebGL fallback is still present in this environment, and browser runs may emit a non-blocking offline resource error while the dev server is alive. These are treated as debug-only artifacts; functional correctness is verified through deterministic text-state, field-level browser assertions, dual-session replay parity, restart parity, and the named regression commands.

## Verification Metadata

- **Verification approach:** Goal-backward audit against `AUTO-04..08` using snapshot contract checks, dedicated browser-route evidence, dual-session replay parity, restart parity, and the unified v1.1 regression scripts.
- **Automated checks:** `node --test tests/determinism-contract.test.js`, `node tests/playwright-determinism-replay.test.js`, `node tests/playwright-breakables-loot.test.js`, `node tests/playwright-progression-levels.test.js`, `node tests/playwright-levelup-choice.test.js`, `node tests/playwright-restart-parity.test.js`, `npm run test:e2e:v11`, `npm run test:regression:v11`
- **Artifacts reviewed:** `.planning/artifacts/phase-11/determinism-replay-run-a.json`, `.planning/artifacts/phase-11/determinism-replay-run-b.json`, `.planning/artifacts/phase-11/restart-parity-latest.json`, `.planning/artifacts/phase-08/breakables-loot-latest.json`, `.planning/artifacts/phase-09/progression-levels-latest.json`, `.planning/artifacts/phase-10/levelup-choice-latest.json`
- **Human checks required:** 0
- **Total verification time:** 10 min

## Result

Phase 11 verification passed. The remaining headless/WebGL and offline-resource noise does not block verification because the frozen text-state contract, dual-session replay route, restart parity route, and named regression commands together cover all Phase 11 must-haves.

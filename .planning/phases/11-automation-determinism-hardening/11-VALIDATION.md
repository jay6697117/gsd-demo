---
phase: 11
slug: automation-determinism-hardening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for v1.1 snapshot freeze, replay parity, shared browser automation helpers, and restart reset regression.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright direct scripts |
| **Config file** | none — Node built-in test runner + local browser scripts |
| **Quick run command** | `test -f tests/determinism-contract.test.js && node --test tests/determinism-contract.test.js` |
| **Full suite command** | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-map-sectors.test.js && node tests/playwright-building-tactics.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-determinism-replay.test.js && node tests/playwright-restart-parity.test.js` |
| **Estimated runtime** | ~240 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every wave:** Run the corresponding wave gate command
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 240 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | AUTO-04 | contract | `test -f tests/determinism-contract.test.js && node --test tests/determinism-contract.test.js` | ✅ existing | ⬜ pending |
| 11-01-02 | 01 | 1 | AUTO-04 | syntax + build | `test -f tests/helpers/playwright-game.js && node --input-type=module -e "import('./tests/helpers/playwright-game.js')" && npm run build` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | AUTO-05 | browser replay | `test -f tests/playwright-determinism-replay.test.js && node tests/playwright-determinism-replay.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 2 | AUTO-05 | build + replay | `test -f tests/playwright-determinism-replay.test.js && npm run build && node tests/playwright-determinism-replay.test.js` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 3 | AUTO-06 | browser route | `test -f tests/playwright-breakables-loot.test.js && node tests/playwright-breakables-loot.test.js` | ✅ existing | ⬜ pending |
| 11-03-02 | 03 | 3 | AUTO-07 | browser route | `test -f tests/playwright-levelup-choice.test.js && test -f tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-progression-levels.test.js` | ✅ existing | ⬜ pending |
| 11-04-01 | 04 | 4 | AUTO-08 | browser reset | `test -f tests/playwright-restart-parity.test.js && node tests/playwright-restart-parity.test.js` | ❌ W0 | ⬜ pending |
| 11-04-02 | 04 | 4 | AUTO-04, AUTO-05, AUTO-06, AUTO-07, AUTO-08 | phase regression gate | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-map-sectors.test.js && node tests/playwright-building-tactics.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-determinism-replay.test.js && node tests/playwright-restart-parity.test.js` | ❌ partial W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/playwright-game.js` — shared Playwright helper skeleton and scripted timeline support
- [ ] `tests/playwright-determinism-replay.test.js` — dual-session deterministic replay route
- [ ] `tests/playwright-restart-parity.test.js` — unified equipment/progression restart reset route
- [x] `tests/determinism-contract.test.js` — snapshot contract baseline already exists
- [x] `tests/playwright-burst.test.js` — baseline smoke route already exists
- [x] `tests/playwright-map-sectors.test.js` — sector traversal browser route already exists
- [x] `tests/playwright-building-tactics.test.js` — tactical building browser route already exists
- [x] `tests/playwright-breakables-loot.test.js` — loot/equipment browser route already exists
- [x] `tests/playwright-progression-levels.test.js` — progression browser route already exists
- [x] `tests/playwright-levelup-choice.test.js` — level-up choice browser route already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Headless screenshot 仅作为调试工件时，artifact 名称和目录是否仍便于人工定位 | AUTO-06, AUTO-07, AUTO-08 | 可维护性和排障体验仍需要一次人工 spot-check，但不替代 deterministic/browser assertions | 抽查 `.planning/artifacts/phase-11/` 中 replay 与 restart parity 产物命名是否能直接映射到对应 route 和失败场景。 |

---

## Snapshot Contract Checks

- `schemaVersion` must be `1.4.0`.
- `rngState` must expose `runSeed`, `spawnRngState`, `dropRngState`, and `offerRngState`.
- `world` must retain stable traversal/building/breakable summaries used by v1.1 assertions.
- `lootState` must retain `groundDrops`, `dropRngState`, and `pendingPickupId`.
- `equipmentState` must retain `slots`, `derivedStats`, and `compareCandidate`.
- `progressionState` must retain `level`, `totalXp`, `pendingLevelUps`, and `eventSeq`.
- `levelUpState` must retain `activeEventId`, `currentOfferId`, `offeredChoices`, `selectedIndex`, `rerollsRemaining`, `offerSeq`, and `offerRngState`.
- `upgradeState` must retain `appliedChoices`, `skillModifiers`, and `talentModifiers`.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 240s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

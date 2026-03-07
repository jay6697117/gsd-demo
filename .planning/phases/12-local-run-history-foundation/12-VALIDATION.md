---
phase: 12
slug: local-run-history-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for local standard-run history persistence and best-score surfaces.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright direct scripts |
| **Config file** | none — Node built-in test runner + existing browser helper |
| **Quick run command** | `test -f tests/meta-history.test.js && node --test tests/meta-history.test.js` |
| **Full suite command** | `test -f tests/meta-history.test.js && test -f tests/playwright-meta-history.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/meta-history.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-meta-history.test.js && node tests/playwright-restart-parity.test.js` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every wave:** Run the corresponding wave gate command (cumulative, file-existence-safe)
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | META-01 | unit | `test -f tests/meta-history.test.js && node --test tests/meta-history.test.js` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | META-01 | unit + build | `test -f tests/meta-history.test.js && node --test tests/meta-history.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | META-01 | integration | `test -f tests/meta-history.test.js && node --test tests/meta-history.test.js` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | META-02 | build + UI integration | `test -f tests/meta-history.test.js && npm run build && node --test tests/meta-history.test.js` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 3 | META-01, META-02 | browser persistence | `test -f tests/playwright-meta-history.test.js && node tests/playwright-meta-history.test.js` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 3 | META-01, META-02 | phase regression gate | `test -f tests/meta-history.test.js && test -f tests/playwright-meta-history.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/meta-history.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-meta-history.test.js && node tests/playwright-restart-parity.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/meta-history.test.js` — sorting, retention, de-duplication, standard-only persistence rules
- [ ] `tests/playwright-meta-history.test.js` — gameover write, reload persistence, start/gameover surface assertions
- [x] `tests/helpers/playwright-game.js` — shared browser lifecycle helper already exists
- [x] `tests/playwright-restart-parity.test.js` — restart parity baseline already exists
- [x] `tests/determinism-contract.test.js` — snapshot contract baseline already exists
- [x] `tests/playwright-burst.test.js` — baseline browser smoke already exists
- [x] `tests/playwright-breakables-loot.test.js` — v1.1 loot/equipment browser route already exists
- [x] `tests/playwright-progression-levels.test.js` — progression browser route already exists
- [x] `tests/playwright-levelup-choice.test.js` — level-up browser route already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Collapsed panel copy density on start/gameover remains readable without overpowering the main overlay CTA | META-02 | Visual hierarchy and copy fit are partially subjective even after browser assertions | Spot-check that the collapsed history summary reads as support information rather than replacing the primary start/restart CTA. |

---

## Snapshot Contract Checks

- `metaState.bestRuns` exists and is ordered by `Score -> Time -> Kills -> Level`, with stable fallback ordering.
- `metaState.bestRuns` exists and is bounded to `10` entries.
- `metaState.recentRuns` exists and is bounded to `20` entries.
- `metaState.isExpanded` exists and reflects panel state without requiring DOM-only assertions.
- Every stored record includes `id`, `mode`, `score`, `time`, `kills`, `level`, `seed`, and `playedAt`.
- No daily challenge fields or challenge identity leak into Phase 12 snapshot state.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

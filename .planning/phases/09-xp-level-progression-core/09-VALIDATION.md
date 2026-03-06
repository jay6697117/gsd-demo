---
phase: 09
slug: xp-level-progression-core
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for deterministic XP, level progression, and restart parity.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright |
| **Config file** | none — Node built-in test runner + local browser scripts |
| **Quick run command** | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js || echo 'W0 pending: tests/progression-system.test.js missing'` |
| **Full suite command** | `test -f tests/progression-system.test.js && test -f tests/playwright-progression-levels.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js || echo 'W0 pending: progression tests missing'` |
| **Estimated runtime** | ~150 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every plan wave:** Run the corresponding wave gate command (cumulative, file-existence-safe)
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 150 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PROG-02 | unit | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | PROG-02, PROG-03 | unit + build | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js && npm run build || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | PROG-01 | integration | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | PROG-01, PROG-03 | integration + build | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js && npm run build || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 3 | PROG-04 | contract | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js tests/determinism-contract.test.js || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-03-02 | 03 | 3 | PROG-04 | contract + build | `test -f tests/progression-system.test.js && node --test tests/progression-system.test.js tests/determinism-contract.test.js && npm run build || echo 'W0 pending: tests/progression-system.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-04-01 | 04 | 4 | PROG-05 | e2e | `test -f tests/playwright-progression-levels.test.js && node tests/playwright-progression-levels.test.js || echo 'W0 pending: tests/playwright-progression-levels.test.js missing'` | ❌ W0 | ⬜ pending |
| 09-04-02 | 04 | 4 | PROG-01, PROG-02, PROG-03, PROG-04, PROG-05 | phase regression gate | `test -f tests/progression-system.test.js && test -f tests/playwright-progression-levels.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js || echo 'W0 pending: progression tests missing'` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/progression-system.test.js` — XP gain, threshold window, event queue, restart-parity pure assertions
- [ ] `tests/playwright-progression-levels.test.js` — kill -> xp -> level-up cue browser route assertions
- [x] `tests/world-sectors.test.js` — traversal baseline already exists
- [x] `tests/building-system.test.js` — building baseline already exists
- [x] `tests/building-tactics.test.js` — tactical building baseline already exists
- [x] `tests/building-steering.test.js` — steering baseline already exists
- [x] `tests/breakable-system.test.js` — breakable baseline already exists
- [x] `tests/drop-system.test.js` — loot baseline already exists
- [x] `tests/equipment-system.test.js` — equipment baseline already exists
- [x] `tests/determinism-contract.test.js` — deterministic snapshot baseline already exists
- [x] `tests/playwright-breakables-loot.test.js` — existing loot browser regression already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `LEVEL UP` cue 是否足够清晰但不会打断战斗节奏 | PROG-04 | 提示可读性仍含主观判断，但不能替代自动化逻辑验证 | 在首次升级触发时确认 HUD/banner 能明确暴露升级到达，同时玩家仍可继续移动与攻击，且不进入新的暂停态。 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 150s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

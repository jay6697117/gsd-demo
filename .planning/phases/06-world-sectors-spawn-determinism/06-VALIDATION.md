---
phase: 06
slug: world-sectors-spawn-determinism
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-05
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for world sectors and deterministic spawn behavior.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test + Playwright |
| **Config file** | none — Node built-in test runner + local script |
| **Quick run command** | `node --test tests/world-sectors.test.js` |
| **Full suite command** | `npm run build && node --test tests/world-sectors.test.js tests/spawn-director.test.js tests/determinism-contract.test.js && node tests/playwright-map-sectors.test.js` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every plan wave:** Run full suite command
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MAP-01 | unit/integration | `node --test tests/world-sectors.test.js` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | MAP-02 | unit/integration | `node --test tests/world-sectors.test.js` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | MAP-03 | unit/contract | `node --test tests/spawn-director.test.js tests/determinism-contract.test.js` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | MAP-04 | e2e + build | `node tests/playwright-map-sectors.test.js && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/world-sectors.test.js` — topology connectivity and boundary traversal assertions
- [ ] `tests/spawn-director.test.js` — sector-weighted spawn scheduling determinism assertions
- [ ] `tests/playwright-map-sectors.test.js` — three-sector traversal and readability signal e2e assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safe lane vs choke readability under combat pressure | MAP-04 | Final visual clarity is partially subjective | Run a combat session, traverse at least 3 sectors, verify routes and choke zones are visually distinguishable without pausing. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

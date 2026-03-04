---
phase: 05
slug: automation-determinism-harness
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for deterministic automation harness coverage.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test + Playwright |
| **Config file** | none — Node built-in test runner + local script |
| **Quick run command** | `node --test tests/determinism-contract.test.js` |
| **Full suite command** | `npm run build && node --test tests/determinism-contract.test.js tests/control-rules.test.js tests/feedback-rules.test.js && node tests/playwright-burst.test.js` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every plan wave:** Run full suite command
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | AUTO-01 | unit/integration | `node --test tests/determinism-contract.test.js` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | AUTO-02 | unit/integration + build | `node --test tests/determinism-contract.test.js && npm run build` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 2 | AUTO-03 | e2e burst | `node tests/playwright-burst.test.js` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 2 | AUTO-03 | e2e + build | `node tests/playwright-burst.test.js && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Validate burst artifacts are visually readable (screenshot sanity) | AUTO-03 | Artifact usability is partly subjective | Open generated screenshot and ensure player/enemy/HUD are visible in captured frame. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

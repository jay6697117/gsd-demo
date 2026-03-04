---
phase: 04
slug: control-state-hardening
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for control-state hardening feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test |
| **Config file** | none — Node built-in test runner |
| **Quick run command** | `node --test tests/control-rules.test.js` |
| **Full suite command** | `npm run build && node --test tests/control-rules.test.js tests/feedback-rules.test.js` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/control-rules.test.js`
- **After every plan wave:** Run `npm run build && node --test tests/control-rules.test.js tests/feedback-rules.test.js`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CORE-04 | unit + build | `node --test tests/control-rules.test.js && npm run build` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | UX-01, UX-03 | unit + build | `node --test tests/control-rules.test.js && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toggle fullscreen with `f`, exit with `Esc`, then continue movement/attack | UX-01 | Browser fullscreen permissions and key routing are environment-dependent | Start run, press `f`, verify fullscreen enters; press `Esc`, verify fullscreen exits; confirm controls still work. |
| Lose focus and regain focus without phantom movement/attack | UX-03 | Focus behavior requires real browser/window state | Hold move key, switch away from tab/window, return, verify game is paused and no stuck key remains, resume with `P`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

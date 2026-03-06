---
phase: 07
slug: building-tactical-layer
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for tactical building execution and deterministic regression safety.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright |
| **Config file** | none — Node built-in test runner + local browser scripts |
| **Quick run command** | `node --test tests/building-system.test.js` |
| **Full suite command** | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/determinism-contract.test.js && node tests/playwright-building-tactics.test.js` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every plan wave:** Run the corresponding wave gate command (cumulative, file-existence-safe)
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BLD-01 | unit | `node --test tests/building-system.test.js` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | BLD-01 | unit/contract + build | `node --test tests/building-system.test.js tests/determinism-contract.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | BLD-02 | integration | `node --test tests/building-system.test.js tests/building-tactics.test.js` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | BLD-02 | integration + build | `node --test tests/building-system.test.js tests/building-tactics.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | BLD-03 | unit/stress | `node --test tests/building-steering.test.js` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | BLD-03 | stress/integration + build | `node --test tests/building-steering.test.js tests/world-sectors.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 3 | BLD-04 | contract + build | `node --test tests/determinism-contract.test.js && npm run build` | ✅ | ⬜ pending |
| 07-04-02 | 04 | 3 | BLD-02, BLD-04 | e2e + build | `node tests/playwright-building-tactics.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 07-04-03 | 04 | 3 | BLD-01, BLD-02, BLD-03, BLD-04 | phase regression gate | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/determinism-contract.test.js && node tests/playwright-building-tactics.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/building-system.test.js` — archetype / preset / query / spawn-exclusion assertions
- [ ] `tests/building-tactics.test.js` — player tactical route and building-aware collision assertions
- [ ] `tests/building-steering.test.js` — enemy steering / unstuck stress assertions
- [ ] `tests/playwright-building-tactics.test.js` — three-sector tactical e2e assertions
- [x] `tests/world-sectors.test.js` — sector traversal and boundary baseline already exists
- [x] `tests/determinism-contract.test.js` — deterministic snapshot baseline already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `soft-cover` 是否能被玩家直观识别为“临时缓压口袋”而不是普通障碍 | BLD-02 | tactical readability 的最终感知仍有主观成分 | 进入至少一个 outer sector，在敌人压力下使用 `soft-cover` 完成一次 retreat pocket，确认玩家无需额外说明即可理解其战术用途。 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

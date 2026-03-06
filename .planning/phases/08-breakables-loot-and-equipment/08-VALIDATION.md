---
phase: 08
slug: breakables-loot-and-equipment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for deterministic breakable, loot, and equipment execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright |
| **Config file** | none — Node built-in test runner + local browser scripts |
| **Quick run command** | `node --test tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js` |
| **Full suite command** | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js` |
| **Estimated runtime** | ~135 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every plan wave:** Run the corresponding wave gate command (cumulative, file-existence-safe)
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 135 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | LOOT-01 | unit | `node --test tests/breakable-system.test.js` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | LOOT-01 | unit/contract + build | `node --test tests/breakable-system.test.js tests/determinism-contract.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | LOOT-02 | unit | `node --test tests/drop-system.test.js` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | LOOT-02, LOOT-05 | unit/contract + build | `node --test tests/drop-system.test.js tests/determinism-contract.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | LOOT-03 | unit/integration | `node --test tests/equipment-system.test.js` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 3 | LOOT-04 | integration + build | `node --test tests/equipment-system.test.js tests/determinism-contract.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 4 | LOOT-05 | contract + build | `node --test tests/determinism-contract.test.js && npm run build` | ✅ | ⬜ pending |
| 08-04-02 | 04 | 4 | LOOT-01, LOOT-02, LOOT-03, LOOT-04, LOOT-05 | e2e + regression | `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/breakable-system.test.js` — breakable catalog / lifecycle / attack-order assertions
- [ ] `tests/drop-system.test.js` — weighted drop resolver / rarity / descriptor ordering assertions
- [ ] `tests/equipment-system.test.js` — pickup, compare, reject re-entry, derived stat application assertions
- [ ] `tests/playwright-breakables-loot.test.js` — breakable -> loot -> equip browser route assertions
- [x] `tests/world-sectors.test.js` — sector traversal baseline already exists
- [x] `tests/building-system.test.js` — building tactical baseline already exists
- [x] `tests/building-tactics.test.js` — tactical route baseline already exists
- [x] `tests/building-steering.test.js` — enemy steering baseline already exists
- [x] `tests/determinism-contract.test.js` — deterministic snapshot baseline already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| compare overlay 的新旧属性差值是否足够直观，不需要猜测替换结果 | LOOT-04 | 视觉可读性仍含主观判断，但不能替代自动化逻辑验证 | 打碎一个会触发替换比较的 breakable，确认 overlay 同时展示旧装备、新装备、stat delta，并且在 `Enter` / `Escape` 两种分支下文案与结果一致。 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 135s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

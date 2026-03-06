---
phase: 10
slug: skill-talent-choice-engine
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for deterministic skill/talent offers, level-up choice flow, reroll behavior, and immediate upgrade effects.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + Playwright |
| **Config file** | none — Node built-in test runner + local browser scripts |
| **Quick run command** | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js` |
| **Full suite command** | `test -f tests/levelup-system.test.js && test -f tests/playwright-levelup-choice.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-scoped automated command(s)
- **After every wave:** Run the corresponding wave gate command
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | TAL-03 | unit | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | TAL-03, TAL-04 | unit + build | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | TAL-01 | integration | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | TAL-01, TAL-02 | integration + build | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | TAL-05 | contract | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js tests/determinism-contract.test.js` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 3 | TAL-05 | contract + build | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js tests/determinism-contract.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 4 | TAL-06 | contract | `test -f tests/levelup-system.test.js && node --test tests/levelup-system.test.js tests/determinism-contract.test.js` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 4 | TAL-01, TAL-02, TAL-03, TAL-04, TAL-05, TAL-06 | phase regression gate | `test -f tests/levelup-system.test.js && test -f tests/playwright-levelup-choice.test.js && npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/determinism-contract.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-levelup-choice.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/levelup-system.test.js` — offer generation, filtering, queue consumption, apply-effect, reroll deterministic assertions
- [ ] `tests/playwright-levelup-choice.test.js` — level-up panel route with confirm/reroll/effect assertions
- [x] `tests/progression-system.test.js` — progression baseline already exists
- [x] `tests/determinism-contract.test.js` — deterministic snapshot baseline already exists
- [x] `tests/world-sectors.test.js` — traversal baseline already exists
- [x] `tests/building-system.test.js` — building baseline already exists
- [x] `tests/building-tactics.test.js` — tactical building baseline already exists
- [x] `tests/building-steering.test.js` — steering baseline already exists
- [x] `tests/breakable-system.test.js` — breakable baseline already exists
- [x] `tests/drop-system.test.js` — loot baseline already exists
- [x] `tests/equipment-system.test.js` — equipment baseline already exists
- [x] `tests/playwright-breakables-loot.test.js` — existing loot browser regression already exists
- [x] `tests/playwright-progression-levels.test.js` — existing progression browser regression already exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| level-up panel 焦点高亮、文案和 reroll 提示是否清晰 | TAL-01, TAL-06 | 视觉可读性仍有主观成分，但不能替代 deterministic 验证 | 在首次升级触发时确认 3 个选项、当前焦点和 reroll 提示都能被用户明确识别，且 panel 关闭后 HUD/战斗恢复正常。 |

---

## Snapshot Contract Checks

- `levelUpState` must expose `activeEventId`, `currentOfferId`, `offeredChoices`, `selectedIndex`, `rerollsRemaining`, `offerSeq`, and `offerRngState`.
- `upgradeState` must expose `appliedChoices`, `skillModifiers`, and `talentModifiers`.
- `10-02` verification must assert `equip_compare > levelup_choice > playing`, `KeyP` ignored in `levelup_choice`, and `Escape` does not dismiss the panel.
- `10-04` verification must assert that each level-up event permits exactly one reroll and that additional reroll attempts are deterministic no-ops.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

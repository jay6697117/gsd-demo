# Requirements: PokeThrees Hunter

**Defined:** 2026-03-05
**Core Value:** 玩家在 30 秒内就能感受到“清晰可读的像素美术 + 准确响应的战斗操作 + 明确成长反馈”的核心乐趣。
**Active Milestone:** v1.1 World & Growth Overhaul

## v1.1 Requirements

### World & Map

- [x] **MAP-01**: User can enter and traverse at least 3 connected map sectors in one run.
- [x] **MAP-02**: User movement and enemy pursuit remain collision-stable at sector boundaries.
- [x] **MAP-03**: Enemy spawn distribution follows sector rules and is deterministic for the same seed and timeline.
- [x] **MAP-04**: User can recognize safe lanes/choke zones visually during active combat.

### Buildings

- [x] **BLD-01**: User can encounter at least 3 building archetypes with distinct tactical behavior (`blocker`, `funnel`, `soft-cover`).
- [x] **BLD-02**: User can leverage buildings to reduce immediate pressure (line-break, kite pivot, retreat window).
- [x] **BLD-03**: Enemy steering handles building obstacles without persistent stuck/loop behavior.
- [x] **BLD-04**: Building interactions do not break deterministic combat state transitions.

### Breakables, Loot, and Equipment

- [x] **LOOT-01**: User can damage and destroy tagged breakable props during combat.
- [x] **LOOT-02**: Destroyed props can roll equipment drops from weighted deterministic drop tables.
- [x] **LOOT-03**: User can pick up equipment and place it into defined slots (`weapon`, `core`, `charm`).
- [x] **LOOT-04**: User can replace currently equipped items with clear stat-delta feedback.
- [x] **LOOT-05**: Drop outcomes are reproducible under identical seed and input timeline.

### Progression

- [x] **PROG-01**: User gains XP from monster kills.
- [x] **PROG-02**: User levels up when XP crosses configurable thresholds.
- [x] **PROG-03**: User receives exactly one level-up decision event per threshold crossing.
- [x] **PROG-04**: User sees level and XP progress in HUD during combat.
- [x] **PROG-05**: New run/restart resets run-local progression state without leaking previous run values.

### Skills & Talents

- [ ] **TAL-01**: User is offered 3 upgrade choices at each level-up event.
- [ ] **TAL-02**: User can select exactly one option and resume combat without input lock.
- [ ] **TAL-03**: Choice pool supports both skill-type and talent-type upgrades with eligibility/exclusion constraints.
- [ ] **TAL-04**: Duplicate or invalid options are filtered out from a single choice panel.
- [ ] **TAL-05**: Applied upgrades produce immediate measurable combat-state impact.
- [ ] **TAL-06**: Upgrade flow supports advanced high-complexity controls (reroll and pool constraints) with deterministic behavior.

### Determinism & Testability

- [ ] **AUTO-04**: `window.render_game_to_text()` includes world/progression/equipment/offer/rng fields required for v1.1 assertions.
- [ ] **AUTO-05**: `window.advanceTime(ms)` preserves deterministic outcomes across map, drop, and level-up pipelines.
- [ ] **AUTO-06**: Automated tests cover `breakable -> drop -> equip` end-to-end flow.
- [ ] **AUTO-07**: Automated tests cover `kill -> xp -> levelup -> choose-upgrade` end-to-end flow.
- [ ] **AUTO-08**: Regression tests verify restart parity for progression and equipment state reset.

## Future Requirements (v1.2+)

### Meta Layer

- **META-01**: User can view local best-score history across runs.
- **META-02**: User can play daily seeded challenge runs.

### Extended Progression

- **PROG-06**: User can access persistent cross-run progression.
- **PROG-07**: User can manage long-term equipment inventory and stash.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Official Pokemon character/assets reproduction | Copyright/legal risk, replaced by original pixel art designs |
| Online multiplayer/co-op/PvP | Not part of current single-run progression milestone |
| Story campaign and quest tree | Would dilute focus from world/growth core loop |
| Fully procedural infinite map streaming | High runtime and tooling complexity; deferred beyond v1.1 |
| Full destructible terrain physics | Conflicts with deterministic movement/pathing guarantees |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 06 | Complete |
| MAP-02 | Phase 06 | Complete |
| MAP-03 | Phase 06 | Complete |
| MAP-04 | Phase 06 | Complete |
| BLD-01 | Phase 07 | Complete |
| BLD-02 | Phase 07 | Complete |
| BLD-03 | Phase 07 | Complete |
| BLD-04 | Phase 07 | Complete |
| LOOT-01 | Phase 08 | Complete |
| LOOT-02 | Phase 08 | Complete |
| LOOT-03 | Phase 08 | Complete |
| LOOT-04 | Phase 08 | Complete |
| LOOT-05 | Phase 08 | Complete |
| PROG-01 | Phase 09 | Complete |
| PROG-02 | Phase 09 | Complete |
| PROG-03 | Phase 09 | Complete |
| PROG-04 | Phase 09 | Complete |
| PROG-05 | Phase 09 | Complete |
| TAL-01 | Phase 10 | Pending |
| TAL-02 | Phase 10 | Pending |
| TAL-03 | Phase 10 | Pending |
| TAL-04 | Phase 10 | Pending |
| TAL-05 | Phase 10 | Pending |
| TAL-06 | Phase 10 | Pending |
| AUTO-04 | Phase 11 | Pending |
| AUTO-05 | Phase 11 | Pending |
| AUTO-06 | Phase 11 | Pending |
| AUTO-07 | Phase 11 | Pending |
| AUTO-08 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-06 after Phase 09 completion*

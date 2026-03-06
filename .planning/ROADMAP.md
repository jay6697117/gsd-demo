# Roadmap: PokeThrees Hunter (v1.1 World & Growth Overhaul)

**Generated:** 2026-03-05
**Source baseline:** `PROJECT.md`, `REQUIREMENTS.md` (v1.1), `research/SUMMARY.md`, `config.json`

## Phase Overview

| Phase | Goal | Requirement Count |
|------|------|-------------------|
| Phase 06 | Deliver scalable world sectors with deterministic traversal and spawn rules | 4 |
| Phase 07 | Integrate tactical building archetypes with stable collision and steering behavior | 4 |
| Phase 08 | Ship deterministic breakable -> loot -> equip combat loop | 5 |
| Phase 09 | Establish configurable XP/level progression and in-run reset correctness | 5 |
| Phase 10 | Implement deterministic level-up choices with skill/talent constraints | 6 |
| Phase 11 | Harden v1.1 observability and end-to-end deterministic regression coverage | 5 |

## Phase 06: World Sectors & Spawn Determinism

**Phase Goal:** Deliver scalable world sectors with deterministic traversal and spawn rules.
**Goal:** Deliver scalable world sectors with deterministic traversal and spawn rules.
**Execution Status:** Complete
**Verification:** Passed (`06-VERIFICATION.md`)
**Plans:** 4/4 plans complete

**Requirements**: [MAP-01, MAP-02, MAP-03, MAP-04]

**Requirement Mapping (4):**
- MAP-01
- MAP-02
- MAP-03
- MAP-04

**Observable Success Criteria:**
- One run supports seamless traversal across at least 3 connected sectors without scene reload.
- Player movement and enemy chase remain collision-stable when crossing sector boundaries.
- Spawn distribution follows sector configuration and replays identically under same seed + timeline.
- Combat space readability clearly exposes safe lanes and choke zones during active pressure.

## Phase 07: Building Tactical Layer

**Phase Goal:** Integrate tactical building archetypes with stable collision and steering behavior.
**Goal:** Integrate tactical building archetypes with stable collision and steering behavior.
**Execution Status:** Planned
**Verification:** Pending (`07-VERIFICATION.md`)
**Plans:** 1/4 plans executed

**Requirements**: [BLD-01, BLD-02, BLD-03, BLD-04]

**Requirement Mapping (4):**
- BLD-01
- BLD-02
- BLD-03
- BLD-04

**Observable Success Criteria:**
- At least 3 building archetypes (`blocker`, `funnel`, `soft-cover`) appear with distinct tactical roles.
- Users can reliably create line-break, kite pivot, and retreat windows using buildings.
- Enemy steering avoids persistent stuck loops around building geometry in stress scenarios.
- Building interactions preserve deterministic combat state transitions across replay runs.

## Phase 08: Breakables, Loot, and Equipment

**Phase Goal:** Ship deterministic breakable -> loot -> equip combat loop.
**Goal:** Ship deterministic breakable -> loot -> equip combat loop.
**Execution Status:** Pending
**Verification:** Pending (`08-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [LOOT-01, LOOT-02, LOOT-03, LOOT-04, LOOT-05]

**Requirement Mapping (5):**
- LOOT-01
- LOOT-02
- LOOT-03
- LOOT-04
- LOOT-05

**Observable Success Criteria:**
- Tagged breakable props can be damaged and destroyed during normal combat flow.
- Destroyed props resolve deterministic weighted drops from configured drop tables.
- Picked equipment can be equipped into `weapon`, `core`, and `charm` slots.
- Replacing equipped items shows clear stat delta feedback before/after swap.
- Identical seed + input timeline reproduces identical drop outcomes end-to-end.

## Phase 09: XP & Level Progression Core

**Phase Goal:** Establish configurable XP/level progression and in-run reset correctness.
**Goal:** Establish configurable XP/level progression and in-run reset correctness.
**Execution Status:** Pending
**Verification:** Pending (`09-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [PROG-01, PROG-02, PROG-03, PROG-04, PROG-05]

**Requirement Mapping (5):**
- PROG-01
- PROG-02
- PROG-03
- PROG-04
- PROG-05

**Observable Success Criteria:**
- Monster kills consistently grant XP through one canonical event pipeline.
- Level thresholds are configurable and trigger level-up when crossed.
- Each threshold crossing emits exactly one level-up decision event.
- HUD continuously displays current level and XP progression during combat.
- Restart/new run fully resets run-local progression state with no leakage from prior runs.

## Phase 10: Skill/Talent Choice Engine

**Phase Goal:** Implement deterministic level-up choices with skill/talent constraints.
**Goal:** Implement deterministic level-up choices with skill/talent constraints.
**Execution Status:** Pending
**Verification:** Pending (`10-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [TAL-01, TAL-02, TAL-03, TAL-04, TAL-05, TAL-06]

**Requirement Mapping (6):**
- TAL-01
- TAL-02
- TAL-03
- TAL-04
- TAL-05
- TAL-06

**Observable Success Criteria:**
- Every level-up shows exactly 3 upgrade options in the selection panel.
- User selects exactly one option and combat resumes without control lock.
- Option generation supports both skill and talent pools with eligibility/exclusion rules.
- Invalid or duplicate options are removed from each offer set before display.
- Applied upgrade effects are immediately measurable in combat state.

## Phase 11: Automation & Determinism Hardening

**Phase Goal:** Harden v1.1 observability and end-to-end deterministic regression coverage.
**Goal:** Harden v1.1 observability and end-to-end deterministic regression coverage.
**Execution Status:** Pending
**Verification:** Pending (`11-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [AUTO-04, AUTO-05, AUTO-06, AUTO-07, AUTO-08]

**Requirement Mapping (5):**
- AUTO-04
- AUTO-05
- AUTO-06
- AUTO-07
- AUTO-08

**Observable Success Criteria:**
- `window.render_game_to_text()` exposes world/progression/equipment/offer/rng fields required by v1.1 assertions.
- `window.advanceTime(ms)` remains deterministic across world, drop, and level-up pipelines.
- Automated tests verify `breakable -> drop -> equip` end-to-end behavior.
- Automated tests verify `kill -> xp -> levelup -> choose-upgrade` end-to-end behavior.
- Regression tests confirm restart parity for progression and equipment reset state.

## Coverage Statistics (v1.1)

| Metric | Value |
|-------|-------|
| Total v1.1 requirements | 29 |
| Mapped requirements | 29 |
| Unmapped requirements | 0 |
| Multi-phase mapped requirements | 0 |
| Coverage | 100% |

## Requirement-to-Phase Index

| Requirement | Phase |
|-------------|-------|
| MAP-01 | Phase 06 |
| MAP-02 | Phase 06 |
| MAP-03 | Phase 06 |
| MAP-04 | Phase 06 |
| BLD-01 | Phase 07 |
| BLD-02 | Phase 07 |
| BLD-03 | Phase 07 |
| BLD-04 | Phase 07 |
| LOOT-01 | Phase 08 |
| LOOT-02 | Phase 08 |
| LOOT-03 | Phase 08 |
| LOOT-04 | Phase 08 |
| LOOT-05 | Phase 08 |
| PROG-01 | Phase 09 |
| PROG-02 | Phase 09 |
| PROG-03 | Phase 09 |
| PROG-04 | Phase 09 |
| PROG-05 | Phase 09 |
| TAL-01 | Phase 10 |
| TAL-02 | Phase 10 |
| TAL-03 | Phase 10 |
| TAL-04 | Phase 10 |
| TAL-05 | Phase 10 |
| TAL-06 | Phase 10 |
| AUTO-04 | Phase 11 |
| AUTO-05 | Phase 11 |
| AUTO-06 | Phase 11 |
| AUTO-07 | Phase 11 |
| AUTO-08 | Phase 11 |

---
*Roadmap status: Phase 07 planned, ready to execute (milestone v1.1 active)*

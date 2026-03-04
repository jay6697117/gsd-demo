# Roadmap: PokeThrees Hunter (v1)

**Generated:** 2026-03-04
**Source baseline:** `PROJECT.md`, `REQUIREMENTS.md` (v1), `research/SUMMARY.md`, `config.json`

## Phase Overview

| Phase | Goal | Requirement Count |
|------|------|-------------------|
| Phase 1 | Build playable shell and HD pixel baseline | 4 |
| Phase 2 | Deliver deterministic combat core and core HUD loop | 9 |
| Phase 3 | Add high-signal hit/kill feedback polish | 1 |
| Phase 4 | Harden control/state transitions (pause/focus/fullscreen) | 3 |
| Complete    | 2026-03-04 | 3 |

## Phase 1: Runtime Skeleton & Pixel Baseline

**Phase Goal:** Let players enter combat quickly from a clear start flow while establishing non-blurry HD pixel rendering and onboarding hints.
**Goal:** Let players enter combat quickly from a clear start flow while establishing non-blurry HD pixel rendering and onboarding hints.

**Requirements**: [CORE-01, VIZ-01, VIZ-02, UX-02]

**Requirement Mapping (4):**
- CORE-01
- VIZ-01
- VIZ-02
- UX-02

**Observable Success Criteria:**
- User can reach combat from start screen within 2 interactions in manual test and scripted flow.
- Pixel visuals remain nearest-neighbor crisp at normal gameplay zoom (no smoothing artifacts on core sprites).
- Scene layering clearly separates foreground gameplay entities from background decoration.
- Pre-combat control hint is visible and readable without opening extra menus.

## Phase 2: Deterministic Combat Core

**Phase Goal:** Deliver the full survivable combat loop with deterministic hit logic, enemy pressure, HP/score progression, and death/restart closure.
**Goal:** Deliver the full survivable combat loop with deterministic hit logic, enemy pressure, HP/score progression, and death/restart closure.
**Execution Status:** Complete (2026-03-04)
**Verification:** Passed (`02-VERIFICATION.md`)
**Plans:** 2/2 plans complete

**Requirements**: [CORE-02, CORE-03, COMB-01, COMB-02, COMB-03, COMB-04, COMB-05, COMB-06, VIZ-04]

**Requirement Mapping (9):**
- CORE-02
- CORE-03
- COMB-01
- COMB-02
- COMB-03
- COMB-04
- COMB-05
- COMB-06
- VIZ-04

**Observable Success Criteria:**
- Four-direction movement and primary attack both respond reliably to keyboard input under sustained play.
- Enemy spawn/pursuit continuously applies pressure in combat mode, and collisions/attacks reduce HP with visible feedback.
- Hit detection is deterministic for equivalent input/time slices, and kills remove enemies while incrementing kill/score counters.
- HUD updates in real time for HP, score, survival timer, and kills.
- On HP=0, game-over summary appears and restart returns player to active combat within 3 seconds.

## Phase 3: Impact Feedback Polish

**Phase Goal:** Improve perceived combat quality by making successful hits/kills immediately readable.
**Goal:** Improve perceived combat quality by making successful hits/kills immediately readable.
**Execution Status:** Complete (2026-03-04)
**Verification:** Passed (`03-VERIFICATION.md`)
**Plans:** 1/1 plans complete

**Requirements**: [VIZ-03]

**Requirement Mapping (1):**
- VIZ-03

**Observable Success Criteria:**
- Every successful hit triggers at least one short feedback channel (flash/shake/particles).
- Kill events present stronger feedback than non-lethal hits so users can distinguish outcomes instantly.

## Phase 4: Control & State Hardening

**Phase Goal:** Eliminate state corruption around pause/resume, focus changes, and fullscreen transitions.
**Goal:** Eliminate state corruption around pause/resume, focus changes, and fullscreen transitions.

**Requirements**: [CORE-04, UX-01, UX-03]

**Requirement Mapping (3):**
- CORE-04
- UX-01
- UX-03

**Observable Success Criteria:**
- Pause/resume does not leave stuck movement/attack states and does not desync gameplay timers.
- `f` toggles fullscreen and `Esc` exits fullscreen without breaking input responsiveness.
- After tab focus loss and regain, keyboard controls recover consistently without requiring page reload.

## Phase 5: Automation & Determinism Harness

**Phase Goal:** Make gameplay behavior machine-verifiable with stable simulation stepping and regression artifacts.
**Goal:** Make gameplay behavior machine-verifiable with stable simulation stepping and regression artifacts.

**Requirements**: [AUTO-01, AUTO-02, AUTO-03]

**Requirement Mapping (3):**
- AUTO-01
- AUTO-02
- AUTO-03

**Observable Success Criteria:**
- `window.render_game_to_text()` returns stable, gameplay-relevant JSON schema for assertions.
- `window.advanceTime(ms)` deterministically advances simulation for repeatable scenario testing.
- Playwright action bursts can run end-to-end and produce screenshots/state artifacts without runtime errors.

## Coverage Statistics (v1)

| Metric | Value |
|-------|-------|
| Total v1 requirements | 20 |
| Mapped requirements | 20 |
| Unmapped requirements | 0 |
| Multi-phase mapped requirements | 0 |
| Coverage | 100% |

## Requirement-to-Phase Index

| Requirement | Phase |
|-------------|-------|
| CORE-01 | Phase 1 |
| CORE-02 | Phase 2 |
| CORE-03 | Phase 2 |
| CORE-04 | Phase 4 |
| COMB-01 | Phase 2 |
| COMB-02 | Phase 2 |
| COMB-03 | Phase 2 |
| COMB-04 | Phase 2 |
| COMB-05 | Phase 2 |
| COMB-06 | Phase 2 |
| VIZ-01 | Phase 1 |
| VIZ-02 | Phase 1 |
| VIZ-03 | Phase 3 |
| VIZ-04 | Phase 2 |
| UX-01 | Phase 4 |
| UX-02 | Phase 1 |
| UX-03 | Phase 4 |
| AUTO-01 | Phase 5 |
| AUTO-02 | Phase 5 |
| AUTO-03 | Phase 5 |

---
*Roadmap status: Phase 3 complete; Phase 4 ready for execution*

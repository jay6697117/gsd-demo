# Requirements: PokeThrees Hunter

**Defined:** 2026-03-04
**Core Value:** 玩家在 30 秒内就能感受到“清晰可读的像素美术 + 准确响应的战斗操作 + 明确成长反馈”的核心乐趣。

## v1 Requirements

### Core Loop

- [x] **CORE-01**: User can start a run from a start screen and enter combat within 2 interactions.
- [ ] **CORE-02**: User can lose the run when HP reaches 0 and see a game-over summary.
- [ ] **CORE-03**: User can restart from game-over and return to combat within 3 seconds.
- [ ] **CORE-04**: User can pause and resume gameplay without corrupting movement/attack state.

### Combat

- [ ] **COMB-01**: User can move the player character in four directions using keyboard input.
- [ ] **COMB-02**: User can trigger a primary attack with a clear cooldown feedback.
- [ ] **COMB-03**: User attack can damage enemies with deterministic hit detection.
- [ ] **COMB-04**: Enemy units spawn continuously and pursue the player in combat mode.
- [ ] **COMB-05**: Enemy contact or attacks can reduce player HP with visible feedback.
- [ ] **COMB-06**: Enemy death removes enemy from active world and increments kill count.

### Feedback & Pixel Art

- [x] **VIZ-01**: User sees HD pixel art style rendering with nearest-neighbor visual clarity.
- [x] **VIZ-02**: User sees layered background and readable foreground contrast during combat.
- [ ] **VIZ-03**: User sees hit/kill feedback (flash, shake, or particles) when attacks land.
- [ ] **VIZ-04**: User sees real-time HUD values for HP, score, time survived, and kills.

### Controls & UX

- [ ] **UX-01**: User can toggle fullscreen with `f` and exit fullscreen with `Esc`.
- [x] **UX-02**: User can view minimal control hints before gameplay starts.
- [ ] **UX-03**: User can continue reliable keyboard control after focus change and resume.

### Testability & Determinism

- [ ] **AUTO-01**: User (or automation) can call `window.render_game_to_text()` to get current gameplay-relevant JSON state.
- [ ] **AUTO-02**: User (or automation) can call `window.advanceTime(ms)` to deterministically step simulation time.
- [ ] **AUTO-03**: Automated Playwright action bursts can progress gameplay and produce screenshots/state artifacts without runtime errors.

## v2 Requirements

### Progression & Replayability

- **PROG-01**: User can choose one upgrade from 3 options at timed intervals.
- **PROG-02**: User can build kill-chain multiplier bonuses through continuous eliminations.
- **PROG-03**: User can fight multiple enemy archetypes with distinct attack patterns.

### Meta Layer

- **META-01**: User can view local best-score history across runs.
- **META-02**: User can play daily seeded challenge runs.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Official Pokemon character/assets reproduction | Copyright/legal risk, replaced with original pixel creatures inspired by monster-battle fantasy |
| Online multiplayer/co-op/PvP | High networking complexity, not needed to validate v1 core combat loop |
| Open world exploration and story campaign | Content-heavy scope that delays combat core validation |
| Full equipment/inventory RPG systems | Adds UI/state complexity before core loop maturity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 4 | Pending |
| COMB-01 | Phase 2 | Pending |
| COMB-02 | Phase 2 | Pending |
| COMB-03 | Phase 2 | Pending |
| COMB-04 | Phase 2 | Pending |
| COMB-05 | Phase 2 | Pending |
| COMB-06 | Phase 2 | Pending |
| VIZ-01 | Phase 1 | Complete |
| VIZ-02 | Phase 1 | Complete |
| VIZ-03 | Phase 3 | Pending |
| VIZ-04 | Phase 2 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 1 | Complete |
| UX-03 | Phase 4 | Pending |
| AUTO-01 | Phase 5 | Pending |
| AUTO-02 | Phase 5 | Pending |
| AUTO-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after initial definition*

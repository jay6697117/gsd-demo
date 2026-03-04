---
phase: 02-deterministic-combat-core
plan: 01
subsystem: combat
tags: [determinism, input, cooldown, hit-detection]
requires: []
provides:
  - deterministic movement input channel separation
  - deterministic attack cooldown and hit-resolution pipeline
  - render-independent combat random source handling
affects: [02-02, 03-impact-feedback-polish]
tech-stack:
  added: []
  patterns:
    - fixed-step edge-vs-held input handling
    - split simulation and visual random streams
key-files:
  created: []
  modified:
    - src/main.js
key-decisions:
  - "Consume edge-trigger keys once to avoid cross-mode duplicate actions."
  - "Use dedicated simulation RNG so render-frequency variance cannot alter combat outcomes."
patterns-established:
  - "Deterministic order: sort attack targets by enemy id before applying damage and kill resolution."
  - "Input discipline: sustained channels drive movement; edge channels drive one-shot actions."
requirements-completed: [COMB-01, COMB-02, COMB-03]
duration: 6 min
completed: 2026-03-04
---

# Phase 02 Plan 01: Deterministic Combat Foundations Summary

**Deterministic movement input and attack-hit resolution were hardened with render-independent random sequencing and stable enemy ordering.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T14:24:00Z
- **Completed:** 2026-03-04T14:30:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Separated edge-trigger consumption from held-state movement input, preventing stale key edges from leaking across modes.
- Removed residual velocity drift when no directional key is held, keeping movement deterministic under long fixed-step runs.
- Stabilized attack and kill-resolution flow by using deterministic enemy ordering and splitting simulation RNG from visual-only RNG.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden deterministic input and movement step behavior** - `f42e57c` (fix)
2. **Task 2: Stabilize attack trigger, cooldown, and hit detection path** - `6bbde87` (fix)

## Files Created/Modified
- `src/main.js` - Input edge handling, movement zero-drift behavior, deterministic attack sequencing, RNG stream split.

## Decisions Made
- Bound one-shot controls (`Space`, `P`, `F`, start/restart keys) to consume-once edge semantics to keep mode transitions deterministic.
- Detached simulation randomness from camera shake randomness so equivalent fixed-step inputs remain reproducible.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Deterministic combat foundation is complete and stable.
- Wave 2 can build pressure loops and gameover/restart closure on top of this baseline.

---
*Phase: 02-deterministic-combat-core*
*Completed: 2026-03-04*

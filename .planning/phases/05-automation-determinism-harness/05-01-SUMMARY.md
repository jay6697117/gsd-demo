---
phase: 05-automation-determinism-harness
plan: 01
subsystem: determinism-contract
tags: [determinism, contract, snapshot, advance-time]
requires: [04-01]
provides:
  - versioned deterministic snapshot contract for render_game_to_text
  - bounded fixed-step conversion for advanceTime
  - node:test contract suite for schema and repeatability
affects: [05-02, verification]
tech-stack:
  added: []
  patterns:
    - pure deterministic snapshot builder module
    - bounded fixed-step adapter for simulation stepping
key-files:
  created:
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
  modified:
    - src/main.js
key-decisions:
  - "Moved snapshot shaping and step conversion to pure helpers to make determinism behavior testable without browser runtime."
  - "Added upper bound to advance-step conversion to prevent pathological long-jump stepping while preserving deterministic behavior."
patterns-established:
  - "render_game_to_text is treated as versioned machine contract (`schemaVersion`)."
  - "advanceTime step count is computed through shared pure function (`computeAdvanceSteps`)."
requirements-completed: [AUTO-01, AUTO-02]
duration: 2 min
completed: 2026-03-05
---

# Phase 05 Plan 01: Determinism Contract Summary

**Runtime determinism bridge is now versioned, schema-stable, and backed by repeatability tests for both snapshot output and fixed-step conversion.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T07:35:00+08:00
- **Completed:** 2026-03-05T07:37:31+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `src/determinism-harness.js` with pure deterministic helpers (`buildDeterministicSnapshot`, `computeAdvanceSteps`) and schema versioning.
- Routed `window.render_game_to_text()` through deterministic snapshot builder for stable payload contract.
- Hardened `window.advanceTime(ms)` with shared fixed-step computation and deterministic step metadata tracking.
- Added `tests/determinism-contract.test.js` covering schema stability, repeatability, enemy sort determinism, and long-horizon step clamping.

## Task Commits

Each task was committed atomically:

1. **Task 1: Stabilize render_game_to_text contract schema for assertions** - `379a815` (feat)
2. **Task 2: Harden advanceTime deterministic stepping semantics** - `2a433e8` (fix)

**Plan metadata:** `4367943` (docs)

## Files Created/Modified
- `src/determinism-harness.js` - Pure deterministic contract and fixed-step helpers.
- `tests/determinism-contract.test.js` - Node contract tests for AUTO-01/AUTO-02 behavior.
- `src/main.js` - Snapshot and advance-time integration using deterministic helper module.

## Decisions Made
- Added explicit `schemaVersion` and determinism metadata to reduce future contract drift risk.
- Capped max advance steps (`MAX_ADVANCE_STEPS`) for deterministic safety under oversized time jumps.

## Deviations from Plan

None.

## Issues Encountered

None.

## Self-Check: PASSED

- [x] `node --test tests/determinism-contract.test.js` passes.
- [x] `npm run build` passes.
- [x] AUTO-01/AUTO-02 are mapped to machine-verifiable contract assertions.

## Next Phase Readiness
- Wave 2 can directly consume deterministic snapshot contract for browser burst assertions.
- Contract output now supports stable artifact comparison in Playwright harness.

---
*Phase: 05-automation-determinism-harness*
*Completed: 2026-03-05*

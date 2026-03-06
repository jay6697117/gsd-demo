---
phase: 06-world-sectors-spawn-determinism
plan: 03
subsystem: spawn-director
tags: [world, sectors, spawn, determinism, replay]
requires: [06-01, 06-02]
provides:
  - deterministic sector-aware spawn director with canonical sector ordering
  - runtime spawn state projection through render_game_to_text snapshot spawnState fields
  - reproducible sector spawn evidence via unit and determinism contract coverage
affects: [06-04]
tech-stack:
  added: []
  patterns:
    - pure spawn director separates sector weighting and selection from runtime side effects
    - spawn replay evidence is captured as stable ordered snapshot state for automation assertions
key-files:
  created:
    - src/spawn-director.js
    - tests/spawn-director.test.js
  modified:
    - src/main.js
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Locked spawn ordering to WORLD_SECTOR_IDS / provided sectorIds order and removed alphabetical resorting."
  - "Moved spawn-specific randomness onto explicit spawnRngState so sector selection, cooldown evidence, and snapshot replay fields stay inspectable."
patterns-established:
  - "Runtime refreshes spawnDirector telemetry each frame before attempting spawn decisions."
  - "Snapshot spawnState always exposes eventSeq, sectorWeights, sectorEnemyCounts, lastSpawnSectorId, spawnCooldown, and spawnRngState."
requirements-completed: [MAP-03]
duration: 9 min
completed: 2026-03-06
---

# Phase 06 Plan 03: Deterministic Sector Spawn Summary

**Sector-aware spawn distribution is now driven by a pure spawn director, and replay snapshots expose stable spawn-state evidence for MAP-03.**

## Performance

- **Duration:** 9 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `src/spawn-director.js` with pure APIs for per-sector enemy counts, weight computation, deterministic weighted selection, and explicit director state updates.
- Added `tests/spawn-director.test.js` to lock canonical ordering, deterministic picks, event sequencing, and cooldown / RNG state recording.
- Replaced global edge-only spawn selection in `src/main.js` with sector-directed spawn selection and explicit `state.spawnDirector` runtime state.
- Extended `src/determinism-harness.js` and `tests/determinism-contract.test.js` so snapshots include `world` and `spawnState` sections with stable ordered fields.

## Task Commits

1. **Task 1: Build sector-aware deterministic spawn director** - `565c3d2` (feat)
2. **Task 2: Integrate spawn director and extend deterministic snapshot contract** - `0de9add` (feat)

## Files Created/Modified

- `src/spawn-director.js` - Pure sector-weighted spawn selection and director state helpers.
- `tests/spawn-director.test.js` - Deterministic unit coverage for ordering, weighting, and event metadata.
- `src/main.js` - Runtime spawn integration, explicit spawn RNG state, and sector-based enemy placement.
- `src/determinism-harness.js` - Stable `world` and `spawnState` snapshot serialization.
- `tests/determinism-contract.test.js` - Snapshot contract assertions for spawn-state fields and replay parity.

## Decisions Made

- Canonical spawn ordering now follows the topology contract rather than alphabetical sector sorting.
- Spawn cooldown remains available through legacy `nextSpawnIn` while also being mirrored into `spawnState.spawnCooldown`.

## Deviations from Plan

- **[Rule 3 - Blocking] Recovered partial `06-03` draft files** — An earlier interrupted agent left untracked `spawn-director` draft files in the workspace. They were treated as disposable recovery input, rewritten to match the current planning and validation contract, and not counted as execution evidence.

## Issues Encountered

None after recovery; unit, contract, and build checks all passed on the finalized implementation.

## Self-Check: PASSED

- [x] `node --test tests/spawn-director.test.js` passes.
- [x] `node --test tests/spawn-director.test.js tests/determinism-contract.test.js` passes.
- [x] `npm run build` passes.

## User Setup Required

None.

## Next Phase Readiness

Plan `06-03` now supplies stable spawn-sector telemetry and replay fields required for `06-04` readability assertions and the final Phase 06 regression gate.

---
*Phase: 06-world-sectors-spawn-determinism*
*Completed: 2026-03-06*

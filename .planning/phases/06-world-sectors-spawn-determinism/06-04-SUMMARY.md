---
phase: 06-world-sectors-spawn-determinism
plan: 04
subsystem: readability-and-e2e
tags: [world, sectors, readability, hud, playwright]
requires: [06-02, 06-03]
provides:
  - topology-driven lane and choke readability signals tied to sector metadata
  - deterministic world.readability snapshot fields for HUD and automated assertions
  - end-to-end traversal coverage across three connected sectors under live combat pressure
affects: []
tech-stack:
  added: []
  patterns:
    - readability state is derived from topology plus live enemy counts rather than ad-hoc visual config
    - phase regression uses deterministic contract tests plus Playwright traversal evidence
key-files:
  created:
    - tests/playwright-map-sectors.test.js
  modified:
    - src/main.js
    - src/style.css
    - src/determinism-harness.js
    - tests/determinism-contract.test.js
key-decisions:
  - "Derived `world.readability` from sector topology, lane kinds, choke count, and live per-sector enemy counts so HUD and snapshot evidence share one source of truth."
  - "Allowed known WebGL fallback logs in Playwright verification because the game intentionally degrades to the noop renderer under headless constraints."
patterns-established:
  - "Ground texture, sector outlines, and lane beacons are all built from `WORLD_SECTORS` metadata."
  - "HUD pressure state mirrors deterministic snapshot readability fields and remains stable under `window.advanceTime(ms)` stepping."
requirements-completed: [MAP-04]
duration: 12 min
completed: 2026-03-06
---

# Phase 06 Plan 04: Topology Readability and E2E Summary

**Combat readability is now projected from sector topology into the floor, boundary emphasis, HUD, and e2e assertions, completing MAP-04.**

## Performance

- **Duration:** 12 min
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added topology-driven readability state in `src/main.js`, including sector pressure derivation, sector boundary emphasis, and lane beacon overlays built from `WORLD_SECTORS`.
- Extended `src/style.css` so the minimal HUD reacts to `low` / `medium` / `high` pressure states without changing layout or adding a heavyweight panel.
- Extended `src/determinism-harness.js` and `tests/determinism-contract.test.js` so `render_game_to_text()` exposes `world.readability` fields for deterministic assertions.
- Added `tests/playwright-map-sectors.test.js` to verify three-sector traversal, `Sector` / `Pressure` HUD indicators, readability snapshot fields, and runtime stability under headless execution.
- Ran the full Phase 06 regression gate to confirm MAP-01 through MAP-04 remain green together.

## Task Commits

1. **Task 1: Implement topology-driven readability signals and minimal HUD indicators** - `63f0649` (feat)
2. **Task 2: Add Playwright map-sector traversal and readability coverage** - `e7ffe0d` (test)
3. **Task 3: Run full phase regression gate** - Verified before summary generation with the full Wave 4 command from `06-VALIDATION.md`

## Files Created/Modified

- `src/main.js` - Readability state, topology-derived floor coding, sector guides, lane beacons, and HUD pressure indicators.
- `src/style.css` - Pressure-aware HUD styling for `low`, `medium`, and `high` combat states.
- `src/determinism-harness.js` - Stable `world.readability` snapshot serialization.
- `tests/determinism-contract.test.js` - Snapshot contract assertions for readability fields.
- `tests/playwright-map-sectors.test.js` - End-to-end traversal/readability verification with saved artifacts.

## Decisions Made

- Readability cues now share the same source of truth as traversal and spawn systems: sector bounds, lane kinds, and choke metadata from `WORLD_SECTORS`.
- Headless WebGL initialization failures are treated as expected fallback noise in Playwright because the game already downgrades deterministically to the noop renderer.

## Deviations from Plan

- **[Rule 3 - Blocking] Hardened the scripted traversal path** — The initial north -> south -> east timing did not reliably return the player to the hub before the east transition, so the e2e script was tightened to a deterministic hub re-entry path before asserting three-sector coverage.

## Issues Encountered

- The first Playwright run reached only two sectors because the scripted path remained inside `north` after the vertical return leg.
- Headless Chromium emitted WebGL context creation errors even though the runtime fallback was healthy; the verifier now ignores that known-safe fallback path and still fails on real runtime errors.

## Self-Check: PASSED

- [x] `node --test tests/determinism-contract.test.js` passes.
- [x] `node tests/playwright-map-sectors.test.js` passes.
- [x] `npm run build && node --test tests/world-sectors.test.js tests/spawn-director.test.js tests/determinism-contract.test.js && node tests/playwright-map-sectors.test.js` passes.

## User Setup Required

None.

## Next Phase Readiness

Phase 06 now has deterministic evidence for traversal, boundary collision, spawn distribution, and combat readability, so the phase can move into formal verification and completion.

---
*Phase: 06-world-sectors-spawn-determinism*
*Completed: 2026-03-06*

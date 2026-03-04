---
phase: 01-runtime-skeleton-pixel-baseline
plan: 01
subsystem: ui
tags: [threejs, onboarding, input, fullscreen]
requires: []
provides:
  - Unified start entry transition path for button and keyboard
  - Deterministic pre-run input reset and one-second start envelope
  - High-contrast command-style start hints scoped to start mode
affects: [01-02, 02-deterministic-combat-core]
tech-stack:
  added: []
  patterns:
    - Single entry transition gate for multi-input start actions
    - Mode-scoped onboarding hint visibility
key-files:
  created: []
  modified: [src/main.js, src/style.css, index.html]
key-decisions:
  - "Route start button and start-mode keyboard to requestStartRun before startRun"
  - "Keep fullscreen request best-effort and non-blocking during start transition"
patterns-established:
  - "Input transitions should reset transient key buffers to keep deterministic run starts"
  - "Start-only onboarding hints must not leak into combat HUD state"
requirements-completed: [CORE-01, UX-02]
duration: 2 min
completed: 2026-03-04
---

# Phase 01 Plan 01: Runtime Shell and Onboarding Summary

**Unified start transition flow with deterministic input reset and start-only command-style onboarding hints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T14:07:30Z
- **Completed:** 2026-03-04T14:09:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Consolidated start button and start-mode keyboard entry into one transition gate before `startRun`.
- Added a ~1s start envelope with non-blocking fullscreen attempt and deterministic key-buffer reset.
- Refined start hint copy and contrast, and explicitly scoped hint visibility to start modes only.

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate start-entry behavior and transition gate** - `b782f57` (feat)
2. **Task 2: Harden onboarding hint presentation for start mode** - `5608aa2` (feat)

## Files Created/Modified
- `src/main.js` - Added unified start transition gate, input-buffer reset helpers, and explicit hint visibility control by mode.
- `index.html` - Reworked start hint content into concise command rows.
- `src/style.css` - Increased hint panel readability and added keycap-focused command styling.

## Decisions Made
- Introduced `requestStartRun()` as the only start-mode entry gate so all start interactions share identical transition behavior.
- Kept fullscreen request inside transition as best-effort (`catch` ignored) so permission failure cannot block gameplay entry.
- Enforced mode-scoped hint visibility in runtime logic instead of relying only on overlay visibility side effects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing local build dependency in isolated worktree**
- **Found during:** Task 1 verification setup
- **Issue:** `npm run build` failed with `vite: command not found` because `node_modules` was absent in the isolated worktree.
- **Fix:** Ran `npm install` in the isolated worktree before task execution.
- **Files modified:** None tracked in git
- **Verification:** Subsequent `npm run build` passed for both Task 1 and Task 2.
- **Committed in:** N/A (environment setup only)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pure environment unblock, no scope creep and no behavior drift from plan intent.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Start flow, onboarding readability, and input gating are stable and ready for pixel-baseline hardening in `01-02`.
- No blocker for continuing to the next plan.

## Self-Check: PASSED

---
*Phase: 01-runtime-skeleton-pixel-baseline*
*Completed: 2026-03-04*

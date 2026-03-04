# Phase 4: Control & State Hardening - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden runtime control-state transitions around pause/resume, focus loss/regain, and fullscreen toggling.

This phase must improve reliability of existing controls and mode transitions only.
No new combat capabilities, progression systems, or visual feature expansion.

</domain>

<decisions>
## Implementation Decisions

### A. Pause/Resume State Machine (Locked)
- Pause/resume transitions must be explicit and mode-guarded (`playing <-> paused` only).
- Pause and resume actions must consume edge-trigger input exactly once per step.
- Resuming from pause must not leave stale input states (no stuck movement/attack).
- Pause/resume must preserve deterministic timing semantics (no timer drift on resume).

### B. Focus/Visibility Loss & Recovery (Locked)
- On `blur` and `visibilitychange` -> non-visible: clear keyboard state and edge-trigger set immediately.
- If runtime is `playing` when focus is lost, transition to `paused` deterministically.
- On focus regain, controls must recover without page reload and without phantom key events.
- Focus recovery behavior must be consistent with pause state machine rules.

### C. Fullscreen Keying & Failure Fallback (Locked)
- `KeyF` remains fullscreen toggle entry; `Escape` remains exit path.
- Fullscreen API failure (`requestFullscreen/exitFullscreen` rejection) must not corrupt game mode or input state.
- `fullscreenchange` handling must stay side-effect safe and limited to viewport/render sync responsibilities.
- Fullscreen transitions must not break keyboard responsiveness.

### D. Internal Observability Contract (Locked)
- `window.render_game_to_text()` must expose control-state diagnostics for phase verification:
  - `inputState` (pressed keys / edge keys summary)
  - `pauseState` (current mode + pause transition info)
  - `fullscreenState` (isFullscreen + last toggle intent)
  - `focusState` (visibility/focus derived state)
- These fields are internal test instrumentation, not public API commitments.

### Claude's Discretion
- Exact shape and key naming of internal control-state payload fields.
- Whether to introduce a dedicated pure-rules module (`src/control-rules.js`) for transition logic.
- Exact guard ordering in `updateGameStep` and event handlers so long as locked decisions remain true.

</decisions>

<specifics>
## Specific Ideas

- Prefer extracting transition guards into pure functions for deterministic testability.
- Keep `consumeEdge` as the single gate for one-shot key semantics in runtime loop.
- Avoid spreading mode transitions across unrelated rendering or feedback functions.
- Keep focus/fullscreen error handling fail-safe and non-throwing.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `keyboardDown` + `pressedThisStep` key-state channels already exist.
- `maybeHandlePauseAndRestart()` already centralizes pause/restart edge handling.
- `maybeToggleFullscreen()` and `fullscreenchange` listener already exist.
- `window.blur` and `document.visibilitychange` listeners already pause + clear key state.
- `window.render_game_to_text()` already exists and can be extended for control diagnostics.

### Integration Points
- `window.addEventListener("keydown")` / `keyup` handlers in `src/main.js`
- `window.addEventListener("blur")` and `document.addEventListener("visibilitychange")`
- `maybeHandlePauseAndRestart()` and `maybeToggleFullscreen()`
- main fixed-step loop in `updateGameStep(dt)`
- `window.render_game_to_text()` payload assembly

### Stability Risks To Guard
- Direct `pressedThisStep.has(...)` usage in multiple paths can cause double-consumption bugs.
- Mixed transition logic inside gameplay update can introduce mode inconsistency.
- Fullscreen promise rejection handling can silently desync intended state vs actual viewport state.

</code_context>

<deferred>
## Deferred Ideas

- New control mappings/remappable keys.
- Controller/gamepad support.
- Advanced pause UI overlays or settings menu.

</deferred>

---
*Phase: 04-control-state-hardening*
*Context gathered: 2026-03-04*

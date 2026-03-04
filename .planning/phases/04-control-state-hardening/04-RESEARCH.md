# Phase 4: Control & State Hardening - Research

**Researched:** 2026-03-04
**Domain:** Pause/focus/fullscreen state safety and deterministic control recovery
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pause/resume transitions must be mode-guarded (`playing <-> paused` only).
- Pause/resume must consume edge-trigger input exactly once per step.
- Resume path must not retain stale keyboard state.
- Runtime timing semantics must remain deterministic around pause/resume.
- On `blur` and `visibilitychange` to non-visible, clear pressed and edge input state immediately.
- Focus loss during `playing` must transition deterministically to `paused`.
- Focus regain must recover keyboard controls without phantom input.
- Fullscreen toggle must stay on `KeyF`; `Escape` exits fullscreen.
- Fullscreen API failures must not corrupt mode/input state.
- `fullscreenchange` should only synchronize viewport/render state.
- `window.render_game_to_text()` must expose internal control diagnostics (`inputState`, `pauseState`, `fullscreenState`, `focusState`).

### Claude's Discretion
- Exact shape of control diagnostics payload.
- Whether to extract pure control-rule helpers into `src/control-rules.js`.
- Exact ordering of mode/input guards inside frame update path.

### Deferred Ideas (OUT OF SCOPE)
- Remappable controls.
- Gamepad support.
- New pause menu features.
</user_constraints>

<research_summary>
## Summary

Phase 4 is a correctness hardening phase, not a feature expansion phase. The most reliable strategy is to separate control transition rules (pure logic) from event wiring (DOM side effects), then drive all mode transitions through deterministic guards in `updateGameStep`.

Current `src/main.js` already has core hooks (`keydown/keyup`, `blur`, `visibilitychange`, `fullscreenchange`, pause handler, render text bridge), so implementation should avoid architecture churn. The highest-risk defects are stale edge events, duplicated transition triggers, and fullscreen failure side effects.

**Primary recommendation:** one plan with two tasks: (1) control-state rule extraction and deterministic transition hardening, (2) fullscreen/focus recovery hardening plus observability payload extension.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | Runtime rendering and loop integration | Already integrated and sufficient for state/control hardening |
| vite | 7.3.1 | Build verification pipeline | Fast deterministic validation for each task |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:test | Node runtime built-in | Rule-level deterministic unit checks | Validate pure state-transition helpers without browser runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extract pure control rules | Keep all logic inline in `main.js` | Lower file count but poorer testability and higher regression risk |

**Installation:**
```bash
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Edge-consumption discipline
**What:** One-shot keys (`P`, `F`, `Enter`, `Space`, `R`) are consumed through a single helper and never read twice in one frame.
**When to use:** Any transition-producing input path.

### Pattern 2: Event-to-intent, loop-to-transition
**What:** DOM events only record intent/state flags; mode transitions happen in fixed-step loop.
**When to use:** Focus loss/recovery and fullscreen intent outcomes.

### Pattern 3: Side-effect-safe fullscreen wrapper
**What:** Wrap fullscreen API calls in non-throwing adapter that records result metadata.
**When to use:** `KeyF` toggles and `Escape` exits.

### Anti-Patterns to Avoid
- Reading `pressedThisStep.has(...)` directly in multiple flow branches.
- Mutating game mode directly in multiple event handlers and update paths.
- Letting fullscreen promise rejection modify gameplay mode.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Control transition validation | Browser-only manual checks | Pure rule helpers + `node:test` cases | Faster, deterministic, catches edge regressions |
| Focus/fullscreen observability | Ad-hoc console logging | Structured `render_game_to_text` diagnostics | Enables automation and future regression harness |

**Key insight:** this phase succeeds by reducing state mutation surfaces and making transition intent explicit.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Double-consumed edge keys
**What goes wrong:** One keydown toggles pause/fullscreen twice across separate handlers.
**How to avoid:** Use a dedicated `consumeEdge(code)` helper and never direct-read edge set for transitions.

### Pitfall 2: Ghost input after tab switch
**What goes wrong:** Movement or attack remains active after blur/visibility restore.
**How to avoid:** Clear both `keyboardDown` and edge set on focus loss; mark recovery metadata for next step.

### Pitfall 3: Fullscreen failure side effects
**What goes wrong:** Rejected fullscreen promise leaves runtime in inconsistent control mode.
**How to avoid:** Record failure reason in control diagnostics; keep mode/input untouched.
</common_pitfalls>

<validation_architecture>
## Validation Architecture

### Verification split
- **Rule-level deterministic checks:** `tests/control-rules.test.js`
- **Build-level regression check:** `npm run build`
- **Runtime smoke checks:** `window.render_game_to_text()` includes control diagnostics fields

### Required verification commands
```bash
node --test tests/control-rules.test.js
npm run build
```

### Nyquist intent
- Every task includes at least one automated command.
- No three consecutive tasks without automated verification.
- Phase closes only after diagnostics fields are observable in `render_game_to_text()` payload.
</validation_architecture>

<code_examples>
## Code Examples

### Edge consumption helper
```javascript
function consumeEdge(code) {
  if (!pressedThisStep.has(code)) return false;
  pressedThisStep.delete(code);
  return true;
}
```

### Focus loss action contract
```javascript
const result = applyFocusLoss({ mode: state.mode });
state.mode = result.nextMode;
keyboardDown.clear();
pressedThisStep.clear();
```

### Control diagnostics fragment
```javascript
focusState: {
  visibility: document.visibilityState,
  hasWindowFocus: document.hasFocus(),
  lastEvent: state.control.lastFocusEvent,
},
```
</code_examples>

<sota_updates>
## State of the Art (project-local)

- Existing runtime already exposes `window.render_game_to_text()` and fixed-step updates; no framework migration is needed.
- Existing keyboard channels (`keyboardDown`, `pressedThisStep`) are sufficient if transition reads are centralized.
</sota_updates>

<open_questions>
## Open Questions

1. Whether paused-state HUD should include explicit focus-recovery text or reuse existing banner channel.
2. Whether fullscreen intent metadata should keep short history or only last attempt.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/04-control-state-hardening/04-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/main.js`
- `index.html`
</sources>

<metadata>
## Metadata

**Research date:** 2026-03-04
**Valid until:** next phase-planning cycle
</metadata>

---

*Phase: 04-control-state-hardening*
*Research completed: 2026-03-04*
*Ready for planning: yes*

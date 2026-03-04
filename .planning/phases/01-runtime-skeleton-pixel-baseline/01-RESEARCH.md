# Phase 1: Runtime Skeleton & Pixel Baseline - Research

**Researched:** 2026-03-04
**Domain:** Three.js runtime shell, HD pixel baseline, onboarding UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep adaptive render resolution (do not switch to fixed internal logical resolution in Phase 1).
- Keep renderer pixel ratio cap at 1.5.
- Enforce nearest-neighbor texture sampling globally and disable mipmaps.
- Align sprite and camera to pixel grid before render.
- Keep pixel-font-first UI style.
- Disable post-processing in Phase 1.
- Define asset grid sizing conventions in Phase 1.
- Add reproducible visual baseline screenshot checks.
- Keep dual start entry: button plus keyboard shortcut.
- Use around 1 second transition from start screen to combat.
- Lock gameplay input immediately after start and clear stale key states.
- Do not block start flow if fullscreen request fails.
- Prioritize weak background and strong foreground readability.
- Ensure effects do not obscure core player/enemy silhouette.
- Keep weak arena boundary hint for movement orientation.
- Keep onboarding hints minimal, shown on start screen only, command-style wording, and visible every run.

### Claude's Discretion
- Exact animation language and timing details within the 1 second transition envelope.
- Exact threshold values for background attenuation and contrast.
- Exact implementation layer for pixel-grid snapping.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<research_summary>
## Summary

Phase 1 should optimize for a stable base layer that can support deterministic combat and future polish work without visual or state regressions. The highest leverage is to lock rendering clarity, state transitions, and onboarding discoverability now, then avoid broad feature expansion.

For this codebase, the existing single-file architecture in `src/main.js` is sufficient for Phase 1. The planning strategy should keep changes focused to scene boot flow, renderer setup, and UI overlays, while preserving deterministic update cadence already present.

**Primary recommendation:** implement Phase 1 as two execution plans: shell/onboarding first, then pixel/readability hardening.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | WebGL rendering and scene graph | Already integrated and sufficient for current runtime shell scope |
| vite | 7.3.1 | Dev/build pipeline | Fast iteration loop for game UI and rendering changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright | 1.58.2 | Visual/regression automation scaffolding | For deterministic visual snapshots and flow smoke checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Keep single-file bootstrap | Split to multiple runtime modules now | Better long-term structure but unnecessary scope increase in Phase 1 |

**Installation:**
```bash
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)
```text
src/
├── main.js        # Runtime loop, scene setup, state transitions
└── style.css      # Overlay/HUD and visual shell
```

### Pattern 1: Mode-driven runtime shell
**What:** Drive start/playing/paused/gameover from one explicit state mode.
**When to use:** Any screen transition or input gating change.
**Example:** keep transitions inside `updateGameStep` and `startRun` as single sources of truth.

### Pattern 2: Render baseline hardening
**What:** Centralize render sizing, pixel ratio cap, texture filtering, and snapping policies.
**When to use:** Any visual clarity change touching pixel quality.
**Example:** route all renderer sizing through `resizeRenderer`; enforce texture policies in texture factories.

### Anti-Patterns to Avoid
- Mixing UI transition logic across multiple uncoordinated handlers.
- Introducing post-processing before baseline pixel quality is locked.
- Adding Phase 2+ combat complexity in Phase 1 files.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visual regression discipline | Ad-hoc manual checks only | Deterministic screenshot baseline routine | Prevents silent pixel-quality regressions |
| State transition diffusion | Multiple transition flags in many places | Single `state.mode` driven transitions | Reduces transition bugs and stale state |

**Key insight:** In this phase, reliability comes from constrained control points, not new subsystems.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Pixel clarity drift
**What goes wrong:** Later edits re-enable smoothing or alter ratio behavior.
**How to avoid:** Keep explicit nearest-filter enforcement and snapshot checks.

### Pitfall 2: Input stale-state at transition
**What goes wrong:** Keydown state leaks into first combat frames.
**How to avoid:** Reset input buffers on start and transition boundaries.

### Pitfall 3: Overlay readability conflicts
**What goes wrong:** Start hints and overlays compete with scene readability.
**How to avoid:** Keep onboarding minimal and mode-scoped.
</common_pitfalls>

<code_examples>
## Code Examples

### Start flow gate
```javascript
if (state.mode === "start" && (pressedThisStep.has("Enter") || pressedThisStep.has("Space"))) {
  startRun();
}
```

### Texture nearest policy
```javascript
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
```

### Renderer sizing control
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(width, height, false);
```
</code_examples>

<sota_updates>
## State of the Art (project-local)

- For this repository state, no additional framework migration is required for Phase 1.
- Existing game loop and deterministic stepping are already aligned with later automated testing needs.
</sota_updates>

<open_questions>
## Open Questions

1. Exact transition choreography within the 1 second envelope (fade, zoom, or flash).
2. Pixel-grid snapping granularity for camera offset under shake.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-runtime-skeleton-pixel-baseline/01-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/main.js`
- `src/style.css`
- `index.html`
</sources>

<metadata>
## Metadata

**Research date:** 2026-03-04
**Valid until:** next phase-planning cycle
</metadata>

---

*Phase: 01-runtime-skeleton-pixel-baseline*
*Research completed: 2026-03-04*
*Ready for planning: yes*

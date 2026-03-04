# Phase 2: Deterministic Combat Core - Research

**Researched:** 2026-03-04
**Domain:** Deterministic combat loop, enemy pressure, HUD/state closure
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep strict fixed-step simulation for combat logic.
- Keep dual-channel input sampling: edge-trigger plus sustained-state.
- Keep forward-sector melee hit model (not full-circle).
- Reset to fixed seed per run for reproducibility.
- Use progressive spawn pressure with bounded limits.
- Enforce hard on-screen enemy cap.
- Keep short invulnerability window after hit.
- Keep fixed-probability enemy mix strategy.
- Refresh HUD every logic step.
- Keep numeric format as integer HP plus 1-decimal survival time.
- Keep survival-first HUD hierarchy.
- Keep HUD visible in paused and gameover modes.
- Keep gameover summary to Time + Score + Kills.
- Keep restart entry as button plus hotkeys.
- Keep around 0.8 second restart transition.
- Freeze combat simulation after entering gameover.

### Claude's Discretion
- Exact enemy hard-cap value and difficulty ramp constants.
- Exact sector angle/radius values for melee hit model.
- Exact restart transition animation details.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<research_summary>
## Summary

Phase 2 should complete the deterministic survivability loop with clear causal links between input, simulation, damage, scoring, and restart. The existing runtime already has most primitives in `src/main.js`; the planning focus is sequencing and quality gates, not architecture replacement.

The most robust split is foundation-first then closure: one plan for deterministic movement/attack/hit mechanics and one plan for sustained pressure, HUD synchronization, and death/restart closure. This keeps each plan within execution context budget while preserving dependency clarity.

**Primary recommendation:** implement Phase 2 in two waves with explicit requirement mapping and deterministic verification commands.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | Scene and visual feedback runtime | Already integrated and suitable for deterministic game loop extension |
| vite | 7.3.1 | Build and iteration pipeline | Fast static validation during planning and execution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright | 1.58.2 | Deterministic input-flow verification | For post-plan end-to-end checks using render text bridge |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expand current single-loop runtime | Immediate subsystem extraction | Better modularity, but higher risk and no direct Phase 2 requirement benefit |

**Installation:**
```bash
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Deterministic step-first simulation
**What:** Use fixed simulation step as sole source of truth.
**When to use:** Movement, cooldown, collisions, spawn timing, damage, score updates.

### Pattern 2: Event-consequence closure
**What:** Ensure each event has complete state and visual consequence.
**When to use:** Attack hit -> enemy HP change -> kill/score update -> feedback and cleanup.

### Pattern 3: Mode-safe closure
**What:** Freeze or gate systems by mode to avoid state drift.
**When to use:** paused/gameover transitions and restart cycle.

### Anti-Patterns to Avoid
- Introducing frame-time dependent combat math in main gameplay path.
- Updating HUD from stale or partial state snapshots.
- Leaving spawn/damage systems active after gameover trigger.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic stepping | Custom variable-step compensation system | Existing fixed-step accumulator path | Lower bug surface and clearer reproducibility |
| Loop observability | Ad-hoc debug logs only | Existing `render_game_to_text` and deterministic time advance path | Better regression utility and less noise |

**Key insight:** deterministic behavior quality depends on strict gating and ordered updates, not additional abstractions.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Hidden non-determinism in update order
**What goes wrong:** Equivalent inputs produce divergent outcomes due to update sequencing drift.
**How to avoid:** Keep stable update order and deterministic random initialization per run.

### Pitfall 2: Pressure curve runaway
**What goes wrong:** Spawn pressure overwhelms readability and performance.
**How to avoid:** Enforce hard cap and bounded spawn cooldown intervals.

### Pitfall 3: Gameover drift
**What goes wrong:** Combat systems continue mutating state after gameover.
**How to avoid:** Freeze combat-path updates once mode switches to gameover.
</common_pitfalls>

<code_examples>
## Code Examples

### Fixed-step update shell
```javascript
while (accumulator >= FIXED_STEP) {
  updateGameStep(FIXED_STEP);
  accumulator -= FIXED_STEP;
}
```

### Hit-gate by cooldown and facing
```javascript
if (state.player.attackCooldown <= 0 && pressedThisStep.has("Space")) {
  doAttack();
}
```

### Spawn bounded interval
```javascript
state.spawnCooldown = clamp(nextValue, 0.24, 1.1);
```
</code_examples>

<sota_updates>
## State of the Art (project-local)

- Current runtime already exposes deterministic testing bridge (`render_game_to_text`, `advanceTime`), reducing extra instrumentation needs for this phase.
- Phase 2 should prioritize requirement closure over subsystem extraction.
</sota_updates>

<open_questions>
## Open Questions

1. Exact hard-cap value that balances pressure and readability on target devices.
2. Final forward-sector tuning values for best control feel.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-deterministic-combat-core/02-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/main.js`
- `.planning/research/SUMMARY.md`
</sources>

<metadata>
## Metadata

**Research date:** 2026-03-04
**Valid until:** next phase-planning cycle
</metadata>

---

*Phase: 02-deterministic-combat-core*
*Research completed: 2026-03-04*
*Ready for planning: yes*

# Phase 3: Impact Feedback Polish - Research

**Researched:** 2026-03-04
**Domain:** Hit/kill readability feedback system polish
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Kill feedback must be noticeably stronger than regular hit feedback.
- Kill signature uses burst particles and short shake.
- Multi-kill emphasis exists but must be capped.
- Feedback should trigger in the same frame as hit events.
- Apply per-channel hard caps under high event rates.
- Preserve kill readability priority when channels compete.
- Rate-limit center banners.
- Camera shake uses max-selection instead of additive stacking.
- Regular hit channel baseline: light flash + light particles.
- Kill channel baseline: medium flash + short shake + strong particles.
- Combo milestone baseline: text + light visual boost.
- During kill moment, kill feedback has temporary priority over danger overlay.

### Claude's Discretion
- Exact numeric thresholds and window lengths for channel caps.
- Exact intensity values and decay curves per feedback channel.
- Exact visual easing and timing harmonization.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<research_summary>
## Summary

Phase 3 should refine perceptual clarity, not feature breadth. The implementation should preserve deterministic combat timing while improving instantaneous readability of hit outcome classes (hit, kill, multi-kill milestone).

Current code already contains suitable primitives (`triggerHitFeedback`, `triggerKillFeedback`, `showCenterBanner`, shake/overlay timers). The correct planning strategy is to tune and govern channel interactions through explicit caps and priority rules instead of adding new rendering subsystems.

**Primary recommendation:** use one focused execution plan with two tasks: channel hierarchy tuning and high-frequency noise governance.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | Runtime visual effects primitives | Already integrated with particle, line, and shake paths |
| vite | 7.3.1 | Build validation | Fast and sufficient for this polish-only phase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright | 1.58.2 | End-to-end visual behavior confirmation | Optional run for deterministic feedback snapshots after execution |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tune existing feedback primitives | Introduce post-processing stack | Higher complexity and conflict with Phase 1 no-postprocessing baseline |

**Installation:**
```bash
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Channel hierarchy first
**What:** Define explicit precedence between hit, kill, milestone, and danger channels.
**When to use:** All event collisions and feedback overlap cases.

### Pattern 2: Timer-governed decay
**What:** Keep timers as sole authority for visual persistence and fade-out.
**When to use:** Flash overlays, banners, line bursts, and shake intensity envelopes.

### Pattern 3: Bounded spectacle
**What:** Cap event-driven visual output per channel.
**When to use:** Multi-hit bursts, chain milestones, and crowded combat moments.

### Anti-Patterns to Avoid
- Introducing unbounded additive shake or particle explosion loops.
- Allowing danger overlays to permanently suppress kill readability.
- Coupling feedback triggers to frame-time instead of event-time in fixed-step loop.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New feedback renderer layer | Separate post-processing feedback pipeline | Existing timer and primitive system | Lower risk and preserves deterministic behavior |
| Free-form overlap behavior | Ad-hoc per-event exceptions | Explicit priority matrix and channel caps | Easier to reason, easier to test |

**Key insight:** readability polish is a control-policy problem, not a rendering-stack problem.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Feedback saturation
**What goes wrong:** Frequent events flood the scene and reduce combat legibility.
**How to avoid:** Enforce per-channel caps and rate limits.

### Pitfall 2: Ambiguous outcome signal
**What goes wrong:** Hit and kill cues become too similar.
**How to avoid:** Maintain strict channel separation and intensity gap.

### Pitfall 3: Priority inversion
**What goes wrong:** Secondary overlays obscure primary kill events.
**How to avoid:** Apply explicit temporary kill-priority window.
</common_pitfalls>

<code_examples>
## Code Examples

### Event-time trigger pattern
```javascript
enemy.hp -= damage;
triggerHitFeedback(enemy.x, enemy.y);
if (enemy.hp <= 0) {
  triggerKillFeedback(enemy.x, enemy.y);
}
```

### Max-selection shake policy
```javascript
state.shakeStrength = Math.max(state.shakeStrength, strength);
state.shakeTime = Math.max(state.shakeTime, duration);
```

### Banner throttle policy (concept)
```javascript
if (now - lastBannerAt >= BANNER_COOLDOWN) {
  showCenterBanner(text, duration, kind);
}
```
</code_examples>

<sota_updates>
## State of the Art (project-local)

- Existing code already includes advanced feedback primitives for this phase target.
- No additional libraries are required to satisfy VIZ-03.
</sota_updates>

<open_questions>
## Open Questions

1. Final per-channel cap values for best readability under heavy spawn load.
2. Final fade durations to balance clarity versus visual persistence.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-impact-feedback-polish/03-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/main.js`
- `src/style.css`
</sources>

<metadata>
## Metadata

**Research date:** 2026-03-04
**Valid until:** next phase-planning cycle
</metadata>

---

*Phase: 03-impact-feedback-polish*
*Research completed: 2026-03-04*
*Ready for planning: yes*

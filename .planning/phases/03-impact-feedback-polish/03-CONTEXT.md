# Phase 3: Impact Feedback Polish - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve combat readability by making successful hits and kills immediately distinguishable through clear, bounded feedback channels.
This phase clarifies feedback behavior within existing combat systems and does not add new gameplay capabilities.

</domain>

<decisions>
## Implementation Decisions

### Hit vs Kill Differentiation
- Kill feedback must be clearly stronger than regular hit feedback.
- Kill signature uses particle burst plus short camera shake.
- Multi-kill events receive extra emphasis with an explicit upper bound.
- Feedback is triggered in the same frame as the hit event.

### High-Frequency Noise Control
- Use per-channel hard caps (flash, shake, particles, text) under high event density.
- Prioritize kill readability when effects compete.
- Center banners (for chain/multi-kill) are rate-limited.
- Camera shake uses max-selection behavior, not additive stacking.

### Feedback Channel Matrix
- Regular hit default: light flash + light particles.
- Kill default: medium flash + short shake + strong particles.
- Combo milestone default: text + light visual reinforcement.
- If danger overlay conflicts with kill feedback, kill moment takes temporary priority.

### Claude's Discretion
- Exact numeric thresholds for per-channel caps and rate-limit windows.
- Exact medium/light/strong intensity values for flash, shake, and particles.
- Exact decay curves and easing for each feedback channel.

</decisions>

<specifics>
## Specific Ideas

- Readability-first hierarchy: outcome readability must beat spectacle density.
- Keep feedback expressive but bounded in sustained combat pressure.
- Preserve causal clarity: player action and feedback should feel tightly connected.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `triggerHitFeedback(x, y)`: existing regular-hit channel entry point.
- `triggerKillFeedback(x, y)`: existing kill-focused channel entry point.
- `addHitShake(strength, duration)`: existing shake accumulation control point.
- `spawnParticles(...)` and `spawnHitLines(...)`: reusable visual burst primitives.
- `showCenterBanner(...)`: existing central text feedback primitive.
- `state.feedback.*`: existing feedback state container for timers and overlays.

### Established Patterns
- Deterministic fixed-step update loop governs all gameplay and feedback timing.
- Feedback channels are already timer-driven and mode-aware in runtime state.
- Combat result updates and feedback triggers are colocated in `doAttack()`.

### Integration Points
- `doAttack()`: hit/kill differentiation and multi-kill branching.
- `updateFeedbackState(dt)`: channel decay, urgency state, and rate-limit behavior.
- `syncVisuals()`: final flash/overlay blending and camera shake application.
- `updateHitLines(dt)` / `updateParticles(dt)`: high-frequency visual channel throttling.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-impact-feedback-polish*
*Context gathered: 2026-03-04*

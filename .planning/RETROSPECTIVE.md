# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — World & Growth Overhaul

**Shipped:** 2026-03-07
**Phases:** 6 | **Plans:** 24 | **Sessions:** Not tracked in repository history

### What Was Built
- A scalable multi-sector world with deterministic traversal, spawn routing, and readability signals.
- Tactical building archetypes with stable player collision, enemy steering, and machine-readable tactical state.
- A deterministic breakable -> drop -> equip loop with isolated loot RNG and compare/equip semantics.
- Kill-driven XP progression, queued level-up events, deterministic upgrade choice/reroll flow, and applied upgrade effects.
- Milestone-wide replay parity, restart parity, and named end-to-end regression commands.

### What Worked
- Keeping each new system behind explicit runtime state slices made snapshot growth predictable instead of ad hoc.
- Reusing `render_game_to_text()` as the canonical assertion surface prevented browser tests from drifting into screenshot-only verification.
- Splitting randomness into dedicated streams (`spawn`, `drop`, `offer`) preserved replay parity while making failures explainable.

### What Was Inefficient
- Some archive/complete workflow automation assumed fields like accomplishments and task counts existed everywhere, but the real repo required manual correction.
- Browser artifact noise from headless/WebGL fallback still forced explicit filtering and explanation work during verification.
- Several milestone-close documents were generated mechanically first and then needed human cleanup to reach publication quality.

### Patterns Established
- System boundaries are now documented as deterministic state contracts first and UI/render behavior second.
- Browser-route tests should assert field-level snapshot state, with screenshots retained only as debugging artifacts.
- Milestone closure should treat archive CLI output as a starting point, not the final truth.

### Key Lessons
1. If a feature changes gameplay state, it should also declare a stable snapshot surface in the same milestone, not later.
2. Isolating semantics early matters: buildings, breakables, loot, progression, and upgrades each stayed maintainable because their contracts were not overloaded.
3. Completion workflows need post-CLI verification; archive automation is useful, but it does not remove the need for document review.

### Cost Observations
- Model mix: not explicitly tracked in repository metadata
- Sessions: not explicitly tracked in repository metadata
- Notable: deterministic contracts reduced downstream debugging cost more than any local implementation shortcut

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.1 | Not tracked | 6 | Shifted from feature-only delivery to contract-first world/growth systems with auditable milestone closure |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.1 | Node + Playwright direct scripts | 29/29 milestone requirements satisfied | Sector, loot, progression, and automation systems were all added without introducing a heavy new runtime framework |

### Top Lessons (Verified Across Milestones)

1. Deterministic text-state contracts are the most reliable long-term regression surface for this project.
2. Small, phase-bounded systems scale better than broad gameplay rewrites when the repo must stay replay-safe.

# Pitfalls Research

**Domain:** Deterministic action-survivor progression loop for `v1.1 World & Growth Overhaul`
**Researched:** 2026-03-05
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: XP grant logic is split across multiple combat paths

**What goes wrong:**
Enemy kills from direct attacks, DOT ticks, prop explosions, or delayed death handlers grant XP inconsistently (double grant or missing grant), causing non-reproducible level pacing between runs.

**Why it happens:**
Teams wire progression quickly by adding `xp += ...` in several places inside a monolithic loop, without a single kill-event contract or idempotency guard.

**How to avoid:**
Introduce one canonical kill event (`entityId`, `killerId`, `cause`, `tickId`), route all XP grants through one reducer, and reject duplicate `(entityId, tickId)` grants. Add contract tests that replay the same kill sequence and assert identical XP/level timeline.

**Warning signs:**
`xpEvents != killEvents` for the same replay; same enemy death occasionally increases XP twice; deterministic replay diverges exactly after mixed kill sources.

**Phase to address:**
Phase 1 - Event Contract & Progression State Schema

---

### Pitfall 2: Level-up choice is applied re-entrantly inside the simulation step

**What goes wrong:**
A level-up popup interrupts combat mid-tick, then talent effects are applied before the frame completes, producing order-dependent outcomes (extra hit, skipped cooldown, or timing drift).

**Why it happens:**
UI and simulation logic are coupled; progression mutation is executed immediately when XP threshold is crossed instead of at a deterministic frame boundary.

**How to avoid:**
Queue `pendingLevelUps` during simulation and resolve them only at a fixed boundary (`step end -> freeze -> choose -> apply -> next step`). Keep a strict state machine (`playing`, `levelup_choice`, `paused`) and assert legal transitions.

**Warning signs:**
Rare bugs only on the exact frame of leveling; same input script yields different HP/cooldown states when frame time changes; pause/focus transitions around level-up produce sticky input.

**Phase to address:**
Phase 2 - Deterministic Runtime Integration

---

### Pitfall 3: One global RNG stream couples spawn, drops, and upgrade offers

**What goes wrong:**
A cosmetic or UI change consumes random numbers and unexpectedly changes spawn layout, drop outcomes, or upgrade options, breaking deterministic replay and balancing.

**Why it happens:**
Progression systems are added on top of an existing loop that already relies on a shared RNG consumption order.

**How to avoid:**
Use domain-separated seeded streams (`spawnRng`, `dropRng`, `upgradeRng`), serialize their states in deterministic snapshots, and ban `Math.random()` in gameplay paths through lint/check hooks.

**Warning signs:**
Unrelated UI tweaks change drop fairness; replay mismatch appears after adding new VFX; same seed differs after code refactor with no gameplay intent.

**Phase to address:**
Phase 2 - Deterministic Runtime Integration

---

### Pitfall 4: Upgrade pool lacks eligibility and exclusivity rules

**What goes wrong:**
Level-up offers include duplicates, maxed-out upgrades, or incompatible skill/talent combinations, leading to dead choices and player distrust.

**Why it happens:**
Upgrade entries are treated as a flat weighted list without prerequisite checks, uniqueness constraints, or anti-synergy tags.

**How to avoid:**
Define upgrade metadata (`requires`, `excludes`, `maxRank`, `tags`), filter by runtime eligibility before sampling, enforce unique options per pick, and add fallback behavior when the eligible pool is small.

**Warning signs:**
Choice panels show “no effect” outcomes; telemetry indicates high cancel/hesitation at level-up; bug reports mention repeated useless cards.

**Phase to address:**
Phase 3 - Skill/Talent Choice Engine

---

### Pitfall 5: Power scaling is unconstrained and collapses map challenge

**What goes wrong:**
Certain level/talent/equipment combinations create runaway DPS or survivability, trivializing expanded map sectors and making building tactics irrelevant.

**Why it happens:**
Multipliers stack without category caps, while difficulty scaling depends mostly on elapsed time instead of player power budget.

**How to avoid:**
Split scaling into capped channels (base, additive, multiplicative), define TTK and incoming-DPS guardrails by level band, and run scripted balance sweeps across representative builds.

**Warning signs:**
Median elite TTK drops sharply after one talent tier; survival variance explodes across seeds; top builds ignore most world interactions because raw stats dominate.

**Phase to address:**
Phase 4 - World Balance & Director Calibration

---

### Pitfall 6: Breakable-prop drop economy distorts progression pacing

**What goes wrong:**
Optimal play becomes crate-farming instead of combat; unlucky streaks stall progression while lucky streaks skip intended level/talent progression.

**Why it happens:**
Drop tables are tuned in isolation from XP curve and map traversal cost, with no pity floor or zone-level spawn budget.

**How to avoid:**
Model expected progression gain per minute from both kills and props, cap prop-derived power share by phase target, add pity protection for key slots, and enforce per-zone breakable density limits.

**Warning signs:**
Run success correlates more with prop breaks than kill performance; players path to prop clusters and ignore enemy risk; progression variance across equal-skill runs becomes extreme.

**Phase to address:**
Phase 4 - World Balance & Director Calibration

---

### Pitfall 7: Deterministic harness does not track progression-critical state

**What goes wrong:**
Regression tests pass core combat while progression silently regresses (wrong level timing, invalid offers, inconsistent equipment drops).

**Why it happens:**
Snapshot schemas focus on combat fields only and omit `xp`, `level`, `offeredUpgrades`, `equippedItems`, and per-domain RNG states.

**How to avoid:**
Extend `render_game_to_text` schema with progression fields, add contract tests around level thresholds and offer generation, and include zero-duration edge tests for `advanceTime(0)` semantics.

**Warning signs:**
Progression bugs are found only by manual play; CI flakes cluster around level-up moments; replay output lacks enough fields to explain divergence.

**Phase to address:**
Phase 5 - Regression Harness & Observability

---

### Pitfall 8: Run reset/resume leaks progression state between sessions

**What goes wrong:**
Restarted runs inherit levels, talents, equipment modifiers, or drop pity counters from previous runs, causing hidden bias and hard-to-reproduce reports.

**Why it happens:**
Mutable state is reused in-place across `start -> gameover -> restart` transitions, especially in monolithic runtime code with implicit contracts.

**How to avoid:**
Create a `newRunState(seed)` factory, deep-reset progression subtrees on restart, version state schema explicitly, and verify lifecycle transitions with deterministic integration tests.

**Warning signs:**
New run starts above level 1; first drop odds differ after restart without seed change; reload/focus flow changes starting buffs.

**Phase to address:**
Phase 6 - Lifecycle Hardening & Release Gate

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Award XP directly inside multiple damage handlers | Fast to ship first playable build | Hidden double-count/miss paths, hard replay debugging | Only in prototype branch before Phase 1 contract lock |
| Keep one shared RNG for all systems | Minimal plumbing | Any feature change shifts gameplay outcomes globally | Never in deterministic milestone |
| Encode talents as ad-hoc inline conditionals | No schema migration work | Balance changes require risky code edits and duplicate logic | Temporary spike only, must be replaced in Phase 3 |
| Tune drops by feel without telemetry | Quick iteration in local play | Biased pacing and unstable fairness across seeds | Only for first balancing pass, then telemetry required |
| Skip progression fields in snapshots to keep output short | Faster initial harness setup | CI cannot catch growth regressions | Never once progression is milestone scope |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Combat kill pipeline + progression reducer | XP updates happen both in combat and UI callbacks | Route all grants through one event reducer with idempotency key checks |
| Breakable props + drop resolver | Drop roll uses spawn RNG stream and shifts enemy behavior | Use dedicated `dropRng` stream and snapshot its state |
| Level-up UI + input/focus/fullscreen events | Choice modal pauses render but not input state | Freeze simulation and clear transient input on mode switch |
| Determinism harness (`advanceTime`, `render_game_to_text`) + new progression fields | Harness output omits level-up and equipment state | Version snapshot schema and fail tests on missing progression keys |
| Playwright burst tests + level-up interactions | Tests rely on fixed sleeps and miss race conditions | Drive assertions from deterministic state transitions, not wall-clock waits |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rebuilding upgrade eligibility graph every frame | Frame spikes when many talents unlocked | Cache eligibility and invalidate only on level-up/equip changes | ~25+ unlocked upgrades with 60 FPS target |
| Spawning drop meshes/materials per prop break with no pooling | Long-run GC spikes and frame jitter | Pool pickup visuals and reuse materials/textures by rarity tier | High break frequency in dense map sectors |
| Recomputing full enemy path costs after each prop destruction | AI stutter when props are chain-broken | Use incremental nav updates and capped recompute budget per tick | Multi-prop combat hotspots |
| Serializing full game state every tick for debug | CPU overhead and input latency under load | Snapshot only on checkpoints (level-up, N ticks, test hooks) | Extended soak tests or CI replays |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Leaving progression mutation/debug APIs writable in production | Players can inject XP, reroll offers, or force drops | Gate debug surfaces by build flag and expose read-only diagnostics in prod |
| Trusting client-computed progression for competitive records | Tampered runs pollute rankings and balance analytics | Recompute or verify key progression events server-side before acceptance |
| Loading drop/upgrade tables from unvalidated user-controlled storage | Malicious configs create impossible builds or crashes | Validate schema + signature/version checks before applying runtime data |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Level-up modal appears in lethal moments without safe window | Feels unfair and breaks combat flow | Trigger choice at deterministic safe boundary with short invulnerability/freeze policy |
| Upgrade cards hide real numeric effect and stack behavior | Players cannot build intentionally | Show concise delta preview (`+X%`, caps, exclusions) directly in choice UI |
| Equipment drop rarity is visually unclear in combat clutter | Missed rewards and frustration | Strong rarity color language + pickup cues + minimap/indicator option |
| Building/prop interactions are not explained early | Players ignore map tactics and assume randomness | Provide first-run micro tutorial for breakables, drops, and tactical buildings |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **XP contract:** Often missing duplicate-kill protection — verify one XP grant per unique kill event in replay.
- [ ] **Level-up pipeline:** Often missing boundary semantics — verify no re-entrant mutation inside a simulation tick.
- [ ] **Upgrade choice validity:** Often missing eligibility/exclusion enforcement — verify every offered option changes state meaningfully.
- [ ] **Drop fairness:** Often missing pacing guardrails — verify kill-driven baseline progression still works with poor drop RNG.
- [ ] **Deterministic coverage:** Often missing progression fields — verify snapshots include level, XP, offers, equipped items, and RNG streams.
- [ ] **Run lifecycle reset:** Often missing deep reset of progression subtree — verify restart/new run parity across same seed.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| XP double-grant/miss-grant incidents | HIGH | Freeze progression tuning changes, instrument kill-to-XP ledger, replay failing seeds, patch reducer idempotency, backfill regression tests. |
| Re-entrant level-up ordering bug | MEDIUM | Isolate level-up state machine, move application to frame boundary, add transition assertions, rerun deterministic seed pack. |
| RNG cross-contamination | HIGH | Split RNG streams, migrate snapshot schema, regenerate golden replays, diff pre/post outcomes with fixed seeds. |
| Invalid upgrade offerings | MEDIUM | Add eligibility validator in content pipeline, quarantine broken entries, patch fallback sampler, run choice-quality test suite. |
| Drop economy over-dominates progression | MEDIUM | Rebalance drop EV budgets, add pity/caps, run telemetry A/B sweep on scripted seeds, monitor progression variance. |
| Restart state leak | HIGH | Implement full run-state factory reset, audit mutable references, add restart determinism contract tests, block release until clean. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| XP grant logic is split across multiple combat paths | Phase 1 - Event Contract & Progression State Schema | Replay ledger shows `killEvents == xpEvents` and no duplicate grant IDs. |
| Level-up choice is applied re-entrantly inside the simulation step | Phase 2 - Deterministic Runtime Integration | Transition tests prove level-up applies only at frame boundary. |
| One global RNG stream couples spawn, drops, and upgrade offers | Phase 2 - Deterministic Runtime Integration | Same seed replays produce identical spawn/drop/offer sequences after refactors. |
| Upgrade pool lacks eligibility and exclusivity rules | Phase 3 - Skill/Talent Choice Engine | Offer-generation tests guarantee unique, valid, state-changing options. |
| Power scaling is unconstrained and collapses map challenge | Phase 4 - World Balance & Director Calibration | Balance sweep meets TTK and survival-band targets across canonical builds. |
| Breakable-prop drop economy distorts progression pacing | Phase 4 - World Balance & Director Calibration | Telemetry confirms kill-based baseline progression remains stable under unlucky drops. |
| Deterministic harness does not track progression-critical state | Phase 5 - Regression Harness & Observability | Snapshot schema contract includes progression fields and fails fast on missing keys. |
| Run reset/resume leaks progression state between sessions | Phase 6 - Lifecycle Hardening & Release Gate | Restart/new-run deterministic tests pass for same seed and input script. |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/CONCERNS.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/TESTING.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/research/FEATURES.md`
- Established deterministic-simulation and action-survivor balancing practices from production postmortems

---
*Pitfalls research for: v1.1 World & Growth Overhaul deterministic progression loop*
*Researched: 2026-03-05*

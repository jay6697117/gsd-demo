# Codebase Concerns

**Analysis Date:** 2026-03-05

## Tech Debt

**God file for game runtime orchestration:**
- Issue: Core loop, state machine, input handling, rendering, UI sync, and deterministic hooks are concentrated in one large file.
- Files: `src/main.js`
- Impact: Change blast radius is high; small feature edits can break unrelated flows (pause/focus/fullscreen/combat) and review cost is high.
- Fix approach: Split into focused modules (`loop`, `combat`, `feedback`, `controls`, `ui-sync`), keep side effects at one entrypoint.
- Priority: High

**Repeated lifecycle/disposal logic for render objects:**
- Issue: Sprite/particle/slash creation and disposal are manually repeated in multiple places.
- Files: `src/main.js`
- Impact: Easy to introduce resource leaks or inconsistent cleanup when adding new effect types.
- Fix approach: Centralize object factories + disposal helpers with shared ownership boundaries.
- Priority: Medium

**Determinism and production runtime concerns are tightly coupled:**
- Issue: Test-oriented deterministic controls are embedded directly into runtime flow.
- Files: `src/main.js`, `src/determinism-harness.js`
- Impact: Future gameplay features may accidentally depend on test hooks, increasing regression risk.
- Fix approach: Gate deterministic debug APIs behind build flags and isolate harness adapter layer.
- Priority: Medium

## Known Bugs

**Potential cross-browser mismatch in visibility/fullscreen event targets:**
- Symptoms: Focus/pause or fullscreen state metadata may fail to update on some environments.
- Files: `src/main.js`
- Trigger: `visibilitychange`/`fullscreenchange` listeners are attached to `window` instead of canonical `document`/element targets.
- Workaround: Keep blur/focus fallback logic, but behavior is still platform-dependent.
- Root cause: Event source assumptions are not normalized.
- Priority: High

**Time stepping may under-advance or over-advance for non-step-aligned inputs:**
- Symptoms: `advanceTime(ms)` can drift from expected simulated duration for arbitrary `ms` values.
- Files: `src/determinism-harness.js`, `src/main.js`
- Trigger: Step count uses `Math.round(clampedMs / stepMs)` with forced minimum of 1 step.
- Workaround: Callers pass multiples of 16.666ms (60 FPS step).
- Root cause: Rounding strategy optimizes simplicity, not strict elapsed-time fidelity.
- Priority: Medium

**Enemy collision check uses pre-move distance:**
- Symptoms: Fast close-range contacts can register one tick late (or feel inconsistent at boundary conditions).
- Files: `src/main.js`
- Trigger: Collision condition uses `len` computed before enemy position update.
- Workaround: Low `dt` masks most cases but does not remove edge-case mismatch.
- Root cause: Distance is not recomputed after movement integration.
- Priority: Medium

## Security Considerations

**Determinism control APIs are globally exposed in production bundle:**
- Risk: Anyone with console access can force simulation progression and inspect full gameplay state, which blocks trustworthy competitive scoring.
- Files: `src/main.js`
- Current mitigation: None (always exported on `window`).
- Recommendations: Expose only in test/dev builds, or guard with explicit runtime debug flag.
- Priority: High

**Third-party font CDN dependency without strict policy controls:**
- Risk: External font requests leak client metadata and add supply-chain/network dependency for first render.
- Files: `index.html`
- Current mitigation: `preconnect` is present, but no CSP/SRI/self-host fallback.
- Recommendations: Self-host fonts or add strict CSP + fallback font strategy.
- Priority: Low

## Performance Bottlenecks

**Per-enemy sprite texture/material allocation on every spawn:**
- Problem: New canvas texture + sprite material are created for each enemy instance.
- Files: `src/main.js`
- Measurement: Build is functional, but this pattern scales poorly under spawn pressure and increases GC churn.
- Cause: No cache for identical enemy archetype assets.
- Improvement path: Cache textures/material templates by enemy type and clone lightweight sprite instances.
- Priority: High

**Per-particle and per-slash geometry/material churn:**
- Problem: Combat feedback allocates many short-lived Three.js objects every second.
- Files: `src/main.js`
- Measurement: At sustained combat, allocations are bounded by caps but still produce frequent GC spikes on lower-end devices.
- Cause: No pooling/reuse strategy for effects.
- Improvement path: Introduce object pools and shared geometries/materials for slash/particle systems.
- Priority: High

**Initial bundle size exceeds Vite warning threshold:**
- Problem: Production JS chunk is over 500 kB minified.
- Files: `package.json`, `src/main.js`
- Measurement: `npm run build` reports `dist/assets/index-*.js` around 522.78 kB and chunk-size warning.
- Cause: Single-entry architecture plus full runtime in one module.
- Improvement path: Split modules and lazy-load non-critical runtime/debug surfaces.
- Priority: Medium

## Fragile Areas

**Control-state transitions are sensitive to update order:**
- Files: `src/main.js`, `src/control-rules.js`
- Why fragile: Pause/focus/fullscreen/restart transitions are interwoven with per-frame updates and side effects.
- Common failures: A small ordering change can break recovery flow or key edge consumption.
- Safe modification: Keep transition logic pure, enforce explicit state transition tests before reordering frame pipeline.
- Test coverage: Pure helper tests exist, but integrated transition sequencing is lightly covered.
- Priority: High

**Boot assumes required DOM nodes always exist:**
- Files: `src/main.js`, `index.html`
- Why fragile: Missing or renamed elements will throw during module evaluation.
- Common failures: Runtime crash before game loop starts in embedding/refactor scenarios.
- Safe modification: Add defensive null checks and fail-fast diagnostics around DOM binding.
- Test coverage: No automated test for degraded/missing DOM contracts.
- Priority: Medium

## Scaling Limits

**Active combat entity caps are hard-coded for stability, not scalability:**
- Current capacity: `MAX_ACTIVE_ENEMIES = 26`, `FEEDBACK_PARTICLE_HARD_CAP = 120`.
- Files: `src/main.js`
- Limit: Increasing combat density requires structural performance work; current caps hide rather than solve throughput limits.
- Symptoms at limit: Spawn cadence throttles and visual feedback may be culled.
- Scaling path: Object pooling + batched updates + per-device quality tiers.
- Priority: Medium

**Manual deterministic stepping has a hard upper bound:**
- Current capacity: `MAX_ADVANCE_STEPS = 7200` (~120s at 60 FPS) per call.
- Files: `src/determinism-harness.js`
- Limit: Long-range replay/soak scenarios need segmented stepping.
- Symptoms at limit: Calls silently cap and cannot represent requested long durations exactly.
- Scaling path: Expose chunked stepping API with explicit continuation metadata.
- Priority: Low

## Dependencies at Risk

**Playwright is listed as runtime dependency:**
- Risk: Production installs pull test tooling footprint and browser-related transitive surface unnecessarily.
- Files: `package.json`, `tests/playwright-burst.test.js`
- Impact: Larger install size, slower CI/deploy setup, avoidable supply-chain exposure for runtime environments.
- Migration plan: Move `playwright` to `devDependencies` and keep test scripts unchanged.
- Priority: Medium

## Missing Critical Features

**No structured runtime cleanup lifecycle for hot reload/unmount:**
- Problem: Global listeners and RAF loop are started unconditionally with no teardown handler.
- Files: `src/main.js`
- Current workaround: Full page reload resets state.
- Blocks: Reliable embedding/re-initialization and cleaner dev HMR behavior.
- Implementation complexity: Medium.
- Priority: Medium

## Test Coverage Gaps

**Core gameplay integration logic is largely untested at unit level:**
- What's not tested: `startRun`, `updateGameStep`, `doAttack`, enemy collision/damage, and restart transition correctness.
- Files: `src/main.js`, `tests/control-rules.test.js`, `tests/determinism-contract.test.js`
- Risk: Refactors in main loop can regress combat/state behavior without fast failing tests.
- Priority: High
- Difficulty to test: Requires extracting side-effect-heavy logic into testable pure modules or harnessable adapters.

**Focus/fullscreen browser-compatibility matrix is not regression-tested:**
- What's not tested: Browser differences for focus/visibility/fullscreen event ordering and listener targets.
- Files: `src/main.js`, `tests/playwright-burst.test.js`
- Risk: Platform-specific input/state bugs escape CI because current burst test validates only a narrow happy path.
- Priority: High
- Difficulty to test: Needs multi-scenario Playwright flows and assertions on control-state metadata transitions.

**Performance regressions lack automated guardrails:**
- What's not tested: Allocation pressure and frame-time stability under sustained combat.
- Files: `src/main.js`, `tests/playwright-burst.test.js`
- Risk: Future visual polish may degrade FPS or increase GC stalls without detection.
- Priority: Medium
- Difficulty to test: Requires lightweight performance budget assertions in scripted runs.

---

*Concerns audit: 2026-03-05*
*Update as issues are fixed or new ones discovered*

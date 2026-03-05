# Codebase Concerns

**Analysis Date:** 2026-03-05

## Tech Debt

**Monolithic runtime orchestration in one entry file:**
- Issue: Game loop, state transitions, rendering, combat, UI synchronization, and browser event handling are all implemented in one large module.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Why: Fast iteration favored direct in-file implementation over subsystem boundaries.
- Impact: High change blast radius; unrelated regressions are easy to introduce during small edits.
- Fix approach: Extract runtime subsystems (`loop`, `combat`, `effects`, `controls`, `ui`) and keep side effects isolated in one bootstrap layer.

**Cross-module contracts are implicit and string-literal driven:**
- Issue: State fields and mode values are coordinated across modules without a shared schema or runtime validator.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js`
- Why: Lightweight JavaScript structure without explicit type contracts.
- Impact: Refactors can silently desynchronize shape/field assumptions and break determinism snapshots.
- Fix approach: Introduce a shared state contract module (or TypeScript + strict checks) and centralize mode constants.

**Determinism hooks are coupled to production runtime:**
- Issue: Test-oriented stepping and snapshot APIs are exported directly to `window` in the main runtime.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Why: Deterministic automation was integrated by extending the main runtime surface.
- Impact: Runtime behavior and test harness concerns are tightly coupled, increasing accidental misuse risk.
- Fix approach: Gate deterministic APIs by environment flags and expose them via a dedicated debug adapter.

## Known Bugs

**`visibilitychange` listener uses `window` instead of canonical `document` target:**
- Symptoms: Focus recovery/pause metadata can become inconsistent in browser environments that do not route the event to `window`.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Trigger: Tab visibility changes while the game is in active play.
- Workaround: `blur`/`focus` handlers partially compensate, but behavior remains event-order dependent.
- Root cause: Event target assumptions are broader than browser guarantees for `visibilitychange`.

**Enemy hit check uses stale distance after movement integration:**
- Symptoms: Borderline contact damage can be delayed by one tick, producing inconsistent feel at close range.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Trigger: Enemy starts just outside collision range, moves into range within the same update step.
- Workaround: Small fixed `dt` reduces frequency but does not remove edge cases.
- Root cause: Collision test compares against `len` computed before enemy position update.

**`advanceTime(0)` still advances simulation by one fixed step:**
- Symptoms: Zero-duration deterministic calls mutate state/time unexpectedly.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js`
- Trigger: `computeAdvanceSteps(0, fixedStep)` path in deterministic automation.
- Workaround: Callers avoid zero-duration stepping.
- Root cause: Step conversion enforces `Math.max(1, ...)` even when requested duration is zero.

## Security Considerations

**Global deterministic control and full-state introspection are always exposed:**
- Risk: Browser console access can force deterministic progression and inspect internal runtime state.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Current mitigation: None.
- Recommendations: Restrict debug APIs to dev/test builds and hide them behind explicit runtime flags.

**External font CDN dependency without strict policy controls:**
- Risk: External requests leak client metadata and introduce a supply-chain dependency for render-critical assets.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/index.html`
- Current mitigation: Basic `preconnect`.
- Recommendations: Self-host fonts or enforce strict CSP with reliable local fallback.

## Performance Bottlenecks

**Enemy spawn path allocates fresh canvas textures/materials per instance:**
- Problem: Each spawned enemy creates new GPU/CPU-side texture/material objects.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Measurement: Pattern is allocation-heavy by design; no texture/material cache exists for repeated archetypes.
- Cause: Sprite factory creates per-instance texture/material rather than archetype-level reuse.
- Improvement path: Cache textures/material templates per enemy type and reuse sprite resources.

**Particle/slash effects create short-lived geometry/material objects at high frequency:**
- Problem: Combat feedback emits many transient Three.js allocations.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Measurement: Hard caps exist (`FEEDBACK_PARTICLE_HARD_CAP = 120`) but object churn still creates GC pressure.
- Cause: No pooling/reuse for particle and slash render objects.
- Improvement path: Add object pools and shared geometry/material resources.

**Bundle size warning indicates limited code-splitting headroom:**
- Problem: Main production JS chunk exceeds warning threshold.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Measurement: `npm run build` reports `dist/assets/index-CLshM1Hp.js` at `522.78 kB` minified.
- Cause: Single-entry architecture and centralized runtime code.
- Improvement path: Split non-critical runtime/debug surfaces with dynamic import boundaries.

## Fragile Areas

**DOM binding assumes required elements always exist:**
- Why fragile: Startup reads required nodes without null guards, then immediately attaches listeners.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/index.html`
- Common failures: Runtime crash during bootstrap when IDs change or partial embeds omit expected nodes.
- Safe modification: Add explicit DOM contract checks with fail-fast diagnostics.
- Test coverage: No degraded-DOM bootstrap test exists.

**Control-state transitions depend on strict update ordering:**
- Why fragile: Fullscreen, pause, focus recovery, restart, and edge-key consumption are interleaved in one frame pipeline.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js`
- Common failures: Small ordering shifts can regress pause/focus behavior and restart timing.
- Safe modification: Keep transition logic pure and assert sequence behavior with integration tests before reordering.
- Test coverage: Rule-level tests exist, but integrated sequencing coverage is limited.

## Scaling Limits

**Combat throughput is capped by fixed hard limits:**
- Current capacity: `MAX_ACTIVE_ENEMIES = 26`, `FEEDBACK_PARTICLE_HARD_CAP = 120`.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Limit: Higher density gameplay requires structural performance changes, not just larger constants.
- Symptoms at limit: Spawn throttling and feedback culling under sustained pressure.
- Scaling path: Device-tier quality settings, pooling, and batch-friendly update paths.

**Deterministic stepping is capped per call:**
- Current capacity: `MAX_ADVANCE_STEPS = 7200` (~120 seconds at 60 FPS per call).
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js`
- Limit: Long replay/soak scenarios require repeated segmented calls.
- Symptoms at limit: Requested long durations are truncated by cap.
- Scaling path: Add chunked stepping API with explicit continuation metadata.

## Dependencies at Risk

**Playwright is installed as a runtime dependency instead of dev-only:**
- Risk: Production installs include browser-automation tooling and larger transitive footprint.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`
- Impact: Larger install surface and avoidable dependency risk in runtime environments.
- Migration plan: Move `playwright` from `dependencies` to `devDependencies`.

## Missing Critical Features

**No explicit teardown lifecycle for listeners and RAF loop:**
- Problem: Runtime initializes global listeners and animation loop unconditionally, with no cleanup API.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`
- Current workaround: Full page reload resets state.
- Blocks: Safe embedding/re-mount patterns and deterministic cleanup in hot-reload contexts.
- Implementation complexity: Medium.

## Test Coverage Gaps

**Core gameplay transitions and combat branches are not directly unit-tested:**
- What's not tested: `startRun`, `updateGameStep`, `doAttack`, collision damage edge cases, restart transition race paths.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js`
- Risk: Refactors can break gameplay correctness without fast, localized failures.
- Priority: High.
- Difficulty to test: Requires extraction of side-effect-heavy logic into testable subsystems.

**Browser event-order compatibility is only lightly validated:**
- What's not tested: Cross-browser ordering differences for blur/focus/visibility/fullscreen transitions.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`
- Risk: Platform-specific control-state regressions can pass CI unnoticed.
- Priority: High.
- Difficulty to test: Needs multi-scenario Playwright assertions for transition metadata.

**Performance regression budgets are not automated:**
- What's not tested: Allocation churn and frame-time behavior under sustained high-entity combat.
- Files: `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`
- Risk: Visual feature growth can degrade responsiveness with no CI guardrail.
- Priority: Medium.
- Difficulty to test: Requires scripted stress profile and budget thresholds in CI.

---

*Concerns audit: 2026-03-05*
*Update as issues are fixed or new ones discovered*

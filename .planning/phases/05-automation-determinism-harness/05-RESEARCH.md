# Phase 5: Automation & Determinism Harness - Research

**Researched:** 2026-03-05
**Domain:** Deterministic simulation harness, stable state contract, Playwright burst automation
**Confidence:** HIGH

<user_constraints>
## User Constraints

### Locked Inputs (from ROADMAP + REQUIREMENTS)
- `AUTO-01`: `window.render_game_to_text()` must return stable gameplay-relevant JSON state for assertions.
- `AUTO-02`: `window.advanceTime(ms)` must deterministically advance simulation time for repeatable tests.
- `AUTO-03`: Playwright burst actions must progress gameplay and produce artifacts without runtime errors.
- Keep v1 scope focused on automation and determinism only; no gameplay feature expansion.

### Context Gap
- No `05-CONTEXT.md` exists yet.
- Planning proceeds from roadmap/requirements and current codebase behavior only.

### Claude's Discretion
- Exact payload schema versioning strategy for `render_game_to_text`.
- Exact artifact format/path for burst automation outputs.
- How to split deterministic contract tests vs browser automation tests.

### Deferred Ideas (OUT OF SCOPE)
- Cloud CI orchestration and cross-browser matrix.
- Performance benchmarking dashboards.
</user_constraints>

<research_summary>
## Summary

Phase 5 should formalize the existing debug bridge into a deterministic testing contract and attach a repeatable Playwright burst harness. Current code already exposes `window.render_game_to_text()` and `window.advanceTime(ms)`, but schema stability and deterministic guarantees are not yet contract-tested.

Most robust sequence is two-step: first lock deterministic runtime contract (AUTO-01/02), then build browser automation burst flow (AUTO-03) that depends on the contract output.

**Primary recommendation:** split execution into two plans:
1. Contract hardening + deterministic stepping assertions.
2. Playwright burst harness + artifact emission and runtime-error guards.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | Runtime simulation/render loop | Existing engine path to be made machine-verifiable |
| vite | 7.3.1 | Build and packaging | Existing baseline validation gate |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright | 1.58.2 | Browser burst automation and artifact capture | AUTO-03 end-to-end deterministic smoke |
| node:test | Node built-in | Contract-level deterministic assertions | AUTO-01/02 unit/integration contract checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Playwright scripts in repo | External runner harness | Lower in-repo visibility and harder phase verification linkage |

**Installation:**
```bash
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Contract-first debug bridge
**What:** Treat `render_game_to_text` output as versioned assertion contract.
**When to use:** Any state output change that affects automation.

### Pattern 2: Deterministic step adapter
**What:** `advanceTime(ms)` is deterministic and bounded; same seed + same steps => same state hash.
**When to use:** Regression and reproducibility tests.

### Pattern 3: Burst-runner with artifact bundle
**What:** One command runs Playwright burst inputs, captures screenshot + JSON state + console summary.
**When to use:** AUTO-03 proof and future CI smoke.

### Anti-Patterns to Avoid
- Embedding random-time dependencies in contract payload (e.g., wall-clock timestamps).
- Allowing browser-only manual tests as sole evidence for deterministic requirements.
- Mixing gameplay feature changes into automation harness tasks.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON contract drift detection | Manual eyeballing only | Snapshot-style deterministic assertions over selected fields | Prevents silent contract breakage |
| Burst automation validation | Ad-hoc one-off browser steps | Scripted Playwright burst with stable artifact path | Repeatable and auditable |

**Key insight:** Phase 5 quality depends on explicit contracts and repeatable artifacts, not on adding new gameplay behaviors.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Non-deterministic payload fields
**What goes wrong:** State output changes across identical seeded runs.
**How to avoid:** Restrict payload to simulation-derived fields and deterministic rounding rules.

### Pitfall 2: advanceTime drift
**What goes wrong:** `advanceTime(ms)` accumulates frame-dependent drift across runs.
**How to avoid:** Use fixed-step count derivation and deterministic loop path only.

### Pitfall 3: Burst harness false-green
**What goes wrong:** Script runs but misses console/runtime failures.
**How to avoid:** Capture console errors and fail test if critical runtime errors appear.
</common_pitfalls>

<validation_architecture>
## Validation Architecture

### Verification split
- **Contract tests (AUTO-01/02):** deterministic state schema and time-step reproducibility checks.
- **Build gate:** `npm run build` after contract updates.
- **Burst e2e (AUTO-03):** Playwright burst script that captures screenshot + state JSON and validates no runtime errors.

### Required verification commands
```bash
node --test tests/determinism-contract.test.js
node tests/playwright-burst.test.js
npm run build
```

### Nyquist intent
- Every plan task includes explicit automated command.
- No step depends solely on manual testing.
- Artifacts are deterministic and persisted under a stable path.
</validation_architecture>

<code_examples>
## Code Examples

### Deterministic state capture
```javascript
const snapshot = JSON.parse(window.render_game_to_text());
```

### Deterministic stepping
```javascript
window.advanceTime(1000);
```

### Burst action sample
```javascript
await page.keyboard.down("KeyW");
await page.waitForTimeout(120);
await page.keyboard.up("KeyW");
```
</code_examples>

<sota_updates>
## State of the Art (project-local)

- Runtime already exposes `render_game_to_text` and `advanceTime`; Phase 5 should harden these into contract-tested interfaces.
- Existing Node test setup is active and can absorb new contract tests without framework migration.
</sota_updates>

<open_questions>
## Open Questions

1. Whether to include a `schemaVersion` field in `render_game_to_text` for explicit contract evolution.
2. Whether burst artifacts should keep latest-only or timestamped history under `.planning/artifacts/`.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `src/main.js`
- `tests/control-rules.test.js`
- `tests/feedback-rules.test.js`
</sources>

<metadata>
## Metadata

**Research date:** 2026-03-05
**Valid until:** next phase-planning cycle
</metadata>

---

*Phase: 05-automation-determinism-harness*
*Research completed: 2026-03-05*
*Ready for planning: yes*

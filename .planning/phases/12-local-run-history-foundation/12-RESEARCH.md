# Phase 12: Local Run History Foundation - Research

**Researched:** 2026-03-07  
**Domain:** local-only standard-run history persistence, best-score ranking contract, start/gameover history surfaces, deterministic meta observability  
**Confidence:** HIGH

## User Constraints

### Locked Requirements (MUST cover)
- `META-01`: completed standard-run summaries persist locally across reload and browser restart.
- `META-02`: user can view local best-score history with score, survival time, kills, seed, level, and played-at metadata.

### Locked Decisions
- Phase 12 only covers `standard run` history and best-score surfaces.
- `best-score` ranks by `Score -> Time -> Kills -> Level`.
- history shape is `Best + Recent`, not a single merged journal.
- retention is `Top 10 + Recent 20`.
- history appears on both `start-screen` and `gameover-screen`.
- default visibility is a collapsed panel; expanded layout is `Best first, Recent below`.
- each record uses compact 2-line density: line 1 highlights `score/time`; line 2 contains `kills/level/seed/playedAt`.
- no daily challenge, backend, cloud sync, persistent progression, inventory, stash, or new standalone meta page in this phase.

### Phase Boundary
- Deliver one deterministic local summary model for completed standard runs, one bounded persistence contract, and two existing overlay surfaces that can render the same history summary.
- Do not introduce daily buckets, challenge identity, cross-run progression, or online features.

## Summary

Phase 12 is not a gameplay phase. It is the first meta shell around the already-shipped v1.1 run loop. That means the safest plan is to attach history only where the runtime already has authoritative run-completion truth, and to keep every assertion rooted in the same text-state and browser helpers that the project already trusts.

The repository facts point to one clean implementation path:
1. `src/main.js#enterGameOver()` is already the canonical run-end boundary and currently formats `state.gameOverSummary`. That is the only correct place to normalize and persist one completed standard-run record.
2. `src/main.js#startRun()` is already the canonical run reset entry. It is therefore the correct place to hydrate local history into runtime state without accidentally double-writing or leaking transient run slices.
3. `index.html` already contains exactly the two surfaces the user chose: `#start-screen` and `#gameover-screen`. Phase 12 does not need a third screen or routing layer; it needs a reusable history renderer/contract for those two overlays.
4. `render_game_to_text()` and `tests/helpers/playwright-game.js` already define the project's automation truth model. History should be observable through `metaState` in the snapshot, not only through DOM text or direct `localStorage` inspection.

The main risk in this phase is not implementation difficulty. It is scope bleed and contract drift. If the plan leaves room for ad-hoc storage shape, hidden ranking rules, or multiple write entrypoints, Phase 13 daily challenge work will become harder and tests will become ambiguous. So the research conclusion is to freeze the history contract now, keep it local-only and standard-only, and prove it through one rule test plus one browser route.

**Primary recommendation:** plan this phase as `3` serial waves: `12-01 -> 12-02 -> 12-03`.

## Planner-Critical Findings

### 1) `enterGameOver()` is the only correct write boundary
- Current fact: `src/main.js#enterGameOver()` already transitions the runtime into `gameover` and writes the existing summary string.
- Risk: writing history anywhere else (`requestRestart()`, `startRun()`, start-screen render, helper scripts) will produce duplicate records or make restart semantics ambiguous.
- Planning implication: the normalized summary builder and persistence write must anchor to game-over entry, once per completed standard run.

### 2) `startRun()` is the correct hydration/reset boundary
- Current fact: `src/main.js#startRun()` already resets run-local state such as world, spawn, loot, equipment, progression, level-up, and RNG slices.
- Risk: if history hydration happens lazily in UI render code, browser reload and restart parity become harder to reason about; if it happens during write, start-screen cannot display history before the next run starts.
- Planning implication: history load should happen during boot/start-run initialization into a stable `state.meta.standardHistory` slice.

### 3) there is currently no storage or meta-state implementation
- Current fact: repo search shows no `localStorage`, `storage`, `metaState`, or history-specific code in the runtime.
- Risk: planner must not assume an existing abstraction layer or generic persistence framework.
- Planning implication: Phase 12 should introduce a narrow, versioned persistence adapter dedicated to standard-run history instead of a broad “meta store”.

### 4) `index.html` already exposes the exact two UI shells the phase needs
- Current fact: `index.html` has `#start-screen` and `#gameover-screen`, each with existing title/summary/button content blocks.
- Risk: creating a separate meta page would violate locked scope and add navigation work with no requirement support.
- Planning implication: Phase 12 should render a collapsed history panel into both overlays, using one shared rendering contract or helper.

### 5) snapshot-first observability remains the correct automation strategy
- Current fact: `tests/helpers/playwright-game.js` reads browser state via `window.advanceTime(ms)` and `window.render_game_to_text()`; existing Playwright tests assert against parsed snapshot JSON.
- Risk: if Phase 12 relies on raw `localStorage` inspection for correctness, determinism and browser diagnostics split into two truth sources.
- Planning implication: `metaState` must expose `bestRuns`, `recentRuns`, and panel expansion state so tests can explain failures from runtime state alone.

### 6) time source must be controlled explicitly
- Current fact: the phase requires `playedAt`, but the runtime does not yet have a time abstraction for persisted meta records.
- Risk: scattered `Date.now()` calls make tie-breaks, browser assertions, and replay diagnostics unstable.
- Planning implication: planner must require one explicit time source boundary for persisted records, with testability in mind.

### 7) restart parity and persistence are related but not identical
- Current fact: `tests/playwright-restart-parity.test.js` already proves run-local slices reset through the real `gameover -> restart -> startRun` flow.
- Risk: if Phase 12 treats persisted history as another run-local slice, restart may wrongly clear it; if it bypasses runtime state entirely, text-state becomes incomplete.
- Planning implication: Phase 12 browser coverage should prove both sides simultaneously: run-local reset stays intact while persisted standard history survives reload/restart.

## Standard Stack

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `node:test` | Node built-in | pure rule and persistence-contract assertions | already used across deterministic logic tests |
| `playwright` | `1.58.2` | browser route for start/gameover/reload history assertions | already shipped in v1.1 regression |
| `vite` | `7.3.1` | build gate | keeps validation aligned with existing phases |

### Recommendation
- Do not introduce a UI framework, state library, database wrapper, or generic persistence SDK.
- Use the existing browser helper pattern and text-state contract.
- Keep storage shape narrow and explicitly versioned.

## Architecture Patterns

### Pattern 1: Normalize-on-Write, Hydrate-on-Start
**What:** normalize a completed standard-run summary exactly once at game-over, persist it, then hydrate persisted history into runtime state on start/boot.  
**Where:** `src/main.js` plus a dedicated history/persistence module.  
**Why:** separates write events from view rendering and prevents duplicate records.

### Pattern 2: Dedicated Versioned History Store
**What:** persist only `{ version, bestRuns, recentRuns }` for standard history.  
**Where:** new meta/history module.  
**Why:** avoids premature design of a generic meta store before daily challenge exists.

### Pattern 3: Shared Overlay History Renderer Contract
**What:** one render path or one formatting contract feeds both start-screen and gameover-screen.  
**Where:** `src/main.js` + existing overlay DOM.  
**Why:** guarantees both surfaces show the same order, density, and collapse/expand semantics.

### Pattern 4: Snapshot-First Meta Assertions
**What:** expose `metaState` in `render_game_to_text()` and assert browser behavior against it.  
**Where:** `src/determinism-harness.js`, Playwright scripts.  
**Why:** keeps diagnostics consistent with the rest of the project and avoids hidden storage-only truth.

## Proposed Contracts

### Runtime Meta Slice
```js
state.meta = {
  standardHistory: {
    bestRuns,
    recentRuns,
    isExpanded,
  },
};
```

### Persisted Storage Shape
```js
{
  version: 1,
  bestRuns,
  recentRuns,
}
```

### Standard Run Record
```js
{
  id,
  mode: "standard",
  score,
  time,
  kills,
  level,
  seed,
  playedAt,
}
```

### Ranking Contract
- Primary sort: `score desc`
- Tie-break 1: `time desc`
- Tie-break 2: `kills desc`
- Tie-break 3: `level desc`
- Stable fallback: `playedAt desc`, then `id desc`

### Snapshot Extension
```js
metaState: {
  bestRuns,
  recentRuns,
  isExpanded,
}
```

## Don’t Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| persistence | generic meta DB or catch-all settings store | narrow versioned standard-history adapter | keeps Phase 12 bounded and Phase 13 easier to extend |
| ranking | hidden weighted formula | explicit comparator matching locked user rules | deterministic and user-explainable |
| testing | direct `localStorage` as primary oracle | snapshot `metaState` + browser route | one truth source for runtime and tests |
| UI surface | new standalone meta page | existing `start-screen` + `gameover-screen` overlays | matches locked product boundary |
| time capture | scattered `Date.now()` calls | one injected/centralized played-at source | stable tests and tie-breaks |

## Common Pitfalls

### Pitfall 1: Writing history more than once per run
**Avoid:** only persist at game-over entry; never at restart button, start button, or overlay render.

### Pitfall 2: Letting recent ordering and best ordering share one mutable list
**Avoid:** treat `bestRuns` and `recentRuns` as two separately maintained bounded projections.

### Pitfall 3: Pulling daily semantics into standard history early
**Avoid:** keep `mode: "standard"` explicit and reject daily-specific identity fields from Phase 12 data shape.

### Pitfall 4: Making DOM the only history evidence
**Avoid:** add `metaState` to the snapshot so browser failures are diagnosable without screenshots.

### Pitfall 5: Treating persisted history as run-local reset state
**Avoid:** restart resets run-local slices, but standard history survives because it is loaded from persistence, not reset as gameplay state.

## Validation Architecture

### Wave 1 Validation
- `node --test tests/meta-history.test.js`
- `npm run build`

### Wave 2 Validation
- `node --test tests/meta-history.test.js`
- `npm run build`

### Wave 3 Validation
- `node tests/playwright-meta-history.test.js`
- `npm run build`

### Phase Gate
- `npm run build && node --test tests/world-sectors.test.js tests/building-system.test.js tests/building-tactics.test.js tests/building-steering.test.js tests/breakable-system.test.js tests/drop-system.test.js tests/equipment-system.test.js tests/progression-system.test.js tests/levelup-system.test.js tests/meta-history.test.js tests/determinism-contract.test.js && node tests/playwright-burst.test.js && node tests/playwright-breakables-loot.test.js && node tests/playwright-levelup-choice.test.js && node tests/playwright-progression-levels.test.js && node tests/playwright-meta-history.test.js && node tests/playwright-restart-parity.test.js`

### Required Evidence
- sorting/retention logic is asserted in pure tests
- start-screen and gameover-screen both expose the history surface
- browser reload keeps persisted standard history readable
- restart parity remains compatible with persistence
- no daily challenge data appears in Phase 12 runtime or snapshot contracts

## Requirement-to-Plan Hints

### Plan 12-01 (Wave 1, depends_on: none): Standard History Model + Persistence Rules
**Primary requirement:** `META-01`  
**Files (expected):**
- `src/meta-history.js` or equivalent new module
- `tests/meta-history.test.js`
- `src/main.js` (only if hydration hook must be stubbed early)

**Implementation hints:**
1. build a normalized summary builder for completed standard runs
2. define a versioned storage adapter
3. implement ranking, bounded best/recent retention, and stable fallback ordering
4. keep UI out of this wave

### Plan 12-02 (Wave 2, depends_on: 12-01): Surface History on Start/Gameover Overlays
**Primary requirements:** `META-01`, `META-02`  
**Files (expected):**
- `src/main.js`
- `index.html`
- `src/style.css`
- `src/meta-history.js`

**Implementation hints:**
1. write history exactly once at game-over
2. hydrate history into runtime state for start-screen and gameover-screen rendering
3. render one collapsed panel contract on both surfaces
4. expanded layout is `Best` above `Recent`, with compact 2-line record density

### Plan 12-03 (Wave 3, depends_on: 12-02): Snapshot Bridge + Browser Persistence Route
**Primary requirements:** `META-01`, `META-02`  
**Files (expected):**
- `src/determinism-harness.js`
- `tests/playwright-meta-history.test.js`
- `tests/meta-history.test.js`
- `tests/playwright-restart-parity.test.js` (only if parity coverage needs extension)

**Implementation hints:**
1. serialize `metaState` through the determinism harness
2. verify persisted standard history survives reload/browser restart
3. prove both start-screen and gameover-screen expose the same history model
4. explicitly assert no Phase 13 daily fields leak into the snapshot

## Recommended Plan Count
- **3 plans**
- **3 waves**
- **Execution order:** `12-01 -> 12-02 -> 12-03`

## Final Recommendation
Plan Phase 12 as a narrow local meta shell with one write boundary, one versioned persistence contract, one shared overlay history model, and one snapshot-visible meta state. That gives Phase 13 a clean place to add daily challenge bucketing later without reopening standard-run history semantics.

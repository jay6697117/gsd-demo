# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** Browser game monolith with a single runtime composition root, fixed-step simulation, and deterministic automation hooks.

**Key Characteristics:**
- One orchestrator module (`src/main.js`) owns runtime setup, state transitions, simulation ticks, and render sync.
- Rule logic is split into focused helper modules (`src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`).
- UI shell is declarative and thin (`index.html` + `src/style.css`), while behavior stays in runtime code.
- Deterministic automation is exposed through global hooks (`window.render_game_to_text`, `window.advanceTime`) in `src/main.js`.
- Verification is layered: unit/contract tests in `tests/*.test.js` plus browser burst validation in `tests/playwright-burst.test.js`.

## Layers

**Presentation Layer:**
- Purpose: Provide the HTML shell, canvas mount point, overlays, and HUD styling.
- Contains: DOM nodes and CSS visual definitions.
- Location: `index.html`, `src/style.css`.
- Depends on: Browser DOM/CSS runtime and events bound by `src/main.js`.
- Used by: Player interactions and automated browser tests.

**Runtime Orchestration Layer:**
- Purpose: Assemble renderer/scene, own mutable state, handle input, run game loop, and coordinate systems.
- Contains: `state` and `world` objects, update pipeline, event bindings, lifecycle transitions.
- Location: `src/main.js`.
- Depends on: `three` package and helper modules in `src/*.js`.
- Used by: Entire interactive runtime and automation entry hooks.

**Domain Rules Layer:**
- Purpose: Encapsulate deterministic and reusable rule logic outside the runtime shell.
- Contains:
  - Control intent helpers in `src/control-rules.js`.
  - Feedback/tempo/danger logic in `src/feedback-rules.js`.
  - Snapshot schema and step computation in `src/determinism-harness.js`.
- Depends on: JavaScript standard library only.
- Used by: `src/main.js` and tests in `tests/control-rules.test.js`, `tests/feedback-rules.test.js`, `tests/determinism-contract.test.js`.

**Verification and Automation Layer:**
- Purpose: Validate behavior determinism, rule correctness, and runtime health under browser execution.
- Contains: Node test runner suites and Playwright scenario script.
- Location: `tests/control-rules.test.js`, `tests/feedback-rules.test.js`, `tests/determinism-contract.test.js`, `tests/playwright-burst.test.js`.
- Depends on: Node test API, `playwright`, dev server command from `package.json`.
- Used by: Regression checks and artifact generation into `.planning/artifacts/phase-05/`.

## Data Flow

**Interactive Runtime Flow:**

1. Browser loads `index.html` and includes `src/style.css`.
2. Module entry `src/main.js` initializes renderer runtime, scene graph, camera, and global state.
3. Input listeners (`keydown`, `keyup`, `focus`, `blur`, `visibilitychange`, `fullscreenchange`) mutate control/input state.
4. `requestAnimationFrame(frame)` drives an accumulator-based fixed-step loop (`FIXED_STEP = 1/60`).
5. Each fixed step executes `updateGameStep()`: control handling, simulation, combat, spawning, feedback, HUD updates.
6. `syncVisuals()` maps state to scene objects and executes `renderer.render(scene, camera)`.

**Deterministic Automation Flow:**

1. `tests/playwright-burst.test.js` starts the Vite dev server and opens the app in Chromium.
2. Test sets `window.__GSD_DISABLE_WEBGL__ = true` before app code runs to force predictable no-op renderer fallback.
3. Test triggers game start and scripted key bursts, then calls `window.advanceTime(ms)`.
4. `window.advanceTime()` computes deterministic steps via `computeAdvanceSteps()` in `src/determinism-harness.js` and runs fixed updates.
5. Test reads `window.render_game_to_text()` output, which serializes `buildDeterministicSnapshot()` payload.
6. Snapshot and diagnostics are persisted to `.planning/artifacts/phase-05/`.

**State Management:**
- Runtime state is centralized in the `state` object in `src/main.js`.
- Render object references are centralized in the `world` object in `src/main.js`.
- Input edge/hold semantics are tracked by `pressedThisStep` and `keyboardDown` sets in `src/main.js`.
- Determinism metadata is persisted under `state.determinism` and exported by `src/determinism-harness.js`.

## Key Abstractions

**`state` Runtime Model:**
- Purpose: Single mutable source of gameplay truth (mode, player, enemies, control, feedback, determinism).
- Examples: `state.player`, `state.enemies`, `state.control.fullscreen`, `state.determinism` in `src/main.js`.
- Pattern: Centralized in-memory state container.

**`world` Render Registry:**
- Purpose: Keep scene object references separate from scalar simulation state.
- Examples: `world.playerSprite`, `world.enemyRoot`, `world.slashRoot`, `world.particleRoot` in `src/main.js`.
- Pattern: Render-handle registry for lifecycle/disposal control.

**Rule Helper Modules:**
- Purpose: Keep deterministic and testable logic outside the orchestration shell.
- Examples: `resolvePauseMode()` in `src/control-rules.js`, `getDangerState()` in `src/feedback-rules.js`, `buildDeterministicSnapshot()` in `src/determinism-harness.js`.
- Pattern: Stateless helper functions.

**Determinism Snapshot Contract:**
- Purpose: Stable serialized schema for automated assertions.
- Examples: `DETERMINISM_SCHEMA_VERSION` and snapshot structure in `src/determinism-harness.js`.
- Pattern: Contract-first serialization with normalization/sorting.

## Entry Points

**Browser Entry:**
- Location: `index.html`.
- Triggers: HTTP page load.
- Responsibilities: Provide root DOM structure and load `src/main.js` as ESM.

**Runtime Entry Module:**
- Location: `src/main.js`.
- Triggers: Script execution after module load.
- Responsibilities: Build world, bind listeners, start frame loop, expose automation hooks.

**Automation and Test Entries:**
- `tests/determinism-contract.test.js` via `npm run test:determinism` in `package.json`.
- `tests/playwright-burst.test.js` via `npm run test:burst` in `package.json`.

## Error Handling

**Strategy:** Fail soft in rendering and control integrations, preserve simulation continuity, and expose failure details in state.

**Patterns:**
- Renderer creation is wrapped in `try/catch` with no-op fallback in `createRendererRuntime()` (`src/main.js`).
- Fullscreen request promises capture failure metadata (`lastError`, `failureCount`) in `state.control.fullscreen` (`src/main.js`).
- Fixed-step conversion sanitizes invalid inputs and applies hard caps in `computeAdvanceSteps()` (`src/determinism-harness.js`).
- Render resources are explicitly disposed when entities/effects expire (`src/main.js`).

## Cross-Cutting Concerns

**Determinism:**
- Fixed-step simulation and bounded step conversion in `src/main.js` and `src/determinism-harness.js`.
- Stable snapshot ordering/rounding contract asserted by `tests/determinism-contract.test.js`.

**Input Discipline:**
- One-shot edge consumption and mode-intent helpers in `src/control-rules.js`.
- Runtime consumes edges through `consumeEdge()` in `src/main.js`.

**Feedback Cohesion:**
- Tempo, combo milestones, danger thresholds in `src/feedback-rules.js`.
- Visual application and rate-limited banners in `src/main.js` and `src/style.css`.

**Observability for Automation:**
- Public hooks in `src/main.js`.
- Persistent artifact output in `.planning/artifacts/phase-05/` from `tests/playwright-burst.test.js`.

---
*Architecture analysis: 2026-03-05*
*Update when runtime layering or module responsibilities change*

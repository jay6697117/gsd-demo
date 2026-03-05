# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

**Files:**
- Source files use `kebab-case` under `src/`, for example `src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`.
- The entry/runtime orchestration stays in `src/main.js`; rule-style logic is extracted into `*-rules.js`.
- Tests use `*.test.js` naming in `tests/`, for example `tests/control-rules.test.js`, `tests/determinism-contract.test.js`.

**Functions:**
- Functions use `camelCase`, for example `resolvePauseMode` in `src/control-rules.js`, `getDangerState` in `src/feedback-rules.js`, `buildDeterministicSnapshot` in `src/determinism-harness.js`.
- Event/control handlers also use verb-led `camelCase`, for example `applyFocusLoss`, `requestFullscreenTransition`, `maybeHandlePauseAndRestart` in `src/main.js`.
- Boolean-returning or boolean-semantic names prefer `is/has/should` prefixes, for example `shouldClearInputForVisibility` (`src/control-rules.js`), `isCriticalConsoleError` (`tests/playwright-burst.test.js`).

**Variables and constants:**
- Local/runtime variables use `camelCase`, for example `rendererRuntime`, `feedbackDangerLayer` (`src/main.js`).
- Constants use `UPPER_SNAKE_CASE`, for example `FIXED_STEP`, `PLAYER_MAX_HP` (`src/main.js`), `MAX_ADVANCE_STEPS` (`src/determinism-harness.js`), `DANGER_HP_RATIO` (`src/feedback-rules.js`).
- State object keys use `camelCase` and semantic nesting (`state.control.pause`, `state.feedback.bannerTimer` in `src/main.js`).

## Code Style

**Formatting (observed):**
- Semicolons are consistently used across source and tests (`src/*.js`, `tests/*.js`).
- Indentation is 2 spaces.
- Multi-line literals and parameter lists keep trailing commas, for example in `src/main.js` and `tests/determinism-contract.test.js`.
- Source files predominantly use double quotes (`src/main.js`, `src/control-rules.js`, `src/determinism-harness.js`).
- A localized quote-style deviation exists in `tests/feedback-rules.test.js` (single quotes). New edits should prefer existing local file style, but repository majority is double quotes.

**Lint/format tooling:**
- No ESLint/Prettier config file is present at repository root (no `eslint.config.*`, `.eslintrc*`, `.prettierrc*` found).
- `package.json` does not define `lint` or `format` scripts (`package.json`).

## Import Organization

- ESM imports are used consistently (`"type": "module"` in `package.json`).
- Typical order in source modules is:
1. External packages first (for example `import * as THREE from "three";` in `src/main.js`).
2. Internal relative modules second (`"./control-rules.js"`, `"./determinism-harness.js"` in `src/main.js`).
- Typical order in tests is:
1. Node built-ins first (`node:test`, `node:assert/strict`, `node:fs/promises`, etc.).
2. Third-party dependencies second when needed (`playwright` in `tests/playwright-burst.test.js`).
3. Relative imports from `src/` last (`../src/*.js` in unit/contract tests).
- Path aliases are not used; imports rely on explicit relative paths (`src/*.js`, `tests/*.js`).

## Error Handling Patterns

- Runtime boundary fallback is preferred over hard crash for optional capabilities:
  - `createRendererRuntime` catches WebGL init failures and falls back to noop renderer in `src/main.js`.
- Input normalization and defensive guards are centralized in utility functions:
  - `toFinite`, `normalizeFixedStep`, `safeSortedKeys` in `src/determinism-harness.js`.
  - `clamp` helpers in `src/main.js` and `src/feedback-rules.js`.
- Guard-clause style is common for control flow short-circuiting:
  - `consumeEdge`, `requestRestart`, `spawnParticles`, `updateSpawning` in `src/main.js` and `src/control-rules.js`.
- Test automation scripts fail fast with explicit `throw new Error(...)`, and top-level `.catch(...)` converts failure to non-zero exit in `tests/playwright-burst.test.js`.

## Logging and Diagnostics

- Logging is minimal and boundary-focused:
  - `console.warn` for renderer fallback diagnostics in `src/main.js`.
  - `console.error` only at process-level failure boundary in `tests/playwright-burst.test.js`.
- There is no dedicated logging framework (no pino/winston wrapper module found).

## Comments

- Comments are sparse and mostly explain intent/why:
  - Determinism rationale comment in `startRun` (`src/main.js`).
  - Polling rationale comment in `waitForServer` (`tests/playwright-burst.test.js`).
  - Input burst intent comments in Playwright scenario (`tests/playwright-burst.test.js`).
- No JSDoc/TSDoc convention is currently enforced in `src/` or `tests/`.

## Function and Module Design

- Pure decision logic is separated into small named-export modules:
  - `src/control-rules.js`
  - `src/feedback-rules.js`
  - `src/determinism-harness.js`
- Side-effect-heavy orchestration is centralized in `src/main.js` (DOM events, rendering loop, world state mutation, global test hooks).
- Default exports are not used; named exports are the dominant pattern (`src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`).
- Test hooks are intentionally exposed as globals for harness integration:
  - `window.render_game_to_text`
  - `window.advanceTime`
  - both defined in `src/main.js`.

---

*Convention analysis: 2026-03-05*
*Update when style or module boundaries change*

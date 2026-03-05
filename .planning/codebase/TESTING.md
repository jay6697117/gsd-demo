# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

**Runner and assertions:**
- Unit/contract tests use Node built-in test runner and assertion library:
  - `import test from "node:test";`
  - `import assert from "node:assert/strict";`
  - see `tests/control-rules.test.js`, `tests/feedback-rules.test.js`, `tests/determinism-contract.test.js`.
- Browser/runtime smoke testing uses Playwright through a standalone Node script (`tests/playwright-burst.test.js`) rather than `node:test` suites.

**Configuration files:**
- No dedicated test config file is present (no `vitest.config.*`, `jest.config.*`, `playwright.config.*` in repository root).
- Test behavior is encoded directly in each test file and npm scripts (`package.json`).

**Run commands (current repository):**
```bash
npm run test:determinism                        # Script in package.json; runs determinism contract
npm run test:burst                              # Script in package.json; runs Playwright burst harness
node --test tests/control-rules.test.js         # Direct unit test run
node --test tests/feedback-rules.test.js        # Direct unit test run
node --test tests/determinism-contract.test.js  # Direct contract test run
node tests/playwright-burst.test.js             # Direct E2E-like smoke run
```

## Test File Organization

**Location and naming:**
- All tests live in top-level `tests/` directory.
- Naming follows `*.test.js`:
  - `tests/control-rules.test.js`
  - `tests/feedback-rules.test.js`
  - `tests/determinism-contract.test.js`
  - `tests/playwright-burst.test.js`
- Source and tests are separated by directory (`src/` vs `tests/`), not colocated.

**Current structure:**
```text
src/
  control-rules.js
  feedback-rules.js
  determinism-harness.js
  main.js
tests/
  control-rules.test.js
  feedback-rules.test.js
  determinism-contract.test.js
  playwright-burst.test.js
```

## Test Structure

- Tests are function-oriented and flat: repeated `test("...", () => { ... })` blocks instead of deep nested suites.
- Assertions are explicit and deterministic (`assert.equal`, `assert.deepEqual`, `assert.ok`).
- Common pattern is arrange/act/assert in sequence, even when comments are omitted.
- Contract tests use local factory helper for repeatable fixtures:
  - `buildMockState()` in `tests/determinism-contract.test.js`.
- Determinism checks include idempotence assertions (`deepEqual` and JSON-string equality) in `tests/determinism-contract.test.js`.

## Mocking Strategy

**Mock framework usage:**
- No Jest/Vitest/Sinon mock API is used.
- No module-level mocking (`mock`, `spyOn`) appears in current test files.

**How dependencies are controlled:**
- Pure function tests pass explicit in-memory inputs (for example `Set` instances in `tests/control-rules.test.js`).
- Contract tests inject controlled callbacks and state objects (for example `sortedKeysFn`, `state` in `tests/determinism-contract.test.js`).
- Browser harness controls environment by initialization hook:
  - `page.addInitScript(() => { window.__GSD_DISABLE_WEBGL__ = true; })` in `tests/playwright-burst.test.js`.
- External boundary isolation is done by process orchestration, not mock framework:
  - spawns Vite dev server via `child_process.spawn`
  - polls readiness with `fetch`
  - captures `pageerror` and `console` events
  - all in `tests/playwright-burst.test.js`.

## Fixtures and Factories

- No shared fixture directory exists (no `tests/fixtures/` or `tests/factories/`).
- Fixtures are local to each test file:
  - `buildMockState()` in `tests/determinism-contract.test.js`.
  - inline constants and setup objects in `tests/control-rules.test.js` and `tests/feedback-rules.test.js`.
- Playwright harness persists runtime artifacts to disk for inspection:
  - `.planning/artifacts/phase-05/burst-latest.png`
  - `.planning/artifacts/phase-05/burst-latest.json`
  - `.planning/artifacts/phase-05/burst-console.json`
  - paths defined in `tests/playwright-burst.test.js`.

## Coverage Strategy

- No automated coverage tool/threshold is configured (`package.json` has no coverage script; no `c8`/`nyc` config).
- Practical strategy is risk-based by test type:
  - Unit rules coverage for control and feedback logic (`tests/control-rules.test.js`, `tests/feedback-rules.test.js`).
  - Contract coverage for deterministic snapshot and stepping API (`tests/determinism-contract.test.js`).
  - Runtime smoke coverage for integration path and browser errors (`tests/playwright-burst.test.js`).
- Critical invariants currently emphasized:
  - deterministic step conversion and snapshot schema stability (`tests/determinism-contract.test.js`)
  - low-HP danger/chain threshold behavior (`tests/feedback-rules.test.js`)
  - focus/pause/fullscreen control transitions (`tests/control-rules.test.js`)
  - start-to-running transition and console/page error absence (`tests/playwright-burst.test.js`).

## Test Types In Use

- **Unit tests:** `tests/control-rules.test.js`, `tests/feedback-rules.test.js`.
- **Contract tests:** `tests/determinism-contract.test.js` for deterministic data shape and repeatability guarantees.
- **E2E-like smoke tests:** `tests/playwright-burst.test.js` (real browser + real dev server).
- Snapshot file comparison tooling is not used; assertions are value-level and explicit.

## Practical Notes for New Tests

- Prefer `node:test` + `node:assert/strict` for new pure logic tests to match existing files under `tests/`.
- For runtime flows requiring DOM/render loop validation, follow the existing Playwright script approach in `tests/playwright-burst.test.js`.
- Keep tests deterministic by avoiding wall-clock randomness and by using controlled seeds/state (pattern from `tests/determinism-contract.test.js`).

---

*Testing analysis: 2026-03-05*
*Update when test commands, framework, or coverage policy changes*

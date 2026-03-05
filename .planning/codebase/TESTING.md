# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

**Runner:**
- Unit and contract tests use the Node built-in runner (`node:test`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js\``, and `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``.
- Browser/runtime integration smoke uses Playwright in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.
- There is no dedicated test config file at `\`/Users/zhangjinhui/Desktop/gsd-demo\`` (`vitest.config.*`, `jest.config.*`, and `playwright.config.*` are absent).

**Assertion Library:**
- Assertions are from `node:assert/strict`.
- Common matchers are `assert.equal`, `assert.deepEqual`, and `assert.ok`.

**Run Commands:**
```bash
npm run test:determinism                        # Contract test entry from /Users/zhangjinhui/Desktop/gsd-demo/package.json
npm run test:burst                              # Playwright burst smoke from /Users/zhangjinhui/Desktop/gsd-demo/package.json
node --test /Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js
node --test /Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js
node --test /Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js
node /Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js
```

## Test File Organization

**Location:**
- Tests are centralized in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.
- Source and test trees are separate (`\`/Users/zhangjinhui/Desktop/gsd-demo/src\`` vs `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``).

**Naming:**
- All files follow `*.test.js`.
- Current files:
- `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js\``
- `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js\``
- `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``
- `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``

**Structure:**
```text
/Users/zhangjinhui/Desktop/gsd-demo/src/
  control-rules.js
  feedback-rules.js
  determinism-harness.js
  main.js
/Users/zhangjinhui/Desktop/gsd-demo/tests/
  control-rules.test.js
  feedback-rules.test.js
  determinism-contract.test.js
  playwright-burst.test.js
```

## Test Structure

**Suite Organization:**
```javascript
import test from "node:test";
import assert from "node:assert/strict";

test("behavior statement", () => {
  // arrange
  // act
  // assert
  assert.equal(actual, expected);
});
```

**Patterns:**
- Flat test layout is preferred over deep nesting; each behavior is encoded as a standalone `test(...)`.
- Determinism contracts use factory helpers (`buildMockState`) for repeatable setup in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``.
- Runtime smoke validates both state payload shape and browser error channels in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.

## Mocking

**Framework:**
- No Jest/Vitest/Sinon mocking framework is used.
- No `mock`, `spyOn`, or module-stub APIs appear in current tests.

**Patterns:**
```javascript
// Controlled inputs instead of framework mocks
const snapshot = buildDeterministicSnapshot({
  state: buildMockState(),
  keyboardDown: new Set(["KeyW", "KeyF"]),
  pressedThisStep: new Set(["Space"]),
  sortedKeysFn: (keys) => Array.from(keys).sort((a, b) => a.localeCompare(b)),
});
```

**What to Mock:**
- Browser capabilities are controlled at runtime boundaries (for example disabling WebGL via `page.addInitScript`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.
- External process boundaries are isolated by spawning and tearing down a dedicated Vite server in the same file.

**What NOT to Mock:**
- Pure rule logic in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\`` and `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``.
- Deterministic snapshot composition in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``.

## Fixtures and Factories

**Test Data:**
```javascript
function buildMockState() {
  return {
    mode: "playing",
    randomSeed: 5745092,
    // deterministic fields...
  };
}
```

**Location:**
- Fixtures are file-local; no shared `fixtures/` directory exists under `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.
- Runtime artifacts are written for inspection to:
- `\`/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-latest.png\``
- `\`/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-latest.json\``
- `\`/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-console.json\``

## Coverage

**Requirements:**
- No numeric coverage threshold is currently enforced.
- De facto quality goal is invariant coverage:
- control transitions (`\`/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js\``)
- feedback thresholds (`\`/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js\``)
- deterministic schema and repeatability (`\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``)
- runtime smoke and error absence (`\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``)

**Configuration:**
- No `c8`/`nyc` or built-in coverage script exists in `\`/Users/zhangjinhui/Desktop/gsd-demo/package.json\``.
- Quality implication: regression detection depends on assertion quality and scenario breadth rather than coverage gates.

**View Coverage:**
```bash
# Not configured in /Users/zhangjinhui/Desktop/gsd-demo/package.json
# Add a coverage command before expecting percentage reports.
```

## Test Types

**Unit Tests:**
- Scope: single-purpose rule functions in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\`` and `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``.
- Mocking: none; direct data input/output assertions.

**Integration/Contract Tests:**
- Scope: deterministic snapshot and step conversion invariants in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``.
- Strategy: uses realistic nested state objects and strict deep equality.

**E2E-like Smoke Tests:**
- Framework: Playwright + real Vite dev server.
- Scope: start flow, deterministic progression, and runtime error channels in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.

## Common Patterns

**Async Testing:**
```javascript
test("async behavior", async () => {
  await waitForServer("http://127.0.0.1:4174");
  assert.ok(true);
});
```

**Error Testing:**
```javascript
if (typeof state.schemaVersion !== "string") {
  throw new Error("State payload is missing schemaVersion.");
}
```

**Snapshot Testing:**
- Snapshot file diff tooling is not used.
- Equivalent confidence is achieved with explicit shape/value assertions and deterministic JSON equality in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js\``.

---

*Testing analysis: 2026-03-05*
*Update when framework, commands, or quality gates change*

# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

**Files:**
- Source modules use `kebab-case` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src\`` (for example `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``).
- Runtime orchestration is centralized in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.
- Tests use `*.test.js` naming in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.

**Functions:**
- Function names are `camelCase` across modules, for example `resolvePauseMode`, `getDangerState`, and `buildDeterministicSnapshot`.
- Control/event handlers are verb-first `camelCase` (`applyFocusLoss`, `requestFullscreenTransition`, `maybeHandlePauseAndRestart`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.
- Boolean semantics use `is/has/should` prefixes (`shouldClearInputForVisibility` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\``, `isCriticalConsoleError` in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``).

**Variables:**
- Runtime and local variables use `camelCase` (`rendererRuntime`, `feedbackDangerLayer`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.
- Constants use `UPPER_SNAKE_CASE` (`FIXED_STEP`, `PLAYER_MAX_HP`, `MAX_ADVANCE_STEPS`, `DANGER_HP_RATIO`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``, and `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``.
- Nested state keys remain semantic `camelCase` (`state.control.pause`, `state.feedback.bannerTimer`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.

**Types:**
- No TypeScript or JSDoc typedef layer is currently used.
- Data shapes are conveyed by object literals and deterministic schema fields in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``.

## Code Style

**Formatting:**
- Semicolons are consistently present across `\`/Users/zhangjinhui/Desktop/gsd-demo/src\`` and `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.
- Indentation is 2 spaces.
- Trailing commas are used in multiline arrays, object literals, and parameter lists.
- Most source files use double quotes (`\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\``), while `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js\`` uses single quotes.

**Linting:**
- No enforced lint/format gate exists (no `eslint.config.*`, `.eslintrc*`, `.prettierrc*` under `\`/Users/zhangjinhui/Desktop/gsd-demo\``).
- `\`/Users/zhangjinhui/Desktop/gsd-demo/package.json\`` has no `lint` or `format` script.
- Quality implication: style consistency depends on reviewer discipline rather than automated checks.

## Import Organization

**Order:**
1. External packages first (for example `three` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``).
2. Internal relative modules next (for example `./control-rules.js`, `./determinism-harness.js` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``).
3. In tests, Node built-ins first (`node:test`, `node:assert/strict`), then third-party packages (`playwright`), then app imports (`../src/*.js`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/*.test.js\``.

**Grouping:**
- Imports are grouped by dependency scope with blank-line separation in most files.
- Alphabetical sorting is common but not strict; practical readability is preferred.

**Path Aliases:**
- No alias mapping is configured; all imports use explicit relative paths in `\`/Users/zhangjinhui/Desktop/gsd-demo/src\`` and `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.

## Error Handling

**Patterns:**
- Boundary fallback is preferred for optional capabilities: WebGL initialization failure is caught and downgraded to noop rendering in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.
- Defensive normalization is centralized for numeric and collection inputs (`toFinite`, `normalizeFixedStep`, `safeSortedKeys`) in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``.
- Guard clauses are used heavily to short-circuit invalid or no-op states (`consumeEdge`, `requestRestart`, `updateSpawning`).

**Error Types:**
- Runtime code mostly avoids custom error classes; it prefers fallback return objects and state flags.
- Test harness scripts throw explicit `Error` with actionable messages and fail with non-zero exit codes in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.
- `normalizeErrorMessage` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\`` converts unknown errors to safe strings for deterministic state reporting.

## Logging

**Framework:**
- Native console logging only (`console.warn`, `console.error`).
- No dedicated logging library is present in `\`/Users/zhangjinhui/Desktop/gsd-demo\``.

**Patterns:**
- Logging is concentrated at boundaries and exceptional paths:
- Renderer fallback warning in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\``.
- Top-level test runner failure logging in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.
- Core gameplay loops avoid noisy console output to preserve deterministic behavior and test signal quality.

## Comments

**When to Comment:**
- Comments are sparse and intent-focused, mainly for non-obvious quality constraints (polling behavior, deterministic bursts) in `\`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js\``.
- Prefer comments that explain why the behavior is required for determinism or reliability.

**JSDoc/TSDoc:**
- Not currently used in `\`/Users/zhangjinhui/Desktop/gsd-demo/src\`` or `\`/Users/zhangjinhui/Desktop/gsd-demo/tests\``.
- Public behavior is communicated through descriptive names and test coverage.

**TODO Comments:**
- No formal TODO tag convention (`TODO(owner): ...`) is visible in current source files.
- Quality recommendation: adopt a tracked TODO format when technical debt begins to accumulate.

## Function Design

**Size:**
- Pure rule modules (`\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``) keep functions compact and focused.
- `\`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js\`` contains many orchestration functions with larger scope; this is the primary complexity hotspot.

**Parameters:**
- Simple function signatures are preferred for rule modules (primitive values or shallow objects).
- Rich context objects are used where deterministic snapshots are built (`buildDeterministicSnapshot` in `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``).

**Return Values:**
- Functions return explicit values with stable shapes; no implicit `undefined` contracts are relied on in core rule modules.
- Early returns are common for safety and readability.

## Module Design

**Exports:**
- Named exports are the default pattern across `\`/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js\``, `\`/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js\``, and `\`/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js\``.
- No default exports are used in the core logic modules.

**Barrel Files:**
- No barrel file pattern (`index.js` re-export layer) is currently used.
- Direct import paths keep dependencies explicit and reduce ambiguity in a small codebase.

---

*Convention analysis: 2026-03-05*
*Update when style policy, lint gates, or module boundaries change*

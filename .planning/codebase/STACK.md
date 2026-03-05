# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**
- JavaScript (ES Modules) - Main gameplay runtime and domain logic in `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/control-rules.js`, `/Users/zhangjinhui/Desktop/gsd-demo/src/feedback-rules.js`, and `/Users/zhangjinhui/Desktop/gsd-demo/src/determinism-harness.js`.

**Secondary:**
- HTML5 - Browser entry document in `/Users/zhangjinhui/Desktop/gsd-demo/index.html`.
- CSS3 - Visual styling and HUD/overlay effects in `/Users/zhangjinhui/Desktop/gsd-demo/src/style.css`.
- JavaScript (Node-side test scripts) - Automated validation in `/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js`, and `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`.

## Runtime

**Environment:**
- Browser runtime with WebGL-capable rendering (with noop fallback path for deterministic tests) in `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.
- Node.js runtime for dev server, build, preview, and test execution declared in `/Users/zhangjinhui/Desktop/gsd-demo/package.json`.
- Node compatibility floor is constrained by dependency engines recorded in `/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json` (notably `node_modules/vite` and `node_modules/playwright`).

**Package Manager:**
- npm - Script orchestration defined in `/Users/zhangjinhui/Desktop/gsd-demo/package.json`.
- Lockfile: `/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json` present (lockfileVersion 3).

## Frameworks

**Core:**
- Three.js `^0.183.2` - Real-time scene graph, rendering, and gameplay visuals (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`).
- Vanilla browser APIs - Input, focus, visibility, and fullscreen lifecycle (`/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`).

**Testing:**
- Node built-in test runner (`node:test`) - Logic and contract tests (`/Users/zhangjinhui/Desktop/gsd-demo/tests/control-rules.test.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/feedback-rules.test.js`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/determinism-contract.test.js`).
- Playwright `^1.58.2` - Browser burst regression and screenshot/state artifact checks (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`).

**Build/Dev:**
- Vite `^7.3.1` - Local dev server and production build pipeline (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`).
- Rollup and esbuild (transitive via Vite) - Bundling and transform infrastructure (`/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json`, `node_modules/vite`, `node_modules/rollup`).

## Key Dependencies

**Critical:**
- `three@^0.183.2` - Core render/runtime dependency for the game world (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`).
- `vite@^7.3.1` - Build and local runtime entry for all application workflows (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`).
- `playwright@^1.58.2` - Browser automation dependency for deterministic burst verification (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`).

**Infrastructure:**
- Node built-ins (`node:fs/promises`, `node:path`, `node:process`, `node:child_process`) - Test orchestration and artifact output (`/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`).
- Optional repository CLI integration key (`BRAVE_API_KEY`) is consumed by tooling code in `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/commands.cjs`.

## Configuration

**Environment:**
- No application `.env` file is present in the repository root; runtime behavior is primarily code- and script-driven (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/.gitignore`).
- Test server process flags `CI` and `FORCE_COLOR` are injected in `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`.
- Optional CLI key `BRAVE_API_KEY` is read in `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/config.cjs` and `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/commands.cjs`.

**Build:**
- HTML entry and module bootstrapping in `/Users/zhangjinhui/Desktop/gsd-demo/index.html`.
- Build/dev/preview command declarations in `/Users/zhangjinhui/Desktop/gsd-demo/package.json`.
- Dependency tree and runtime engine constraints in `/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json`.

## Platform Requirements

**Development:**
- Any platform that supports Node.js and Chromium execution for Playwright workflows (`/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`).
- Node should satisfy Vite engine requirements from `/Users/zhangjinhui/Desktop/gsd-demo/package-lock.json` (`node: ^20.19.0 || >=22.12.0` under `node_modules/vite`).

**Production:**
- Static asset hosting target for Vite build output (`dist`) implied by scripts in `/Users/zhangjinhui/Desktop/gsd-demo/package.json`.
- No server-side runtime, database binding, or container deployment manifest is defined in repository runtime files (`/Users/zhangjinhui/Desktop/gsd-demo/index.html`, `/Users/zhangjinhui/Desktop/gsd-demo/package.json`).

---

*Stack analysis: 2026-03-05*
*Update after major dependency changes*

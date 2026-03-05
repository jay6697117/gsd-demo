# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```text
gsd-demo/
├── `src/`                                # Runtime source code
│   ├── `main.js`                         # Composition root and fixed-step loop
│   ├── `control-rules.js`                # Control/focus/fullscreen rule helpers
│   ├── `feedback-rules.js`               # Feedback, danger, combo, tempo helpers
│   ├── `determinism-harness.js`          # Snapshot schema and deterministic stepping helpers
│   └── `style.css`                       # UI shell and feedback overlay styles
├── `tests/`                              # Unit, contract, and browser automation tests
│   ├── `control-rules.test.js`
│   ├── `feedback-rules.test.js`
│   ├── `determinism-contract.test.js`
│   └── `playwright-burst.test.js`
├── `.planning/`                          # Planning state, phase docs, and generated artifacts
│   ├── `PROJECT.md`
│   ├── `REQUIREMENTS.md`
│   ├── `ROADMAP.md`
│   ├── `STATE.md`
│   ├── `phases/`
│   ├── `research/`
│   ├── `artifacts/`
│   └── `codebase/`                       # Current codebase map outputs
├── `.codex/`                             # GSD workflows, templates, skills, and agents
│   ├── `get-shit-done/`
│   ├── `skills/`
│   └── `agents/`
├── `dist/`                               # Vite build output (generated)
├── `output/`                             # Local run/debug outputs (generated)
├── `node_modules/`                       # Installed dependencies (generated)
├── `index.html`                          # Browser HTML entry point
├── `package.json`                        # Scripts and dependency manifest
├── `package-lock.json`                   # Dependency lockfile
├── `progress.md`                         # Iteration progress notes
└── `.gitignore`                          # Git ignore rules
```

## Directory Purposes

**`src/`:**
- Purpose: Main product runtime implementation.
- Contains: Bootstrapping, simulation loop, rule helpers, snapshot helpers, CSS.
- Key files: `src/main.js`, `src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`, `src/style.css`.
- Subdirectories: None (currently flat).

**`tests/`:**
- Purpose: Regression and contract verification.
- Contains: Node test files and one Playwright scenario.
- Key files: `tests/determinism-contract.test.js`, `tests/playwright-burst.test.js`.
- Subdirectories: None (currently flat).

**`.planning/`:**
- Purpose: GSD planning records, phase execution artifacts, and project control docs.
- Contains: Planning markdown docs, phase plans/summaries, research notes, generated artifacts.
- Key files: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json`.
- Subdirectories: `.planning/phases/`, `.planning/research/`, `.planning/artifacts/`, `.planning/codebase/`.

**`.codex/`:**
- Purpose: Local automation framework configuration for GSD workflows.
- Contains: Workflow templates, command tooling, skill definitions, and agent prompts.
- Key files: `.codex/get-shit-done/workflows/map-codebase.md`, `.codex/get-shit-done/templates/codebase/architecture.md`, `.codex/skills/gsd-map-codebase/SKILL.md`.
- Subdirectories: `.codex/get-shit-done/`, `.codex/skills/`, `.codex/agents/`.

**`dist/`:**
- Purpose: Production web build artifacts.
- Contains: Bundled assets from Vite.
- Key files: Generated at build time under `dist/assets/`.
- Subdirectories: `dist/assets/`.

**`output/`:**
- Purpose: Local outputs from iterative game runs and experimental snapshots.
- Contains: Variant output directories.
- Key files: Example directories such as `output/web-game/` and `output/web-game-phase3-combo/`.
- Subdirectories: Multiple run-specific folders.

## Key File Locations

**Entry Points:**
- `index.html`: Browser document root and script mount.
- `src/main.js`: Runtime composition root and simulation scheduler.

**Configuration:**
- `package.json`: NPM scripts (`dev`, `build`, `preview`, `test:determinism`, `test:burst`) and dependency declarations.
- `package-lock.json`: Locked dependency graph.
- `.planning/config.json`: GSD process configuration.
- `.gitignore`: Exclusion rules for Git tracking.

**Core Logic:**
- `src/main.js`: Game loop, state machine, combat, spawning, feedback, and rendering orchestration.
- `src/control-rules.js`: Pause/focus/fullscreen intent helpers and input utility helpers.
- `src/feedback-rules.js`: Tempo, danger, chain warning, and combo milestone rules.
- `src/determinism-harness.js`: Deterministic step conversion and snapshot schema construction.

**Testing:**
- `tests/control-rules.test.js`: Unit tests for control helper behavior.
- `tests/feedback-rules.test.js`: Unit tests for feedback rule behavior.
- `tests/determinism-contract.test.js`: Contract tests for deterministic snapshot consistency.
- `tests/playwright-burst.test.js`: Browser burst script validating runtime health and artifact output.

**Documentation:**
- `progress.md`: Iteration-level status notes.
- `.planning/PROJECT.md`: Project scope and direction.
- `.planning/REQUIREMENTS.md`: Requirements baseline.
- `.planning/ROADMAP.md`: Milestone and phase roadmap.
- `.planning/phases/`: Detailed plan/summary/verification records by phase.

## Naming Conventions

**Files:**
- Runtime helper modules use kebab-case (`control-rules.js`, `feedback-rules.js`, `determinism-harness.js`).
- Tests use `*.test.js` suffix (`control-rules.test.js`, `feedback-rules.test.js`).
- Planning anchors use uppercase names (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`).

**Directories:**
- Root functional folders are short and role-driven (`src/`, `tests/`, `.planning/`, `.codex/`).
- Planning subfolders are responsibility-based (`phases`, `research`, `artifacts`, `codebase`).

**Special Patterns:**
- Deterministic runtime hooks are globally named in snake-like style: `window.render_game_to_text` and `window.advanceTime` in `src/main.js`.
- Burst evidence is persisted under `.planning/artifacts/phase-05/` (`burst-latest.json`, `burst-latest.png`, `burst-console.json`).

## Where to Add New Code

**New Feature:**
- Primary code: `src/main.js` for orchestration wiring; extract reusable logic into `src/*.js` helper modules.
- Tests: `tests/*.test.js` matching the touched helper/runtime behavior.
- Config if needed: `package.json` scripts when adding new verification entry points.

**New Component/Module:**
- Simulation or rule logic: add a dedicated file in `src/` (for example `src/spawn-rules.js` or `src/input-rules.js`).
- Determinism contract changes: update `src/determinism-harness.js` and mirror assertions in `tests/determinism-contract.test.js`.
- Visual-only adjustments: `src/style.css` (and `index.html` if structure changes).

**New Route/Command (project-specific equivalent):**
- Browser event/control entry: `src/main.js` event listeners.
- Runtime handler logic: helper modules under `src/`.
- Automation usage validation: `tests/playwright-burst.test.js`.

**Utilities:**
- Shared pure helpers: colocate in `src/` with focused naming (`*-rules.js`, `*-harness.js`).
- Avoid adding utility logic to `.planning/` or `.codex/`; those directories are process/tooling scope, not product runtime scope.

## Special Directories

**`.planning/artifacts/phase-05/`:**
- Purpose: Persist deterministic burst verification artifacts.
- Source: Generated by `tests/playwright-burst.test.js`.
- Committed: Yes (currently present in repository state).

**`dist/`:**
- Purpose: Production build output.
- Source: Generated by `npm run build` from `package.json`.
- Committed: Yes (currently present in repository state).

**`node_modules/`:**
- Purpose: Third-party dependency installation cache.
- Source: Generated by `npm install`.
- Committed: No (excluded via `.gitignore`).

---
*Structure analysis: 2026-03-05*
*Update when directory layout or placement conventions change*

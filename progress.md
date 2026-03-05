Original prompt: 开发一个threes.js 宝可梦 高清 像素艺术 HD pixel art击杀游戏

## 2026-03-04 Initialization
- Created `.planning/` artifacts via gsd-new-project workflow:
  - PROJECT.md
  - config.json
  - research/*.md + SUMMARY.md
  - REQUIREMENTS.md
  - ROADMAP.md
  - STATE.md
- Next: build playable Three.js HD pixel-art combat game with deterministic test hooks.

## TODO
- Bootstrap Vite + Three.js project skeleton.
- Implement start/combat/gameover flow.
- Implement player movement, attack, enemy spawn/chase, hp/score/kills.
- Implement HD pixel-art style rendering and clear combat feedback.
- Expose `window.render_game_to_text` and `window.advanceTime(ms)`.
- Add fullscreen toggle (`f`) + Esc exit handling.
- Run Playwright client loop, inspect screenshots, fix regressions.

## 2026-03-04 Game Implementation Chunk 1
- Bootstrapped project with `vite`, `three`, and `playwright` dependencies.
- Added `index.html` overlays (`#start-btn`, game-over, HUD) and responsive stage layout.
- Implemented `src/main.js` core systems:
  - fixed-step simulation loop
  - start/playing/paused/gameover state flow
  - keyboard movement/attack/pause/restart/fullscreen
  - enemy spawn/chase and player damage model
  - attack slash, kill scoring, chain timer, particles, camera shake
  - HD pixel-art sprite rendering with nearest-neighbor textures
  - deterministic hooks `window.render_game_to_text` and `window.advanceTime(ms)`
- Next: run dev server + Playwright client loops, inspect screenshots/state/errors, iterate fixes.

## 2026-03-04 Validation Chunk
- Executed `$WEB_GAME_CLIENT` loops with default and custom actions:
  - `output/web-game/` (smoke run, no runtime errors)
  - `output/web-game-final/` (combat-focused run; kills/score/gameover/restart observed in state JSON)
  - `output/web-game-slash/` (attack effect visibility check)
- Fixed runtime and determinism issues found during test loop:
  - `ReferenceError` from pixel pattern declaration order.
  - Added deterministic start seed for reproducible runs.
  - Added manual-stepping mode after `advanceTime(ms)` to avoid dual time sources.
  - Added explicit `Escape` fullscreen exit handling.
  - Improved attack wedge visibility for screenshot verification.
- Manual browser checks (Playwright MCP):
  - Start flow works.
  - Pause/resume (`p`) toggles mode (`playing` <-> `paused`).
  - Fullscreen (`f`) enters and `Escape` exits fullscreen.

## Suggested Next TODOs
- Add lightweight SFX layer (attack hit / kill / game-over) using howler.
- Add one additional enemy behavior variant (dash or ranged) for v1.1 depth.
- Split `src/main.js` into modules (`loop`, `combat`, `render`, `ui`) for maintainability.

## 2026-03-04 Phase 3 Feedback Enhancement Chunk
- Merged stashed feedback rules assets into mainline without regressing determinism/control flow.
- Added deterministic feedback rules module:
  - `src/feedback-rules.js`
  - Combo milestone detection (`x3/x5/x8`)
  - Low-HP danger state evaluator
  - Optional tempo / chain warning helpers for future use
- Integrated selective runtime usage in `src/main.js`:
  - Combo banner milestone selection now uses `getComboMilestone`
  - Danger overlay demand now uses `getDangerState`
  - Existing `render_game_to_text` / `advanceTime` contract and control-state logic kept intact
- Added unit coverage:
  - `tests/feedback-rules.test.js`
  - Covers tempo phase windows, milestone detection, danger pulse, and chain warning threshold logic

## 2026-03-04 Verification Evidence (Fresh)
- Rule tests:
  - `node --test tests/feedback-rules.test.js` → 5/5 pass
- Build:
  - `npm run build` → pass (non-blocking chunk-size warning remains)
- Regression smoke (determinism + burst) remained green after merge:
  - `node --test tests/determinism-contract.test.js`
  - `node tests/playwright-burst.test.js`

## Suggested Next TODOs
- Add a deterministic scripted combo scenario to consistently reach `x3` milestone for artifact-level verification.
- Split `src/main.js` into focused modules (`feedback`, `combat`, `spawning`, `ui`) for maintainability.
- Consider lightweight audio feedback layer aligned with hit/kill/milestone channels.

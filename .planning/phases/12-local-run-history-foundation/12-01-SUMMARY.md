---
phase: 12-local-run-history-foundation
plan: 01
subsystem: meta persistence
tags: [meta-history, local-storage, ranking, retention, standard-run]
requires:
  - phase: 11-automation-determinism-hardening
    provides: deterministic browser helpers, restart parity baseline, and text-state regression commands
provides:
  - deterministic standard-run record normalization and ranking rules
  - versioned local standard-history persistence contract
  - runtime hydration boundary for `state.meta.standardHistory`
affects: [12-02, 12-03, 12-verification]
tech-stack:
  added: []
  patterns:
    - standard-run history persists through one narrow versioned adapter instead of ad-hoc storage calls
    - runtime history hydration is read-only and anchored to boot/start-run, not rendering or snapshot generation
key-files:
  created:
    - .planning/phases/12-local-run-history-foundation/12-01-SUMMARY.md
    - src/meta-history.js
    - tests/meta-history.test.js
  modified:
    - src/main.js
key-decisions:
  - "Persisted standard history stores only `{ version, bestRuns, recentRuns }`; `isExpanded` remains runtime-only UI state."
  - "Recent history is normalized as a recency-ordered bounded list, while best history keeps the locked score-first ranking contract."
patterns-established:
  - "Phase 12 storage logic can now reuse `loadStandardHistory()` and `saveStandardHistory()` instead of touching `localStorage` directly."
  - "Meta-layer state is introduced as `state.meta.standardHistory` before any overlay UI is mounted."
requirements-completed: [META-01]
duration: 13 min
completed: 2026-03-07
---

# Phase 12 Plan 01: Local run-history rules and storage summary

**Deterministic standard-run history now has one normalized record model, one bounded best/recent projection, and one versioned local persistence contract ready for overlay work.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-07T14:20:00Z
- **Completed:** 2026-03-07T14:33:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 新增 `src/meta-history.js`，锁定 standard-run record normalize、best 排名规则、recent 保留规则，以及 versioned local storage contract。
- 新增 `tests/meta-history.test.js`，覆盖排序、保留上限、standard-only、storage round-trip、坏 payload 容错和 hydration 不写回。
- 在 `src/main.js` 新增 `state.meta.standardHistory`，并把 hydration 收口到初始 state 与 `startRun()` 的只读边界，没有引入任何 history 写入路径。

## Task Commits

Each task was committed atomically enough for review, with the shared draft collapsed into one implementation commit:

1. **Task 1 + Task 2: standard history rules, storage adapter, and runtime hydration** - `40c7a67` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/meta-history.js` - standard-run history normalize, ranking, retention, storage read/write, and snapshot summary helpers.
- `tests/meta-history.test.js` - pure rule coverage for ranking, retention, storage round-trip, malformed payload tolerance, and no-write hydration.
- `src/main.js` - adds `state.meta.standardHistory` and read-only hydration at boot/start-run.

## Decisions Made

- 持久化 shape 固定为 `{ version, bestRuns, recentRuns }`，不把 `isExpanded` 写入 storage，避免 UI 态污染持久化契约。
- `bestRuns` 与 `recentRuns` 使用两个独立投影：best 走 score-first comparator，recent 走 recency-first comparator，不把 recent 当成 best 的排序副本。
- `startRun()` 只做 history hydration，不做写入，确保 restart、snapshot 和 start-screen 渲染都不会制造重复记录。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 并行触发两笔 `git commit` 时生成过一次 `.git/index.lock` 风险提示；确认没有活跃 git 进程后继续，最终没有留下仓库锁状态。
- 现有未跟踪草稿已经同时覆盖了规则层和 hydration 共享文件，因此 Wave 1 最终以一笔 implementation commit 固化，而不是硬拆出两笔伪独立代码提交。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 现在可以安全把 history 写入边界放到 `enterGameOver()`，并在 start/gameover 两个 overlay 上挂同一份 collapsed/expanded history panel。
- Wave 3 可以直接在当前 `meta-history` contract 上扩 `metaState`，不需要再改 storage shape。

---
*Phase: 12-local-run-history-foundation*
*Completed: 2026-03-07*

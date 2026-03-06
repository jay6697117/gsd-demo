---
phase: 07-building-tactical-layer
plan: 03
subsystem: enemy-steering
tags: [buildings, enemies, steering, collision, determinism]
requires: [07-01, 07-02]
provides:
  - deterministic enemy obstacle steering around building colliders
  - explicit nearest-exit recovery when pursuit starts inside padded building exclusion
  - stress-route assertions for blocker, funnel, soft-cover, and spawn-near-building chases
affects: [07-04]
tech-stack:
  added: []
  patterns:
    - enemy pursuit reuses building collider contracts before boundary resolution instead of adding navmesh state
    - steering uses deterministic clearance guides and explicit escape recovery instead of RNG detours
key-files:
  created:
    - tests/building-steering.test.js
  modified:
    - src/building-system.js
    - src/main.js
key-decisions:
  - "Kept enemy steering inside pure building-system helpers so runtime and tests share one deterministic contract."
  - "Used edge-clearance guide points plus nearest-exit recovery instead of navmesh, A*, or random detours."
patterns-established:
  - "Blocked pursuit holds a stable detour side until the path clears, preventing oscillating lateral crawl."
  - "Spawn-adjacent recovery can burst to the nearest safe edge to leave padded building exclusion in one fixed step."
requirements-completed: [BLD-03]
duration: 11 min
completed: 2026-03-06
---

# Phase 07 Plan 03: 敌人建筑绕障与脱困总结

**敌人追击现在会基于建筑碰撞做确定性绕障、沿边清障和近边脱困，不引入 navmesh、额外 RNG 或非对称通行规则。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-06T11:14:05+08:00
- **Completed:** 2026-03-06T11:25:18+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 在 `src/building-system.js` 中补齐了纯函数 steering 层：可检测 padded building exclusion、生成沿边清障导向、并在敌人起始点落入排除区时选择最近安全出口强制脱困。
- 在 `src/main.js` 中把 steering 接入敌人追击更新路径，为每个敌人稳定维护 `blockedFrames`、`steerSign` 和 `steeringMode`，让长期追击不会退化成抖动或无限贴边。
- 新增 `tests/building-steering.test.js`，覆盖 `stress pursuit`、`corner squeeze`、`funnel chase`、`spawn-near-building` 四类固定步长压测场景，并验证 steering 对等输入的确定性。

## Task Commits

1. **Tasks 1-2: 纯 steering helper、运行时接入、压测场景覆盖** - `26551ca` (feat)

## Files Created/Modified

- `src/building-system.js` - 新增建筑感知 steering、沿边导向、最近出口脱困与候选方向排序逻辑。
- `src/main.js` - 敌人更新流程改为先取 steering 建议再走边界解析，并把阻塞状态写回敌人运行时字段。
- `tests/building-steering.test.js` - 固定种子/固定步长下的 blocker、funnel、soft-cover、spawn-adjacent 追击稳定性测试。

## Decisions Made

- 把敌人绕障决策继续放在 `building-system` 纯逻辑内，而不是散落到 `main.js` 的逐帧更新中。这样 `07-04` 的回归和快照契约可以复用同一份可测行为边界。
- 用“沿障碍边的 clearance guide + 最近出口 escape recovery”替代更重的寻路系统。当前地图拓扑和建筑规模不需要 navmesh，确定性比局部最优路径更重要。

## Deviations from Plan

- 将 Task 1 和 Task 2 合并到一个实现提交中。原因是纯 helper 的候选排序与运行时 `blockedFrames/steerSign` 状态写回属于同一行为闭环，拆开会产生中间态失真。
- 额外加入了 `nearest-exit` 脱困分支。`07-03-PLAN.md` 只要求显式 unstuck fallback，但 `spawn-near-building` 场景表明单纯侧移不足以在一个 fixed step 内离开 padded exclusion，因此增加了最近出口恢复逻辑；范围仍然严格属于 `BLD-03`。

## Issues Encountered

- 第一版候选方向会在 blocker 边缘过早进入单侧 lateral crawl，导致 `stress pursuit` 长时间贴边缓慢滑动。最终改为先清障、再绕角推进，问题消失。
- 验证阶段暴露了一个我自己引入的低级错误：`clamp` helper 漏定义。已在最终门禁前修正，没有扩散到其他模块。

## User Setup Required

- 无。该计划没有新增外部服务、环境变量或控制台配置步骤。

## Verification

- [x] `node --test tests/building-steering.test.js`
- [x] `node --test tests/building-steering.test.js tests/world-sectors.test.js`
- [x] `npm run build`
- [x] `node --test tests/building-system.test.js tests/building-tactics.test.js tests/determinism-contract.test.js tests/building-steering.test.js tests/world-sectors.test.js`

## Next Phase Readiness

- `07-03` 已经把敌人的建筑绕障稳定性补齐，`07-04` 可以直接汇总 deterministic snapshot、Playwright tactical route 和 full regression gate。
- 当前建筑碰撞、玩家战术 cue、敌人 steering 都复用了同一套 building collider contract，没有新增新的地图真相源。

---
*Phase: 07-building-tactical-layer*
*Completed: 2026-03-06*

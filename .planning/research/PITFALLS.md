# Pitfalls Research

**Domain:** Local meta shell for deterministic action game (`v1.2 Meta Challenge Layer`)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Persisting raw runtime state instead of normalized run summaries

**What goes wrong:**
把整块 runtime state 或完整 snapshot 写进本地存储，导致 schema 随战斗系统演进不断膨胀，history 读取和排序也越来越脆弱。

**Why it happens:**
实现者想省事，直接 `JSON.stringify(render_game_to_text())` 或存大对象，而不是明确设计 summary schema。

**How to avoid:**
只在 run completion 边界生成固定 summary shape，字段受控且有 retention policy；storage 层只认 summary，不认 raw runtime state。

**Warning signs:**
localStorage 条目快速变大；history schema 和 snapshot schema 强耦合；只是调整战斗字段就会破坏 meta read-back。

**Phase to address:**
Phase 12 - Local History Foundation

---

### Pitfall 2: Daily challenge seed depends on unstable local-time or restart paths

**What goes wrong:**
同一天 challenge 在 reload、restart 或跨设备上得到不同 seed，daily mode 失去“今天同一局”的语义。

**Why it happens:**
实现时直接拿 `Date.now()`、本地时区零点或 restart count 拼 seed，没有明确 day key contract。

**How to avoid:**
固定使用 UTC day key，并通过纯函数映射到 challenge key 和 run seed；restart 只能复用已解析出的 challenge identity，不能重新随机。

**Warning signs:**
刷新页面后 daily challenge label 变化；同日两次开始 run 得到不同 seed；Playwright 只能靠 mock 时间而无法断言真实 contract。

**Phase to address:**
Phase 13 - Daily Challenge Contract

---

### Pitfall 3: Standard and daily results share one best-score bucket

**What goes wrong:**
玩家的普通高分覆盖 daily best，或者 daily challenge 的历史条目挤占 standard history，导致结果解释混乱。

**Why it happens:**
实现者只做了“一个 history list + 一个 best score”，没有 mode-aware bucket 设计。

**How to avoid:**
统一 summary shape，但按 `mode` 分 bucket；标准局、daily 局各自维护 best digest 和 list ordering。

**Warning signs:**
UI 无法解释 best score 来自哪种 mode；daily best 会在打普通局后变化；测试里只能依赖文案猜 bucket。

**Phase to address:**
Phase 14 - Meta Surfaces & Regression

---

### Pitfall 4: Meta state is visible in UI but absent from deterministic snapshot

**What goes wrong:**
界面看似有 history/daily label，但自动化无法验证 persistence 和 challenge identity，回归只能看 screenshot。

**Why it happens:**
meta layer 被当作“只是 UI 壳层”，没有进入 `render_game_to_text()` contract。

**How to avoid:**
为 `metaState` 定义稳定摘要：active mode、challenge key、best digest、history counts；Playwright 以 text-state 为真相源。

**Warning signs:**
需要直接读 localStorage 才能断言；截图变化很多但真正数据变更不可见；reload bug 很难定位。

**Phase to address:**
Phase 14 - Meta Surfaces & Regression

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store unbounded full history | 实现快，不用考虑 retention | localStorage 膨胀、排序变慢、schema 难演进 | Never for v1.2 |
| Reuse score-only summary shape | 改动最小 | 无法支持 seed/level/mode/daily digest 解释性 | Only for throwaway prototypes, not this milestone |
| Hide challenge identity in UI text only | 文案改起来快 | snapshot 和测试无从验证 | Never for v1.2 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Resort full history on every frame | start/game-over UI 在低端机抖动 | only recompute digests on write/read boundaries | history grows past trivial sizes |
| Serialize large payloads on every state change | occasional input hitches around game-over/restart | persist only on completion boundary or explicit refresh | once persistence moves into active combat path |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Daily challenge looks like a hidden debug switch | 玩家不知道这个模式存在，也不知道今天是哪一局 | show explicit start-screen entry with challenge label |
| History only shows score | 玩家无法理解高分是如何产生的 | show score together with time, kills, level, seed, and mode |
| Daily and standard entries look identical | 玩家不知道自己看的到底是哪种 run | mode badges and separate section headers |

---
*Pitfalls research for: v1.2 Meta Challenge Layer*
*Researched: 2026-03-07*

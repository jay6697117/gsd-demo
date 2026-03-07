# Feature Research

**Domain:** Meta shell for deterministic browser action game (`v1.2 Meta Challenge Layer`)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Local best-score history | 一旦单局循环成熟，玩家自然会期待“我上局打了多少、最好成绩是多少” | LOW | Deps: normalized run summary, local persistence, list ordering |
| Daily challenge entry from start screen | daily mode 必须是显式入口，而不是隐藏脚本或 query-only 功能 | MEDIUM | Deps: mode selection, challenge label, run seed injection |
| Stable daily challenge identity | 玩家会默认“今天的 challenge 应该每次都一样” | MEDIUM | Deps: date key policy, deterministic seed derivation, visible challenge metadata |
| Separate standard vs daily records | 不同 mode 的 best-score 语义不同，混在一起会让结果失真 | LOW | Deps: bucketed storage schema, mode-aware UI labels |
| Meta state visible to automation | 没有 text-state，meta UI 很容易只做成手工验证功能 | MEDIUM | Deps: snapshot extension, browser routes, reload assertions |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Compact run journal with seed + level + mode | 玩家不仅看到分数，还能理解“那局为什么强” | LOW | 在 best-score history 中带出 seed/level/kills/survival time 即可形成解释性 |
| Best-of-day summary beside current challenge | 让 daily mode 有“今天还差多少”的目标感 | MEDIUM | 需要把 current challenge key 与 local best-of-day 绑定展示 |
| Deterministic challenge label surfaced in HUD or summary | 让截图、文字回放、调试工件都能引用同一个 challenge identity | LOW | 对后续分享或自动化都更友好 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Cloud leaderboard / account sync | “既然有 best score，就想看全球榜” | 会立刻引入 backend、auth、作弊与时钟一致性问题 | Keep v1.2 local-only and freeze summary schema first |
| Persistent progression in the same milestone | “历史分数之后自然想要跨局成长” | 会把 simple meta shell 变成长期经济/成长系统，范围暴涨 | Defer to a later progression milestone |
| Daily challenge with rotating rule packs from server | “每日玩法应该每天变花样” | 需要服务端配置、版本控制、回放兼容治理 | Keep deterministic daily seed under one fixed ruleset |
| Infinite run journal | “所有记录都应该永久保存” | localStorage 容量与排序成本会逐渐失控 | Keep bounded history with explicit retention policy |

## Feature Dependencies

```text
[Local Best-Score History]
    └──requires──> [Normalized Run Summary]
                       └──requires──> [Stable Run Completion Hook]

[Daily Challenge Entry]
    └──requires──> [Daily Challenge Key]
                       └──requires──> [Deterministic Seed Derivation]

[Separate Daily Results] ──requires──> [Mode-Aware Storage Buckets]

[Meta Snapshot Visibility] ──enhances──> [History Persistence]
[Meta Snapshot Visibility] ──enhances──> [Daily Challenge Regression]

[Cloud Sync] ──conflicts──> [v1.2 local-only milestone boundary]
```

### Dependency Notes

- **Local Best-Score History requires Normalized Run Summary:** 如果直接把 runtime state 整块落盘，history schema 会随战斗系统演进而漂移。
- **Daily Challenge Entry requires Deterministic Seed Derivation:** 没有可解释的 day key -> seed 映射，同一天 challenge 就无法稳定复现。
- **Separate Daily Results requires Mode-Aware Storage Buckets:** 否则玩家会把普通 run 的高分误当成 daily best，从而破坏 daily mode 的目标感。
- **Meta Snapshot Visibility enhances both persistence and challenge regression:** 没有 snapshot，浏览器测试只能点 UI，无法判断真正持久化了什么。

## MVP Definition

### Launch With (v1.2)

- [ ] Local bounded history for completed standard runs — 验证 meta shell 是否有真实留存价值
- [ ] Daily seeded challenge from the start screen — 验证“每天一局”入口是否成立
- [ ] Separate daily result tracking and best-of-day display — 防止 mode 语义混乱
- [ ] Meta state in deterministic text snapshot — 保持自动化与调试的一致性

### Add After Validation (v1.2.x)

- [ ] Richer history filters or sorting controls — 只有当基础 history 被证明常用时再加
- [ ] Shareable challenge summary formatting — 当用户开始主动比较 daily runs 时再加

### Future Consideration (v1.3+)

- [ ] Persistent cross-run progression — 属于更重的长期成长系统
- [ ] Long-term equipment stash / inventory — 与本地 meta shell 不应在同一 milestone 混做
- [ ] Cloud-backed leaderboard — 需要额外基础设施与防作弊策略

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Local best-score history | HIGH | LOW | P1 |
| Daily seeded challenge entry | HIGH | MEDIUM | P1 |
| Stable challenge key/seed contract | HIGH | MEDIUM | P1 |
| Separate daily result buckets | MEDIUM | LOW | P1 |
| Best-of-day summary surface | MEDIUM | LOW | P2 |
| Rich history filtering | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Sources

- Existing runtime inspection: run start, run end, score/seed/snapshot behavior
- Archived `META-01` / `META-02` future requirements from v1.1
- Existing Playwright regression patterns already used by the project

---
*Feature research for: v1.2 Meta Challenge Layer*
*Researched: 2026-03-07*

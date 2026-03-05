# Feature Research

**Domain:** Action-survivor world/growth loop for `v1.1 World & Growth Overhaul`
**Researched:** 2026-03-05
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

这部分是动作幸存者品类的基础预期，缺失会直接损害可玩性判断。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Kill-based XP and level-up cadence | 玩家默认“杀怪=变强”，且每 30-90 秒应有一次成长反馈 | MEDIUM | Deps: combat kill events, XP curve config, HUD level state; level-up tempo must be deterministic-testable |
| Level-up choice panel (typically 3 options, pick 1) | 该品类核心乐趣是 run 内构筑，而非纯数值堆叠 | MEDIUM | Deps: upgrade pool, rarity weights, pause/slow-time choice flow, apply-upgrade pipeline |
| Expandable map sectors with readable traversal lanes | 中后期怪量上升后，玩家需要空间决策（kite/choke/escape） | HIGH | Deps: zone schema, spawn-point partitioning, collision/pathing stability |
| Building collision readability (block, pass, partial cover) | 建筑必须“看得懂、撞得准”，否则会被认为不公平 | MEDIUM | Deps: building archetype data, collider tagging, enemy steering fallback |
| Breakable prop risk/reward loop (optional detour) | 玩家通常期待场景交互至少能提供短期收益机会 | MEDIUM | Deps: prop HP/damage channel, break feedback, drop trigger + pickup rules |

### Differentiators (Competitive Advantage)

这部分用于把 v1.1 从“可玩”提升到“值得反复玩”，且仍控制在单里程碑范围。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Equipment drops from breakables with slot identity (weapon/core/charm) | 把地图互动与成长绑定，形成“绕路打箱子”决策张力 | HIGH | Deps: equipment schema, slot constraints, drop tables by prop type, on-run equip state |
| Building-driven tactical micro-loops (funnel, line break, retreat windows) | 建筑不只是障碍，而是可利用的战术地形 | HIGH | Deps: enemy path heuristics, spawn-safe radius checks, building archetype behaviors |
| Hybrid level-up design: skill (active modifier) vs talent (passive stat rule) | 强化“构筑方向感”，减少纯随机数值漂移 | HIGH | Deps: bifurcated upgrade taxonomy, exclusivity tags, synergy/anti-synergy rules |
| Zone-specific drop bias (biome-lite without full biome system) | 让地图扩展带来可感知收益差异，而非仅视觉换皮 | MEDIUM | Deps: sector tagging, weighted loot override, deterministic RNG seed integration |

### Anti-Features (Commonly Requested, Often Problematic)

这些是 v1.1 阶段最容易诱发范围失控的需求，应明确拒绝或降级实现。

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full procedural infinite map streaming | “地图越大越高级” | 需要流式加载、导航重建、长期性能治理，超出单里程碑 | Ship finite modular sectors with future expansion hooks |
| Diablo-style persistent inventory + town stash | “掉装备就该有背包和仓库” | 会引入跨局经济与复杂 UI，偏离 run-based 核心 | Keep on-run ephemeral equipment only in v1.1 |
| Fully destructible buildings/terrain physics | “可破坏越多越爽” | 破坏导航与碰撞确定性，回归测试成本激增 | Limit destructibility to tagged props, keep buildings static |
| 6-8 upgrade choices per level | “选择越多越策略” | 决策疲劳、节奏中断、移动端可读性差 | Keep 3 choices with reroll/banish deferred |
| Rare-drop hard dependency for progression | “稀有掉落驱动留存” | RNG 卡进度导致挫败，破坏成长曲线可控性 | Guarantee baseline power via XP levels, drops as acceleration |

## Feature Dependencies

```text
[Map Sector Expansion]
    └──requires──> [Zone Data Schema]
                      └──requires──> [Spawn Partition + Nav Collision Contracts]

[Richer Buildings]
    └──requires──> [Building Archetype Definitions]
    └──requires──> [Enemy Steering Around Obstacles]

[Breakable Props]
    └──requires──> [Damage Routing]
    └──requires──> [Drop Table Resolver]
                      └──requires──> [RNG Seed Consistency]

[Kill-based Leveling]
    └──requires──> [Kill Event Bus]
    └──requires──> [XP Curve Config]

[Skill/Talent Choices]
    └──requires──> [Level-up Trigger]
    └──requires──> [Upgrade Pool + Tag Rules]

[Deterministic Regression Harness]
    └──enhances──> [Kill-based Leveling]
    └──enhances──> [Skill/Talent Choices]
    └──enhances──> [Drop Table Verification]

[Monolithic Main Runtime]
    └──conflicts──> [Low-risk feature iteration velocity]
```

### Dependency Notes

- **Map Sector Expansion requires Zone Data Schema:** 没有统一分区数据结构，地图扩展会退化成硬编码，后续扩容成本陡增。
- **Richer Buildings requires Enemy Steering Around Obstacles:** 建筑价值依赖 AI 可读绕行，否则会出现卡墙或无脑直线穿模感。
- **Breakable Props requires Drop Table Resolver:** 可破坏本身不是目的，核心是“击破后有稳定可调收益”。
- **Skill/Talent Choices requires Upgrade Pool + Tag Rules:** 若无标签约束，容易出现重复项、无效项或失衡组合。
- **Deterministic Regression Harness enhances progression features:** v1.1 需要可回放验证升级节奏与掉落概率，避免每次调参都靠手打体感。
- **Monolithic Main Runtime conflicts with iteration velocity:** `src/main.js` 现状会放大改动爆炸半径，建议按子系统切分但保持里程碑内最小重构。

## MVP Definition

### Launch With (v1.1)

单里程碑必须落地的最小闭环。

- [ ] Map sectors: fixed-size modular zones + spawn partition rules — 支撑“可扩展地图”目标
- [ ] Building archetypes: at least 3 types (`blocker`, `funnel`, `soft-cover`) — 支撑建筑策略差异
- [ ] Breakable props: tagged objects with HP, break feedback, and weighted equipment drops — 完成“击破-掉落”闭环
- [ ] Kill XP leveling: configurable curve and deterministic level trigger — 完成“击杀成长”闭环
- [ ] Level-up choices: 3-option pick-1 with skill/talent split — 完成“升级抉择”闭环
- [ ] Regression visibility: text snapshot fields for level, offered upgrades, drops — 保障自动化验证可用

### Add After Validation (v1.1.x)

同主题增强，但不阻塞 v1.1 交付。

- [ ] Add 2-3 new building archetypes after baseline pathing stability passes soak tests
- [ ] Add zone-specific drop bias after global drop rates meet fairness targets
- [ ] Add one controlled reroll per level-up after choice quality metrics are collected

### Future Consideration (v2+)

超出当前单里程碑范围，明确后置。

- [ ] Persistent meta progression tied to equipment collection — 需先验证 run-loop 留存
- [ ] Procedural biome transitions with dynamic hazards — 需先完成导航与性能分层
- [ ] Advanced affix crafting economy — 需先有稳定背包/存档协议

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Kill-based XP leveling | HIGH | MEDIUM | P1 |
| Level-up skill/talent choices | HIGH | MEDIUM | P1 |
| Map sector expansion hooks | HIGH | HIGH | P1 |
| Richer building archetypes | HIGH | MEDIUM | P1 |
| Breakable props with equipment drops | HIGH | HIGH | P1 |
| Snapshot coverage for growth/drop states | HIGH | LOW | P1 |
| Zone-specific drop bias | MEDIUM | MEDIUM | P2 |
| Additional archetype variants | MEDIUM | MEDIUM | P2 |
| Level-up reroll/banish controls | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Vampire Survivors) | Competitor B (Halls of Torment) | Our Approach |
|---------|-----------------------------------|----------------------------------|--------------|
| Kill-driven progression | Frequent XP gems and level spikes | Dense waves + stat scaling | Keep kill-driven leveling, expose deterministic curve configs |
| Upgrade choice structure | Simple high-tempo pick-one upgrades | Heavier stat and trait layering | Use 3-option skill/talent split for clarity + build direction |
| Map interaction | Limited destructibles, focus on kiting | Some environmental pressure | Make breakable props a first-class tactical detour with equipment drops |
| Terrain/building role | Mostly pathing pressure | Arena geometry influences routing | Emphasize building archetypes as tactical tools, not just blockers |

## Sources

- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/PROJECT.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/REQUIREMENTS.md`
- `/Users/zhangjinhui/Desktop/gsd-demo/.planning/codebase/CONCERNS.md`
- Genre references for pattern baselines: Vampire Survivors, Halls of Torment, Brotato

---
*Feature research for: v1.1 World & Growth Overhaul (action-survivor loop)*
*Researched: 2026-03-05*

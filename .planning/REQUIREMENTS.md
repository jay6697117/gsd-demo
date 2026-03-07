# Requirements: PokeThrees Hunter

**Defined:** 2026-03-07
**Core Value:** 玩家在 30 秒内就能感受到“清晰可读的像素美术 + 准确响应的战斗操作 + 明确成长反馈”的核心乐趣。
**Active Milestone:** v1.2 Meta Challenge Layer

## v1.2 Requirements

### Meta Layer

- [ ] **META-01**: User can persist completed standard-run summaries locally across page reloads and browser restarts.
- [ ] **META-02**: User can view local best-score history with score, survival time, kills, seed, level, and played-at metadata.
- [ ] **META-03**: User can start a daily seeded challenge run directly from the start screen.
- [ ] **META-04**: The same UTC challenge day always resolves to the same challenge key and run seed, independent of restart count.
- [ ] **META-05**: User can view daily challenge results separately from standard-run history, and the active challenge identity is exposed in deterministic text state.

## Future Requirements (v1.3+)

### Extended Progression

- **PROG-06**: User can access persistent cross-run progression.
- **PROG-07**: User can manage long-term equipment inventory and stash.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud leaderboard or account sync | Requires backend/auth and changes the milestone from local meta shell to online service work |
| Persistent progression tree | Would couple simple meta history to a much heavier cross-run growth system |
| Long-term equipment stash/inventory | Needs additional data modeling and UI beyond v1.2’s local history boundary |
| Server-authored daily modifiers or rotating ops content | Requires authoritative clocks and content delivery outside current project scope |
| Full replay archive storage | Storing whole replays is much heavier than the bounded summary model needed for v1.2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| META-01 | Phase 12 | Pending |
| META-02 | Phase 12 | Pending |
| META-03 | Phase 13 | Pending |
| META-04 | Phase 13 | Pending |
| META-05 | Phase 14 | Pending |

**Coverage:**
- v1.2 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap mapping (phases 12-14)*

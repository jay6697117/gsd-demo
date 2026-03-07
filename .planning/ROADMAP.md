# Roadmap: PokeThrees Hunter (v1.2 Meta Challenge Layer)

**Generated:** 2026-03-07
**Source baseline:** `PROJECT.md`, `REQUIREMENTS.md` (v1.2), `research/SUMMARY.md`, `config.json`

## Phase Overview

| Phase | Goal | Requirement Count |
|------|------|-------------------|
| Phase 12 | Establish local run-history persistence and best-score surfaces | 2 |
| Phase 13 | Add daily seeded challenge mode with stable day-key and run-seed contract | 2 |
| Phase 14 | Separate daily results and freeze meta-layer observability/regression coverage | 1 |

## Phase 12: Local Run History Foundation

**Phase Goal:** Establish local run-history persistence and best-score surfaces.
**Goal:** Establish local run-history persistence and best-score surfaces.
**Execution Status:** In Progress
**Verification:** Pending (`12-VERIFICATION.md`)
**Plans:** 1/3 plans executed

**Requirements**: [META-01, META-02]

**Requirement Mapping (2):**
- META-01
- META-02

**Observable Success Criteria:**
- Completed standard runs are normalized into bounded local summaries at the stable run-completion boundary.
- Local history survives page reload and browser restart without leaking transient runtime state.
- Players can view a best-score history list with score, survival time, kills, seed, level, and played-at metadata.
- History ordering and best-score digest remain deterministic for the same persisted local data.

## Phase 13: Daily Challenge Contract

**Phase Goal:** Add daily seeded challenge mode with stable day-key and run-seed contract.
**Goal:** Add daily seeded challenge mode with stable day-key and run-seed contract.
**Execution Status:** Pending
**Verification:** Pending (`13-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [META-03, META-04]

**Requirement Mapping (2):**
- META-03
- META-04

**Observable Success Criteria:**
- Start screen exposes a daily challenge entry with a visible challenge label before combat begins.
- The same UTC challenge day always resolves to the same challenge key and run seed across reloads and restarts.
- Restarting a daily run preserves the active challenge identity instead of silently generating a new one.
- Daily challenge mode reuses the shipped combat loop without reopening v1.1 gameplay contracts.

## Phase 14: Meta Results & Regression

**Phase Goal:** Separate daily results and freeze meta-layer observability/regression coverage.
**Goal:** Separate daily results and freeze meta-layer observability/regression coverage.
**Execution Status:** Pending
**Verification:** Pending (`14-VERIFICATION.md`)
**Plans:** 0/0 plans complete

**Requirements**: [META-05]

**Requirement Mapping (1):**
- META-05

**Observable Success Criteria:**
- Daily challenge results are stored and surfaced separately from standard-run history and best-score digests.
- `render_game_to_text()` exposes active challenge identity and meta-state summaries required for persistence and reload assertions.
- Browser-level regression covers “complete run -> persist -> reload -> read back” and “same day -> same challenge identity” paths.
- Meta-layer additions do not regress v1.1 restart parity or the existing deterministic automation surface.

## Coverage Statistics (v1.2)

| Metric | Value |
|-------|-------|
| Total v1.2 requirements | 5 |
| Mapped requirements | 5 |
| Unmapped requirements | 0 |
| Multi-phase mapped requirements | 0 |
| Coverage | 100% |

## Requirement-to-Phase Index

| Requirement | Phase |
|-------------|-------|
| META-01 | Phase 12 |
| META-02 | Phase 12 |
| META-03 | Phase 13 |
| META-04 | Phase 13 |
| META-05 | Phase 14 |

---
*Roadmap status: Phase 12 in progress, 1/3 plans executed (milestone v1.2 active)*

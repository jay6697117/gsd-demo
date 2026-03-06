import { OFFER_RNG_SEED_SALT, UPGRADE_CATALOG } from "./upgrade-catalog.js";

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeChoice(choice) {
  if (!choice || typeof choice !== "object") {
    return null;
  }

  const id = typeof choice.id === "string" ? choice.id : null;
  const kind = typeof choice.kind === "string" ? choice.kind : null;
  if (!id || !kind) {
    return null;
  }

  return {
    id,
    kind,
  };
}

function buildEmptyModifiers() {
  return {
    attackDamage: 0,
    maxHp: 0,
    moveSpeed: 0,
    attackRadius: 0,
    attackArc: 0,
    attackCooldown: 0,
  };
}

function buildChoiceRanks(appliedChoices = []) {
  const ranks = new Map();
  for (const choice of appliedChoices) {
    const current = ranks.get(choice.id) ?? 0;
    ranks.set(choice.id, current + 1);
  }
  return ranks;
}

function getCatalogEntryById(id, catalog = UPGRADE_CATALOG) {
  return catalog.find((entry) => entry.id === id) ?? null;
}

function buildAppliedModifiers(appliedChoices = [], catalog = UPGRADE_CATALOG) {
  const skillModifiers = buildEmptyModifiers();
  const talentModifiers = buildEmptyModifiers();

  for (const choice of appliedChoices) {
    const entry = getCatalogEntryById(choice.id, catalog);
    if (!entry) {
      continue;
    }
    const target = entry.kind === "skill" ? skillModifiers : talentModifiers;
    const effectKind = entry.effect?.kind;
    if (!Object.hasOwn(target, effectKind)) {
      continue;
    }
    target[effectKind] += toFiniteNumber(entry.effect?.amount, 0);
  }

  return {
    skillModifiers,
    talentModifiers,
  };
}

function createNextRngState(rngState) {
  return (1664525 * (Math.floor(toFiniteNumber(rngState, 0)) >>> 0) + 1013904223) >>> 0;
}

function pickDeterministicIndex(rngState, length) {
  if (length <= 0) {
    return { index: -1, nextState: Math.floor(toFiniteNumber(rngState, 0)) >>> 0 };
  }
  const nextState = createNextRngState(rngState);
  return {
    index: nextState % length,
    nextState,
  };
}

function sortEntriesStable(entries = []) {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

function removeEntryById(entries, id) {
  return entries.filter((entry) => entry.id !== id);
}

function normalizeLevelUpEvent(levelUpEvent = {}) {
  return {
    id: typeof levelUpEvent.id === "string" ? levelUpEvent.id : "lvlup-0000",
    reachedLevel: Math.max(1, Math.floor(toFiniteNumber(levelUpEvent.reachedLevel, 1))),
    thresholdXp: Math.max(0, Math.floor(toFiniteNumber(levelUpEvent.thresholdXp, 0))),
  };
}

export function createOfferSeed(seed) {
  return (Math.floor(toFiniteNumber(seed, 0)) ^ OFFER_RNG_SEED_SALT) >>> 0;
}

export function createUpgradeState({ appliedChoices = [], skillModifiers = null, talentModifiers = null } = {}) {
  const normalizedChoices = (Array.isArray(appliedChoices) ? appliedChoices : [])
    .map((choice) => normalizeChoice(choice))
    .filter(Boolean);
  const derived = buildAppliedModifiers(normalizedChoices);

  return {
    appliedChoices: normalizedChoices,
    skillModifiers: skillModifiers && typeof skillModifiers === "object" ? { ...buildEmptyModifiers(), ...skillModifiers } : derived.skillModifiers,
    talentModifiers: talentModifiers && typeof talentModifiers === "object" ? { ...buildEmptyModifiers(), ...talentModifiers } : derived.talentModifiers,
  };
}

export function getEligibleUpgrades({
  levelUpEvent = normalizeLevelUpEvent(),
  upgradeState = createUpgradeState(),
  catalog = UPGRADE_CATALOG,
} = {}) {
  const event = normalizeLevelUpEvent(levelUpEvent);
  const state = createUpgradeState(upgradeState);
  const ranks = buildChoiceRanks(state.appliedChoices);
  const selectedIds = new Set(state.appliedChoices.map((choice) => choice.id));

  return sortEntriesStable(catalog).filter((entry) => {
    const currentRank = ranks.get(entry.id) ?? 0;
    if (currentRank >= Math.max(1, Math.floor(toFiniteNumber(entry.maxRank, 1)))) {
      return false;
    }
    if (Array.isArray(entry.requires) && entry.requires.some((id) => !selectedIds.has(id))) {
      return false;
    }
    if (Array.isArray(entry.excludes) && entry.excludes.some((id) => selectedIds.has(id))) {
      return false;
    }
    if (entry.minLevel && event.reachedLevel < Math.max(1, Math.floor(toFiniteNumber(entry.minLevel, 1)))) {
      return false;
    }
    return true;
  });
}

export function generateUpgradeOffers({
  levelUpEvent = normalizeLevelUpEvent(),
  upgradeState = createUpgradeState(),
  offerRngState = 0,
  catalog = UPGRADE_CATALOG,
  offerCount = 3,
} = {}) {
  const eligible = getEligibleUpgrades({ levelUpEvent, upgradeState, catalog });
  const desiredCount = Math.max(0, Math.floor(toFiniteNumber(offerCount, 3)));
  if (eligible.length < desiredCount) {
    throw new Error(`Expected at least ${desiredCount} eligible upgrades, received ${eligible.length}.`);
  }

  let nextState = Math.floor(toFiniteNumber(offerRngState, 0)) >>> 0;
  let remainingSkills = eligible.filter((entry) => entry.kind === "skill");
  let remainingTalents = eligible.filter((entry) => entry.kind === "talent");
  let remaining = [...eligible];
  const picks = [];

  if (desiredCount >= 2 && remainingSkills.length > 0 && remainingTalents.length > 0) {
    const skillPick = pickDeterministicIndex(nextState, remainingSkills.length);
    nextState = skillPick.nextState;
    picks.push(remainingSkills[skillPick.index]);
    remaining = removeEntryById(remaining, picks.at(-1).id);
    remainingSkills = removeEntryById(remainingSkills, picks.at(-1).id);
    remainingTalents = removeEntryById(remainingTalents, picks.at(-1).id);

    const talentPick = pickDeterministicIndex(nextState, remainingTalents.length);
    nextState = talentPick.nextState;
    picks.push(remainingTalents[talentPick.index]);
    remaining = removeEntryById(remaining, picks.at(-1).id);
    remainingSkills = removeEntryById(remainingSkills, picks.at(-1).id);
    remainingTalents = removeEntryById(remainingTalents, picks.at(-1).id);
  }

  while (picks.length < desiredCount) {
    const nextPick = pickDeterministicIndex(nextState, remaining.length);
    nextState = nextPick.nextState;
    const choice = remaining[nextPick.index];
    picks.push(choice);
    remaining = removeEntryById(remaining, choice.id);
  }

  return {
    levelUpEvent: normalizeLevelUpEvent(levelUpEvent),
    offeredChoices: sortEntriesStable(picks).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      description: entry.description,
      maxRank: entry.maxRank,
      nextRank: (buildChoiceRanks(createUpgradeState(upgradeState).appliedChoices).get(entry.id) ?? 0) + 1,
      requires: [...entry.requires],
      excludes: [...entry.excludes],
      tags: [...entry.tags],
      effect: { ...entry.effect },
    })),
    offerRngState: nextState,
  };
}

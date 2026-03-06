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

function sortEntriesStable(entries = []) {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
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

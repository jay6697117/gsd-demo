import { OFFER_RNG_SEED_SALT, UPGRADE_CATALOG } from "./upgrade-catalog.js";
import { createProgressionState } from "./progression-system.js";

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

function normalizeOfferedChoice(choice, catalog = UPGRADE_CATALOG) {
  if (!choice || typeof choice !== "object") {
    return null;
  }

  const entry = getCatalogEntryById(choice.id, catalog);
  const kind =
    typeof choice.kind === "string"
      ? choice.kind
      : typeof entry?.kind === "string"
        ? entry.kind
        : null;
  if (typeof choice.id !== "string" || !kind) {
    return null;
  }

  return {
    id: choice.id,
    kind,
    label: typeof choice.label === "string" ? choice.label : entry?.label ?? choice.id,
    description:
      typeof choice.description === "string"
        ? choice.description
        : entry?.description ?? "",
    maxRank: Math.max(1, Math.floor(toFiniteNumber(choice.maxRank ?? entry?.maxRank, 1))),
    nextRank: Math.max(1, Math.floor(toFiniteNumber(choice.nextRank, 1))),
    requires: Array.isArray(choice.requires)
      ? [...choice.requires]
      : Array.isArray(entry?.requires)
        ? [...entry.requires]
        : [],
    excludes: Array.isArray(choice.excludes)
      ? [...choice.excludes]
      : Array.isArray(entry?.excludes)
        ? [...entry.excludes]
        : [],
    tags: Array.isArray(choice.tags)
      ? [...choice.tags]
      : Array.isArray(entry?.tags)
        ? [...entry.tags]
        : [],
    effect: {
      kind:
        typeof choice.effect?.kind === "string"
          ? choice.effect.kind
          : entry?.effect?.kind ?? null,
      amount: toFiniteNumber(choice.effect?.amount ?? entry?.effect?.amount, 0),
    },
  };
}

function createOfferId(eventId, offerSeq) {
  return `${eventId}-offer-${String(offerSeq).padStart(4, "0")}`;
}

function normalizeModifierSummary(modifiers = null) {
  return {
    ...buildEmptyModifiers(),
    ...(modifiers && typeof modifiers === "object" ? modifiers : {}),
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

export function createLevelUpState({
  activeEventId = null,
  currentOfferId = null,
  offeredChoices = [],
  selectedIndex = 0,
  rerollsRemaining = 0,
  offerSeq = 0,
  offerRngState = 0,
} = {}) {
  const normalizedChoices = (Array.isArray(offeredChoices) ? offeredChoices : [])
    .map((choice) => normalizeOfferedChoice(choice))
    .filter(Boolean);
  const maxIndex = Math.max(0, normalizedChoices.length - 1);
  const normalizedSelectedIndex =
    normalizedChoices.length > 0
      ? Math.min(maxIndex, Math.max(0, Math.floor(toFiniteNumber(selectedIndex, 0))))
      : 0;

  return {
    activeEventId: typeof activeEventId === "string" ? activeEventId : null,
    currentOfferId: typeof currentOfferId === "string" ? currentOfferId : null,
    offeredChoices: normalizedChoices,
    selectedIndex: normalizedSelectedIndex,
    rerollsRemaining: Math.max(0, Math.floor(toFiniteNumber(rerollsRemaining, 0))),
    offerSeq: Math.max(0, Math.floor(toFiniteNumber(offerSeq, 0))),
    offerRngState: Math.floor(toFiniteNumber(offerRngState, 0)) >>> 0,
  };
}

export function summarizeLevelUpStateForSnapshot(levelUpState = createLevelUpState()) {
  const normalized = createLevelUpState(levelUpState);
  return {
    activeEventId: normalized.activeEventId,
    currentOfferId: normalized.currentOfferId,
    offeredChoices: normalized.offeredChoices.map((choice) => ({
      id: choice.id,
      kind: choice.kind,
      nextRank: choice.nextRank,
      maxRank: choice.maxRank,
      effect: {
        kind: choice.effect.kind,
        amount: toFiniteNumber(choice.effect.amount, 0),
      },
    })),
    selectedIndex: normalized.selectedIndex,
    rerollsRemaining: normalized.rerollsRemaining,
    offerSeq: normalized.offerSeq,
    offerRngState: normalized.offerRngState,
  };
}

export function summarizeUpgradeStateForSnapshot(upgradeState = createUpgradeState()) {
  const normalized = createUpgradeState(upgradeState);
  return {
    appliedChoices: normalized.appliedChoices.map((choice) => ({
      id: choice.id,
      kind: choice.kind,
    })),
    skillModifiers: normalizeModifierSummary(normalized.skillModifiers),
    talentModifiers: normalizeModifierSummary(normalized.talentModifiers),
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

export function beginLevelUpChoice({
  progressionState = createProgressionState(),
  upgradeState = createUpgradeState(),
  levelUpState = createLevelUpState(),
  catalog = UPGRADE_CATALOG,
} = {}) {
  const normalizedProgression = createProgressionState(progressionState);
  const normalizedUpgradeState = createUpgradeState(upgradeState);
  const normalizedLevelUpState = createLevelUpState(levelUpState);

  if (
    normalizedLevelUpState.activeEventId ||
    normalizedProgression.pendingLevelUps.length === 0
  ) {
    return {
      didOpen: false,
      progressionState: normalizedProgression,
      upgradeState: normalizedUpgradeState,
      levelUpState: normalizedLevelUpState,
    };
  }

  const activeEvent = normalizedProgression.pendingLevelUps[0];
  const offerResult = generateUpgradeOffers({
    levelUpEvent: activeEvent,
    upgradeState: normalizedUpgradeState,
    offerRngState: normalizedLevelUpState.offerRngState,
    catalog,
  });
  const nextOfferSeq = normalizedLevelUpState.offerSeq + 1;

  return {
    didOpen: true,
    progressionState: normalizedProgression,
    upgradeState: normalizedUpgradeState,
    levelUpState: createLevelUpState({
      activeEventId: activeEvent.id,
      currentOfferId: createOfferId(activeEvent.id, nextOfferSeq),
      offeredChoices: offerResult.offeredChoices,
      selectedIndex: 0,
      rerollsRemaining: 1,
      offerSeq: nextOfferSeq,
      offerRngState: offerResult.offerRngState,
    }),
  };
}

export function moveLevelUpSelection({
  levelUpState = createLevelUpState(),
  direction = 0,
} = {}) {
  const normalizedLevelUpState = createLevelUpState(levelUpState);
  if (normalizedLevelUpState.offeredChoices.length === 0) {
    return normalizedLevelUpState;
  }

  const nextIndex = Math.min(
    normalizedLevelUpState.offeredChoices.length - 1,
    Math.max(
      0,
      normalizedLevelUpState.selectedIndex +
        Math.sign(toFiniteNumber(direction, 0)),
    ),
  );

  return createLevelUpState({
    ...normalizedLevelUpState,
    selectedIndex: nextIndex,
  });
}

export function confirmLevelUpChoice({
  progressionState = createProgressionState(),
  upgradeState = createUpgradeState(),
  levelUpState = createLevelUpState(),
} = {}) {
  const normalizedProgression = createProgressionState(progressionState);
  const normalizedUpgradeState = createUpgradeState(upgradeState);
  const normalizedLevelUpState = createLevelUpState(levelUpState);
  const chosenChoice =
    normalizedLevelUpState.offeredChoices[normalizedLevelUpState.selectedIndex] ??
    normalizedLevelUpState.offeredChoices[0] ??
    null;

  if (!normalizedLevelUpState.activeEventId || !chosenChoice) {
    return {
      didConfirm: false,
      chosenChoice: null,
      progressionState: normalizedProgression,
      upgradeState: normalizedUpgradeState,
      levelUpState: normalizedLevelUpState,
    };
  }

  let removed = false;
  const nextPendingLevelUps = normalizedProgression.pendingLevelUps.filter((event) => {
    if (!removed && event.id === normalizedLevelUpState.activeEventId) {
      removed = true;
      return false;
    }
    return true;
  });

  return {
    didConfirm: true,
    consumedEventId: normalizedLevelUpState.activeEventId,
    chosenChoice,
    progressionState: createProgressionState({
      ...normalizedProgression,
      pendingLevelUps: nextPendingLevelUps,
    }),
    upgradeState: createUpgradeState({
      appliedChoices: [
        ...normalizedUpgradeState.appliedChoices,
        { id: chosenChoice.id, kind: chosenChoice.kind },
      ],
    }),
    levelUpState: createLevelUpState({
      offerRngState: normalizedLevelUpState.offerRngState,
      offerSeq: normalizedLevelUpState.offerSeq,
    }),
  };
}

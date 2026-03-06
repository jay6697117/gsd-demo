import {
  LEVEL_THRESHOLDS,
  LEVEL_THRESHOLD_OVERFLOW_DELTA,
  XP_VALUES_BY_ENEMY_KIND,
} from "./progression-config.js";

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizePendingLevelUp(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const reachedLevel = Math.max(2, Math.floor(toFiniteNumber(event.reachedLevel, 2)));
  return {
    id: typeof event.id === "string" ? event.id : `lvlup-${String(reachedLevel).padStart(4, "0")}`,
    reachedLevel,
    thresholdXp: Math.max(0, Math.floor(toFiniteNumber(event.thresholdXp, 0))),
  };
}

function createLevelUpEvent(eventSeq, reachedLevel) {
  return {
    id: `lvlup-${String(eventSeq).padStart(4, "0")}`,
    reachedLevel,
    thresholdXp: getThresholdXpForLevel(reachedLevel),
  };
}

export function createProgressionState({
  level = 1,
  totalXp = 0,
  pendingLevelUps = [],
  eventSeq = 0,
} = {}) {
  const normalizedTotalXp = Math.max(0, Math.floor(toFiniteNumber(totalXp, 0)));
  return {
    level: Math.max(1, Math.floor(toFiniteNumber(level, getLevelForXp(normalizedTotalXp)))),
    totalXp: normalizedTotalXp,
    pendingLevelUps: (Array.isArray(pendingLevelUps) ? pendingLevelUps : [])
      .map((event) => normalizePendingLevelUp(event))
      .filter(Boolean),
    eventSeq: Math.max(0, Math.floor(toFiniteNumber(eventSeq, 0))),
  };
}

export function getXpValueForEnemyKind(enemyKind) {
  if (typeof enemyKind !== "string") {
    return 0;
  }
  return Math.max(0, Math.floor(toFiniteNumber(XP_VALUES_BY_ENEMY_KIND[enemyKind], 0)));
}

export function getThresholdXpForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(toFiniteNumber(level, 1)));
  const thresholdIndex = normalizedLevel - 1;
  if (thresholdIndex < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[thresholdIndex];
  }

  const overflowSteps = thresholdIndex - (LEVEL_THRESHOLDS.length - 1);
  return (
    LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] +
    overflowSteps * Math.max(1, LEVEL_THRESHOLD_OVERFLOW_DELTA)
  );
}

export function getLevelForXp(totalXp) {
  const normalizedXp = Math.max(0, Math.floor(toFiniteNumber(totalXp, 0)));
  let level = 1;

  while (normalizedXp >= getThresholdXpForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getLevelWindow(totalXp) {
  const level = getLevelForXp(totalXp);
  return {
    level,
    currentLevelStartXp: getThresholdXpForLevel(level),
    nextLevelXp: getThresholdXpForLevel(level + 1),
  };
}

export function applyXpGain({
  progressionState = createProgressionState(),
  xpGain = 0,
} = {}) {
  const currentState = createProgressionState(progressionState);
  const normalizedGain = Math.max(0, Math.floor(toFiniteNumber(xpGain, 0)));
  const nextTotalXp = currentState.totalXp + normalizedGain;
  const nextLevel = getLevelForXp(nextTotalXp);
  const gainedEvents = [];
  let nextEventSeq = currentState.eventSeq;

  for (let reachedLevel = currentState.level + 1; reachedLevel <= nextLevel; reachedLevel += 1) {
    nextEventSeq += 1;
    gainedEvents.push(createLevelUpEvent(nextEventSeq, reachedLevel));
  }

  return {
    progressionState: createProgressionState({
      level: nextLevel,
      totalXp: nextTotalXp,
      pendingLevelUps: [...currentState.pendingLevelUps, ...gainedEvents],
      eventSeq: nextEventSeq,
    }),
    gainedEvents,
    leveledUp: gainedEvents.length > 0,
  };
}

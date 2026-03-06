import {
  BREAKABLE_ARCHETYPES,
  BREAKABLE_LAYOUT_PRESETS,
  BREAKABLE_SECTOR_IDS,
} from "./breakable-catalog.js";

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeSectorIds(sectorIds = BREAKABLE_SECTOR_IDS) {
  const normalized = [];
  for (const sectorId of sectorIds) {
    if (typeof sectorId !== "string") {
      continue;
    }
    if (!normalized.includes(sectorId)) {
      normalized.push(sectorId);
    }
  }
  return normalized;
}

function normalizeQuarterTurns(value) {
  const rounded = Math.floor(toFiniteNumber(value, 0));
  const normalized = rounded % 4;
  return normalized < 0 ? normalized + 4 : normalized;
}

function createBreakableInstance(sectorId, preset, order) {
  const archetype = BREAKABLE_ARCHETYPES[preset?.archetypeId];
  if (!archetype || typeof preset?.id !== "string") {
    return null;
  }

  return {
    id: preset.id,
    order,
    sectorId,
    archetypeId: archetype.id,
    blocksMovement: Boolean(archetype.blocksMovement),
    rotationQuarterTurns: normalizeQuarterTurns(preset.rotationQuarterTurns),
    x: Number(toFiniteNumber(preset.x, 0).toFixed(3)),
    y: Number(toFiniteNumber(preset.y, 0).toFixed(3)),
    size: {
      width: Number(toFiniteNumber(archetype.size?.width, 1).toFixed(3)),
      height: Number(toFiniteNumber(archetype.size?.height, 1).toFixed(3)),
    },
    hitRadius: Number(toFiniteNumber(archetype.hitRadius, 1).toFixed(3)),
    maxHp: Math.max(1, Math.floor(toFiniteNumber(archetype.maxHp, 1))),
    hp: Math.max(1, Math.floor(toFiniteNumber(archetype.maxHp, 1))),
    broken: false,
    visual: archetype.visual,
  };
}

function sortBreakablesStable(breakables = []) {
  return [...breakables].sort((left, right) => {
    const leftOrder = Math.floor(toFiniteNumber(left?.order, Number.MAX_SAFE_INTEGER));
    const rightOrder = Math.floor(toFiniteNumber(right?.order, Number.MAX_SAFE_INTEGER));
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

function normalizeFacing(attackFacing = { x: 1, y: 0 }) {
  const x = toFiniteNumber(attackFacing?.x, 1);
  const y = toFiniteNumber(attackFacing?.y, 0);
  const length = Math.hypot(x, y);
  if (length <= 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: x / length, y: y / length };
}

function isBreakableHit({
  breakable,
  attackOrigin,
  attackFacing,
  attackRadius,
  frontDotThreshold,
}) {
  if (!breakable || breakable.broken) {
    return false;
  }

  const dx = toFiniteNumber(breakable.x, 0) - toFiniteNumber(attackOrigin?.x, 0);
  const dy = toFiniteNumber(breakable.y, 0) - toFiniteNumber(attackOrigin?.y, 0);
  const distance = Math.hypot(dx, dy);
  const maxDistance = Math.max(0, toFiniteNumber(attackRadius, 0)) + toFiniteNumber(breakable.hitRadius, 0);
  if (distance > maxDistance) {
    return false;
  }

  const normalX = distance > 1e-6 ? dx / distance : 0;
  const normalY = distance > 1e-6 ? dy / distance : 0;
  const frontDot = normalX * attackFacing.x + normalY * attackFacing.y;
  return frontDot >= toFiniteNumber(frontDotThreshold, -1);
}

export function createWorldBreakables({
  sectorIds = BREAKABLE_SECTOR_IDS,
  layoutPresets = BREAKABLE_LAYOUT_PRESETS,
  presets = null,
} = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  const resolvedLayoutPresets = presets || layoutPresets;
  const breakables = [];

  for (const sectorId of normalizedSectorIds) {
    const sectorPresets = Array.isArray(resolvedLayoutPresets?.[sectorId]) ? resolvedLayoutPresets[sectorId] : [];
    for (const preset of sectorPresets) {
      const breakable = createBreakableInstance(sectorId, preset, breakables.length);
      if (breakable) {
        breakables.push(breakable);
      }
    }
  }

  return sortBreakablesStable(breakables);
}

export function getBreakablesForSector(breakables = [], sectorId) {
  if (typeof sectorId !== "string") {
    return sortBreakablesStable(Array.isArray(breakables) ? breakables : []);
  }
  return sortBreakablesStable((Array.isArray(breakables) ? breakables : []).filter((breakable) => breakable.sectorId === sectorId));
}

export function resolveBreakableAttackStep({
  breakables = [],
  attackOrigin = { x: 0, y: 0 },
  attackFacing = { x: 1, y: 0 },
  attackRadius = 0,
  attackDamage = 0,
  frontDotThreshold = -1,
} = {}) {
  const resolvedFacing = normalizeFacing(attackFacing);
  const normalizedDamage = Math.max(0, Math.floor(toFiniteNumber(attackDamage, 0)));
  const nextBreakables = [];
  const hitBreakables = [];
  const destroyedBreakables = [];

  for (const breakable of sortBreakablesStable(Array.isArray(breakables) ? breakables : [])) {
    const current = {
      ...breakable,
      hp: Math.max(0, Math.floor(toFiniteNumber(breakable?.hp, breakable?.maxHp ?? 0))),
      maxHp: Math.max(1, Math.floor(toFiniteNumber(breakable?.maxHp, 1))),
      broken: Boolean(breakable?.broken),
    };

    if (
      normalizedDamage > 0 &&
      isBreakableHit({
        breakable: current,
        attackOrigin,
        attackFacing: resolvedFacing,
        attackRadius,
        frontDotThreshold,
      })
    ) {
      const nextHp = Math.max(0, current.hp - normalizedDamage);
      const nextBreakable = {
        ...current,
        hp: nextHp,
        broken: nextHp <= 0,
      };
      hitBreakables.push(nextBreakable);
      if (!current.broken && nextBreakable.broken) {
        destroyedBreakables.push(nextBreakable);
      }
      nextBreakables.push(nextBreakable);
      continue;
    }

    nextBreakables.push(current);
  }

  return {
    breakables: nextBreakables,
    hitBreakables,
    destroyedBreakables,
  };
}

export function summarizeBreakablesForSnapshot(breakables = []) {
  return sortBreakablesStable(Array.isArray(breakables) ? breakables : []).map((breakable) => ({
    id: breakable.id,
    sectorId: breakable.sectorId,
    archetypeId: breakable.archetypeId,
    maxHp: Math.max(1, Math.floor(toFiniteNumber(breakable.maxHp, 1))),
    hp: Math.max(0, Math.floor(toFiniteNumber(breakable.hp, breakable.maxHp ?? 0))),
    broken: Boolean(breakable.broken),
    x: Number(toFiniteNumber(breakable.x, 0).toFixed(3)),
    y: Number(toFiniteNumber(breakable.y, 0).toFixed(3)),
  }));
}

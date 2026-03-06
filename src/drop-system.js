import { BREAKABLE_DROP_TABLES } from "./drop-tables.js";

export const DROP_RNG_SEED_SALT = 0x19f3c6ad;

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
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

function advanceDropRngState(dropRngState = 0) {
  const nextState = (1664525 * (Math.floor(toFiniteNumber(dropRngState, 0)) >>> 0) + 1013904223) >>> 0;
  return {
    nextState,
    unitValue: nextState / 0x100000000,
  };
}

function pickWeightedEntry(dropTableId, unitValue, dropTables = BREAKABLE_DROP_TABLES) {
  const table = Array.isArray(dropTables?.[dropTableId]) ? dropTables[dropTableId] : [];
  if (table.length === 0) {
    return null;
  }

  const totalWeight = table.reduce((sum, entry) => sum + Math.max(0, toFiniteNumber(entry?.weight, 0)), 0);
  if (totalWeight <= 0) {
    return table[0];
  }

  let cursor = Math.max(0, Math.min(0.999999999, toFiniteNumber(unitValue, 0))) * totalWeight;
  for (const entry of table) {
    cursor -= Math.max(0, toFiniteNumber(entry?.weight, 0));
    if (cursor <= 0) {
      return entry;
    }
  }
  return table.at(-1) ?? null;
}

function createGroundDrop({ eventSeq, breakable, tableEntry, existingCount }) {
  const sequence = Math.max(1, Math.floor(toFiniteNumber(eventSeq, 1)));
  return {
    id: `drop-${String(sequence).padStart(4, "0")}-${breakable.id}`,
    order: Math.max(0, Math.floor(toFiniteNumber(existingCount, 0))),
    sourcePropId: breakable.id,
    sourceSectorId: breakable.sectorId,
    slot: tableEntry.slot,
    rarity: tableEntry.rarity,
    statKey: tableEntry.statKey,
    statValue: toFiniteNumber(tableEntry.statValue, 0),
    x: Number(toFiniteNumber(breakable.x, 0).toFixed(3)),
    y: Number(toFiniteNumber(breakable.y, 0).toFixed(3)),
    pickupArmed: true,
    needsRearm: false,
    lastRangeState: "outside",
  };
}

function normalizeGroundDrop(drop, orderFallback = 0) {
  return {
    id: typeof drop?.id === "string" ? drop.id : `drop-${String(orderFallback + 1).padStart(4, "0")}`,
    order: Math.max(0, Math.floor(toFiniteNumber(drop?.order, orderFallback))),
    sourcePropId: typeof drop?.sourcePropId === "string" ? drop.sourcePropId : null,
    sourceSectorId: typeof drop?.sourceSectorId === "string" ? drop.sourceSectorId : null,
    slot: typeof drop?.slot === "string" ? drop.slot : "weapon",
    rarity: typeof drop?.rarity === "string" ? drop.rarity : "common",
    statKey: typeof drop?.statKey === "string" ? drop.statKey : "attackDamage",
    statValue: toFiniteNumber(drop?.statValue, 0),
    x: Number(toFiniteNumber(drop?.x, 0).toFixed(3)),
    y: Number(toFiniteNumber(drop?.y, 0).toFixed(3)),
    pickupArmed: Boolean(drop?.pickupArmed),
    needsRearm: Boolean(drop?.needsRearm),
    lastRangeState: typeof drop?.lastRangeState === "string" ? drop.lastRangeState : "outside",
  };
}

export function createDropSeed(seed) {
  return (Math.floor(toFiniteNumber(seed, 0)) ^ DROP_RNG_SEED_SALT) >>> 0;
}

export function createLootState({ groundDrops = [], dropRngState = 0, eventSeq = 0, pendingPickupId = null } = {}) {
  return {
    groundDrops: (Array.isArray(groundDrops) ? groundDrops : []).map((drop, index) => normalizeGroundDrop(drop, index)),
    dropRngState: Math.floor(toFiniteNumber(dropRngState, 0)) >>> 0,
    eventSeq: Math.max(0, Math.floor(toFiniteNumber(eventSeq, 0))),
    pendingPickupId: typeof pendingPickupId === "string" ? pendingPickupId : null,
  };
}

export function resolveDestroyedBreakableDrops({
  lootState = createLootState(),
  destroyedBreakables = [],
  dropTables = BREAKABLE_DROP_TABLES,
} = {}) {
  let nextLootState = createLootState(lootState);

  for (const breakable of sortBreakablesStable(Array.isArray(destroyedBreakables) ? destroyedBreakables : [])) {
    const { nextState, unitValue } = advanceDropRngState(nextLootState.dropRngState);
    const tableEntry = pickWeightedEntry(breakable?.dropTableId, unitValue, dropTables);
    nextLootState = {
      ...nextLootState,
      dropRngState: nextState,
    };

    if (!tableEntry || typeof breakable?.id !== "string") {
      continue;
    }

    const eventSeq = nextLootState.eventSeq + 1;
    const groundDrop = createGroundDrop({
      eventSeq,
      breakable,
      tableEntry,
      existingCount: nextLootState.groundDrops.length,
    });
    nextLootState = {
      ...nextLootState,
      eventSeq,
      groundDrops: [...nextLootState.groundDrops, groundDrop],
    };
  }

  return {
    lootState: nextLootState,
  };
}

export function summarizeLootStateForSnapshot(lootState = createLootState()) {
  const normalized = createLootState(lootState);
  return {
    eventSeq: normalized.eventSeq,
    pendingPickupId: normalized.pendingPickupId,
    dropRngState: normalized.dropRngState,
    groundDrops: normalized.groundDrops.map((drop, index) => normalizeGroundDrop(drop, index)),
  };
}

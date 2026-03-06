const EQUIPMENT_SLOTS = ["weapon", "core", "charm"];
const DERIVED_STAT_KEYS = ["attackDamage", "maxHp", "moveSpeed"];

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function cloneDrop(drop, overrides = {}) {
  return {
    ...drop,
    ...overrides,
  };
}

function buildEmptySlots() {
  return {
    weapon: null,
    core: null,
    charm: null,
  };
}

function normalizeEquipmentItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const slot = typeof item.slot === "string" ? item.slot : null;
  const statKey = typeof item.statKey === "string" ? item.statKey : null;
  if (!EQUIPMENT_SLOTS.includes(slot) || !DERIVED_STAT_KEYS.includes(statKey)) {
    return null;
  }

  return {
    id: typeof item.id === "string" ? item.id : null,
    slot,
    rarity: typeof item.rarity === "string" ? item.rarity : "common",
    statKey,
    statValue: toFiniteNumber(item.statValue, 0),
    sourcePropId: typeof item.sourcePropId === "string" ? item.sourcePropId : null,
  };
}

function buildDerivedStats(slots) {
  const derivedStats = {
    attackDamage: 0,
    maxHp: 0,
    moveSpeed: 0,
  };

  for (const slot of EQUIPMENT_SLOTS) {
    const item = slots[slot];
    if (!item) {
      continue;
    }
    derivedStats[item.statKey] += toFiniteNumber(item.statValue, 0);
  }

  return derivedStats;
}

function normalizeSlots(slots = {}) {
  const normalized = buildEmptySlots();
  for (const slot of EQUIPMENT_SLOTS) {
    normalized[slot] = normalizeEquipmentItem(slots[slot]);
  }
  return normalized;
}

function normalizeCompareCandidate(compareCandidate) {
  if (!compareCandidate || typeof compareCandidate !== "object") {
    return null;
  }

  const candidateItem = normalizeEquipmentItem(compareCandidate.candidateItem);
  const equippedItem = normalizeEquipmentItem(compareCandidate.equippedItem);
  const slot = typeof compareCandidate.slot === "string" ? compareCandidate.slot : candidateItem?.slot ?? null;
  if (!candidateItem || !slot) {
    return null;
  }

  return {
    dropId: typeof compareCandidate.dropId === "string" ? compareCandidate.dropId : candidateItem.id,
    slot,
    candidateItem,
    equippedItem,
    statDelta: toFiniteNumber(compareCandidate.statDelta, 0),
  };
}

function createItemFromGroundDrop(drop) {
  return normalizeEquipmentItem({
    id: drop.id,
    slot: drop.slot,
    rarity: drop.rarity,
    statKey: drop.statKey,
    statValue: drop.statValue,
    sourcePropId: drop.sourcePropId,
  });
}

function sortGroundDropsStable(groundDrops = []) {
  return [...groundDrops].sort((left, right) => {
    const leftOrder = Math.floor(toFiniteNumber(left?.order, Number.MAX_SAFE_INTEGER));
    const rightOrder = Math.floor(toFiniteNumber(right?.order, Number.MAX_SAFE_INTEGER));
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

function normalizeLootState(lootState = {}) {
  return {
    ...lootState,
    groundDrops: sortGroundDropsStable(Array.isArray(lootState.groundDrops) ? lootState.groundDrops : []).map(
      (drop, index) => ({
        id: typeof drop?.id === "string" ? drop.id : `drop-${String(index + 1).padStart(4, "0")}`,
        order: Math.max(0, Math.floor(toFiniteNumber(drop?.order, index))),
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
      }),
    ),
    pendingPickupId: typeof lootState.pendingPickupId === "string" ? lootState.pendingPickupId : null,
  };
}

function setDropFlags(drop, overrides = {}) {
  return cloneDrop(drop, overrides);
}

function buildCompareCandidate(drop, equippedItem) {
  const candidateItem = createItemFromGroundDrop(drop);
  return {
    dropId: drop.id,
    slot: candidateItem.slot,
    candidateItem,
    equippedItem,
    statDelta: candidateItem.statValue - toFiniteNumber(equippedItem?.statValue, 0),
  };
}

function equipItemIntoState(equipmentState, item) {
  const nextSlots = {
    ...equipmentState.slots,
    [item.slot]: item,
  };
  return createEquipmentState({
    slots: nextSlots,
    compareCandidate: null,
  });
}

export function createEquipmentState({ slots = {}, compareCandidate = null } = {}) {
  const normalizedSlots = normalizeSlots(slots);
  return {
    slots: normalizedSlots,
    derivedStats: buildDerivedStats(normalizedSlots),
    compareCandidate: normalizeCompareCandidate(compareCandidate),
  };
}

export function resolveAutoPickupStep({
  equipmentState = createEquipmentState(),
  lootState = { groundDrops: [], pendingPickupId: null },
  playerPosition = { x: 0, y: 0 },
  pickupRadius = 1,
} = {}) {
  const normalizedEquipmentState = createEquipmentState(equipmentState);
  const normalizedLootState = normalizeLootState(lootState);
  const radius = Math.max(0, toFiniteNumber(pickupRadius, 0));
  const playerX = toFiniteNumber(playerPosition?.x, 0);
  const playerY = toFiniteNumber(playerPosition?.y, 0);

  const groundDrops = normalizedLootState.groundDrops.map((drop) => {
    const distance = Math.hypot(drop.x - playerX, drop.y - playerY);
    const inside = distance <= radius;

    if (!inside) {
      return setDropFlags(drop, {
        pickupArmed: drop.needsRearm ? true : drop.pickupArmed,
        needsRearm: false,
        lastRangeState: "outside",
      });
    }

    return setDropFlags(drop, {
      lastRangeState: "inside",
    });
  });

  const nextLootState = {
    ...normalizedLootState,
    groundDrops,
  };

  if (normalizedEquipmentState.compareCandidate || nextLootState.pendingPickupId) {
    return {
      equipmentState: normalizedEquipmentState,
      lootState: nextLootState,
      nextMode: "equip_compare",
    };
  }

  for (const drop of groundDrops) {
    const distance = Math.hypot(drop.x - playerX, drop.y - playerY);
    const inside = distance <= radius;
    if (!inside || !drop.pickupArmed || drop.needsRearm) {
      continue;
    }

    const candidateItem = createItemFromGroundDrop(drop);
    const equippedItem = normalizedEquipmentState.slots[candidateItem.slot];

    if (!equippedItem) {
      return {
        equipmentState: equipItemIntoState(normalizedEquipmentState, candidateItem),
        lootState: {
          ...nextLootState,
          groundDrops: groundDrops.filter((entry) => entry.id !== drop.id),
          pendingPickupId: null,
        },
        nextMode: "playing",
        action: "equipped",
        appliedItem: candidateItem,
      };
    }

    return {
      equipmentState: createEquipmentState({
        slots: normalizedEquipmentState.slots,
        compareCandidate: buildCompareCandidate(drop, equippedItem),
      }),
      lootState: {
        ...nextLootState,
        pendingPickupId: drop.id,
        groundDrops: groundDrops.map((entry) =>
          entry.id === drop.id
            ? setDropFlags(entry, {
                pickupArmed: false,
                needsRearm: false,
                lastRangeState: "inside",
              })
            : entry,
        ),
      },
      nextMode: "equip_compare",
      action: "compare",
    };
  }

  return {
    equipmentState: normalizedEquipmentState,
    lootState: nextLootState,
    nextMode: "playing",
  };
}

export function acceptCompareCandidate({
  equipmentState = createEquipmentState(),
  lootState = { groundDrops: [], pendingPickupId: null },
} = {}) {
  const normalizedEquipmentState = createEquipmentState(equipmentState);
  const normalizedLootState = normalizeLootState(lootState);
  const compareCandidate = normalizedEquipmentState.compareCandidate;
  if (!compareCandidate) {
    return {
      equipmentState: normalizedEquipmentState,
      lootState: normalizedLootState,
      nextMode: "playing",
    };
  }

  return {
    equipmentState: equipItemIntoState(normalizedEquipmentState, compareCandidate.candidateItem),
    lootState: {
      ...normalizedLootState,
      groundDrops: normalizedLootState.groundDrops.filter((drop) => drop.id !== compareCandidate.dropId),
      pendingPickupId: null,
    },
    nextMode: "playing",
    acceptedItem: compareCandidate.candidateItem,
  };
}

export function rejectCompareCandidate({
  equipmentState = createEquipmentState(),
  lootState = { groundDrops: [], pendingPickupId: null },
} = {}) {
  const normalizedEquipmentState = createEquipmentState(equipmentState);
  const normalizedLootState = normalizeLootState(lootState);
  const compareCandidate = normalizedEquipmentState.compareCandidate;
  if (!compareCandidate) {
    return {
      equipmentState: normalizedEquipmentState,
      lootState: normalizedLootState,
      nextMode: "playing",
    };
  }

  return {
    equipmentState: createEquipmentState({
      slots: normalizedEquipmentState.slots,
      compareCandidate: null,
    }),
    lootState: {
      ...normalizedLootState,
      pendingPickupId: null,
      groundDrops: normalizedLootState.groundDrops.map((drop) =>
        drop.id === compareCandidate.dropId
          ? setDropFlags(drop, {
              pickupArmed: false,
              needsRearm: true,
              lastRangeState: "inside",
            })
          : drop,
      ),
    },
    nextMode: "playing",
  };
}

export function summarizeEquipmentStateForSnapshot(equipmentState = createEquipmentState()) {
  const normalized = createEquipmentState(equipmentState);
  const summarizeItem = (item) =>
    item
      ? {
          id: item.id,
          slot: item.slot,
          rarity: item.rarity,
          statKey: item.statKey,
          statValue: item.statValue,
          sourcePropId: item.sourcePropId,
        }
      : null;

  return {
    slots: {
      weapon: summarizeItem(normalized.slots.weapon),
      core: summarizeItem(normalized.slots.core),
      charm: summarizeItem(normalized.slots.charm),
    },
    derivedStats: {
      attackDamage: toFiniteNumber(normalized.derivedStats.attackDamage, 0),
      maxHp: toFiniteNumber(normalized.derivedStats.maxHp, 0),
      moveSpeed: toFiniteNumber(normalized.derivedStats.moveSpeed, 0),
    },
    compareCandidate: normalized.compareCandidate
      ? {
          dropId: normalized.compareCandidate.dropId,
          slot: normalized.compareCandidate.slot,
          candidateItem: summarizeItem(normalized.compareCandidate.candidateItem),
          equippedItem: summarizeItem(normalized.compareCandidate.equippedItem),
          statDelta: toFiniteNumber(normalized.compareCandidate.statDelta, 0),
        }
      : null,
  };
}

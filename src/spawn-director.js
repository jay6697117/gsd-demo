const DEFAULT_PER_SECTOR_SOFT_CAP = 4;
const MIN_WEIGHT = 0.01;

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundWeight(value) {
  return Number(clamp(value, MIN_WEIGHT, Number.POSITIVE_INFINITY).toFixed(6));
}

function normalizeSectorIds(sectorIds = []) {
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

function normalizeSectorId(sectorId, sectorIds) {
  if (typeof sectorId === "string" && sectorIds.includes(sectorId)) {
    return sectorId;
  }
  return sectorIds[0] ?? null;
}

function normalizeCountEntries({ sectorIds, sectorEnemyCounts }) {
  const countsMap = new Map(sectorIds.map((sectorId) => [sectorId, 0]));

  if (Array.isArray(sectorEnemyCounts)) {
    for (const entry of sectorEnemyCounts) {
      const sectorId = entry?.sectorId;
      if (typeof sectorId !== "string" || !countsMap.has(sectorId)) {
        continue;
      }
      countsMap.set(sectorId, Math.max(0, Math.floor(toFiniteNumber(entry?.count, 0))));
    }
  } else if (sectorEnemyCounts && typeof sectorEnemyCounts === "object") {
    for (const sectorId of sectorIds) {
      countsMap.set(sectorId, Math.max(0, Math.floor(toFiniteNumber(sectorEnemyCounts[sectorId], 0))));
    }
  }

  return sectorIds.map((sectorId) => ({
    sectorId,
    count: countsMap.get(sectorId) ?? 0,
  }));
}

function countBySectorId(sectorEnemyCounts = []) {
  const map = new Map();
  for (const entry of sectorEnemyCounts) {
    if (typeof entry?.sectorId !== "string") {
      continue;
    }
    map.set(entry.sectorId, Math.max(0, Math.floor(toFiniteNumber(entry?.count, 0))));
  }
  return map;
}

export function createSpawnDirectorState({ sectorIds = [], spawnCooldown = 0, spawnRngState = 0 } = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  return {
    eventSeq: 0,
    sectorWeights: normalizedSectorIds.map((sectorId) => ({ sectorId, weight: 1 })),
    sectorEnemyCounts: normalizedSectorIds.map((sectorId) => ({ sectorId, count: 0 })),
    lastSpawnSectorId: null,
    spawnCooldown: Math.max(0, toFiniteNumber(spawnCooldown, 0)),
    spawnRngState: Math.floor(toFiniteNumber(spawnRngState, 0)) >>> 0,
  };
}

export function buildSectorEnemyCounts({ sectorIds = [], enemies = [] } = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  const countsMap = new Map(normalizedSectorIds.map((sectorId) => [sectorId, 0]));

  for (const enemy of enemies) {
    const sectorId = enemy?.sectorId;
    if (typeof sectorId !== "string" || !countsMap.has(sectorId)) {
      continue;
    }
    countsMap.set(sectorId, (countsMap.get(sectorId) ?? 0) + 1);
  }

  return normalizedSectorIds.map((sectorId) => ({ sectorId, count: countsMap.get(sectorId) ?? 0 }));
}

export function computeSectorWeights({
  sectorIds = [],
  playerSectorId,
  sectorEnemyCounts = [],
  heatState = {},
  activeEnemyCount = 0,
  maxActiveEnemies = 1,
  perSectorSoftCap = DEFAULT_PER_SECTOR_SOFT_CAP,
} = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  if (normalizedSectorIds.length === 0) {
    return [];
  }

  const normalizedPlayerSectorId = normalizeSectorId(playerSectorId, normalizedSectorIds);
  const normalizedCounts = normalizeCountEntries({
    sectorIds: normalizedSectorIds,
    sectorEnemyCounts,
  });
  const countsMap = countBySectorId(normalizedCounts);

  const normalizedSoftCap = Math.max(1, Math.floor(toFiniteNumber(perSectorSoftCap, DEFAULT_PER_SECTOR_SOFT_CAP)));
  const normalizedMaxActive = Math.max(1, Math.floor(toFiniteNumber(maxActiveEnemies, 1)));
  const normalizedActive = Math.max(0, Math.floor(toFiniteNumber(activeEnemyCount, 0)));

  const globalPressure = clamp(normalizedActive / normalizedMaxActive, 0, 1);
  const globalRoomFactor = 0.35 + (1 - globalPressure) * 0.65;

  const danger = clamp(toFiniteNumber(heatState?.danger, 0), 0, 1);
  const sideBufferActive = Boolean(heatState?.sideBufferActive);
  const hotSectorId = normalizeSectorId(heatState?.hotSectorId, normalizedSectorIds);
  const reliefSectorId = normalizeSectorId(heatState?.reliefSectorId, normalizedSectorIds);
  const lastSpawnSectorId = normalizeSectorId(heatState?.lastSpawnSectorId, normalizedSectorIds);

  return normalizedSectorIds.map((sectorId) => {
    const count = countsMap.get(sectorId) ?? 0;
    const softCapRatio = clamp(count / normalizedSoftCap, 0, 2.5);

    const congestionPenalty = softCapRatio >= 1 ? 0.18 : clamp(1 - softCapRatio * 0.45, 0.18, 1);
    const playerBias =
      sectorId === normalizedPlayerSectorId ? 1.2 - danger * 0.6 : 0.95 + danger * 0.45;

    let weight = globalRoomFactor * congestionPenalty * playerBias;

    if (sectorId === hotSectorId) {
      weight *= 0.82;
    }

    if (sectorId === lastSpawnSectorId) {
      weight *= 0.88;
    }

    if (sideBufferActive) {
      if (sectorId === normalizedPlayerSectorId) {
        weight *= 0.42;
      }
      if (sectorId === reliefSectorId) {
        weight *= 1.35;
      }
    }

    return {
      sectorId,
      weight: roundWeight(weight),
    };
  });
}

function normalizeWeightedEntries(sectorWeights = []) {
  const entries = [];
  const seen = new Set();
  for (const entry of sectorWeights) {
    if (typeof entry?.sectorId !== "string") {
      continue;
    }
    if (seen.has(entry.sectorId)) {
      continue;
    }
    seen.add(entry.sectorId);
    entries.push({
      sectorId: entry.sectorId,
      weight: roundWeight(toFiniteNumber(entry?.weight, 0)),
    });
  }
  return entries;
}

export function chooseWeightedSector({ sectorWeights = [], rngValue = 0 } = {}) {
  const normalizedWeights = normalizeWeightedEntries(sectorWeights);
  if (normalizedWeights.length === 0) {
    return {
      sectorId: null,
      selectedWeight: 0,
      totalWeight: 0,
      rngValue: 0,
    };
  }

  const boundedRng = clamp(toFiniteNumber(rngValue, 0), 0, 0.999999999999);
  const totalWeight = normalizedWeights.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    const fallback = normalizedWeights[0];
    return {
      sectorId: fallback.sectorId,
      selectedWeight: fallback.weight,
      totalWeight,
      rngValue: boundedRng,
    };
  }

  const target = boundedRng * totalWeight;
  let cumulative = 0;

  for (const entry of normalizedWeights) {
    cumulative += entry.weight;
    if (target <= cumulative) {
      return {
        sectorId: entry.sectorId,
        selectedWeight: entry.weight,
        totalWeight,
        rngValue: boundedRng,
      };
    }
  }

  const fallback = normalizedWeights[normalizedWeights.length - 1];
  return {
    sectorId: fallback.sectorId,
    selectedWeight: fallback.weight,
    totalWeight,
    rngValue: boundedRng,
  };
}

export function planSpawnSector({
  directorState = null,
  sectorIds = [],
  playerSectorId,
  sectorEnemyCounts = [],
  heatState = {},
  activeEnemyCount = 0,
  maxActiveEnemies = 1,
  perSectorSoftCap = DEFAULT_PER_SECTOR_SOFT_CAP,
  rngValue = 0,
  spawnRngState = 0,
  spawnCooldown = 0,
} = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  const baseState = directorState || createSpawnDirectorState({ sectorIds: normalizedSectorIds });

  const normalizedCounts = normalizeCountEntries({
    sectorIds: normalizedSectorIds,
    sectorEnemyCounts,
  });

  const weights = computeSectorWeights({
    sectorIds: normalizedSectorIds,
    playerSectorId,
    sectorEnemyCounts: normalizedCounts,
    heatState,
    activeEnemyCount,
    maxActiveEnemies,
    perSectorSoftCap,
  });

  const selection = chooseWeightedSector({ sectorWeights: weights, rngValue });
  const normalizedSpawnRngState = Math.floor(toFiniteNumber(spawnRngState, 0)) >>> 0;

  return {
    selectedSectorId: selection.sectorId,
    selectedWeight: selection.selectedWeight,
    totalWeight: selection.totalWeight,
    rngValue: selection.rngValue,
    directorState: {
      eventSeq: Math.max(0, Math.floor(toFiniteNumber(baseState?.eventSeq, 0))) + 1,
      sectorWeights: weights,
      sectorEnemyCounts: normalizedCounts,
      lastSpawnSectorId: selection.sectorId,
      spawnCooldown: Math.max(0, toFiniteNumber(spawnCooldown, baseState?.spawnCooldown ?? 0)),
      spawnRngState: normalizedSpawnRngState,
    },
  };
}

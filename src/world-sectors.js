export const HUB_SECTOR_ID = "hub";

const RAW_WORLD_SECTORS = [
  {
    id: "hub",
    kind: "hub",
    order: 0,
    bounds: { minX: -8, maxX: 8, minY: -6, maxY: 6 },
    neighbors: ["north", "east", "south"],
    lanes: [
      {
        id: "hub-north-main",
        toSectorId: "north",
        kind: "main",
        width: 4,
        entry: { x: 0, y: -6 },
        exit: { x: 0, y: -6.01 },
      },
      {
        id: "hub-east-main",
        toSectorId: "east",
        kind: "main",
        width: 4,
        entry: { x: 8, y: 0 },
        exit: { x: 8.01, y: 0 },
      },
      {
        id: "hub-south-main",
        toSectorId: "south",
        kind: "main",
        width: 4,
        entry: { x: 0, y: 6 },
        exit: { x: 0, y: 6.01 },
      },
    ],
  },
  {
    id: "north",
    kind: "outer",
    order: 1,
    bounds: { minX: -8, maxX: 8, minY: -16, maxY: -6 },
    neighbors: ["hub", "east", "south"],
    lanes: [
      {
        id: "north-hub-main",
        toSectorId: "hub",
        kind: "main",
        width: 4,
        entry: { x: 0, y: -6.01 },
        exit: { x: 0, y: -6 },
      },
      {
        id: "north-east-ring",
        toSectorId: "east",
        kind: "bypass",
        width: 2,
        entry: { x: 7.5, y: -7 },
        exit: { x: 8.01, y: -6.5 },
      },
      {
        id: "north-south-ring",
        toSectorId: "south",
        kind: "bypass",
        width: 2,
        entry: { x: -7.5, y: -7 },
        exit: { x: -7.5, y: 6.01 },
      },
    ],
  },
  {
    id: "east",
    kind: "outer",
    order: 2,
    bounds: { minX: 8, maxX: 18, minY: -6, maxY: 6 },
    neighbors: ["hub", "south", "north"],
    lanes: [
      {
        id: "east-hub-main",
        toSectorId: "hub",
        kind: "main",
        width: 4,
        entry: { x: 8.01, y: 0 },
        exit: { x: 8, y: 0 },
      },
      {
        id: "east-south-ring",
        toSectorId: "south",
        kind: "bypass",
        width: 2,
        entry: { x: 8.5, y: 5.5 },
        exit: { x: 7.5, y: 6.01 },
      },
      {
        id: "east-north-ring",
        toSectorId: "north",
        kind: "bypass",
        width: 2,
        entry: { x: 8.5, y: -5.5 },
        exit: { x: 7.5, y: -6.01 },
      },
    ],
  },
  {
    id: "south",
    kind: "outer",
    order: 3,
    bounds: { minX: -8, maxX: 8, minY: 6, maxY: 16 },
    neighbors: ["hub", "north", "east"],
    lanes: [
      {
        id: "south-hub-main",
        toSectorId: "hub",
        kind: "main",
        width: 4,
        entry: { x: 0, y: 6.01 },
        exit: { x: 0, y: 6 },
      },
      {
        id: "south-east-ring",
        toSectorId: "east",
        kind: "bypass",
        width: 2,
        entry: { x: 7.5, y: 6.5 },
        exit: { x: 8.01, y: 5.5 },
      },
      {
        id: "south-north-ring",
        toSectorId: "north",
        kind: "bypass",
        width: 2,
        entry: { x: -7.5, y: 6.5 },
        exit: { x: -7.5, y: -6.01 },
      },
    ],
  },
];

function freezeDeep(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      freezeDeep(entry);
    }
    return Object.freeze(value);
  }

  for (const entry of Object.values(value)) {
    freezeDeep(entry);
  }
  return Object.freeze(value);
}

export const WORLD_SECTORS = freezeDeep(RAW_WORLD_SECTORS.map((sector) => ({ ...sector })));
export const WORLD_SECTOR_IDS = Object.freeze(WORLD_SECTORS.map((sector) => sector.id));

const SECTOR_BY_ID = new Map(WORLD_SECTORS.map((sector) => [sector.id, sector]));

function normalizeSectorId(sectorId) {
  if (typeof sectorId === "string" && SECTOR_BY_ID.has(sectorId)) {
    return sectorId;
  }
  return HUB_SECTOR_ID;
}

function isInsideBounds(bounds, x, y) {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function normalizeWorldTraversalState(worldTraversalState) {
  const currentSectorId = normalizeSectorId(worldTraversalState?.currentSectorId);
  const transitionSeq = Math.max(0, Math.floor(Number(worldTraversalState?.transitionSeq) || 0));

  const visitedSectorIds = [];
  if (Array.isArray(worldTraversalState?.visitedSectorIds)) {
    for (const sectorId of worldTraversalState.visitedSectorIds) {
      if (typeof sectorId !== "string" || !SECTOR_BY_ID.has(sectorId)) {
        continue;
      }
      if (!visitedSectorIds.includes(sectorId)) {
        visitedSectorIds.push(sectorId);
      }
    }
  }

  if (!visitedSectorIds.includes(currentSectorId)) {
    visitedSectorIds.push(currentSectorId);
  }

  return {
    currentSectorId,
    visitedSectorIds,
    transitionSeq,
  };
}

export function getSectorById(sectorId) {
  if (typeof sectorId !== "string") {
    return null;
  }
  return SECTOR_BY_ID.get(sectorId) || null;
}

export function getConnectedSectorIds(startSectorId = HUB_SECTOR_ID) {
  const startId = normalizeSectorId(startSectorId);
  const visited = new Set([startId]);
  const queue = [startId];
  const connected = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    connected.push(currentId);

    const currentSector = SECTOR_BY_ID.get(currentId);
    if (!currentSector) {
      continue;
    }

    for (const neighborId of currentSector.neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }
      visited.add(neighborId);
      queue.push(neighborId);
    }
  }

  return connected;
}

export function isSectorConnected(fromSectorId, toSectorId) {
  const startId = normalizeSectorId(fromSectorId);
  const targetId = normalizeSectorId(toSectorId);
  return getConnectedSectorIds(startId).includes(targetId);
}

export function canTraverseBetween(fromSectorId, toSectorId) {
  const fromId = normalizeSectorId(fromSectorId);
  const toId = normalizeSectorId(toSectorId);
  if (fromId === toId) {
    return true;
  }

  const fromSector = SECTOR_BY_ID.get(fromId);
  return Boolean(fromSector && fromSector.neighbors.includes(toId));
}

export function resolveSectorIdForPosition(position, fallbackSectorId = HUB_SECTOR_ID) {
  const x = Number(position?.x);
  const y = Number(position?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return normalizeSectorId(fallbackSectorId);
  }

  for (const sector of WORLD_SECTORS) {
    if (isInsideBounds(sector.bounds, x, y)) {
      return sector.id;
    }
  }

  return normalizeSectorId(fallbackSectorId);
}

export function createWorldTraversalState(initialSectorId = HUB_SECTOR_ID) {
  const currentSectorId = normalizeSectorId(initialSectorId);
  return {
    currentSectorId,
    visitedSectorIds: [currentSectorId],
    transitionSeq: 0,
  };
}

export function advanceWorldTraversalState(worldTraversalState, nextSectorId) {
  const normalizedState = normalizeWorldTraversalState(worldTraversalState);
  const resolvedNextSectorId = normalizeSectorId(nextSectorId);

  if (resolvedNextSectorId === normalizedState.currentSectorId) {
    return normalizedState;
  }

  if (!canTraverseBetween(normalizedState.currentSectorId, resolvedNextSectorId)) {
    return normalizedState;
  }

  const visitedSectorIds = normalizedState.visitedSectorIds.includes(resolvedNextSectorId)
    ? normalizedState.visitedSectorIds
    : [...normalizedState.visitedSectorIds, resolvedNextSectorId];

  return {
    currentSectorId: resolvedNextSectorId,
    visitedSectorIds,
    transitionSeq: normalizedState.transitionSeq + 1,
  };
}

export function buildWorldTraversalSummary(worldTraversalState) {
  const normalized = normalizeWorldTraversalState(worldTraversalState);
  return {
    currentSectorId: normalized.currentSectorId,
    visitedSectorIds: [...normalized.visitedSectorIds],
    visitedCount: normalized.visitedSectorIds.length,
    transitionSeq: normalized.transitionSeq,
  };
}

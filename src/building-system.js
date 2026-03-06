import {
  BUILDING_ARCHETYPE_IDS,
  BUILDING_ARCHETYPES,
  BUILDING_LAYOUT_PRESETS,
} from "./building-catalog.js";
import { WORLD_SECTOR_IDS } from "./world-sectors.js";

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

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeQuarterTurns(value) {
  const rounded = Math.floor(toFiniteNumber(value, 0));
  const normalized = rounded % 4;
  return normalized < 0 ? normalized + 4 : normalized;
}

function rotatePoint(point, quarterTurns) {
  const turns = normalizeQuarterTurns(quarterTurns);
  if (turns === 0) {
    return { x: point.x, y: point.y };
  }
  if (turns === 1) {
    return { x: -point.y, y: point.x };
  }
  if (turns === 2) {
    return { x: -point.x, y: -point.y };
  }
  return { x: point.y, y: -point.x };
}

function rotateBounds(bounds, quarterTurns) {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ].map((point) => rotatePoint(point, quarterTurns));

  return {
    minX: Math.min(...corners.map((point) => point.x)),
    maxX: Math.max(...corners.map((point) => point.x)),
    minY: Math.min(...corners.map((point) => point.y)),
    maxY: Math.max(...corners.map((point) => point.y)),
  };
}

function offsetBounds(bounds, offsetX, offsetY) {
  return {
    minX: Number((bounds.minX + offsetX).toFixed(3)),
    maxX: Number((bounds.maxX + offsetX).toFixed(3)),
    minY: Number((bounds.minY + offsetY).toFixed(3)),
    maxY: Number((bounds.maxY + offsetY).toFixed(3)),
  };
}

function mergeBounds(boundsList) {
  return boundsList.reduce(
    (accumulator, bounds) => ({
      minX: Math.min(accumulator.minX, bounds.minX),
      maxX: Math.max(accumulator.maxX, bounds.maxX),
      minY: Math.min(accumulator.minY, bounds.minY),
      maxY: Math.max(accumulator.maxY, bounds.maxY),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function normalizeSectorIds(sectorIds = WORLD_SECTOR_IDS) {
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

function isPointInsideBounds(point, bounds) {
  const x = toFiniteNumber(point?.x, Number.NaN);
  const y = toFiniteNumber(point?.y, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function expandBounds(bounds, padding = 0) {
  const inset = Math.max(0, toFiniteNumber(padding, 0));
  return {
    minX: bounds.minX - inset,
    maxX: bounds.maxX + inset,
    minY: bounds.minY - inset,
    maxY: bounds.maxY + inset,
  };
}

function buildCollider(building, colliderBounds, colliderIndex) {
  return freezeDeep({
    id: `${building.id}#${colliderIndex}`,
    buildingId: building.id,
    sectorId: building.sectorId,
    archetypeId: building.archetypeId,
    role: building.role,
    bounds: colliderBounds,
  });
}

function buildAnchorMap(anchors = {}, position, quarterTurns) {
  const resolvedEntries = Object.entries(anchors).map(([key, point]) => {
    const rotated = rotatePoint(point, quarterTurns);
    return [
      key,
      freezeDeep({
        x: Number((rotated.x + position.x).toFixed(3)),
        y: Number((rotated.y + position.y).toFixed(3)),
      }),
    ];
  });
  return freezeDeep(Object.fromEntries(resolvedEntries));
}

function createBuildingInstance(sectorId, preset, order) {
  const archetype = BUILDING_ARCHETYPES[preset?.archetypeId];
  if (!archetype) {
    return null;
  }

  const position = {
    x: Number(toFiniteNumber(preset?.x, 0).toFixed(3)),
    y: Number(toFiniteNumber(preset?.y, 0).toFixed(3)),
  };
  const rotationQuarterTurns = normalizeQuarterTurns(preset?.rotationQuarterTurns);
  const colliders = archetype.colliders.map((collider, index) =>
    buildCollider(
      {
        id: preset.id,
        sectorId,
        archetypeId: archetype.id,
        role: archetype.role,
      },
      offsetBounds(rotateBounds(collider.bounds, rotationQuarterTurns), position.x, position.y),
      index,
    ),
  );
  const bounds = mergeBounds(colliders.map((collider) => collider.bounds));

  return freezeDeep({
    id: preset.id,
    order,
    sectorId,
    archetypeId: archetype.id,
    role: archetype.role,
    shape: archetype.shape,
    position,
    rotationQuarterTurns,
    visual: archetype.visual,
    anchors: buildAnchorMap(archetype.anchors, position, rotationQuarterTurns),
    bounds,
    colliders,
  });
}

export function createWorldBuildings({
  sectorIds = WORLD_SECTOR_IDS,
  layoutPresets = BUILDING_LAYOUT_PRESETS,
} = {}) {
  const normalizedSectorIds = normalizeSectorIds(sectorIds);
  const buildings = [];

  for (const sectorId of normalizedSectorIds) {
    const presets = Array.isArray(layoutPresets?.[sectorId]) ? layoutPresets[sectorId] : [];
    for (const preset of presets) {
      const building = createBuildingInstance(sectorId, preset, buildings.length);
      if (building) {
        buildings.push(building);
      }
    }
  }

  return freezeDeep(buildings);
}

export const WORLD_BUILDINGS = createWorldBuildings();

export function getBuildingsForSector(buildings = WORLD_BUILDINGS, sectorId) {
  if (typeof sectorId !== "string") {
    return Array.isArray(buildings) ? [...buildings] : [];
  }
  return (Array.isArray(buildings) ? buildings : []).filter((building) => building.sectorId === sectorId);
}

export function getBuildingColliders(buildings = WORLD_BUILDINGS, { sectorId = null } = {}) {
  return getBuildingsForSector(buildings, sectorId).flatMap((building) => building.colliders);
}

export function isPointBlockedByBuildings(point, { buildings = WORLD_BUILDINGS, sectorId = null, padding = 0 } = {}) {
  const colliders = getBuildingColliders(buildings, { sectorId });
  return colliders.some((collider) => isPointInsideBounds(point, expandBounds(collider.bounds, padding)));
}

export function filterSpawnCandidates({
  sectorId,
  buildings = WORLD_BUILDINGS,
  candidates = [],
  padding = 0.75,
} = {}) {
  return candidates.filter(
    (candidate) => !isPointBlockedByBuildings(candidate, { buildings, sectorId, padding }),
  );
}

export function summarizeBuildingsForSnapshot(buildings = WORLD_BUILDINGS) {
  return (Array.isArray(buildings) ? buildings : []).map((building) => ({
    id: building.id,
    sectorId: building.sectorId,
    archetypeId: building.archetypeId,
    role: building.role,
    shape: building.shape,
    colliderCount: Array.isArray(building.colliders) ? building.colliders.length : 0,
    bounds: {
      minX: Number(toFiniteNumber(building.bounds?.minX, 0).toFixed(3)),
      maxX: Number(toFiniteNumber(building.bounds?.maxX, 0).toFixed(3)),
      minY: Number(toFiniteNumber(building.bounds?.minY, 0).toFixed(3)),
      maxY: Number(toFiniteNumber(building.bounds?.maxY, 0).toFixed(3)),
    },
  }));
}

export function buildWorldTacticsState({
  currentSectorId,
  playerPosition = { x: 0, y: 0 },
  buildings = WORLD_BUILDINGS,
  sectorEnemyCounts = [],
} = {}) {
  const sectorBuildings = getBuildingsForSector(buildings, currentSectorId);
  const roleCounts = BUILDING_ARCHETYPE_IDS.map((role) => ({
    role,
    count: sectorBuildings.filter((building) => building.role === role).length,
  }));
  const enemyCountEntry = Array.isArray(sectorEnemyCounts)
    ? sectorEnemyCounts.find((entry) => entry?.sectorId === currentSectorId)
    : null;
  const sectorEnemyCount = Math.max(0, Math.floor(toFiniteNumber(enemyCountEntry?.count, 0)));

  const softCoverBuildings = sectorBuildings.filter((building) => building.role === "soft-cover");
  const retreatPocketActive = softCoverBuildings.some((building) => {
    const pocket = building.anchors?.retreatPocket;
    if (!pocket) {
      return false;
    }
    return Math.hypot(playerPosition.x - pocket.x, playerPosition.y - pocket.y) <= 1.45;
  });

  const lineBreakAvailable =
    roleCounts.find((entry) => entry.role === "blocker")?.count > 0 ||
    roleCounts.find((entry) => entry.role === "soft-cover")?.count > 0;
  const funnelAvailable = roleCounts.find((entry) => entry.role === "funnel")?.count > 0;
  const retreatPocketAvailable = softCoverBuildings.length > 0;

  let cueLabel = "OPEN";
  if (retreatPocketActive) {
    cueLabel = "POCKET";
  } else if (funnelAvailable) {
    cueLabel = "FUNNEL";
  } else if (lineBreakAvailable) {
    cueLabel = "BREAK";
  }

  return freezeDeep({
    currentSectorId: typeof currentSectorId === "string" ? currentSectorId : WORLD_SECTOR_IDS[0] ?? "hub",
    buildingIds: sectorBuildings.map((building) => building.id),
    roleCounts,
    sectorEnemyCount,
    lineBreakAvailable,
    funnelAvailable,
    retreatPocketAvailable,
    retreatPocketActive,
    cueLabel,
  });
}

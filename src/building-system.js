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

function clamp(value, min, max) {
  if (min > max) {
    return (min + max) / 2;
  }
  return Math.min(max, Math.max(min, value));
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

function segmentIntersectsBounds(fromPoint, toPoint, bounds) {
  if (isPointInsideBounds(fromPoint, bounds) || isPointInsideBounds(toPoint, bounds)) {
    return true;
  }

  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;
  let minT = 0;
  let maxT = 1;

  const axes = [
    { start: fromPoint.x, delta: deltaX, min: bounds.minX, max: bounds.maxX },
    { start: fromPoint.y, delta: deltaY, min: bounds.minY, max: bounds.maxY },
  ];

  for (const axis of axes) {
    if (Math.abs(axis.delta) < 1e-6) {
      if (axis.start < axis.min || axis.start > axis.max) {
        return false;
      }
      continue;
    }

    const t1 = (axis.min - axis.start) / axis.delta;
    const t2 = (axis.max - axis.start) / axis.delta;
    const entry = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    minT = Math.max(minT, entry);
    maxT = Math.min(maxT, exit);

    if (minT > maxT) {
      return false;
    }
  }

  return maxT >= 0 && minT <= 1;
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

function normalizeBuildingColliders(buildingColliders = []) {
  return Array.isArray(buildingColliders)
    ? buildingColliders.filter(
        (collider) =>
          collider?.bounds &&
          Number.isFinite(collider.bounds.minX) &&
          Number.isFinite(collider.bounds.maxX) &&
          Number.isFinite(collider.bounds.minY) &&
          Number.isFinite(collider.bounds.maxY),
      )
    : [];
}

function normalizeVector(vector, fallback = { x: 0, y: 0 }) {
  const x = toFiniteNumber(vector?.x, fallback.x);
  const y = toFiniteNumber(vector?.y, fallback.y);
  const length = Math.hypot(x, y);
  if (length <= 1e-6) {
    return { x: fallback.x, y: fallback.y };
  }
  return { x: x / length, y: y / length };
}

function scaleVector(vector, scale) {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
  };
}

function findBlockingCollider(fromPoint, toPoint, colliders, padding = 0) {
  for (const collider of colliders) {
    const expanded = expandBounds(collider.bounds, padding);
    if (segmentIntersectsBounds(fromPoint, toPoint, expanded)) {
      return collider;
    }
  }
  return null;
}

function choosePreferredSteerSign(position, desired, blockingCollider, steerSign, blockedFrames) {
  if (blockedFrames > 0 && (steerSign === 1 || steerSign === -1)) {
    return steerSign;
  }

  if (!blockingCollider) {
    return steerSign === -1 ? -1 : 1;
  }

  const center = {
    x: (blockingCollider.bounds.minX + blockingCollider.bounds.maxX) / 2,
    y: (blockingCollider.bounds.minY + blockingCollider.bounds.maxY) / 2,
  };
  const perpendicular = { x: -desired.y, y: desired.x };
  const side = (center.x - position.x) * perpendicular.x + (center.y - position.y) * perpendicular.y;
  return side >= 0 ? -1 : 1;
}

function findContainingCollider(point, colliders, padding = 0) {
  for (const collider of colliders) {
    if (isPointInsideBounds(point, expandBounds(collider.bounds, padding))) {
      return collider;
    }
  }
  return null;
}

function getDetourGuidePoint(currentPosition, desired, expandedBounds, steerSign) {
  const clearance = 0.35;
  const dominantAxis = Math.abs(desired.x) >= Math.abs(desired.y) ? "x" : "y";

  if (dominantAxis === "x") {
    const clearanceY = steerSign > 0 ? expandedBounds.maxY + clearance : expandedBounds.minY - clearance;
    const forwardX = desired.x >= 0 ? expandedBounds.maxX + clearance : expandedBounds.minX - clearance;
    const alreadyCleared = steerSign > 0
      ? currentPosition.y >= expandedBounds.maxY + 0.05
      : currentPosition.y <= expandedBounds.minY - 0.05;

    return alreadyCleared
      ? { x: forwardX, y: clearanceY }
      : { x: currentPosition.x, y: clearanceY };
  }

  const clearanceX = steerSign > 0 ? expandedBounds.maxX + clearance : expandedBounds.minX - clearance;
  const forwardY = desired.y >= 0 ? expandedBounds.maxY + clearance : expandedBounds.minY - clearance;
  const alreadyCleared = steerSign > 0
    ? currentPosition.x >= expandedBounds.maxX + 0.05
    : currentPosition.x <= expandedBounds.minX - 0.05;

  return alreadyCleared
    ? { x: clearanceX, y: forwardY }
    : { x: clearanceX, y: currentPosition.y };
}

function getEscapeTarget(currentPosition, expandedBounds, desired) {
  const offset = 0.05;
  const exits = [
    {
      mode: "escape-left",
      target: {
        x: expandedBounds.minX - offset,
        y: clamp(currentPosition.y, expandedBounds.minY - offset, expandedBounds.maxY + offset),
      },
    },
    {
      mode: "escape-right",
      target: {
        x: expandedBounds.maxX + offset,
        y: clamp(currentPosition.y, expandedBounds.minY - offset, expandedBounds.maxY + offset),
      },
    },
    {
      mode: "escape-up",
      target: {
        x: clamp(currentPosition.x, expandedBounds.minX - offset, expandedBounds.maxX + offset),
        y: expandedBounds.minY - offset,
      },
    },
    {
      mode: "escape-down",
      target: {
        x: clamp(currentPosition.x, expandedBounds.minX - offset, expandedBounds.maxX + offset),
        y: expandedBounds.maxY + offset,
      },
    },
  ];

  exits.sort((left, right) => {
    const leftVector = {
      x: left.target.x - currentPosition.x,
      y: left.target.y - currentPosition.y,
    };
    const rightVector = {
      x: right.target.x - currentPosition.x,
      y: right.target.y - currentPosition.y,
    };
    const leftDistance = Math.hypot(leftVector.x, leftVector.y);
    const rightDistance = Math.hypot(rightVector.x, rightVector.y);
    if (Math.abs(leftDistance - rightDistance) > 1e-6) {
      return leftDistance - rightDistance;
    }

    const leftAlignment = leftDistance > 1e-6
      ? (leftVector.x * desired.x + leftVector.y * desired.y) / leftDistance
      : Number.NEGATIVE_INFINITY;
    const rightAlignment = rightDistance > 1e-6
      ? (rightVector.x * desired.x + rightVector.y * desired.y) / rightDistance
      : Number.NEGATIVE_INFINITY;
    return rightAlignment - leftAlignment;
  });

  return exits[0] ?? null;
}

function buildSteeringCandidates(currentPosition, desired, blockingCollider, preferredSign, padding) {
  const normalizedDesired = normalizeVector(desired, { x: 1, y: 0 });
  const normalizedSign = preferredSign === -1 ? -1 : 1;
  const candidates = [];

  if (blockingCollider) {
    const expandedBounds = expandBounds(blockingCollider.bounds, padding + 0.15);
    for (const sign of [normalizedSign, -normalizedSign]) {
      const guidePoint = getDetourGuidePoint(currentPosition, normalizedDesired, expandedBounds, sign);
      candidates.push({
        direction: normalizeVector({
          x: guidePoint.x - currentPosition.x,
          y: guidePoint.y - currentPosition.y,
        }, normalizedDesired),
        mode: sign > 0 ? "detour-left" : "detour-right",
        sign,
      });
    }

    const perpendicular = normalizeVector({ x: -normalizedDesired.y, y: normalizedDesired.x }, { x: 0, y: 1 });
    candidates.push({
      direction: normalizeVector(scaleVector(perpendicular, normalizedSign), normalizedDesired),
      mode: normalizedSign > 0 ? "unstuck-left" : "unstuck-right",
      sign: normalizedSign,
    });
  }

  candidates.push({
    direction: normalizedDesired,
    mode: "direct",
    sign: normalizedSign,
  });

  return candidates;
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

export function planBuildingAwareSteering({
  position = { x: 0, y: 0 },
  targetPosition = { x: 0, y: 0 },
  speed = 0,
  dt = 1 / 60,
  buildingColliders = [],
  blockedFrames = 0,
  steerSign = 1,
  padding = 0.7,
} = {}) {
  const currentPosition = {
    x: toFiniteNumber(position?.x, 0),
    y: toFiniteNumber(position?.y, 0),
  };
  const normalizedSpeed = Math.max(0, toFiniteNumber(speed, 0));
  const normalizedDt = Math.max(1 / 240, toFiniteNumber(dt, 1 / 60));
  const toTarget = {
    x: toFiniteNumber(targetPosition?.x, 0) - currentPosition.x,
    y: toFiniteNumber(targetPosition?.y, 0) - currentPosition.y,
  };
  const distance = Math.hypot(toTarget.x, toTarget.y);

  if (distance <= 1e-6 || normalizedSpeed <= 0) {
    return freezeDeep({
      velocity: { x: 0, y: 0 },
      blockedFrames: 0,
      steerSign: steerSign === -1 ? -1 : 1,
      mode: "hold",
    });
  }

  const colliders = normalizeBuildingColliders(buildingColliders);
  const desired = normalizeVector(toTarget, { x: 1, y: 0 });
  const containingCollider = findContainingCollider(currentPosition, colliders, padding);

  if (containingCollider) {
    const expandedBounds = expandBounds(containingCollider.bounds, padding);
    const escapeTarget = getEscapeTarget(currentPosition, expandedBounds, desired);

    if (escapeTarget) {
      const escapeVector = {
        x: escapeTarget.target.x - currentPosition.x,
        y: escapeTarget.target.y - currentPosition.y,
      };
      const escapeDistance = Math.hypot(escapeVector.x, escapeVector.y);
      const escapeDirection = normalizeVector(escapeVector, { x: -desired.x, y: -desired.y });
      const escapeSpeed = Math.max(normalizedSpeed, (escapeDistance + 0.01) / normalizedDt);

      return freezeDeep({
        velocity: {
          x: escapeDirection.x * escapeSpeed,
          y: escapeDirection.y * escapeSpeed,
        },
        blockedFrames: blockedFrames + 1,
        steerSign: Math.sign(escapeDirection.x * -desired.y + escapeDirection.y * desired.x) || steerSign || 1,
        mode: escapeTarget.mode,
      });
    }
  }

  const directPoint = {
    x: currentPosition.x + desired.x * normalizedSpeed * normalizedDt,
    y: currentPosition.y + desired.y * normalizedSpeed * normalizedDt,
  };
  const blockingCollider = findBlockingCollider(currentPosition, directPoint, colliders, padding);
  if (!blockingCollider) {
    return freezeDeep({
      velocity: {
        x: desired.x * normalizedSpeed,
        y: desired.y * normalizedSpeed,
      },
      blockedFrames: 0,
      steerSign: steerSign === -1 ? -1 : 1,
      mode: "direct",
    });
  }

  const preferredSign = choosePreferredSteerSign(currentPosition, desired, blockingCollider, steerSign, blockedFrames);
  const candidates = buildSteeringCandidates(currentPosition, desired, blockingCollider, preferredSign, padding);

  for (const candidate of candidates) {
    const nextPoint = {
      x: currentPosition.x + candidate.direction.x * normalizedSpeed * normalizedDt,
      y: currentPosition.y + candidate.direction.y * normalizedSpeed * normalizedDt,
    };
    if (findBlockingCollider(currentPosition, nextPoint, colliders, padding)) {
      continue;
    }

    return freezeDeep({
      velocity: {
        x: candidate.direction.x * normalizedSpeed,
        y: candidate.direction.y * normalizedSpeed,
      },
      blockedFrames: candidate.mode === "direct" ? 0 : blockedFrames + 1,
      steerSign: candidate.sign,
      mode: candidate.mode,
    });
  }

  const fallbackDirection = normalizeVector(
    {
      x: -desired.y * preferredSign,
      y: desired.x * preferredSign,
    },
    desired,
  );

  return freezeDeep({
    velocity: {
      x: fallbackDirection.x * normalizedSpeed * 0.65,
      y: fallbackDirection.y * normalizedSpeed * 0.65,
    },
    blockedFrames: blockedFrames + 1,
    steerSign: preferredSign,
    mode: preferredSign > 0 ? "unstuck-left" : "unstuck-right",
  });
}

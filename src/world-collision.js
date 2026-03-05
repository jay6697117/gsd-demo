import { WORLD_SECTORS, canTraverseBetween, getSectorById } from "./world-sectors.js";

const BOUNDARY_EPSILON = 1e-4;
const LANE_SIDE_TOLERANCE = 0.7;
const LANE_PASS_TOLERANCE = 0.2;

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

function normalizePoint(point, fallback = { x: 0, y: 0 }) {
  return {
    x: toFiniteNumber(point?.x, fallback.x),
    y: toFiniteNumber(point?.y, fallback.y),
  };
}

function isInsideBounds(bounds, point, epsilon = BOUNDARY_EPSILON) {
  return (
    point.x >= bounds.minX - epsilon &&
    point.x <= bounds.maxX + epsilon &&
    point.y >= bounds.minY - epsilon &&
    point.y <= bounds.maxY + epsilon
  );
}

function clampPointToBounds(point, bounds, epsilon = BOUNDARY_EPSILON) {
  return {
    x: clamp(point.x, bounds.minX + epsilon, bounds.maxX - epsilon),
    y: clamp(point.y, bounds.minY + epsilon, bounds.maxY - epsilon),
  };
}

function findSectorIdForPoint(point) {
  for (const sector of WORLD_SECTORS) {
    if (isInsideBounds(sector.bounds, point)) {
      return sector.id;
    }
  }
  return null;
}

function inferActiveSectorId(currentSectorId, fromPoint, toPoint) {
  if (typeof currentSectorId === "string" && getSectorById(currentSectorId)) {
    return currentSectorId;
  }

  return findSectorIdForPoint(fromPoint) ?? findSectorIdForPoint(toPoint);
}

function inferLaneGate(fromSector, lane) {
  const bounds = fromSector.bounds;
  const points = [lane.entry, lane.exit].map((point) => normalizePoint(point, { x: 0, y: 0 }));

  const candidates = [
    { side: "left", boundary: bounds.minX, coordKey: "x", orthKey: "y" },
    { side: "right", boundary: bounds.maxX, coordKey: "x", orthKey: "y" },
    { side: "top", boundary: bounds.minY, coordKey: "y", orthKey: "x" },
    { side: "bottom", boundary: bounds.maxY, coordKey: "y", orthKey: "x" },
  ];

  let best = null;

  for (const candidate of candidates) {
    for (const point of points) {
      const distance = Math.abs(point[candidate.coordKey] - candidate.boundary);
      if (!best || distance < best.distance) {
        best = {
          side: candidate.side,
          distance,
          center: point[candidate.orthKey],
        };
      }
    }
  }

  if (!best || best.distance > LANE_SIDE_TOLERANCE) {
    return null;
  }

  return {
    side: best.side,
    center: best.center,
    halfWidth: Math.max(0.4, toFiniteNumber(lane.width, 1)) / 2,
  };
}

function computeBoundaryCrossCoordinate(fromPoint, toPoint, bounds, side) {
  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;

  if (side === "left" || side === "right") {
    if (Math.abs(deltaX) < BOUNDARY_EPSILON) {
      return null;
    }

    const boundaryX = side === "left" ? bounds.minX : bounds.maxX;
    const t = (boundaryX - fromPoint.x) / deltaX;

    if (t < -BOUNDARY_EPSILON || t > 1 + BOUNDARY_EPSILON) {
      return null;
    }

    if (side === "left" && toPoint.x >= boundaryX - BOUNDARY_EPSILON) {
      return null;
    }

    if (side === "right" && toPoint.x <= boundaryX + BOUNDARY_EPSILON) {
      return null;
    }

    return fromPoint.y + deltaY * clamp(t, 0, 1);
  }

  if (Math.abs(deltaY) < BOUNDARY_EPSILON) {
    return null;
  }

  const boundaryY = side === "top" ? bounds.minY : bounds.maxY;
  const t = (boundaryY - fromPoint.y) / deltaY;

  if (t < -BOUNDARY_EPSILON || t > 1 + BOUNDARY_EPSILON) {
    return null;
  }

  if (side === "top" && toPoint.y >= boundaryY - BOUNDARY_EPSILON) {
    return null;
  }

  if (side === "bottom" && toPoint.y <= boundaryY + BOUNDARY_EPSILON) {
    return null;
  }

  return fromPoint.x + deltaX * clamp(t, 0, 1);
}

function canPassLane(fromSector, toSectorId, fromPoint, toPoint) {
  const candidateLanes = fromSector.lanes.filter((lane) => lane.toSectorId === toSectorId);

  for (const lane of candidateLanes) {
    const gate = inferLaneGate(fromSector, lane);
    if (!gate) {
      continue;
    }

    const crossCoordinate = computeBoundaryCrossCoordinate(fromPoint, toPoint, fromSector.bounds, gate.side);
    if (!Number.isFinite(crossCoordinate)) {
      continue;
    }

    const laneHalfWidthWithTolerance = gate.halfWidth + LANE_PASS_TOLERANCE;
    if (Math.abs(crossCoordinate - gate.center) <= laneHalfWidthWithTolerance) {
      return true;
    }
  }

  return false;
}

function tryResolveWithinSectors(fromPoint, toPoint, activeSectorId) {
  const fromSector = getSectorById(activeSectorId);
  if (!fromSector) {
    return null;
  }

  if (isInsideBounds(fromSector.bounds, toPoint)) {
    return {
      point: toPoint,
      sectorId: activeSectorId,
      resolution: "free",
    };
  }

  for (const toSectorId of fromSector.neighbors) {
    if (!canTraverseBetween(activeSectorId, toSectorId)) {
      continue;
    }

    const toSector = getSectorById(toSectorId);
    if (!toSector) {
      continue;
    }

    if (!canPassLane(fromSector, toSectorId, fromPoint, toPoint)) {
      continue;
    }

    return {
      point: isInsideBounds(toSector.bounds, toPoint) ? toPoint : clampPointToBounds(toPoint, toSector.bounds),
      sectorId: toSectorId,
      resolution: "lane",
    };
  }

  return null;
}

function finalizeResolution(fromPoint, resolved, dt, activeSectorId) {
  const stepTime = Math.max(toFiniteNumber(dt, 1), BOUNDARY_EPSILON);
  return {
    x: resolved.point.x,
    y: resolved.point.y,
    vx: (resolved.point.x - fromPoint.x) / stepTime,
    vy: (resolved.point.y - fromPoint.y) / stepTime,
    sectorId: resolved.sectorId,
    transitioned: resolved.sectorId !== activeSectorId,
    blocked: resolved.resolution === "rebound" || resolved.resolution === "fallback-clamp",
    resolution: resolved.resolution,
  };
}

export function resolveBoundaryMovement(options = {}) {
  const dt = toFiniteNumber(options.dt, 1);
  const fromPoint = normalizePoint(options.position, { x: 0, y: 0 });
  const velocity = normalizePoint(options.velocity, { x: 0, y: 0 });
  const toPoint = {
    x: fromPoint.x + velocity.x * dt,
    y: fromPoint.y + velocity.y * dt,
  };

  const activeSectorId = inferActiveSectorId(options.currentSectorId, fromPoint, toPoint);
  if (!activeSectorId) {
    const fallbackBounds = options.fallbackBounds;
    if (!fallbackBounds) {
      return {
        x: toPoint.x,
        y: toPoint.y,
        vx: velocity.x,
        vy: velocity.y,
        sectorId: null,
        transitioned: false,
        blocked: false,
        resolution: "free",
      };
    }

    const fallbackPoint = clampPointToBounds(toPoint, fallbackBounds, BOUNDARY_EPSILON);
    return finalizeResolution(
      fromPoint,
      {
        point: fallbackPoint,
        sectorId: findSectorIdForPoint(fallbackPoint),
        resolution: "fallback-clamp",
      },
      dt,
      null,
    );
  }

  const direct = tryResolveWithinSectors(fromPoint, toPoint, activeSectorId);
  if (direct) {
    return finalizeResolution(fromPoint, direct, dt, activeSectorId);
  }

  const slideX = tryResolveWithinSectors(fromPoint, { x: toPoint.x, y: fromPoint.y }, activeSectorId);
  const slideY = tryResolveWithinSectors(fromPoint, { x: fromPoint.x, y: toPoint.y }, activeSectorId);

  if (slideX || slideY) {
    const slideCandidates = [slideX, slideY].filter(Boolean);
    slideCandidates.sort((a, b) => {
      const aTravel = Math.hypot(a.point.x - fromPoint.x, a.point.y - fromPoint.y);
      const bTravel = Math.hypot(b.point.x - fromPoint.x, b.point.y - fromPoint.y);
      return bTravel - aTravel;
    });

    const bestSlide = slideCandidates[0];
    const bestSlideTravel = Math.hypot(bestSlide.point.x - fromPoint.x, bestSlide.point.y - fromPoint.y);
    if (bestSlideTravel > BOUNDARY_EPSILON) {
      const slideResolution = bestSlide === slideX ? "slide-x" : "slide-y";
      return finalizeResolution(
        fromPoint,
        {
          point: bestSlide.point,
          sectorId: bestSlide.sectorId,
          resolution: bestSlide.resolution === "lane" ? `${slideResolution}-lane` : slideResolution,
        },
        dt,
        activeSectorId,
      );
    }
  }

  const activeSector = getSectorById(activeSectorId);
  const reboundPoint = activeSector ? clampPointToBounds(toPoint, activeSector.bounds) : fromPoint;

  return finalizeResolution(
    fromPoint,
    {
      point: reboundPoint,
      sectorId: activeSectorId,
      resolution: "rebound",
    },
    dt,
    activeSectorId,
  );
}

export function resolvePlayerBoundaryMovement(options = {}) {
  return resolveBoundaryMovement(options);
}

export function resolveEnemyBoundaryMovement(options = {}) {
  return resolveBoundaryMovement(options);
}

export function resolveSectorForBoundaryPosition(position) {
  const point = normalizePoint(position, { x: 0, y: 0 });
  return findSectorIdForPoint(point);
}

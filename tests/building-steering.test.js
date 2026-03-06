import test from "node:test";
import assert from "node:assert/strict";

import {
  getBuildingColliders,
  isPointBlockedByBuildings,
  planBuildingAwareSteering,
  WORLD_BUILDINGS,
} from "../src/building-system.js";
import { resolveEnemyBoundaryMovement } from "../src/world-collision.js";

const BUILDING_COLLIDERS = getBuildingColliders(WORLD_BUILDINGS);
const ENEMY_FALLBACK_BOUNDS = Object.freeze({
  minX: -20.5,
  maxX: 20.5,
  minY: -11,
  maxY: 11,
});

function runChaseScenario({
  enemyStart,
  playerTarget,
  sectorId,
  steps = 240,
  speed = 3.1,
  dt = 1 / 60,
}) {
  let enemy = {
    x: enemyStart.x,
    y: enemyStart.y,
    sectorId,
    blockedFrames: 0,
    steerSign: 1,
  };
  const positions = [];

  for (let step = 0; step < steps; step += 1) {
    const steering = planBuildingAwareSteering({
      position: { x: enemy.x, y: enemy.y },
      targetPosition: playerTarget,
      speed,
      dt,
      buildingColliders: BUILDING_COLLIDERS,
      blockedFrames: enemy.blockedFrames,
      steerSign: enemy.steerSign,
      padding: 0.78,
    });
    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: steering.velocity,
      dt,
      currentSectorId: enemy.sectorId,
      buildingColliders: BUILDING_COLLIDERS,
      fallbackBounds: ENEMY_FALLBACK_BOUNDS,
    });

    enemy = {
      x: resolved.x,
      y: resolved.y,
      sectorId: resolved.sectorId,
      blockedFrames: steering.blockedFrames,
      steerSign: steering.steerSign,
      mode: steering.mode,
    };
    positions.push(enemy);
  }

  return positions;
}

function maxStillFrames(positions, threshold = 0.01) {
  let best = 0;
  let current = 0;

  for (let index = 1; index < positions.length; index += 1) {
    const prev = positions[index - 1];
    const next = positions[index];
    const delta = Math.hypot(next.x - prev.x, next.y - prev.y);
    if (delta <= threshold) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

test("building-aware steering is deterministic for equivalent inputs", () => {
  const options = {
    position: { x: -5.8, y: 0 },
    targetPosition: { x: 1.2, y: 0 },
    speed: 3.1,
    dt: 1 / 60,
    buildingColliders: BUILDING_COLLIDERS,
    blockedFrames: 4,
    steerSign: 1,
    padding: 0.78,
  };

  assert.deepEqual(planBuildingAwareSteering(options), planBuildingAwareSteering(options));
});

test("stress pursuit routes around the hub blocker without entering building geometry", () => {
  const positions = runChaseScenario({
    enemyStart: { x: -5.8, y: 0 },
    playerTarget: { x: 2.2, y: 0 },
    sectorId: "hub",
    steps: 260,
  });
  const final = positions.at(-1);

  assert.ok(final.x > -1.2, `expected blocker chase to clear the blocker, got ${JSON.stringify(final)}`);
  assert.equal(
    positions.every((enemy) => !isPointBlockedByBuildings(enemy, { buildings: WORLD_BUILDINGS, padding: 0.7 })),
    true,
  );
  assert.ok(maxStillFrames(positions) < 20);
});

test("corner squeeze near soft-cover does not deadlock into a persistent wall loop", () => {
  const positions = runChaseScenario({
    enemyStart: { x: 2.8, y: 11.2 },
    playerTarget: { x: 0, y: 11.1 },
    sectorId: "south",
    steps: 220,
  });
  const final = positions.at(-1);
  const finalDistance = Math.hypot(final.x, final.y - 11.1);

  assert.ok(finalDistance < 2.8, `expected corner squeeze to make progress, got distance=${finalDistance}`);
  assert.ok(maxStillFrames(positions) < 18);
});

test("funnel chase realigns into the corridor instead of bouncing forever on the outer pillar", () => {
  const positions = runChaseScenario({
    enemyStart: { x: -3.2, y: -10.8 },
    playerTarget: { x: 0, y: -13.5 },
    sectorId: "north",
    steps: 220,
  });
  const final = positions.at(-1);

  assert.ok(Math.abs(final.x) < 1.2, `expected funnel chase to recenter, got ${JSON.stringify(final)}`);
  assert.ok(final.y < -11.8);
  assert.ok(maxStillFrames(positions) < 16);
});

test("spawn-near-building recovery avoids starting inside geometry and escapes the local blocker edge", () => {
  const positions = runChaseScenario({
    enemyStart: { x: 11.7, y: 0.2 },
    playerTarget: { x: 16.2, y: 0.2 },
    sectorId: "east",
    steps: 180,
  });
  const final = positions.at(-1);

  assert.equal(
    positions.every((enemy) => !isPointBlockedByBuildings(enemy, { buildings: WORLD_BUILDINGS, padding: 0.68 })),
    true,
  );
  assert.ok(final.x > 13.2, `expected spawn-near-building case to escape the blocker edge, got ${JSON.stringify(final)}`);
});

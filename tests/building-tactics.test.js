import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWorldTacticsState,
  getBuildingColliders,
  WORLD_BUILDINGS,
} from "../src/building-system.js";
import { resolvePlayerBoundaryMovement } from "../src/world-collision.js";

const BUILDING_COLLIDERS = getBuildingColliders(WORLD_BUILDINGS);

function movePlayer(position, velocity, dt, currentSectorId) {
  return resolvePlayerBoundaryMovement({
    position,
    velocity,
    dt,
    currentSectorId,
    buildingColliders: BUILDING_COLLIDERS,
  });
}

test("sector tactics summary exposes stable role counts and tactical cues", () => {
  const hubTactics = buildWorldTacticsState({
    currentSectorId: "hub",
    playerPosition: { x: -5.4, y: 0 },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts: [
      { sectorId: "hub", count: 2 },
      { sectorId: "north", count: 1 },
      { sectorId: "east", count: 0 },
      { sectorId: "south", count: 3 },
    ],
  });
  const southTactics = buildWorldTacticsState({
    currentSectorId: "south",
    playerPosition: { x: 0, y: 11.1 },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts: [
      { sectorId: "hub", count: 2 },
      { sectorId: "north", count: 1 },
      { sectorId: "east", count: 0 },
      { sectorId: "south", count: 3 },
    ],
  });

  assert.deepEqual(hubTactics.roleCounts, [
    { role: "blocker", count: 1 },
    { role: "funnel", count: 0 },
    { role: "soft-cover", count: 0 },
  ]);
  assert.equal(hubTactics.lineBreakAvailable, true);
  assert.equal(hubTactics.funnelAvailable, false);
  assert.equal(southTactics.retreatPocketAvailable, true);
  assert.equal(southTactics.retreatPocketActive, true);
  assert.equal(typeof southTactics.cueLabel, "string");
});

test("blocker collision prevents a direct pass-through but allows a deterministic flank route", () => {
  const blocked = movePlayer({ x: -5.8, y: 0 }, { x: 16, y: 0 }, 0.3, "hub");
  assert.equal(blocked.resolution, "building-rebound");
  assert.equal(blocked.x, -5.8);
  assert.equal(blocked.y, 0);

  let position = { x: -5.8, y: 0 };
  const route = [
    { velocity: { x: 0, y: -8 }, dt: 0.2 },
    { velocity: { x: 12, y: 0 }, dt: 0.36 },
    { velocity: { x: 0, y: 8 }, dt: 0.2 },
  ];

  for (const step of route) {
    const resolved = movePlayer(position, step.velocity, step.dt, "hub");
    position = { x: resolved.x, y: resolved.y };
  }

  assert.ok(position.x > -1.7, `expected flank route to clear blocker, got ${JSON.stringify(position)}`);
  assert.ok(position.y <= 0.1);
});

test("funnel route preserves a narrow pivot corridor instead of letting the player ghost through pillars", () => {
  const direct = movePlayer({ x: -3.2, y: -10.8 }, { x: 12, y: 0 }, 0.3, "north");
  assert.equal(direct.resolution, "building-rebound");

  const corridor = movePlayer({ x: 0, y: -13.8 }, { x: 0, y: 10 }, 0.28, "north");
  assert.equal(corridor.blocked, false);
  assert.ok(corridor.y > -12.2);
  assert.equal(corridor.sectorId, "north");
});

test("soft-cover retreat pocket becomes active once the player steps inside the authored pocket", () => {
  const entry = movePlayer({ x: 0, y: 8.9 }, { x: 0, y: 10 }, 0.22, "south");
  const tactics = buildWorldTacticsState({
    currentSectorId: "south",
    playerPosition: { x: entry.x, y: entry.y },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts: [
      { sectorId: "hub", count: 0 },
      { sectorId: "north", count: 1 },
      { sectorId: "east", count: 1 },
      { sectorId: "south", count: 4 },
    ],
  });

  assert.equal(tactics.retreatPocketActive, true);
  assert.equal(tactics.cueLabel, "POCKET");

  const wallHit = movePlayer({ x: 0, y: 11.1 }, { x: 12, y: 0 }, 0.2, "south");
  assert.equal(wallHit.resolution, "building-rebound");
});

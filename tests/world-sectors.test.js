import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveBoundaryMovement,
  resolveEnemyBoundaryMovement,
  resolvePlayerBoundaryMovement,
  resolveSectorForBoundaryPosition,
} from "../src/world-collision.js";
import {
  advanceWorldTraversalState,
  buildWorldTraversalSummary,
  canTraverseBetween,
  createWorldTraversalState,
  HUB_SECTOR_ID,
  WORLD_SECTOR_IDS,
  WORLD_SECTORS,
  getConnectedSectorIds,
  getSectorById,
  isSectorConnected,
  resolveSectorIdForPosition,
} from "../src/world-sectors.js";

const ENEMY_TEST_FALLBACK_BOUNDS = Object.freeze({
  minX: -20.5,
  maxX: 20.5,
  minY: -11,
  maxY: 11,
});

test("topology exposes deterministic hub-first sector order", () => {
  assert.deepEqual(WORLD_SECTOR_IDS, ["hub", "north", "east", "south"]);
  assert.equal(WORLD_SECTORS[0].id, HUB_SECTOR_ID);
  assert.equal(WORLD_SECTORS.length >= 4, true);

  const sectorIdsFromContract = WORLD_SECTORS.map((sector) => sector.id);
  assert.deepEqual(sectorIdsFromContract, WORLD_SECTOR_IDS);
});

test("hub-plus-ring topology keeps at least three outer sectors connected", () => {
  const hub = getSectorById(HUB_SECTOR_ID);
  assert.ok(hub);

  const outerIds = WORLD_SECTOR_IDS.filter((sectorId) => sectorId !== HUB_SECTOR_ID);
  assert.equal(outerIds.length >= 3, true);

  for (const outerId of outerIds) {
    assert.equal(isSectorConnected(HUB_SECTOR_ID, outerId), true);
  }

  const connectedToHub = getConnectedSectorIds(HUB_SECTOR_ID);
  assert.equal(connectedToHub.length >= 4, true);
  assert.deepEqual(connectedToHub, ["hub", "north", "east", "south"]);
});

test("scripted route visits at least three connected sectors in one run", () => {
  const route = [
    { x: 0, y: -10 },
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 10 },
  ];

  let traversalState = createWorldTraversalState(HUB_SECTOR_ID);
  const transitionPath = [traversalState.currentSectorId];

  for (const point of route) {
    const targetSectorId = resolveSectorIdForPosition(point, traversalState.currentSectorId);
    traversalState = advanceWorldTraversalState(traversalState, targetSectorId);
    transitionPath.push(traversalState.currentSectorId);
  }

  const summary = buildWorldTraversalSummary(traversalState);
  assert.equal(summary.visitedCount >= 3, true);
  assert.deepEqual(summary.visitedSectorIds, ["hub", "north", "east", "south"]);
  assert.equal(summary.currentSectorId, "south");
  assert.equal(summary.transitionSeq, 5);

  for (let i = 1; i < transitionPath.length; i += 1) {
    const from = transitionPath[i - 1];
    const to = transitionPath[i];
    assert.equal(canTraverseBetween(from, to), true);
  }
});

test("boundary resolver allows lane pass-through between hub and north", () => {
  const resolved = resolvePlayerBoundaryMovement({
    position: { x: 0, y: -5.5 },
    velocity: { x: 0, y: -4 },
    dt: 0.2,
    currentSectorId: "hub",
  });

  assert.equal(resolved.sectorId, "north");
  assert.equal(resolved.transitioned, true);
  assert.equal(resolved.resolution, "lane");
  assert.ok(resolved.y < -6);
});

test("boundary resolver rebounds when movement hits non-lane edge", () => {
  const resolved = resolveBoundaryMovement({
    position: { x: 5.1, y: -5.5 },
    velocity: { x: 0, y: -4.4 },
    dt: 0.2,
    currentSectorId: "hub",
  });

  assert.equal(resolved.sectorId, "hub");
  assert.equal(resolved.transitioned, false);
  assert.equal(resolved.resolution, "rebound");
  assert.ok(resolved.y > -6);
  assert.equal(resolved.x, 5.1);
});

test("boundary resolver applies deterministic slide near blocked corner", () => {
  const resolved = resolveBoundaryMovement({
    position: { x: 6.8, y: -5.8 },
    velocity: { x: 3, y: -3 },
    dt: 0.2,
    currentSectorId: "hub",
  });

  assert.equal(resolved.sectorId, "hub");
  assert.equal(resolved.transitioned, false);
  assert.equal(resolved.resolution, "slide-x");
  assert.ok(resolved.x > 6.8);
  assert.equal(resolved.y, -5.8);
});

test("boundary resolver remains stable for near-boundary micro-steps", () => {
  let position = { x: 5.2, y: -5.97 };
  let currentSectorId = "hub";

  for (let i = 0; i < 120; i += 1) {
    const resolved = resolveBoundaryMovement({
      position,
      velocity: { x: 0, y: -1.4 },
      dt: 1 / 60,
      currentSectorId,
    });

    position = { x: resolved.x, y: resolved.y };
    currentSectorId = resolved.sectorId;

    assert.equal(currentSectorId, "hub");
    assert.ok(position.y >= -6);
  }
});

test("boundary resolver falls back to deterministic clamp when outside sector map", () => {
  const resolved = resolveEnemyBoundaryMovement({
    position: { x: 25, y: 14 },
    velocity: { x: 3, y: 1.5 },
    dt: 1,
    fallbackBounds: { minX: -20, maxX: 20, minY: -11, maxY: 11 },
  });

  assert.equal(resolved.resolution, "fallback-clamp");
  assert.equal(resolved.blocked, true);
  assert.equal(resolved.x, 19.9999);
  assert.equal(resolved.y, 10.9999);
  assert.equal(resolveSectorForBoundaryPosition({ x: resolved.x, y: resolved.y }), null);
});

test("enemy pursuit crosses legal lane and remains stable after entering hub", () => {
  const player = { x: 0, y: 0 };
  let enemy = { x: 0, y: -9, sectorId: "north" };
  const sectorHistory = [];

  for (let i = 0; i < 220; i += 1) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;

    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: {
        x: (dx / len) * 3.2,
        y: (dy / len) * 3.2,
      },
      dt: 1 / 60,
      currentSectorId: enemy.sectorId,
      fallbackBounds: ENEMY_TEST_FALLBACK_BOUNDS,
    });

    enemy = { x: resolved.x, y: resolved.y, sectorId: resolved.sectorId };
    sectorHistory.push(enemy.sectorId);
  }

  const firstHubIndex = sectorHistory.indexOf("hub");
  assert.ok(firstHubIndex >= 0);
  assert.equal(sectorHistory.slice(firstHubIndex).every((sectorId) => sectorId === "hub"), true);
});

test("enemy pursuit respects blocked boundary before lane realignment", () => {
  let enemy = { x: 6.5, y: -8, sectorId: "north" };

  for (let i = 0; i < 120; i += 1) {
    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: { x: 0, y: 3.1 },
      dt: 1 / 60,
      currentSectorId: enemy.sectorId,
      fallbackBounds: ENEMY_TEST_FALLBACK_BOUNDS,
    });
    enemy = { x: resolved.x, y: resolved.y, sectorId: resolved.sectorId };
    assert.equal(enemy.sectorId, "north");
    assert.ok(enemy.y <= -6 + 1e-3);
  }

  const postRealignmentSectors = [];
  for (let i = 0; i < 320; i += 1) {
    const dx = -enemy.x;
    const dy = -enemy.y;
    const len = Math.hypot(dx, dy) || 1;

    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: {
        x: (dx / len) * 3.1,
        y: (dy / len) * 3.1,
      },
      dt: 1 / 60,
      currentSectorId: enemy.sectorId,
      fallbackBounds: ENEMY_TEST_FALLBACK_BOUNDS,
    });

    enemy = { x: resolved.x, y: resolved.y, sectorId: resolved.sectorId };
    postRealignmentSectors.push(enemy.sectorId);
  }

  const firstHubIndex = postRealignmentSectors.indexOf("hub");
  assert.ok(firstHubIndex >= 0);
  assert.equal(postRealignmentSectors.slice(firstHubIndex).every((sectorId) => sectorId === "hub"), true);
});

import test from "node:test";
import assert from "node:assert/strict";

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

import test from "node:test";
import assert from "node:assert/strict";

import {
  HUB_SECTOR_ID,
  WORLD_SECTOR_IDS,
  WORLD_SECTORS,
  getConnectedSectorIds,
  getSectorById,
  isSectorConnected,
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

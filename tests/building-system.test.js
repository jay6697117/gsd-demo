import test from "node:test";
import assert from "node:assert/strict";

import {
  BUILDING_ARCHETYPE_IDS,
  BUILDING_ARCHETYPES,
  BUILDING_LAYOUT_PRESETS,
} from "../src/building-catalog.js";
import {
  createWorldBuildings,
  filterSpawnCandidates,
  getBuildingColliders,
  getBuildingsForSector,
  isPointBlockedByBuildings,
  summarizeBuildingsForSnapshot,
} from "../src/building-system.js";

test("building catalog exposes three deterministic tactical archetypes", () => {
  assert.deepEqual(BUILDING_ARCHETYPE_IDS, ["blocker", "funnel", "soft-cover"]);
  assert.equal(BUILDING_ARCHETYPES.blocker.role, "blocker");
  assert.equal(BUILDING_ARCHETYPES.funnel.role, "funnel");
  assert.equal(BUILDING_ARCHETYPES["soft-cover"].role, "soft-cover");
  assert.equal(BUILDING_ARCHETYPES.blocker.colliders.length, 1);
  assert.equal(BUILDING_ARCHETYPES.funnel.colliders.length, 2);
  assert.equal(BUILDING_ARCHETYPES["soft-cover"].colliders.length, 3);
});

test("sector-authored building presets instantiate in stable sector order", () => {
  const buildings = createWorldBuildings();

  assert.deepEqual(
    buildings.map((building) => building.id),
    ["hub-blocker-01", "north-funnel-01", "east-blocker-01", "south-soft-cover-01"],
  );
  assert.deepEqual(
    buildings.map((building) => building.sectorId),
    ["hub", "north", "east", "south"],
  );
  assert.deepEqual(Object.keys(BUILDING_LAYOUT_PRESETS), ["hub", "north", "east", "south"]);
});

test("collider queries remain deterministic for compound archetypes", () => {
  const buildings = createWorldBuildings();
  const northBuildings = getBuildingsForSector(buildings, "north");
  const northColliders = getBuildingColliders(buildings, { sectorId: "north" });

  assert.equal(northBuildings.length, 1);
  assert.equal(northBuildings[0].archetypeId, "funnel");
  assert.equal(northColliders.length, 2);
  assert.deepEqual(
    northColliders.map((collider) => collider.id),
    ["north-funnel-01#0", "north-funnel-01#1"],
  );

  assert.equal(
    isPointBlockedByBuildings({ x: -1.1, y: -10.8 }, { buildings, sectorId: "north" }),
    true,
  );
  assert.equal(
    isPointBlockedByBuildings({ x: 0, y: -10.8 }, { buildings, sectorId: "north" }),
    false,
  );
});

test("spawn-exclusion queries reject blocked candidates while preserving safe order", () => {
  const buildings = createWorldBuildings();
  const candidates = [
    { x: -3.2, y: 0 },
    { x: -5.8, y: 0.6 },
    { x: 0, y: 0 },
  ];

  const safe = filterSpawnCandidates({
    sectorId: "hub",
    buildings,
    candidates,
    padding: 0.2,
  });

  assert.deepEqual(safe, [
    { x: -5.8, y: 0.6 },
    { x: 0, y: 0 },
  ]);
});

test("snapshot building summary is stable and machine-readable", () => {
  const summary = summarizeBuildingsForSnapshot(createWorldBuildings());

  assert.deepEqual(summary[0], {
    id: "hub-blocker-01",
    sectorId: "hub",
    archetypeId: "blocker",
    role: "blocker",
    shape: "compound-rect",
    colliderCount: 1,
    bounds: { minX: -4.7, maxX: -1.7, minY: -0.9, maxY: 0.9 },
  });
  assert.equal(summary.at(-1)?.id, "south-soft-cover-01");
});

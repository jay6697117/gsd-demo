import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSectorEnemyCounts,
  chooseWeightedSector,
  computeSectorWeights,
  createSpawnDirectorState,
  planSpawnSector,
} from "../src/spawn-director.js";

const SECTOR_IDS = ["hub", "north", "east", "south"];

function toWeightMap(weights) {
  const map = new Map();
  for (const entry of weights) {
    map.set(entry.sectorId, entry.weight);
  }
  return map;
}

test("buildSectorEnemyCounts keeps stable sector ordering and counts", () => {
  const counts = buildSectorEnemyCounts({
    sectorIds: SECTOR_IDS,
    enemies: [
      { id: 4, sectorId: "east" },
      { id: 2, sectorId: "north" },
      { id: 1, sectorId: "north" },
      { id: 3, sectorId: "hub" },
      { id: 5, sectorId: "unknown" },
    ],
  });

  assert.deepEqual(counts, [
    { sectorId: "hub", count: 1 },
    { sectorId: "north", count: 2 },
    { sectorId: "east", count: 1 },
    { sectorId: "south", count: 0 },
  ]);
});

test("createSpawnDirectorState seeds canonical sector order and cooldown tracking", () => {
  const state = createSpawnDirectorState({
    sectorIds: SECTOR_IDS,
    spawnCooldown: 0.75,
    spawnRngState: 9123,
  });

  assert.deepEqual(state, {
    eventSeq: 0,
    sectorWeights: [
      { sectorId: "hub", weight: 1 },
      { sectorId: "north", weight: 1 },
      { sectorId: "east", weight: 1 },
      { sectorId: "south", weight: 1 },
    ],
    sectorEnemyCounts: [
      { sectorId: "hub", count: 0 },
      { sectorId: "north", count: 0 },
      { sectorId: "east", count: 0 },
      { sectorId: "south", count: 0 },
    ],
    lastSpawnSectorId: null,
    spawnCooldown: 0.75,
    spawnRngState: 9123,
  });
});

test("computeSectorWeights applies pressure and per-sector soft-cap penalties deterministically", () => {
  const sectorEnemyCounts = [
    { sectorId: "hub", count: 5 },
    { sectorId: "north", count: 0 },
    { sectorId: "east", count: 3 },
    { sectorId: "south", count: 1 },
  ];

  const lowDangerWeights = computeSectorWeights({
    sectorIds: SECTOR_IDS,
    playerSectorId: "hub",
    sectorEnemyCounts,
    heatState: {
      danger: 0.1,
      sideBufferActive: false,
      reliefSectorId: "south",
      hotSectorId: "hub",
      lastSpawnSectorId: "north",
    },
    activeEnemyCount: 9,
    maxActiveEnemies: 26,
    perSectorSoftCap: 4,
  });

  const highDangerWeights = computeSectorWeights({
    sectorIds: SECTOR_IDS,
    playerSectorId: "hub",
    sectorEnemyCounts,
    heatState: {
      danger: 0.9,
      sideBufferActive: true,
      reliefSectorId: "south",
      hotSectorId: "hub",
      lastSpawnSectorId: "north",
    },
    activeEnemyCount: 9,
    maxActiveEnemies: 26,
    perSectorSoftCap: 4,
  });

  const lowDanger = toWeightMap(lowDangerWeights);
  const highDanger = toWeightMap(highDangerWeights);

  assert.equal(highDangerWeights.map((entry) => entry.sectorId).join(","), "hub,north,east,south");

  assert.ok(lowDanger.get("hub") > highDanger.get("hub"));
  assert.ok(highDanger.get("south") > lowDanger.get("south"));
  assert.ok(lowDanger.get("hub") < lowDanger.get("south"));

  const rerun = computeSectorWeights({
    sectorIds: SECTOR_IDS,
    playerSectorId: "hub",
    sectorEnemyCounts,
    heatState: {
      danger: 0.9,
      sideBufferActive: true,
      reliefSectorId: "south",
      hotSectorId: "hub",
      lastSpawnSectorId: "north",
    },
    activeEnemyCount: 9,
    maxActiveEnemies: 26,
    perSectorSoftCap: 4,
  });
  assert.deepEqual(highDangerWeights, rerun);
});

test("chooseWeightedSector uses canonical input ordering and deterministic weighted pick", () => {
  const tied = chooseWeightedSector({
    sectorWeights: [
      { sectorId: "hub", weight: 1 },
      { sectorId: "north", weight: 1 },
      { sectorId: "east", weight: 1 },
      { sectorId: "south", weight: 1 },
    ],
    rngValue: 0,
  });

  assert.equal(tied.sectorId, "hub");

  const weighted = [
    { sectorId: "hub", weight: 1.2 },
    { sectorId: "north", weight: 0.8 },
    { sectorId: "east", weight: 2.0 },
    { sectorId: "south", weight: 0.5 },
  ];

  const first = chooseWeightedSector({ sectorWeights: weighted, rngValue: 0.62 });
  const second = chooseWeightedSector({ sectorWeights: weighted, rngValue: 0.62 });

  assert.deepEqual(first, second);
  assert.equal(first.sectorId, "east");
});

test("planSpawnSector records deterministic metadata, cooldown, and increments event sequence", () => {
  const baseState = createSpawnDirectorState({
    sectorIds: SECTOR_IDS,
    spawnCooldown: 0.75,
    spawnRngState: 108976,
  });

  const run = (rngValue) =>
    planSpawnSector({
      directorState: baseState,
      sectorIds: SECTOR_IDS,
      playerSectorId: "hub",
      sectorEnemyCounts: [
        { sectorId: "hub", count: 2 },
        { sectorId: "north", count: 1 },
        { sectorId: "east", count: 0 },
        { sectorId: "south", count: 0 },
      ],
      heatState: {
        danger: 0.65,
        sideBufferActive: true,
        reliefSectorId: "east",
        hotSectorId: "hub",
        lastSpawnSectorId: "north",
      },
      activeEnemyCount: 3,
      maxActiveEnemies: 26,
      perSectorSoftCap: 4,
      rngValue,
      spawnRngState: 20991,
      spawnCooldown: 0.34,
    });

  const first = run(0.42);
  const second = run(0.42);

  assert.deepEqual(first, second);
  assert.equal(first.selectedSectorId, "east");
  assert.equal(first.directorState.eventSeq, 1);
  assert.equal(first.directorState.lastSpawnSectorId, "east");
  assert.equal(first.directorState.spawnRngState, 20991);
  assert.equal(first.directorState.spawnCooldown, 0.34);
  assert.deepEqual(
    first.directorState.sectorEnemyCounts,
    [
      { sectorId: "hub", count: 2 },
      { sectorId: "north", count: 1 },
      { sectorId: "east", count: 0 },
      { sectorId: "south", count: 0 },
    ],
  );
  assert.deepEqual(
    first.directorState.sectorWeights.map((entry) => entry.sectorId),
    ["hub", "north", "east", "south"],
  );
});

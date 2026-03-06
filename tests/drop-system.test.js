import test from "node:test";
import assert from "node:assert/strict";

import { createWorldBreakables } from "../src/breakable-system.js";
import { BREAKABLE_DROP_TABLES } from "../src/drop-tables.js";
import {
  createLootState,
  createDropSeed,
  resolveDestroyedBreakableDrops,
  summarizeLootStateForSnapshot,
} from "../src/drop-system.js";

test("drop tables only emit deterministic equipment descriptors", () => {
  assert.deepEqual(Object.keys(BREAKABLE_DROP_TABLES), [
    "starter-weapon",
    "upgrade-weapon",
    "defense-core",
    "mobility-charm",
  ]);
  assert.equal(BREAKABLE_DROP_TABLES["starter-weapon"][0].slot, "weapon");
  assert.equal(BREAKABLE_DROP_TABLES["defense-core"][0].statKey, "maxHp");
  assert.equal(BREAKABLE_DROP_TABLES["mobility-charm"][0].statKey, "moveSpeed");
});

test("destroyed breakables resolve stable ground drops and independent drop RNG state", () => {
  const breakables = createWorldBreakables();
  const destroyedBreakables = [
    breakables.find((breakable) => breakable.id === "hub-cache-01"),
    breakables.find((breakable) => breakable.id === "hub-crate-01"),
  ];

  const result = resolveDestroyedBreakableDrops({
    lootState: createLootState({
      dropRngState: createDropSeed(0x57b1c4),
    }),
    destroyedBreakables,
  });

  assert.equal(result.lootState.eventSeq, 2);
  assert.equal(result.lootState.groundDrops.length, 2);
  assert.deepEqual(
    result.lootState.groundDrops.map((drop) => drop.sourcePropId),
    ["hub-crate-01", "hub-cache-01"],
  );
  assert.deepEqual(
    result.lootState.groundDrops.map((drop) => drop.id),
    ["drop-0001-hub-crate-01", "drop-0002-hub-cache-01"],
  );
  assert.deepEqual(result.lootState.groundDrops[0], {
    id: "drop-0001-hub-crate-01",
    order: 0,
    sourcePropId: "hub-crate-01",
    sourceSectorId: "hub",
    slot: "weapon",
    rarity: "common",
    statKey: "attackDamage",
    statValue: 4,
    x: 2.8,
    y: -0.6,
    pickupArmed: true,
    needsRearm: false,
    lastRangeState: "outside",
  });
  assert.equal(typeof result.lootState.dropRngState, "number");
});

test("drop resolution is deterministic for the same seed and break order", () => {
  const destroyedBreakables = createWorldBreakables().filter((breakable) =>
    ["hub-crate-01", "north-cache-01"].includes(breakable.id),
  );

  const run = () =>
    resolveDestroyedBreakableDrops({
      lootState: createLootState({
        dropRngState: createDropSeed(0x57b1c4),
      }),
      destroyedBreakables,
    }).lootState;

  assert.deepEqual(run(), run());
});

test("loot snapshot summary stays stable and omits runtime-only scene state", () => {
  const summary = summarizeLootStateForSnapshot(
    resolveDestroyedBreakableDrops({
      lootState: createLootState({
        dropRngState: createDropSeed(0x57b1c4),
      }),
      destroyedBreakables: createWorldBreakables().filter((breakable) =>
        ["hub-crate-01", "hub-cache-01"].includes(breakable.id),
      ),
    }).lootState,
  );

  assert.deepEqual(summary.groundDrops.map((drop) => drop.id), [
    "drop-0001-hub-crate-01",
    "drop-0002-hub-cache-01",
  ]);
  assert.equal(summary.pendingPickupId, null);
  assert.equal(summary.eventSeq, 2);
});

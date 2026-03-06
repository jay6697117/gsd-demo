import test from "node:test";
import assert from "node:assert/strict";

import {
  BREAKABLE_ARCHETYPE_IDS,
  BREAKABLE_ARCHETYPES,
  BREAKABLE_LAYOUT_PRESETS,
} from "../src/breakable-catalog.js";
import {
  createWorldBreakables,
  getBreakablesForSector,
  resolveBreakableAttackStep,
  summarizeBreakablesForSnapshot,
} from "../src/breakable-system.js";

test("breakable catalog exposes deterministic non-blocking archetypes", () => {
  assert.deepEqual(BREAKABLE_ARCHETYPE_IDS, ["crate", "cache"]);
  assert.equal(BREAKABLE_ARCHETYPES.crate.blocksMovement, false);
  assert.equal(BREAKABLE_ARCHETYPES.cache.blocksMovement, false);
  assert.equal(BREAKABLE_ARCHETYPES.crate.maxHp, 21);
  assert.equal(BREAKABLE_ARCHETYPES.cache.maxHp, 34);
  assert.deepEqual(Object.keys(BREAKABLE_LAYOUT_PRESETS), ["hub", "north", "east", "south"]);
});

test("sector-authored breakables instantiate in stable sector and layout order", () => {
  const breakables = createWorldBreakables();

  assert.deepEqual(
    breakables.map((breakable) => breakable.id),
    [
      "hub-crate-01",
      "hub-cache-01",
      "north-cache-01",
      "east-crate-01",
      "south-cache-01",
    ],
  );
  assert.deepEqual(
    breakables.map((breakable) => breakable.sectorId),
    ["hub", "hub", "north", "east", "south"],
  );
  assert.deepEqual(
    getBreakablesForSector(breakables, "hub").map((breakable) => breakable.id),
    ["hub-crate-01", "hub-cache-01"],
  );
});

test("breakable attack resolution follows stable id order and only breaks once", () => {
  const initialBreakables = createWorldBreakables({
    presets: {
      hub: [
        { id: "hub-cache-02", archetypeId: "cache", x: 1.3, y: 0, rotationQuarterTurns: 0 },
        { id: "hub-crate-02", archetypeId: "crate", x: 0.8, y: 0, rotationQuarterTurns: 0 },
      ],
    },
  });

  const firstSwing = resolveBreakableAttackStep({
    breakables: initialBreakables,
    attackOrigin: { x: 0, y: 0 },
    attackFacing: { x: 1, y: 0 },
    attackRadius: 2.4,
    attackDamage: 21,
    frontDotThreshold: -0.2,
  });

  assert.deepEqual(
    firstSwing.hitBreakables.map((breakable) => breakable.id),
    ["hub-cache-02", "hub-crate-02"],
  );
  assert.equal(firstSwing.destroyedBreakables.length, 1);
  assert.equal(firstSwing.destroyedBreakables[0].id, "hub-crate-02");
  assert.equal(firstSwing.breakables.find((breakable) => breakable.id === "hub-cache-02")?.hp, 13);
  assert.equal(firstSwing.breakables.find((breakable) => breakable.id === "hub-crate-02")?.broken, true);

  const secondSwing = resolveBreakableAttackStep({
    breakables: firstSwing.breakables,
    attackOrigin: { x: 0, y: 0 },
    attackFacing: { x: 1, y: 0 },
    attackRadius: 2.4,
    attackDamage: 21,
    frontDotThreshold: -0.2,
  });

  assert.deepEqual(
    secondSwing.hitBreakables.map((breakable) => breakable.id),
    ["hub-cache-02"],
  );
  assert.deepEqual(
    secondSwing.destroyedBreakables.map((breakable) => breakable.id),
    ["hub-cache-02"],
  );
});

test("snapshot summary exposes stable breakable lifecycle fields without scene objects", () => {
  const summary = summarizeBreakablesForSnapshot(createWorldBreakables());

  assert.deepEqual(summary[0], {
    id: "hub-crate-01",
    sectorId: "hub",
    archetypeId: "crate",
    maxHp: 21,
    hp: 21,
    broken: false,
    x: 2.8,
    y: -0.6,
  });
  assert.equal(summary.at(-1)?.id, "south-cache-01");
});

import test from "node:test";
import assert from "node:assert/strict";

import { createLootState } from "../src/drop-system.js";
import {
  acceptCompareCandidate,
  createEquipmentState,
  rejectCompareCandidate,
  resolveAutoPickupStep,
  summarizeEquipmentStateForSnapshot,
} from "../src/equipment-system.js";

function buildDrop(overrides = {}) {
  return {
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
    ...overrides,
  };
}

test("empty-slot auto pickup equips item immediately and updates derived stats", () => {
  const result = resolveAutoPickupStep({
    equipmentState: createEquipmentState(),
    lootState: createLootState({
      groundDrops: [buildDrop()],
    }),
    playerPosition: { x: 2.8, y: -0.6 },
    pickupRadius: 1.25,
  });

  assert.equal(result.nextMode, "playing");
  assert.equal(result.lootState.groundDrops.length, 0);
  assert.equal(result.equipmentState.slots.weapon?.id, "drop-0001-hub-crate-01");
  assert.equal(result.equipmentState.derivedStats.attackDamage, 4);
});

test("occupied-slot pickup enters compare mode and records pending pickup", () => {
  const result = resolveAutoPickupStep({
    equipmentState: createEquipmentState({
      slots: {
        weapon: {
          id: "equipped-weapon-01",
          slot: "weapon",
          rarity: "common",
          statKey: "attackDamage",
          statValue: 4,
          sourcePropId: "starter",
        },
      },
    }),
    lootState: createLootState({
      groundDrops: [
        buildDrop({
          id: "drop-0002-hub-cache-01",
          sourcePropId: "hub-cache-01",
          rarity: "rare",
          statValue: 7,
          x: 5.1,
          y: 1.2,
        }),
      ],
    }),
    playerPosition: { x: 5.1, y: 1.2 },
    pickupRadius: 1.25,
  });

  assert.equal(result.nextMode, "equip_compare");
  assert.equal(result.lootState.pendingPickupId, "drop-0002-hub-cache-01");
  assert.equal(result.equipmentState.compareCandidate?.slot, "weapon");
  assert.equal(result.equipmentState.compareCandidate?.statDelta, 3);
});

test("accepting compare candidate equips new item and removes ground drop", () => {
  const compareState = resolveAutoPickupStep({
    equipmentState: createEquipmentState({
      slots: {
        weapon: {
          id: "equipped-weapon-01",
          slot: "weapon",
          rarity: "common",
          statKey: "attackDamage",
          statValue: 4,
          sourcePropId: "starter",
        },
      },
    }),
    lootState: createLootState({
      groundDrops: [
        buildDrop({
          id: "drop-0002-hub-cache-01",
          sourcePropId: "hub-cache-01",
          rarity: "rare",
          statValue: 7,
          x: 5.1,
          y: 1.2,
        }),
      ],
    }),
    playerPosition: { x: 5.1, y: 1.2 },
    pickupRadius: 1.25,
  });

  const accepted = acceptCompareCandidate({
    equipmentState: compareState.equipmentState,
    lootState: compareState.lootState,
  });

  assert.equal(accepted.lootState.pendingPickupId, null);
  assert.equal(accepted.lootState.groundDrops.length, 0);
  assert.equal(accepted.equipmentState.compareCandidate, null);
  assert.equal(accepted.equipmentState.slots.weapon?.id, "drop-0002-hub-cache-01");
  assert.equal(accepted.equipmentState.derivedStats.attackDamage, 7);
});

test("rejecting compare candidate requires leave and re-enter before retrigger", () => {
  const compareState = resolveAutoPickupStep({
    equipmentState: createEquipmentState({
      slots: {
        weapon: {
          id: "equipped-weapon-01",
          slot: "weapon",
          rarity: "common",
          statKey: "attackDamage",
          statValue: 4,
          sourcePropId: "starter",
        },
      },
    }),
    lootState: createLootState({
      groundDrops: [
        buildDrop({
          id: "drop-0002-hub-cache-01",
          sourcePropId: "hub-cache-01",
          rarity: "rare",
          statValue: 7,
          x: 5.1,
          y: 1.2,
        }),
      ],
    }),
    playerPosition: { x: 5.1, y: 1.2 },
    pickupRadius: 1.25,
  });

  const rejected = rejectCompareCandidate({
    equipmentState: compareState.equipmentState,
    lootState: compareState.lootState,
  });
  const stillInside = resolveAutoPickupStep({
    equipmentState: rejected.equipmentState,
    lootState: rejected.lootState,
    playerPosition: { x: 5.1, y: 1.2 },
    pickupRadius: 1.25,
  });
  const rearmed = resolveAutoPickupStep({
    equipmentState: stillInside.equipmentState,
    lootState: stillInside.lootState,
    playerPosition: { x: 8.6, y: 1.2 },
    pickupRadius: 1.25,
  });
  const retriggered = resolveAutoPickupStep({
    equipmentState: rearmed.equipmentState,
    lootState: rearmed.lootState,
    playerPosition: { x: 5.1, y: 1.2 },
    pickupRadius: 1.25,
  });

  assert.equal(rejected.lootState.groundDrops[0].needsRearm, true);
  assert.equal(stillInside.nextMode, "playing");
  assert.equal(stillInside.equipmentState.compareCandidate, null);
  assert.equal(rearmed.lootState.groundDrops[0].pickupArmed, true);
  assert.equal(retriggered.nextMode, "equip_compare");
});

test("equipment snapshot summary exposes slots, derived stats, and compare candidate", () => {
  const summary = summarizeEquipmentStateForSnapshot(
    createEquipmentState({
      slots: {
        weapon: {
          id: "drop-0002-hub-cache-01",
          slot: "weapon",
          rarity: "rare",
          statKey: "attackDamage",
          statValue: 7,
          sourcePropId: "hub-cache-01",
        },
      },
      compareCandidate: {
        dropId: "drop-0003-hub-cache-02",
        slot: "weapon",
        candidateItem: {
          id: "drop-0003-hub-cache-02",
          slot: "weapon",
          rarity: "epic",
          statKey: "attackDamage",
          statValue: 10,
          sourcePropId: "hub-cache-02",
        },
        equippedItem: {
          id: "drop-0002-hub-cache-01",
          slot: "weapon",
          rarity: "rare",
          statKey: "attackDamage",
          statValue: 7,
          sourcePropId: "hub-cache-01",
        },
        statDelta: 3,
      },
    }),
  );

  assert.equal(summary.derivedStats.attackDamage, 7);
  assert.equal(summary.slots.weapon?.id, "drop-0002-hub-cache-01");
  assert.equal(summary.compareCandidate?.statDelta, 3);
});

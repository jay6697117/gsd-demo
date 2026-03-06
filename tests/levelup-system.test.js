import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFER_RNG_SEED_SALT,
  UPGRADE_CATALOG,
} from "../src/upgrade-catalog.js";
import {
  createOfferSeed,
  createUpgradeState,
  getEligibleUpgrades,
} from "../src/levelup-system.js";

test("upgrade catalog exposes skill and talent entries with explicit constraint metadata", () => {
  const catalogIds = UPGRADE_CATALOG.map((entry) => entry.id);
  assert.deepEqual(catalogIds, [
    "wide_slash",
    "quick_slash",
    "edge_control",
    "arc_bloom",
    "heavy_hand",
    "sturdy_frame",
    "swift_step",
    "battle_tempo",
  ]);
  assert.equal(OFFER_RNG_SEED_SALT, 0x6d2b79f5);
  assert.ok(UPGRADE_CATALOG.some((entry) => entry.kind === "skill"));
  assert.ok(UPGRADE_CATALOG.some((entry) => entry.kind === "talent"));
  assert.ok(UPGRADE_CATALOG.every((entry) => typeof entry.maxRank === "number"));
  assert.ok(UPGRADE_CATALOG.every((entry) => Array.isArray(entry.requires)));
  assert.ok(UPGRADE_CATALOG.every((entry) => Array.isArray(entry.excludes)));
  assert.ok(UPGRADE_CATALOG.every((entry) => Array.isArray(entry.tags)));
});

test("eligible upgrades filter unmet requirements, exclusions, and max-rank entries", () => {
  const upgradeState = createUpgradeState({
    appliedChoices: [
      { id: "wide_slash", kind: "skill" },
      { id: "sturdy_frame", kind: "talent" },
      { id: "sturdy_frame", kind: "talent" },
    ],
  });

  const eligibleIds = getEligibleUpgrades({
    levelUpEvent: { id: "lvlup-0002", reachedLevel: 2, thresholdXp: 4 },
    upgradeState,
  }).map((entry) => entry.id);

  assert.ok(eligibleIds.includes("arc_bloom"));
  assert.ok(eligibleIds.includes("edge_control"));
  assert.ok(eligibleIds.includes("heavy_hand"));
  assert.ok(eligibleIds.includes("swift_step"));
  assert.ok(!eligibleIds.includes("quick_slash"));
  assert.ok(!eligibleIds.includes("sturdy_frame"));
  assert.ok(!eligibleIds.includes("battle_tempo"));
});

test("offer seed derivation stays isolated from other runtime rng streams", () => {
  assert.equal(createOfferSeed(0), OFFER_RNG_SEED_SALT >>> 0);
  assert.equal(createOfferSeed(0x1234abcd), (0x1234abcd ^ OFFER_RNG_SEED_SALT) >>> 0);
});

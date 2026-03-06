import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFER_RNG_SEED_SALT,
  UPGRADE_CATALOG,
} from "../src/upgrade-catalog.js";
import {
  beginLevelUpChoice,
  confirmLevelUpChoice,
  createOfferSeed,
  createLevelUpState,
  createUpgradeState,
  generateUpgradeOffers,
  getEligibleUpgrades,
  moveLevelUpSelection,
  summarizeLevelUpStateForSnapshot,
  summarizeUpgradeStateForSnapshot,
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

test("deterministic offer generation returns exactly three unique choices and covers both pools when possible", () => {
  const upgradeState = createUpgradeState({
    appliedChoices: [{ id: "wide_slash", kind: "skill" }],
  });
  const params = {
    levelUpEvent: { id: "lvlup-0002", reachedLevel: 2, thresholdXp: 4 },
    upgradeState,
    offerRngState: createOfferSeed(0x1234abcd),
  };

  const first = generateUpgradeOffers(params);
  const second = generateUpgradeOffers(params);

  assert.deepEqual(first, second);
  assert.equal(first.offeredChoices.length, 3);
  assert.equal(new Set(first.offeredChoices.map((entry) => entry.id)).size, 3);
  assert.ok(first.offeredChoices.some((entry) => entry.kind === "skill"));
  assert.ok(first.offeredChoices.some((entry) => entry.kind === "talent"));
  assert.notEqual(first.offerRngState, params.offerRngState);
  assert.deepEqual(
    first.offeredChoices.map((entry) => entry.id),
    ["edge_control", "heavy_hand", "sturdy_frame"],
  );
});

test("beginLevelUpChoice opens one deterministic session from the queue head", () => {
  const progressionState = {
    level: 3,
    totalXp: 10,
    pendingLevelUps: [
      { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
      { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
    ],
    eventSeq: 2,
  };
  const upgradeState = createUpgradeState({
    appliedChoices: [{ id: "wide_slash", kind: "skill" }],
  });
  const levelUpState = createLevelUpState({
    offerRngState: createOfferSeed(0x1234abcd),
  });

  const opened = beginLevelUpChoice({
    progressionState,
    upgradeState,
    levelUpState,
  });

  assert.equal(opened.didOpen, true);
  assert.equal(opened.levelUpState.activeEventId, "lvlup-0001");
  assert.equal(opened.levelUpState.currentOfferId, "lvlup-0001-offer-0001");
  assert.equal(opened.levelUpState.offerSeq, 1);
  assert.equal(opened.levelUpState.rerollsRemaining, 1);
  assert.equal(opened.levelUpState.selectedIndex, 0);
  assert.equal(opened.levelUpState.offeredChoices.length, 3);
  assert.deepEqual(
    opened.progressionState.pendingLevelUps.map((event) => event.id),
    ["lvlup-0001", "lvlup-0002"],
  );
});

test("moveLevelUpSelection clamps focus within the offered choice range", () => {
  const levelUpState = createLevelUpState({
    activeEventId: "lvlup-0001",
    currentOfferId: "lvlup-0001-offer-0001",
    offeredChoices: [
      { id: "edge_control", kind: "skill" },
      { id: "heavy_hand", kind: "talent" },
      { id: "sturdy_frame", kind: "talent" },
    ],
    selectedIndex: 1,
  });

  const movedLeft = moveLevelUpSelection({
    levelUpState,
    direction: -1,
  });
  const movedPastStart = moveLevelUpSelection({
    levelUpState: movedLeft,
    direction: -1,
  });
  const movedRight = moveLevelUpSelection({
    levelUpState: movedPastStart,
    direction: 1,
  });
  const movedPastEnd = moveLevelUpSelection({
    levelUpState: {
      ...levelUpState,
      selectedIndex: 2,
    },
    direction: 1,
  });

  assert.equal(movedLeft.selectedIndex, 0);
  assert.equal(movedPastStart.selectedIndex, 0);
  assert.equal(movedRight.selectedIndex, 1);
  assert.equal(movedPastEnd.selectedIndex, 2);
});

test("confirmLevelUpChoice consumes exactly one pending event and records the selected upgrade", () => {
  const progressionState = {
    level: 3,
    totalXp: 10,
    pendingLevelUps: [
      { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
      { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
    ],
    eventSeq: 2,
  };
  const upgradeState = createUpgradeState({
    appliedChoices: [{ id: "wide_slash", kind: "skill" }],
  });
  const openResult = beginLevelUpChoice({
    progressionState,
    upgradeState,
    levelUpState: createLevelUpState({
      offerRngState: createOfferSeed(0x1234abcd),
    }),
  });

  const confirmed = confirmLevelUpChoice({
    progressionState: openResult.progressionState,
    upgradeState,
    levelUpState: {
      ...openResult.levelUpState,
      selectedIndex: 1,
    },
  });

  assert.equal(confirmed.didConfirm, true);
  assert.equal(confirmed.chosenChoice.id, openResult.levelUpState.offeredChoices[1].id);
  assert.deepEqual(
    confirmed.progressionState.pendingLevelUps.map((event) => event.id),
    ["lvlup-0002"],
  );
  assert.deepEqual(
    confirmed.upgradeState.appliedChoices.map((choice) => choice.id),
    ["wide_slash", openResult.levelUpState.offeredChoices[1].id],
  );
  assert.equal(confirmed.levelUpState.activeEventId, null);
  assert.equal(confirmed.levelUpState.currentOfferId, null);
  assert.deepEqual(confirmed.levelUpState.offeredChoices, []);
  assert.equal(confirmed.levelUpState.selectedIndex, 0);
});

test("confirmed upgrades derive combat modifiers immediately from the chosen entry", () => {
  const confirmed = confirmLevelUpChoice({
    progressionState: {
      level: 3,
      totalXp: 10,
      pendingLevelUps: [{ id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 }],
      eventSeq: 1,
    },
    upgradeState: createUpgradeState({
      appliedChoices: [{ id: "wide_slash", kind: "skill" }],
    }),
    levelUpState: createLevelUpState({
      activeEventId: "lvlup-0001",
      currentOfferId: "lvlup-0001-offer-0001",
      offeredChoices: [
        {
          id: "edge_control",
          kind: "skill",
          nextRank: 1,
          maxRank: 1,
          effect: { kind: "attackRadius", amount: 0.22 },
        },
        {
          id: "heavy_hand",
          kind: "talent",
          nextRank: 1,
          maxRank: 3,
          effect: { kind: "attackDamage", amount: 2 },
        },
        {
          id: "sturdy_frame",
          kind: "talent",
          nextRank: 1,
          maxRank: 2,
          effect: { kind: "maxHp", amount: 12 },
        },
      ],
      selectedIndex: 1,
      offerSeq: 1,
      offerRngState: createOfferSeed(0x1234abcd),
    }),
  });

  assert.equal(confirmed.didConfirm, true);
  assert.equal(confirmed.upgradeState.talentModifiers.attackDamage, 2);
  assert.equal(confirmed.upgradeState.skillModifiers.attackRadius, 0);
  assert.equal(confirmed.upgradeState.appliedChoices.at(-1).id, "heavy_hand");
});

test("snapshot helpers expose stable levelUpState and upgradeState fields", () => {
  const levelUpState = summarizeLevelUpStateForSnapshot(
    createLevelUpState({
      activeEventId: "lvlup-0002",
      currentOfferId: "lvlup-0002-offer-0001",
      offeredChoices: [
        {
          id: "edge_control",
          kind: "skill",
          label: "Edge Control",
          description: "Extend slash reach slightly.",
          nextRank: 1,
          maxRank: 1,
          effect: { kind: "attackRadius", amount: 0.22 },
        },
        {
          id: "heavy_hand",
          kind: "talent",
          label: "Heavy Hand",
          description: "Increase attack damage.",
          nextRank: 1,
          maxRank: 3,
          effect: { kind: "attackDamage", amount: 2 },
        },
      ],
      selectedIndex: 1,
      rerollsRemaining: 1,
      offerSeq: 1,
      offerRngState: createOfferSeed(0x1234abcd),
    }),
  );
  const upgradeState = summarizeUpgradeStateForSnapshot(
    createUpgradeState({
      appliedChoices: [
        { id: "wide_slash", kind: "skill" },
        { id: "heavy_hand", kind: "talent" },
      ],
    }),
  );

  assert.deepEqual(levelUpState, {
    activeEventId: "lvlup-0002",
    currentOfferId: "lvlup-0002-offer-0001",
    offeredChoices: [
      {
        id: "edge_control",
        kind: "skill",
        nextRank: 1,
        maxRank: 1,
        effect: { kind: "attackRadius", amount: 0.22 },
      },
      {
        id: "heavy_hand",
        kind: "talent",
        nextRank: 1,
        maxRank: 3,
        effect: { kind: "attackDamage", amount: 2 },
      },
    ],
    selectedIndex: 1,
    rerollsRemaining: 1,
    offerSeq: 1,
    offerRngState: createOfferSeed(0x1234abcd),
  });
  assert.deepEqual(upgradeState, {
    appliedChoices: [
      { id: "wide_slash", kind: "skill" },
      { id: "heavy_hand", kind: "talent" },
    ],
    skillModifiers: {
      attackDamage: 0,
      maxHp: 0,
      moveSpeed: 0,
      attackRadius: 0,
      attackArc: 0.18,
      attackCooldown: 0,
    },
    talentModifiers: {
      attackDamage: 2,
      maxHp: 0,
      moveSpeed: 0,
      attackRadius: 0,
      attackArc: 0,
      attackCooldown: 0,
    },
  });
});

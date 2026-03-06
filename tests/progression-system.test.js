import test from "node:test";
import assert from "node:assert/strict";

import {
  LEVEL_THRESHOLDS,
  LEVEL_THRESHOLD_OVERFLOW_DELTA,
  XP_VALUES_BY_ENEMY_KIND,
} from "../src/progression-config.js";
import {
  applyEnemyKillXp,
  applyXpGain,
  createProgressionState,
  getLevelForXp,
  getLevelWindow,
  getThresholdXpForLevel,
  getXpValueForEnemyKind,
  summarizeProgressionStateForSnapshot,
} from "../src/progression-system.js";

test("progression config keeps xp values independent from score", () => {
  assert.deepEqual(XP_VALUES_BY_ENEMY_KIND, {
    leafling: 1,
    sparkowl: 1,
    embercub: 2,
  });
  assert.deepEqual(LEVEL_THRESHOLDS, [0, 4, 10, 18, 28, 40]);
  assert.equal(LEVEL_THRESHOLD_OVERFLOW_DELTA, 12);
  assert.equal(getXpValueForEnemyKind("leafling"), 1);
  assert.equal(getXpValueForEnemyKind("sparkowl"), 1);
  assert.equal(getXpValueForEnemyKind("embercub"), 2);
  assert.equal(getXpValueForEnemyKind("unknown"), 0);
});

test("level lookup and window calculations stay stable across explicit and overflow thresholds", () => {
  assert.equal(getThresholdXpForLevel(1), 0);
  assert.equal(getThresholdXpForLevel(2), 4);
  assert.equal(getThresholdXpForLevel(6), 40);
  assert.equal(getThresholdXpForLevel(7), 52);
  assert.equal(getThresholdXpForLevel(8), 64);

  assert.equal(getLevelForXp(0), 1);
  assert.equal(getLevelForXp(3), 1);
  assert.equal(getLevelForXp(4), 2);
  assert.equal(getLevelForXp(17), 3);
  assert.equal(getLevelForXp(18), 4);
  assert.equal(getLevelForXp(64), 8);

  assert.deepEqual(getLevelWindow(0), {
    level: 1,
    currentLevelStartXp: 0,
    nextLevelXp: 4,
  });
  assert.deepEqual(getLevelWindow(18), {
    level: 4,
    currentLevelStartXp: 18,
    nextLevelXp: 28,
  });
  assert.deepEqual(getLevelWindow(52), {
    level: 7,
    currentLevelStartXp: 52,
    nextLevelXp: 64,
  });
});

test("xp gains crossing multiple thresholds append pending events in ascending order", () => {
  const initialState = createProgressionState({
    level: 1,
    totalXp: 3,
    pendingLevelUps: [],
    eventSeq: 0,
  });

  const result = applyXpGain({
    progressionState: initialState,
    xpGain: 15,
  });

  assert.equal(result.leveledUp, true);
  assert.deepEqual(result.gainedEvents, [
    { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
    { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
    { id: "lvlup-0003", reachedLevel: 4, thresholdXp: 18 },
  ]);
  assert.deepEqual(result.progressionState, {
    level: 4,
    totalXp: 18,
    pendingLevelUps: [
      { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
      { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
      { id: "lvlup-0003", reachedLevel: 4, thresholdXp: 18 },
    ],
    eventSeq: 3,
  });
});

test("xp gains below the next threshold preserve queue and event sequence", () => {
  const initialState = createProgressionState({
    level: 2,
    totalXp: 4,
    pendingLevelUps: [{ id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 }],
    eventSeq: 1,
  });

  const result = applyXpGain({
    progressionState: initialState,
    xpGain: 5,
  });

  assert.equal(result.leveledUp, false);
  assert.deepEqual(result.gainedEvents, []);
  assert.deepEqual(result.progressionState, {
    level: 2,
    totalXp: 9,
    pendingLevelUps: [{ id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 }],
    eventSeq: 1,
  });
});

test("enemy kill xp flows through the progression reducer without touching score semantics", () => {
  const initialState = createProgressionState();

  const leaflingResult = applyEnemyKillXp({
    progressionState: initialState,
    enemyKind: "leafling",
  });
  const embercubResult = applyEnemyKillXp({
    progressionState: leaflingResult.progressionState,
    enemyKind: "embercub",
  });
  const finishingResult = applyEnemyKillXp({
    progressionState: embercubResult.progressionState,
    enemyKind: "embercub",
  });

  assert.equal(leaflingResult.xpGain, 1);
  assert.equal(embercubResult.xpGain, 2);
  assert.equal(finishingResult.leveledUp, true);
  assert.deepEqual(finishingResult.gainedEvents, [{ id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 }]);
  assert.deepEqual(finishingResult.progressionState, {
    level: 2,
    totalXp: 5,
    pendingLevelUps: [{ id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 }],
    eventSeq: 1,
  });
});

test("snapshot summary exposes stable progression fields for hud and replay assertions", () => {
  assert.deepEqual(
    summarizeProgressionStateForSnapshot({
      level: 3,
      totalXp: 13,
      pendingLevelUps: [
        { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
        { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
      ],
      eventSeq: 2,
    }),
    {
      level: 3,
      totalXp: 13,
      currentLevelStartXp: 10,
      nextLevelXp: 18,
      pendingLevelUpCount: 2,
      pendingLevelUps: [
        { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
        { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
      ],
      eventSeq: 2,
    },
  );
});

test("fresh progression state resets level, xp, queue, and event sequence to baseline", () => {
  assert.deepEqual(createProgressionState(), {
    level: 1,
    totalXp: 0,
    pendingLevelUps: [],
    eventSeq: 0,
  });
  assert.deepEqual(summarizeProgressionStateForSnapshot(createProgressionState()), {
    level: 1,
    totalXp: 0,
    currentLevelStartXp: 0,
    nextLevelXp: 4,
    pendingLevelUpCount: 0,
    pendingLevelUps: [],
    eventSeq: 0,
  });
});

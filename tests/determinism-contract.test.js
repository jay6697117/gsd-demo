import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDeterministicSnapshot,
  computeAdvanceSteps,
  DETERMINISM_SCHEMA_VERSION,
  MAX_ADVANCE_STEPS,
} from "../src/determinism-harness.js";
import { createSpawnDirectorState, planSpawnSector } from "../src/spawn-director.js";

function buildMockState() {
  return {
    mode: "playing",
    randomSeed: 5745092,
    time: 12.34567,
    score: 412.9,
    kills: 6,
    chain: 2,
    spawnCooldown: 0.4937,
    control: {
      pause: {
        lastTransition: "paused->playing",
        lastFrom: "paused",
        lastTo: "playing",
        lastReason: "key-p",
        lastAt: 11.23,
      },
      focus: {
        visibility: "visible",
        hasWindowFocus: true,
        recoveryPending: false,
        lastEvent: "window-focus",
        lastAt: 10.987,
      },
      fullscreen: {
        isFullscreen: false,
        lastIntent: "exit",
        lastSource: "escape-key",
        lastResult: "fulfilled",
        lastError: null,
        lastAt: 9.321,
        attemptCount: 2,
        failureCount: 0,
      },
    },
    player: {
      x: 1.23456,
      y: -2.34567,
      vx: 0.123456,
      vy: -0.987654,
      hp: 83.447,
      attackCooldown: 0.2168,
      invulnerable: 0,
      facingX: 1,
      facingY: 0,
    },
    enemies: [
      { id: 2, kind: "embercub", x: 2.1234, y: -0.2234, hp: 19.55, maxHp: 34 },
      { id: 1, kind: "leafling", x: -3.3333, y: 1.1111, hp: 25.01, maxHp: 26 },
    ],
    slashEffects: [{}, {}],
    particles: [{}, {}, {}],
    world: {
      currentSectorId: "hub",
      visitedSectorIds: ["hub", "north", "east"],
      transitionSeq: 3,
      breakables: [
        {
          id: "hub-crate-01",
          sectorId: "hub",
          archetypeId: "crate",
          x: 2.8,
          y: -0.6,
          hp: 21,
          maxHp: 21,
          broken: false,
        },
        {
          id: "north-cache-01",
          sectorId: "north",
          archetypeId: "cache",
          x: -1.8,
          y: -11.9,
          hp: 0,
          maxHp: 34,
          broken: true,
        },
      ],
      buildings: [
        {
          id: "hub-blocker-01",
          sectorId: "hub",
          archetypeId: "blocker",
          role: "blocker",
          shape: "compound-rect",
          colliders: [{}, {}],
          bounds: {
            minX: -4.7,
            maxX: -1.7,
            minY: -0.9,
            maxY: 0.9,
          },
        },
      ],
      tactics: {
        currentSectorId: "hub",
        buildingIds: ["hub-blocker-01"],
        roleCounts: [
          { role: "blocker", count: 1 },
          { role: "funnel", count: 0 },
          { role: "soft-cover", count: 0 },
        ],
        sectorEnemyCount: 3,
        lineBreakAvailable: true,
        funnelAvailable: false,
        retreatPocketAvailable: false,
        retreatPocketActive: false,
        cueLabel: "BREAK",
      },
      readability: {
        sectorLabel: "HUB",
        pressureLevel: "medium",
        pressureLabel: "TENSE",
        sectorEnemyCount: 3,
        mainLaneCount: 3,
        bypassLaneCount: 0,
        chokeCount: 3,
      },
    },
    loot: {
      groundDrops: [
        {
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
        },
      ],
      dropRngState: 3829104,
      eventSeq: 1,
      pendingPickupId: null,
    },
    equipment: {
      slots: {
        weapon: {
          id: "drop-0001-hub-crate-01",
          slot: "weapon",
          rarity: "common",
          statKey: "attackDamage",
          statValue: 4,
          sourcePropId: "hub-crate-01",
        },
        core: null,
        charm: null,
      },
      derivedStats: {
        attackDamage: 4,
        maxHp: 0,
        moveSpeed: 0,
      },
      compareCandidate: {
        dropId: "drop-0002-hub-cache-01",
        slot: "weapon",
        candidateItem: {
          id: "drop-0002-hub-cache-01",
          slot: "weapon",
          rarity: "rare",
          statKey: "attackDamage",
          statValue: 7,
          sourcePropId: "hub-cache-01",
        },
        equippedItem: {
          id: "drop-0001-hub-crate-01",
          slot: "weapon",
          rarity: "common",
          statKey: "attackDamage",
          statValue: 4,
          sourcePropId: "hub-crate-01",
        },
        statDelta: 3,
      },
    },
    levelUp: {
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
        {
          id: "swift_step",
          kind: "talent",
          label: "Swift Step",
          description: "Increase movement speed.",
          nextRank: 1,
          maxRank: 2,
          effect: { kind: "moveSpeed", amount: 0.35 },
        },
      ],
      selectedIndex: 2,
      rerollsRemaining: 1,
      offerSeq: 1,
      offerRngState: 2712847316,
    },
    upgrades: {
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
    },
    progression: {
      level: 3,
      totalXp: 13,
      pendingLevelUps: [
        { id: "lvlup-0001", reachedLevel: 2, thresholdXp: 4 },
        { id: "lvlup-0002", reachedLevel: 3, thresholdXp: 10 },
      ],
      eventSeq: 2,
    },
    spawnDirector: {
      eventSeq: 4,
      sectorWeights: [
        { sectorId: "hub", weight: 0.34 },
        { sectorId: "north", weight: 0.92 },
        { sectorId: "east", weight: 1.28 },
        { sectorId: "south", weight: 0.61 },
      ],
      sectorEnemyCounts: [
        { sectorId: "hub", count: 3 },
        { sectorId: "north", count: 1 },
        { sectorId: "east", count: 0 },
        { sectorId: "south", count: 2 },
      ],
      lastSpawnSectorId: "east",
      spawnCooldown: 0.4937,
      spawnRngState: 19088743,
    },
    feedback: {
      hitFlash: 0.33333,
      killFlash: 0.55555,
      dangerOverlay: 0.22222,
      killPriorityTimer: 0.11111,
      bannerText: "KO!",
      bannerKind: "kill",
      bannerTimer: 0.66666,
    },
    determinism: {
      lastAdvanceMs: 1000,
      lastAdvanceSteps: 60,
      totalAdvanceSteps: 120,
      renderBackend: "webgl",
      webglAvailable: true,
      renderError: null,
    },
  };
}

test("computeAdvanceSteps keeps fixed-step conversion deterministic", () => {
  const fixedStep = 1 / 60;

  assert.equal(computeAdvanceSteps(0, fixedStep), 1);
  assert.equal(computeAdvanceSteps(16.666, fixedStep), 1);
  assert.equal(computeAdvanceSteps(1000, fixedStep), 60);
  assert.equal(computeAdvanceSteps(-15, fixedStep), 1);
  assert.equal(computeAdvanceSteps(1000, 1 / 30), 30);
  assert.equal(computeAdvanceSteps(1000, 0), 60);
  assert.equal(computeAdvanceSteps(60 * 60 * 1000, fixedStep), MAX_ADVANCE_STEPS);
});

test("snapshot includes stable schema/version and required sections", () => {
  const snapshot = buildDeterministicSnapshot({
    state: buildMockState(),
    keyboardDown: new Set(["KeyW", "KeyF"]),
    pressedThisStep: new Set(["Space"]),
    fixedStepSeconds: 1 / 60,
    particleCap: 120,
    sortedKeysFn: (keys) => Array.from(keys).sort((a, b) => a.localeCompare(b)),
    manualSteppingMode: false,
  });

  assert.equal(DETERMINISM_SCHEMA_VERSION, "1.4.0");
  assert.equal(snapshot.schemaVersion, DETERMINISM_SCHEMA_VERSION);
  assert.equal(typeof snapshot.determinism.fixedStepSeconds, "number");
  assert.equal(typeof snapshot.determinism.lastAdvanceSteps, "number");
  assert.equal(snapshot.determinism.totalAdvanceSteps, 120);
  assert.equal(snapshot.determinism.renderBackend, "webgl");
  assert.equal(snapshot.determinism.webglAvailable, true);
  assert.equal(typeof snapshot.mode, "string");
  assert.equal(typeof snapshot.time, "number");
  assert.equal(typeof snapshot.player.hp, "number");
  assert.equal(Array.isArray(snapshot.enemies), true);
  assert.equal(Array.isArray(snapshot.inputState.pressedKeys), true);
  assert.equal(snapshot.inputState.edgeCount, 1);
  assert.deepEqual(snapshot.world.visitedSectorIds, ["hub", "north", "east"]);
  assert.equal(Array.isArray(snapshot.world.breakables), true);
  assert.deepEqual(snapshot.world.breakables[0], {
    id: "hub-crate-01",
    sectorId: "hub",
    archetypeId: "crate",
    maxHp: 21,
    hp: 21,
    broken: false,
    x: 2.8,
    y: -0.6,
  });
  assert.equal(snapshot.world.breakables[1].broken, true);
  assert.equal(Array.isArray(snapshot.world.buildings), true);
  assert.equal(snapshot.world.buildings[0].id, "hub-blocker-01");
  assert.equal(snapshot.world.buildings[0].colliderCount, 2);
  assert.equal(snapshot.world.tactics.currentSectorId, "hub");
  assert.deepEqual(
    snapshot.world.tactics.roleCounts,
    [
      { role: "blocker", count: 1 },
      { role: "funnel", count: 0 },
      { role: "soft-cover", count: 0 },
    ],
  );
  assert.equal(snapshot.world.tactics.lineBreakAvailable, true);
  assert.equal(snapshot.world.tactics.retreatPocketActive, false);
  assert.equal(snapshot.world.tactics.cueLabel, "BREAK");
  assert.equal(snapshot.world.readability.sectorLabel, "HUB");
  assert.equal(snapshot.world.readability.pressureLevel, "medium");
  assert.equal(snapshot.world.readability.pressureLabel, "TENSE");
  assert.equal(snapshot.lootState.eventSeq, 1);
  assert.equal(snapshot.lootState.pendingPickupId, null);
  assert.deepEqual(snapshot.lootState.groundDrops[0], {
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
  assert.equal(snapshot.lootState.dropRngState, 3829104);
  assert.equal(snapshot.equipmentState.derivedStats.attackDamage, 4);
  assert.equal(snapshot.equipmentState.slots.weapon.id, "drop-0001-hub-crate-01");
  assert.equal(snapshot.equipmentState.compareCandidate.slot, "weapon");
  assert.equal(snapshot.equipmentState.compareCandidate.statDelta, 3);
  assert.deepEqual(snapshot.levelUpState, {
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
      {
        id: "swift_step",
        kind: "talent",
        nextRank: 1,
        maxRank: 2,
        effect: { kind: "moveSpeed", amount: 0.35 },
      },
    ],
    selectedIndex: 2,
    rerollsRemaining: 1,
    offerSeq: 1,
    offerRngState: 2712847316,
  });
  assert.deepEqual(snapshot.upgradeState, {
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
  assert.deepEqual(snapshot.progressionState, {
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
  });
  assert.equal(snapshot.spawnState.lastSpawnSectorId, "east");
  assert.equal(snapshot.spawnState.spawnCooldown, 0.494);
  assert.deepEqual(
    snapshot.spawnState.sectorWeights.map((entry) => entry.sectorId),
    ["hub", "north", "east", "south"],
  );
  assert.deepEqual(snapshot.rngState, {
    runSeed: 5745092,
    spawnRngState: 19088743,
    dropRngState: 3829104,
    offerRngState: 2712847316,
  });
});

test("snapshot output remains deterministic for equivalent inputs", () => {
  const sharedState = buildMockState();
  const options = {
    state: sharedState,
    keyboardDown: new Set(["KeyW", "KeyF"]),
    pressedThisStep: new Set(["Space"]),
    fixedStepSeconds: 1 / 60,
    particleCap: 120,
    sortedKeysFn: (keys) => Array.from(keys).sort((a, b) => a.localeCompare(b)),
    manualSteppingMode: true,
  };

  const first = buildDeterministicSnapshot(options);
  const second = buildDeterministicSnapshot(options);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.world.tactics, second.world.tactics);
});

test("snapshot sorts enemy records by id for stable assertions", () => {
  const snapshot = buildDeterministicSnapshot({
    state: buildMockState(),
    keyboardDown: new Set(),
    pressedThisStep: new Set(),
    fixedStepSeconds: 1 / 60,
    particleCap: 120,
    manualSteppingMode: false,
  });

  assert.deepEqual(
    snapshot.enemies.map((enemy) => enemy.id),
    [1, 2],
  );
});

test("spawn-sector event sequence remains deterministic for an equivalent timeline", () => {
  const sectorIds = ["hub", "north", "east", "south"];
  const timeline = [0.12, 0.62, 0.31, 0.88];

  const runTimeline = () => {
    let directorState = createSpawnDirectorState({
      sectorIds,
      spawnCooldown: 0.75,
      spawnRngState: 41,
    });

    return timeline.map((rngValue, index) => {
      const result = planSpawnSector({
        directorState,
        sectorIds,
        playerSectorId: index % 2 === 0 ? "hub" : "north",
        sectorEnemyCounts: directorState.sectorEnemyCounts,
        heatState: {
          danger: 0.45,
          hotSectorId: "hub",
          reliefSectorId: "east",
          sideBufferActive: index > 1,
          lastSpawnSectorId: directorState.lastSpawnSectorId,
        },
        activeEnemyCount: index + 2,
        maxActiveEnemies: 26,
        perSectorSoftCap: 4,
        rngValue,
        spawnRngState: directorState.spawnRngState + 17,
        spawnCooldown: 0.2 + index * 0.05,
      });

      directorState = result.directorState;
      return {
        selectedSectorId: result.selectedSectorId,
        eventSeq: directorState.eventSeq,
        spawnCooldown: directorState.spawnCooldown,
      };
    });
  };

  assert.deepEqual(runTimeline(), runTimeline());
});

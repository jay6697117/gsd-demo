import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDeterministicSnapshot,
  computeAdvanceSteps,
  DETERMINISM_SCHEMA_VERSION,
  MAX_ADVANCE_STEPS,
} from "../src/determinism-harness.js";

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

import assert from "node:assert/strict";
import path from "node:path";

import {
  DEFAULT_HOST,
  attachRuntimeCollectors,
  assertNoCriticalRuntimeErrors,
  cleanupSession,
  createBrowserPage,
  ensureGameReady,
  holdKeyUntil,
  readSnapshot,
  spawnDevServer,
  startGame,
  advance,
  waitForServer,
  writeArtifacts,
} from "./helpers/playwright-game.js";

const PORT = 4182;
const BASE_URL = `http://${DEFAULT_HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-11");

function normalizeSnapshotForReplay(snapshot) {
  const normalized = structuredClone(snapshot);

  if (normalized.pauseState) {
    normalized.pauseState.lastAt = 0;
  }
  if (normalized.fullscreenState) {
    normalized.fullscreenState.lastAt = 0;
  }
  if (normalized.focusState) {
    normalized.focusState.lastAt = 0;
  }

  return normalized;
}

async function runOpeningLevelUpRoute(page, attackCount = 3) {
  let snapshot = await readSnapshot(page);

  for (let index = 0; index < attackCount; index += 1) {
    if (snapshot.mode === "levelup_choice") {
      return snapshot;
    }
    if (snapshot.mode === "equip_compare") {
      await page.keyboard.press("Escape");
      snapshot = await advance(page, 240);
    }
    await page.keyboard.press("Space");
    snapshot = await advance(page, 360);
  }

  return snapshot;
}

async function resolveLevelUpWithReroll(page, snapshot) {
  assert.equal(snapshot.mode, "levelup_choice", `Expected levelup_choice before reroll. snapshot=${JSON.stringify(snapshot)}`);
  const initialOfferId = snapshot.levelUpState?.currentOfferId;

  await page.keyboard.press("KeyR");
  snapshot = await advance(page, 180);

  assert.equal(snapshot.mode, "levelup_choice", `Expected reroll to keep levelup_choice active. snapshot=${JSON.stringify(snapshot)}`);
  assert.equal(snapshot.levelUpState?.rerollsRemaining, 0, `Expected reroll budget to be consumed. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
  assert.notEqual(snapshot.levelUpState?.currentOfferId, initialOfferId, `Expected reroll to rotate offer identity. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
  assert.equal(snapshot.levelUpState?.offeredChoices?.length, 3, `Expected reroll to preserve 3 offers. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);

  const rerolledChoices = snapshot.levelUpState.offeredChoices;
  await page.keyboard.press("Enter");
  snapshot = await advance(page, 240);

  assert.equal(snapshot.mode, "playing", `Expected levelup confirm to resume play. snapshot=${JSON.stringify(snapshot)}`);
  assert.equal(snapshot.progressionState?.pendingLevelUpCount, 0, `Expected pending queue to consume one event. progressionState=${JSON.stringify(snapshot.progressionState)}`);
  assert.ok((snapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected at least one applied upgrade. upgradeState=${JSON.stringify(snapshot.upgradeState)}`);
  assert.equal(snapshot.upgradeState?.appliedChoices?.[0]?.id, rerolledChoices[0]?.id, `Expected confirmed choice to match first rerolled offer. upgradeState=${JSON.stringify(snapshot.upgradeState)}`);

  return snapshot;
}

async function resolveHubWeaponFlow(page) {
  let snapshot = await holdKeyUntil(page, "KeyD", (state) => state.player.x >= 1.4, {
    label: "reach hub breakable lane",
  });

  await page.keyboard.press("Space");
  snapshot = await advance(page, 320);

  assert.equal(
    snapshot.world?.breakables?.find((breakable) => breakable.id === "hub-crate-01")?.broken,
    true,
    `Expected hub-crate-01 to be broken. breakables=${JSON.stringify(snapshot.world?.breakables)}`,
  );

  snapshot = await holdKeyUntil(page, "KeyD", (state) => state.equipmentState?.slots?.weapon !== null, {
    label: "auto equip hub weapon",
    maxSteps: 18,
  });

  assert.ok(snapshot.equipmentState?.slots?.weapon, `Expected hub weapon auto-equip. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
  return snapshot;
}

async function traverseThreeSectors(page) {
  let snapshot = await holdKeyUntil(
    page,
    "KeyW",
    (state) => state.world?.currentSectorId === "north" && state.world?.visitedCount >= 2,
    { label: "enter north sector", maxSteps: 24 },
  );

  snapshot = await holdKeyUntil(
    page,
    "KeyS",
    (state) =>
      state.world?.currentSectorId === "hub" &&
      state.world?.visitedCount >= 2 &&
      state.player.y >= -0.5,
    { label: "return to hub center lane", maxSteps: 26 },
  );

  snapshot = await holdKeyUntil(
    page,
    "KeyD",
    (state) => state.world?.currentSectorId === "east" && state.world?.visitedCount >= 3,
    { label: "enter east sector", maxSteps: 28 },
  );

  return advance(page, 240);
}

async function runDeterministicSession(label, server) {
  const screenshotPath = path.join(ARTIFACT_DIR, `determinism-replay-${label}.png`);
  const statePath = path.join(ARTIFACT_DIR, `determinism-replay-${label}.json`);
  const consolePath = path.join(ARTIFACT_DIR, `determinism-replay-${label}-console.json`);

  let browser;
  let page;
  let collectors = { pageErrors: [], consoleMessages: [] };

  try {
    ({ browser, page } = await createBrowserPage());
    collectors = attachRuntimeCollectors(page);
    await ensureGameReady(page, BASE_URL);

    let snapshot = await startGame(page, 900);
    snapshot = await runOpeningLevelUpRoute(page, 3);
    snapshot = await resolveLevelUpWithReroll(page, snapshot);
    snapshot = await resolveHubWeaponFlow(page);
    snapshot = await traverseThreeSectors(page);
    const finalSnapshot = await readSnapshot(page);

    assert.ok(finalSnapshot.world?.visitedCount >= 3, `Expected traversal across at least 3 sectors. world=${JSON.stringify(finalSnapshot.world)}`);
    assert.ok(finalSnapshot.equipmentState?.slots?.weapon !== null, `Expected deterministic route to keep equipped weapon. equipmentState=${JSON.stringify(finalSnapshot.equipmentState)}`);
    assert.ok((finalSnapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected deterministic route to include at least one chosen upgrade. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)}`);

    await writeArtifacts({
      screenshotPath,
      statePath,
      consolePath,
      page,
      state: {
        label,
        finalSnapshot,
        normalizedFinalSnapshot: normalizeSnapshotForReplay(finalSnapshot),
      },
      consoleMessages: collectors.consoleMessages,
    });

    await assertNoCriticalRuntimeErrors(collectors);
    return finalSnapshot;
  } finally {
    await cleanupSession({ page, browser });
    if (server?.exitCode !== null && server.exitCode !== 0) {
      throw new Error(`Dev server exited unexpectedly with code ${server.exitCode}`);
    }
  }
}

async function run() {
  const server = spawnDevServer({ port: PORT });

  try {
    await waitForServer(BASE_URL);
    const runA = await runDeterministicSession("run-a", server);
    const runB = await runDeterministicSession("run-b", server);

    const normalizedRunA = normalizeSnapshotForReplay(runA);
    const normalizedRunB = normalizeSnapshotForReplay(runB);

    assert.deepEqual(
      normalizedRunA,
      normalizedRunB,
      "Expected deterministic replay route to produce identical normalized snapshots across two fresh sessions.",
    );
  } finally {
    await cleanupSession({ server });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

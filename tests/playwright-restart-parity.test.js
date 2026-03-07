import assert from "node:assert/strict";
import path from "node:path";

import {
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

const PORT = 4184;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-11");
const PNG_PATH = path.join(ARTIFACT_DIR, "restart-parity-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "restart-parity-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "restart-parity-console.json");

async function runOpeningLevelUpRoute(page, attackCount = 3) {
  let snapshot = await readSnapshot(page);

  for (let index = 0; index < attackCount; index += 1) {
    if (snapshot.mode === "equip_compare") {
      await page.keyboard.press("Escape");
      snapshot = await advance(page, 240);
    }
    if (snapshot.mode === "levelup_choice") {
      return snapshot;
    }
    await page.keyboard.press("Space");
    snapshot = await advance(page, 360);
  }

  return snapshot;
}

async function resolveLevelUpChoice(page, snapshot) {
  assert.equal(snapshot.mode, "levelup_choice", `Expected levelup_choice before confirm. snapshot=${JSON.stringify(snapshot)}`);
  await page.keyboard.press("Enter");
  snapshot = await advance(page, 240);
  assert.equal(snapshot.mode, "playing", `Expected levelup confirm to resume play. snapshot=${JSON.stringify(snapshot)}`);
  assert.ok((snapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected at least one applied upgrade after confirm. upgradeState=${JSON.stringify(snapshot.upgradeState)}`);
  return snapshot;
}

async function resolveHubWeaponFlow(page) {
  let snapshot = await holdKeyUntil(page, "KeyD", (state) => state.player.x >= 1.4, {
    label: "reach hub breakable lane",
  });

  await page.keyboard.press("Space");
  snapshot = await advance(page, 320);

  snapshot = await holdKeyUntil(page, "KeyD", (state) => state.equipmentState?.slots?.weapon !== null, {
    label: "auto equip hub weapon",
    maxSteps: 18,
  });

  assert.ok(snapshot.equipmentState?.slots?.weapon, `Expected a weapon equip before restart. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
  return snapshot;
}

async function waitForGameOver(page, maxSteps = 40) {
  let snapshot = await readSnapshot(page);
  for (let step = 0; step < maxSteps; step += 1) {
    if (snapshot.mode === "gameover") {
      return snapshot;
    }
    snapshot = await advance(page, 400);
  }
  throw new Error(`Expected gameover before restart parity assertion. snapshot=${JSON.stringify(snapshot)}`);
}

async function run() {
  const server = spawnDevServer({ port: PORT });
  let browser;
  let page;
  let collectors = { pageErrors: [], consoleMessages: [] };

  try {
    await waitForServer(BASE_URL);

    ({ browser, page } = await createBrowserPage());
    collectors = attachRuntimeCollectors(page);
    await ensureGameReady(page, BASE_URL);

    const baselineSnapshot = await startGame(page, 900);

    let snapshot = await runOpeningLevelUpRoute(page, 3);
    snapshot = await resolveLevelUpChoice(page, snapshot);
    snapshot = await resolveHubWeaponFlow(page);

    const preRestartSnapshot = await readSnapshot(page);
    assert.ok(preRestartSnapshot.equipmentState?.slots?.weapon !== null, `Expected equipped weapon before restart. equipmentState=${JSON.stringify(preRestartSnapshot.equipmentState)}`);
    assert.ok((preRestartSnapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected applied upgrade before restart. upgradeState=${JSON.stringify(preRestartSnapshot.upgradeState)}`);
    assert.ok((preRestartSnapshot.progressionState?.level ?? 1) >= 2, `Expected progression level increase before restart. progressionState=${JSON.stringify(preRestartSnapshot.progressionState)}`);

    await waitForGameOver(page);
    await page.click("#restart-btn");
    await advance(page, 1200);

    const restartedSnapshot = await readSnapshot(page);
    await writeArtifacts({
      screenshotPath: PNG_PATH,
      statePath: STATE_PATH,
      consolePath: CONSOLE_PATH,
      page,
      state: {
        baselineSnapshot,
        preRestartSnapshot,
        restartedSnapshot,
      },
      consoleMessages: collectors.consoleMessages,
    });

    assert.equal(restartedSnapshot.mode, "playing", `Expected restart to resume play. snapshot=${JSON.stringify(restartedSnapshot)}`);
    assert.deepEqual(restartedSnapshot.equipmentState, baselineSnapshot.equipmentState, `Expected equipmentState to reset to baseline. equipmentState=${JSON.stringify(restartedSnapshot.equipmentState)}`);
    assert.deepEqual(restartedSnapshot.lootState, baselineSnapshot.lootState, `Expected lootState to reset to baseline. lootState=${JSON.stringify(restartedSnapshot.lootState)}`);
    assert.deepEqual(restartedSnapshot.progressionState, baselineSnapshot.progressionState, `Expected progressionState to reset to baseline. progressionState=${JSON.stringify(restartedSnapshot.progressionState)}`);
    assert.deepEqual(restartedSnapshot.levelUpState, baselineSnapshot.levelUpState, `Expected levelUpState to reset to baseline. levelUpState=${JSON.stringify(restartedSnapshot.levelUpState)}`);
    assert.deepEqual(restartedSnapshot.upgradeState, baselineSnapshot.upgradeState, `Expected upgradeState to reset to baseline. upgradeState=${JSON.stringify(restartedSnapshot.upgradeState)}`);
    assert.equal(restartedSnapshot.rngState?.runSeed, baselineSnapshot.rngState?.runSeed, `Expected runSeed to reset to baseline. rngState=${JSON.stringify(restartedSnapshot.rngState)}`);
    assert.equal(restartedSnapshot.rngState?.dropRngState, baselineSnapshot.rngState?.dropRngState, `Expected dropRngState to reset to baseline. rngState=${JSON.stringify(restartedSnapshot.rngState)}`);
    assert.equal(restartedSnapshot.rngState?.offerRngState, baselineSnapshot.rngState?.offerRngState, `Expected offerRngState to reset to baseline. rngState=${JSON.stringify(restartedSnapshot.rngState)}`);

    await assertNoCriticalRuntimeErrors(collectors);
  } finally {
    await cleanupSession({ page, browser, server });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

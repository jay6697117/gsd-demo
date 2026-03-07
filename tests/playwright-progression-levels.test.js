import assert from "node:assert/strict";
import path from "node:path";

import {
  attachRuntimeCollectors,
  assertNoCriticalRuntimeErrors,
  cleanupSession,
  createBrowserPage,
  ensureGameReady,
  readSnapshot,
  spawnDevServer,
  startGame,
  advance,
  waitForServer,
  writeArtifacts,
} from "./helpers/playwright-game.js";

const PORT = 4179;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-09");
const PNG_PATH = path.join(ARTIFACT_DIR, "progression-levels-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "progression-levels-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "progression-levels-console.json");

async function resolveCompareModeIfNeeded(page, snapshot) {
  if (snapshot.mode !== "equip_compare") {
    return snapshot;
  }
  await page.keyboard.press("Escape");
  return advance(page, 240);
}

async function resolveLevelUpChoiceIfNeeded(page, snapshot) {
  if (snapshot.mode !== "levelup_choice") {
    return snapshot;
  }
  await page.keyboard.press("Enter");
  return advance(page, 240);
}

async function runOpeningLevelUpRoute(page, attackCount = 3) {
  let snapshot = await readSnapshot(page);

  for (let index = 0; index < attackCount; index += 1) {
    snapshot = await resolveCompareModeIfNeeded(page, snapshot);
    await page.keyboard.press("Space");
    snapshot = await advance(page, 360);
  }

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
  throw new Error(`Expected gameover while validating restart parity. snapshot=${JSON.stringify(snapshot)}`);
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

    let snapshot = await startGame(page, 900);
    const initialSnapshot = snapshot;

    snapshot = await runOpeningLevelUpRoute(page, 3);

    const postLevelSnapshot = snapshot;
    assert.ok((postLevelSnapshot.progressionState?.level ?? 1) >= 2, `Expected scripted combat route to reach level 2. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    assert.ok(postLevelSnapshot.progressionState?.pendingLevelUpCount >= 1, `Expected at least one pending level-up event. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    assert.equal(postLevelSnapshot.mode, "levelup_choice", `Expected threshold crossing to enter levelup_choice. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    assert.equal(postLevelSnapshot.levelUpState?.activeEventId, postLevelSnapshot.progressionState?.pendingLevelUps?.[0]?.id, `Expected active level-up session to consume queue head. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    assert.ok(String(postLevelSnapshot.feedback?.bannerText || "").includes("LEVEL UP"), `Expected LEVEL UP banner after threshold crossing. feedback=${JSON.stringify(postLevelSnapshot.feedback)}`);

    const hudText = await page.locator("#hud").textContent();
    assert.ok(hudText?.includes("Lvl 2"), `HUD is missing level display. hud=${JSON.stringify(hudText)}`);

    const postChoiceSnapshot = await resolveLevelUpChoiceIfNeeded(page, postLevelSnapshot);
    assert.ok((postChoiceSnapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected level-up confirm to apply one upgrade. upgradeState=${JSON.stringify(postChoiceSnapshot.upgradeState)}`);
    assert.equal(postChoiceSnapshot.progressionState?.pendingLevelUpCount ?? 0, 0, `Expected pending level-up queue to drain after confirm. progressionState=${JSON.stringify(postChoiceSnapshot.progressionState)}`);

    await waitForGameOver(page);
    await page.click("#restart-btn");
    snapshot = await advance(page, 1200);

    const restartedSnapshot = await readSnapshot(page);
    await writeArtifacts({
      screenshotPath: PNG_PATH,
      statePath: STATE_PATH,
      consolePath: CONSOLE_PATH,
      page,
      state: {
        initialSnapshot,
        postLevelSnapshot,
        postChoiceSnapshot,
        restartedSnapshot,
        hudText,
      },
      consoleMessages: collectors.consoleMessages,
    });

    assert.equal(restartedSnapshot.mode, "playing", `Expected restart to return to playing. snapshot=${JSON.stringify(restartedSnapshot)}`);
    assert.equal(restartedSnapshot.levelUpState?.activeEventId, null, `Expected no active level-up state after restart. levelUpState=${JSON.stringify(restartedSnapshot.levelUpState)}`);
    assert.equal((restartedSnapshot.upgradeState?.appliedChoices?.length ?? 0), 0, `Expected upgrade state reset after restart. upgradeState=${JSON.stringify(restartedSnapshot.upgradeState)}`);
    assert.deepEqual(
      restartedSnapshot.progressionState,
      {
        level: 1,
        totalXp: 0,
        currentLevelStartXp: 0,
        nextLevelXp: 4,
        pendingLevelUpCount: 0,
        pendingLevelUps: [],
        eventSeq: 0,
      },
      `Expected progression reset after restart. progressionState=${JSON.stringify(restartedSnapshot.progressionState)}`,
    );

    await assertNoCriticalRuntimeErrors(collectors);
  } finally {
    await cleanupSession({ page, browser, server });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

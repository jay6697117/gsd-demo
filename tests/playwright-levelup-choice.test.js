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

const PORT = 4181;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-10");
const PNG_PATH = path.join(ARTIFACT_DIR, "levelup-choice-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "levelup-choice-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "levelup-choice-console.json");

function readModifierValue(upgradeState, choice) {
  const bucket = choice?.kind === "skill" ? upgradeState?.skillModifiers : upgradeState?.talentModifiers;
  return bucket?.[choice?.effect?.kind] ?? null;
}

async function runOpeningLevelUpRoute(page, attackCount = 3) {
  let snapshot = await readSnapshot(page);
  for (let index = 0; index < attackCount; index += 1) {
    if (snapshot.mode === "equip_compare") {
      await page.keyboard.press("Escape");
      snapshot = await advance(page, 240);
    }
    await page.keyboard.press("Space");
    snapshot = await advance(page, 360);
  }
  return snapshot;
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

    snapshot = await runOpeningLevelUpRoute(page, 3);
    assert.equal(snapshot.mode, "levelup_choice", `Expected levelup_choice mode. snapshot=${JSON.stringify(snapshot)}`);
    assert.equal(snapshot.progressionState?.pendingLevelUps?.[0]?.id, snapshot.levelUpState?.activeEventId, `Expected queue head to be the active level-up event. snapshot=${JSON.stringify(snapshot)}`);
    assert.equal(snapshot.levelUpState?.rerollsRemaining, 1, `Expected one reroll budget before reroll. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    assert.equal(snapshot.levelUpState?.offeredChoices?.length, 3, `Expected exactly 3 initial offers. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);

    const initialOfferId = snapshot.levelUpState.currentOfferId;
    const initialOfferRngState = snapshot.levelUpState.offerRngState;
    await page.keyboard.press("KeyR");
    snapshot = await advance(page, 180);

    assert.equal(snapshot.mode, "levelup_choice", `Expected reroll to stay inside levelup_choice. snapshot=${JSON.stringify(snapshot)}`);
    assert.equal(snapshot.levelUpState?.rerollsRemaining, 0, `Expected reroll budget to drop to zero. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    assert.notEqual(snapshot.levelUpState?.currentOfferId, initialOfferId, `Expected reroll to advance offer identity. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    assert.notEqual(snapshot.levelUpState?.offerRngState, initialOfferRngState, `Expected reroll to advance offer RNG state. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    assert.equal(snapshot.levelUpState?.offeredChoices?.length, 3, `Expected rerolled panel to keep exactly 3 choices. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);

    const rerolledChoices = snapshot.levelUpState.offeredChoices;
    const chosenChoice = rerolledChoices[0];
    await page.keyboard.press("Enter");
    snapshot = await advance(page, 240);

    const finalSnapshot = await readSnapshot(page);
    await writeArtifacts({
      screenshotPath: PNG_PATH,
      statePath: STATE_PATH,
      consolePath: CONSOLE_PATH,
      page,
      state: {
        initialOfferId,
        initialOfferRngState,
        rerolledChoices,
        finalSnapshot,
      },
      consoleMessages: collectors.consoleMessages,
    });

    assert.equal(finalSnapshot.mode, "playing", `Expected choice confirm to resume playing. snapshot=${JSON.stringify(finalSnapshot)}`);
    assert.equal(finalSnapshot.levelUpState?.activeEventId, null, `Expected no active level-up session after confirm. levelUpState=${JSON.stringify(finalSnapshot.levelUpState)}`);
    assert.equal(finalSnapshot.progressionState?.pendingLevelUpCount ?? 0, 0, `Expected pending level-up queue to consume one event. progressionState=${JSON.stringify(finalSnapshot.progressionState)}`);
    assert.ok((finalSnapshot.upgradeState?.appliedChoices?.length ?? 0) >= 1, `Expected at least one applied upgrade after confirm. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)}`);
    assert.equal(finalSnapshot.upgradeState?.appliedChoices?.[0]?.id, chosenChoice.id, `Expected chosen upgrade to be recorded first. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)} chosen=${JSON.stringify(chosenChoice)}`);
    assert.equal(readModifierValue(finalSnapshot.upgradeState, chosenChoice), chosenChoice.effect.amount, `Expected applied modifier to match chosen effect. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)} choice=${JSON.stringify(chosenChoice)}`);

    await assertNoCriticalRuntimeErrors(collectors);
  } finally {
    await cleanupSession({ page, browser, server });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

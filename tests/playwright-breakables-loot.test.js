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

const PORT = 4178;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-08");
const PNG_PATH = path.join(ARTIFACT_DIR, "breakables-loot-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "breakables-loot-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "breakables-loot-console.json");

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

    let snapshot = await startGame(page, 800);

    snapshot = await holdKeyUntil(page, "KeyD", (state) => state.player.x >= 1.4, {
      label: "reach first breakable attack lane",
    });
    await page.keyboard.press("Space");
    snapshot = await advance(page, 320);

    const firstBreakable = snapshot.world?.breakables?.find((breakable) => breakable.id === "hub-crate-01");
    assert.equal(firstBreakable?.broken, true, `Expected first breakable to be destroyed. breakables=${JSON.stringify(snapshot.world?.breakables)}`);
    assert.equal(snapshot.lootState?.eventSeq, 1, `Expected first destroy to advance drop event sequence once. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.ok(snapshot.lootState?.dropRngState > 0, `Expected drop RNG state to advance after first destroy. lootState=${JSON.stringify(snapshot.lootState)}`);

    snapshot = await holdKeyUntil(page, "KeyD", (state) => state.equipmentState?.slots?.weapon !== null, {
      label: "auto equip first weapon drop",
      maxSteps: 18,
    });
    const equippedWeapon = snapshot.equipmentState?.slots?.weapon;
    assert.ok(equippedWeapon, `Expected first auto-equip weapon. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
    assert.equal(snapshot.lootState?.pendingPickupId, null, `Expected no pending pickup after auto-equip. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.equal(snapshot.lootState?.groundDrops?.length ?? 0, 0, `Expected first ground drop to be consumed. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.equal(snapshot.equipmentState?.derivedStats?.attackDamage, equippedWeapon.statValue, `Expected derived attack bonus to match equipped weapon. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);

    snapshot = await holdKeyUntil(page, "KeyD", (state) => state.player.x >= 4.3, {
      label: "move into second breakable lane",
      maxSteps: 24,
    });
    snapshot = await holdKeyUntil(page, "KeyS", (state) => state.player.y >= 0.8, {
      label: "align with second breakable",
      maxSteps: 14,
    });
    await page.keyboard.press("Space");
    snapshot = await advance(page, 320);

    const secondBreakable = snapshot.world?.breakables?.find((breakable) => breakable.id === "hub-cache-01");
    assert.equal(secondBreakable?.broken, true, `Expected second breakable to be destroyed. breakables=${JSON.stringify(snapshot.world?.breakables)}`);
    assert.ok(snapshot.lootState?.groundDrops?.some((drop) => drop.sourcePropId === "hub-cache-01"), `Expected second ground drop to originate from hub-cache-01. lootState=${JSON.stringify(snapshot.lootState)}`);

    snapshot = await holdKeyUntil(page, "KeyD", (state) => state.mode === "equip_compare", {
      label: "trigger compare pickup",
      maxSteps: 18,
    });

    const compareCandidate = snapshot.equipmentState?.compareCandidate;
    assert.ok(compareCandidate, `Expected compare candidate after second pickup. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
    assert.equal(snapshot.lootState?.pendingPickupId, compareCandidate.dropId, `Expected pending pickup to match compare candidate. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.equal(snapshot.lootState?.groundDrops?.length, 1, `Expected only one compare drop to remain on ground. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.equal(snapshot.lootState?.groundDrops?.[0]?.id, compareCandidate.dropId, `Expected compare drop to stay addressable in groundDrops. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.ok(snapshot.lootState?.dropRngState > 0, `Expected drop RNG state to remain visible during compare. lootState=${JSON.stringify(snapshot.lootState)}`);
    assert.equal(snapshot.equipmentState?.slots?.weapon?.id, equippedWeapon.id, `Expected current weapon to stay equipped during compare. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);

    const comparedValue = compareCandidate.candidateItem?.statValue;
    await page.keyboard.press("Enter");
    snapshot = await advance(page, 240);

    const hudText = await page.locator("#hud").textContent();
    const finalSnapshot = await readSnapshot(page);

    await writeArtifacts({
      screenshotPath: PNG_PATH,
      statePath: STATE_PATH,
      consolePath: CONSOLE_PATH,
      page,
      state: {
        hudText,
        initialWeapon: equippedWeapon,
        compareCandidate,
        finalSnapshot,
      },
      consoleMessages: collectors.consoleMessages,
    });

    assert.equal(finalSnapshot.mode, "playing", `Expected compare mode to resolve back to playing. mode=${finalSnapshot.mode}`);
    assert.equal(finalSnapshot.equipmentState?.slots?.weapon?.statValue, comparedValue, `Expected accepted weapon stat to match compare candidate. equipmentState=${JSON.stringify(finalSnapshot.equipmentState)}`);
    assert.equal(finalSnapshot.equipmentState?.compareCandidate, null, `Expected compare candidate to clear after accept. equipmentState=${JSON.stringify(finalSnapshot.equipmentState)}`);
    assert.equal(finalSnapshot.lootState?.pendingPickupId, null, `Expected no pending pickup after accept. lootState=${JSON.stringify(finalSnapshot.lootState)}`);
    assert.equal(finalSnapshot.lootState?.groundDrops?.length ?? 0, 0, `Expected no remaining ground drops after accept. lootState=${JSON.stringify(finalSnapshot.lootState)}`);
    assert.equal(finalSnapshot.equipmentState?.derivedStats?.attackDamage, comparedValue, `Expected derived attack bonus to match accepted weapon. equipmentState=${JSON.stringify(finalSnapshot.equipmentState)}`);
    assert.ok(hudText?.includes("Gear"), `HUD is missing equipment summary. hud=${JSON.stringify(hudText)}`);
    assert.ok(Array.isArray(finalSnapshot.world?.breakables) && finalSnapshot.world.breakables.length >= 5, `Snapshot is missing stable world.breakables summary. world=${JSON.stringify(finalSnapshot.world)}`);
    assert.ok(finalSnapshot.lootState && finalSnapshot.equipmentState, `Snapshot is missing loot/equipment state. snapshot=${JSON.stringify(finalSnapshot)}`);

    await assertNoCriticalRuntimeErrors(collectors);
  } finally {
    await cleanupSession({ page, browser, server });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

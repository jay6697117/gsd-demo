import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4178;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-08");
const PNG_PATH = path.join(ARTIFACT_DIR, "breakables-loot-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "breakables-loot-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "breakables-loot-console.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // Keep polling until ready.
    }
    await sleep(250);
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${url}`);
}

function spawnDevServer() {
  return spawn(
    "npm",
    ["run", "dev", "--", "--host", HOST, "--port", String(PORT), "--strictPort"],
    {
      cwd: process.cwd(),
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function isCriticalConsoleError(message) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (
    normalized.includes("webgl context could not be created") ||
    normalized.includes("error creating webgl context") ||
    normalized.includes("renderer fallback activated") ||
    normalized.includes("favicon.ico")
  ) {
    return false;
  }
  return normalized.includes("error") || normalized.includes("uncaught") || normalized.includes("failed");
}

async function advance(page, ms) {
  return page.evaluate((value) => JSON.parse(window.advanceTime(value)), ms);
}

async function readSnapshot(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function holdUntil(page, code, predicate, { stepMs = 120, maxSteps = 24, label = code } = {}) {
  let snapshot = await readSnapshot(page);
  await page.keyboard.down(code);

  try {
    for (let step = 0; step < maxSteps; step += 1) {
      snapshot = await advance(page, stepMs);
      if (predicate(snapshot)) {
        return snapshot;
      }
    }
  } finally {
    await page.keyboard.up(code);
  }

  throw new Error(`Route step did not satisfy predicate: ${label}`);
}

async function run() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const server = spawnDevServer();
  let browser;
  let page;
  const pageErrors = [];
  const consoleMessages = [];

  try {
    await waitForServer(BASE_URL);

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });
    page.on("console", (message) => {
      consoleMessages.push({ type: message.type(), text: message.text() });
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        typeof window.advanceTime === "function" &&
        typeof window.render_game_to_text === "function",
      null,
      { timeout: 15000 },
    );

    await page.click("#start-btn");
    await advance(page, 800);

    let snapshot = await holdUntil(page, "KeyD", (state) => state.player.x >= 1.4, {
      label: "reach first breakable attack lane",
    });
    await page.keyboard.press("Space");
    snapshot = await advance(page, 320);

    if (!snapshot.world?.breakables?.find((breakable) => breakable.id === "hub-crate-01")?.broken) {
      throw new Error(`Expected first breakable to be destroyed. breakables=${JSON.stringify(snapshot.world?.breakables)}`);
    }

    snapshot = await holdUntil(page, "KeyD", (state) => state.equipmentState?.slots?.weapon !== null, {
      label: "auto equip first weapon drop",
      maxSteps: 18,
    });
    const equippedWeapon = snapshot.equipmentState?.slots?.weapon;
    if (!equippedWeapon) {
      throw new Error(`Expected first auto-equip weapon. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
    }

    snapshot = await holdUntil(page, "KeyD", (state) => state.player.x >= 4.3, {
      label: "move into second breakable lane",
      maxSteps: 24,
    });
    snapshot = await holdUntil(page, "KeyS", (state) => state.player.y >= 0.8, {
      label: "align with second breakable",
      maxSteps: 14,
    });
    await page.keyboard.press("Space");
    snapshot = await advance(page, 320);

    snapshot = await holdUntil(page, "KeyD", (state) => state.mode === "equip_compare", {
      label: "trigger compare pickup",
      maxSteps: 18,
    });

    const compareCandidate = snapshot.equipmentState?.compareCandidate;
    if (!compareCandidate) {
      throw new Error(`Expected compare candidate after second pickup. equipmentState=${JSON.stringify(snapshot.equipmentState)}`);
    }
    if (snapshot.lootState?.pendingPickupId !== compareCandidate.dropId) {
      throw new Error(`Expected pending pickup to match compare candidate. lootState=${JSON.stringify(snapshot.lootState)}`);
    }

    const comparedValue = compareCandidate.candidateItem?.statValue;
    await page.keyboard.press("Enter");
    snapshot = await advance(page, 240);

    const hudText = await page.locator("#hud").textContent();
    const finalSnapshot = await readSnapshot(page);

    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(
      STATE_PATH,
      JSON.stringify(
        {
          hudText,
          initialWeapon: equippedWeapon,
          compareCandidate,
          finalSnapshot,
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (finalSnapshot.mode !== "playing") {
      throw new Error(`Expected compare mode to resolve back to playing. mode=${finalSnapshot.mode}`);
    }
    if (finalSnapshot.equipmentState?.slots?.weapon?.statValue !== comparedValue) {
      throw new Error(
        `Expected accepted weapon stat to match compare candidate. equipmentState=${JSON.stringify(finalSnapshot.equipmentState)}`,
      );
    }
    if ((finalSnapshot.lootState?.groundDrops?.length ?? 0) !== 0) {
      throw new Error(`Expected no remaining ground drops after accept. lootState=${JSON.stringify(finalSnapshot.lootState)}`);
    }
    if (!hudText?.includes("Gear")) {
      throw new Error(`HUD is missing equipment summary. hud=${JSON.stringify(hudText)}`);
    }
    if (!Array.isArray(finalSnapshot.world?.breakables) || finalSnapshot.world.breakables.length < 5) {
      throw new Error(`Snapshot is missing stable world.breakables summary. world=${JSON.stringify(finalSnapshot.world)}`);
    }
    if (!finalSnapshot.lootState || !finalSnapshot.equipmentState) {
      throw new Error(`Snapshot is missing loot/equipment state. snapshot=${JSON.stringify(finalSnapshot)}`);
    }

    const criticalConsoleErrors = consoleMessages.filter(
      (item) => item.type === "error" && isCriticalConsoleError(item.text),
    );
    if (pageErrors.length > 0 || criticalConsoleErrors.length > 0) {
      throw new Error(
        `Critical runtime errors detected: ${JSON.stringify({ pageErrors, criticalConsoleErrors }, null, 2)}`,
      );
    }
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server && !server.killed) {
      server.kill("SIGTERM");
      await sleep(250);
      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

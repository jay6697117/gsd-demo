import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4177;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-07");
const PNG_PATH = path.join(ARTIFACT_DIR, "building-tactics-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "building-tactics-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "building-tactics-console.json");

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

async function moveUntil(page, code, predicate, { stepMs = 120, maxSteps = 30, label = code } = {}) {
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

    let snapshot = await advance(page, 1200);
    snapshot = await moveUntil(page, "KeyW", (state) => state.world.currentSectorId === "north", {
      label: "reach north sector",
    });
    snapshot = await moveUntil(page, "KeyS", (state) => state.world.currentSectorId === "hub", {
      label: "return to hub",
    });
    snapshot = await moveUntil(page, "KeyS", (state) => state.world.currentSectorId === "south", {
      label: "reach south sector",
      maxSteps: 36,
    });
    snapshot = await moveUntil(
      page,
      "KeyS",
      (state) => state.world?.tactics?.retreatPocketActive === true,
      {
        label: "activate south retreat pocket",
        maxSteps: 24,
      },
    );
    snapshot = await advance(page, 1800);

    const hudText = await page.locator("#hud").textContent();
    const finalSnapshot = await readSnapshot(page);

    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(
      STATE_PATH,
      JSON.stringify(
        {
          hudText,
          visitedSectorIds: finalSnapshot.world?.visitedSectorIds,
          tactics: finalSnapshot.world?.tactics,
          spawnState: finalSnapshot.spawnState,
          enemyCount: finalSnapshot.enemies?.length ?? 0,
          snapshot: finalSnapshot,
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (!hudText?.includes("Sector")) {
      throw new Error(`HUD is missing Sector indicator. hud=${JSON.stringify(hudText)}`);
    }
    if (!hudText.includes("Pressure")) {
      throw new Error(`HUD is missing Pressure indicator. hud=${JSON.stringify(hudText)}`);
    }
    if (!hudText.includes("Tactic POCKET")) {
      throw new Error(`HUD did not expose tactical pocket usage. hud=${JSON.stringify(hudText)}`);
    }
    if (finalSnapshot.world?.visitedCount < 3) {
      throw new Error(`Expected traversal across at least 3 sectors. visitedCount=${finalSnapshot.world?.visitedCount}`);
    }
    if (!Array.isArray(finalSnapshot.world?.buildings) || finalSnapshot.world.buildings.length < 4) {
      throw new Error("render_game_to_text is missing stable world.buildings summary");
    }
    if (!finalSnapshot.world?.tactics || finalSnapshot.world.tactics.currentSectorId !== "south") {
      throw new Error(`Expected final tactical summary in south sector. tactics=${JSON.stringify(finalSnapshot.world?.tactics)}`);
    }
    if (finalSnapshot.world.tactics.retreatPocketActive !== true) {
      throw new Error(`Expected retreat pocket to stay active. tactics=${JSON.stringify(finalSnapshot.world.tactics)}`);
    }
    if (finalSnapshot.world.tactics.cueLabel !== "POCKET") {
      throw new Error(`Expected tactical cue POCKET. tactics=${JSON.stringify(finalSnapshot.world.tactics)}`);
    }
    if ((finalSnapshot.spawnState?.eventSeq ?? 0) < 1) {
      throw new Error(`Expected at least one spawn event. spawnState=${JSON.stringify(finalSnapshot.spawnState)}`);
    }
    if ((finalSnapshot.enemies?.length ?? 0) < 1) {
      throw new Error("Expected at least one active enemy during tactical route");
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

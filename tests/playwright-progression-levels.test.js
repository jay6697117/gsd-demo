import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4179;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-09");
const PNG_PATH = path.join(ARTIFACT_DIR, "progression-levels-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "progression-levels-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "progression-levels-console.json");

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

async function resolveCompareModeIfNeeded(page, snapshot) {
  if (snapshot.mode !== "equip_compare") {
    return snapshot;
  }
  await page.keyboard.press("Escape");
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
    let snapshot = await advance(page, 900);
    const initialSnapshot = snapshot;

    snapshot = await runOpeningLevelUpRoute(page, 3);

    const postLevelSnapshot = snapshot;
    if ((postLevelSnapshot.progressionState?.level ?? 1) < 2) {
      throw new Error(`Expected scripted combat route to reach level 2. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    }
    if (postLevelSnapshot.progressionState?.pendingLevelUpCount < 1) {
      throw new Error(`Expected at least one pending level-up event. snapshot=${JSON.stringify(postLevelSnapshot)}`);
    }
    if (!String(postLevelSnapshot.feedback?.bannerText || "").includes("LEVEL UP")) {
      throw new Error(`Expected LEVEL UP banner after threshold crossing. feedback=${JSON.stringify(postLevelSnapshot.feedback)}`);
    }

    const hudText = await page.locator("#hud").textContent();
    if (!hudText?.includes("Lvl 2")) {
      throw new Error(`HUD is missing level display. hud=${JSON.stringify(hudText)}`);
    }

    await waitForGameOver(page);
    await page.click("#restart-btn");
    snapshot = await advance(page, 1200);

    const restartedSnapshot = await readSnapshot(page);
    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(
      STATE_PATH,
      JSON.stringify(
        {
          initialSnapshot,
          postLevelSnapshot,
          restartedSnapshot,
          hudText,
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (restartedSnapshot.mode !== "playing") {
      throw new Error(`Expected restart to return to playing. snapshot=${JSON.stringify(restartedSnapshot)}`);
    }
    if (
      JSON.stringify(restartedSnapshot.progressionState) !==
      JSON.stringify({
        level: 1,
        totalXp: 0,
        currentLevelStartXp: 0,
        nextLevelXp: 4,
        pendingLevelUpCount: 0,
        pendingLevelUps: [],
        eventSeq: 0,
      })
    ) {
      throw new Error(`Expected progression reset after restart. progressionState=${JSON.stringify(restartedSnapshot.progressionState)}`);
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

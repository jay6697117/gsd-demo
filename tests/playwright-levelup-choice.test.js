import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4181;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-10");
const PNG_PATH = path.join(ARTIFACT_DIR, "levelup-choice-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "levelup-choice-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "levelup-choice-console.json");

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

    snapshot = await runOpeningLevelUpRoute(page, 3);
    if (snapshot.mode !== "levelup_choice") {
      throw new Error(`Expected levelup_choice mode. snapshot=${JSON.stringify(snapshot)}`);
    }
    if (snapshot.levelUpState?.rerollsRemaining !== 1) {
      throw new Error(`Expected one reroll budget before reroll. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    }

    const initialOfferId = snapshot.levelUpState.currentOfferId;
    await page.keyboard.press("KeyR");
    snapshot = await advance(page, 180);

    if (snapshot.mode !== "levelup_choice") {
      throw new Error(`Expected reroll to stay inside levelup_choice. snapshot=${JSON.stringify(snapshot)}`);
    }
    if (snapshot.levelUpState?.rerollsRemaining !== 0) {
      throw new Error(`Expected reroll budget to drop to zero. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    }
    if (snapshot.levelUpState?.currentOfferId === initialOfferId) {
      throw new Error(`Expected reroll to advance offer identity. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    }
    if ((snapshot.levelUpState?.offeredChoices?.length ?? 0) !== 3) {
      throw new Error(`Expected rerolled panel to keep exactly 3 choices. levelUpState=${JSON.stringify(snapshot.levelUpState)}`);
    }

    const rerolledChoices = snapshot.levelUpState.offeredChoices;
    await page.keyboard.press("Enter");
    snapshot = await advance(page, 240);

    const finalSnapshot = await readSnapshot(page);
    const chosenChoice = rerolledChoices[0];
    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(
      STATE_PATH,
      JSON.stringify(
        {
          initialOfferId,
          rerolledChoices,
          finalSnapshot,
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (finalSnapshot.mode !== "playing") {
      throw new Error(`Expected choice confirm to resume playing. snapshot=${JSON.stringify(finalSnapshot)}`);
    }
    if (finalSnapshot.levelUpState?.activeEventId !== null) {
      throw new Error(`Expected no active level-up session after confirm. levelUpState=${JSON.stringify(finalSnapshot.levelUpState)}`);
    }
    if ((finalSnapshot.progressionState?.pendingLevelUpCount ?? 0) !== 0) {
      throw new Error(`Expected pending level-up queue to consume one event. progressionState=${JSON.stringify(finalSnapshot.progressionState)}`);
    }
    if ((finalSnapshot.upgradeState?.appliedChoices?.length ?? 0) < 1) {
      throw new Error(`Expected at least one applied upgrade after confirm. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)}`);
    }
    if (finalSnapshot.upgradeState.appliedChoices[0]?.id !== chosenChoice.id) {
      throw new Error(
        `Expected chosen upgrade to be recorded first. upgradeState=${JSON.stringify(finalSnapshot.upgradeState)} chosen=${JSON.stringify(chosenChoice)}`,
      );
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

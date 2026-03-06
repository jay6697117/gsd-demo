import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4175;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-06");
const PNG_PATH = path.join(ARTIFACT_DIR, "map-sectors-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "map-sectors-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "map-sectors-console.json");

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
    normalized.includes("renderer fallback activated")
  ) {
    return false;
  }
  return normalized.includes("error") || normalized.includes("uncaught") || normalized.includes("failed");
}

async function moveWithAdvance(page, code, advanceMs) {
  await page.keyboard.down(code);
  await page.evaluate((ms) => window.advanceTime(ms), advanceMs);
  await page.keyboard.up(code);
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

    page.on("pageerror", (err) => {
      pageErrors.push(String(err));
    });
    page.on("console", (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
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
    await page.evaluate(() => window.advanceTime(1200));
    await moveWithAdvance(page, "KeyW", 1400);
    await moveWithAdvance(page, "KeyS", 1200);
    await moveWithAdvance(page, "KeyD", 1400);
    await page.keyboard.press("Space");
    await page.evaluate(() => window.advanceTime(900));

    const hudText = await page.locator("#hud").textContent();
    const stateText = await page.evaluate(() => window.render_game_to_text());
    const state = JSON.parse(stateText);

    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(STATE_PATH, JSON.stringify({ hudText, state }, null, 2), "utf-8");
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (!hudText?.includes("Sector")) {
      throw new Error(`HUD is missing Sector indicator. hud=${JSON.stringify(hudText)}`);
    }
    if (!hudText.includes("Pressure")) {
      throw new Error(`HUD is missing Pressure indicator. hud=${JSON.stringify(hudText)}`);
    }
    if (state.world?.visitedCount < 3) {
      throw new Error(`Expected traversal across at least 3 sectors. visitedCount=${state.world?.visitedCount}`);
    }
    if (!state.world?.readability || typeof state.world.readability.pressureLevel !== "string") {
      throw new Error("render_game_to_text is missing world.readability.pressureLevel");
    }
    if (typeof state.world.readability.sectorLabel !== "string") {
      throw new Error("render_game_to_text is missing world.readability.sectorLabel");
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

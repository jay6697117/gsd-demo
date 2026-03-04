import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4174;
const BASE_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = path.join(".planning", "artifacts", "phase-05");
const PNG_PATH = path.join(ARTIFACT_DIR, "burst-latest.png");
const STATE_PATH = path.join(ARTIFACT_DIR, "burst-latest.json");
const CONSOLE_PATH = path.join(ARTIFACT_DIR, "burst-console.json");

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
      // Continue polling until timeout.
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
  return (
    normalized.includes("error") ||
    normalized.includes("uncaught") ||
    normalized.includes("failed")
  );
}

async function run() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const server = spawnDevServer();
  let browser;
  let page;
  const pageErrors = [];
  const consoleMessages = [];

  const serverOutput = [];
  server.stdout.on("data", (chunk) => {
    serverOutput.push(String(chunk));
  });
  server.stderr.on("data", (chunk) => {
    serverOutput.push(String(chunk));
  });

  try {
    await waitForServer(BASE_URL);

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => {
      window.__GSD_DISABLE_WEBGL__ = true;
    });

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

    // Short deterministic input bursts with small waits.
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(120);
    await page.keyboard.up("KeyW");

    await page.keyboard.press("Space");
    await page.waitForTimeout(120);

    await page.keyboard.press("KeyP");
    await page.waitForTimeout(80);
    await page.keyboard.press("KeyP");

    // Deterministic jump to guarantee progression for assertions.
    await page.evaluate(() => window.advanceTime(900));

    const stateText = await page.evaluate(() => window.render_game_to_text());
    const state = JSON.parse(stateText);

    await page.screenshot({ path: PNG_PATH, fullPage: false });
    await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
    await fs.writeFile(CONSOLE_PATH, JSON.stringify(consoleMessages, null, 2), "utf-8");

    if (state.mode === "start") {
      throw new Error("Burst run did not transition out of start mode.");
    }
    if (typeof state.time !== "number" || state.time <= 0) {
      throw new Error(`Burst run did not advance simulation time. time=${state.time}`);
    }
    if (typeof state.schemaVersion !== "string") {
      throw new Error("State payload is missing schemaVersion.");
    }
    if (!state.determinism || typeof state.determinism.lastAdvanceSteps !== "number") {
      throw new Error("State payload is missing determinism stepping metadata.");
    }

    const criticalConsoleErrors = consoleMessages.filter(
      (item) => item.type === "error" && isCriticalConsoleError(item.text),
    );
    if (pageErrors.length > 0 || criticalConsoleErrors.length > 0) {
      const details = {
        pageErrors,
        criticalConsoleErrors,
      };
      throw new Error(`Critical runtime errors detected: ${JSON.stringify(details, null, 2)}`);
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

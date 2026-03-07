import fs from "node:fs/promises";
import process from "node:process";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function waitForServer(url, timeoutMs = 20000) {
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

export function spawnDevServer({
  host = DEFAULT_HOST,
  port,
  cwd = process.cwd(),
  extraEnv = {},
} = {}) {
  if (!Number.isFinite(Number(port))) {
    throw new Error(`spawnDevServer requires a numeric port. Received: ${port}`);
  }

  return spawn(
    "npm",
    ["run", "dev", "--", "--host", host, "--port", String(port), "--strictPort"],
    {
      cwd,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0", ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

export function isCriticalConsoleError(message) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (
    normalized.includes("webgl context could not be created") ||
    normalized.includes("error creating webgl context") ||
    normalized.includes("renderer fallback activated") ||
    normalized.includes("favicon.ico") ||
    normalized.includes("failed to load resource: net::err_internet_disconnected")
  ) {
    return false;
  }
  return (
    normalized.includes("error") ||
    normalized.includes("uncaught") ||
    normalized.includes("failed")
  );
}

export function attachRuntimeCollectors(page) {
  const pageErrors = [];
  const consoleMessages = [];

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });

  return { pageErrors, consoleMessages };
}

export async function createBrowserPage({
  viewport = DEFAULT_VIEWPORT,
  headless = true,
} = {}) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport });
  return { browser, page };
}

export async function ensureGameReady(page, baseUrl, timeoutMs = 15000) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      typeof window.advanceTime === "function" &&
      typeof window.render_game_to_text === "function",
    null,
    { timeout: timeoutMs },
  );
}

export async function startGame(page, initialAdvanceMs = 900) {
  await page.click("#start-btn");
  return advance(page, initialAdvanceMs);
}

export async function advance(page, ms) {
  return page.evaluate((value) => JSON.parse(window.advanceTime(value)), ms);
}

export async function readSnapshot(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

export async function advanceUntil(
  page,
  predicate,
  { stepMs = 120, maxSteps = 24, label = "advance-until" } = {},
) {
  let snapshot = await readSnapshot(page);

  for (let step = 0; step < maxSteps; step += 1) {
    if (predicate(snapshot, step)) {
      return snapshot;
    }
    snapshot = await advance(page, stepMs);
  }

  if (predicate(snapshot, maxSteps)) {
    return snapshot;
  }

  throw new Error(`Advance predicate did not pass within budget: ${label}`);
}

export async function holdKeyUntil(
  page,
  key,
  predicate,
  { stepMs = 120, maxSteps = 24, label = key } = {},
) {
  let snapshot = await readSnapshot(page);
  await page.keyboard.down(key);

  try {
    for (let step = 0; step < maxSteps; step += 1) {
      if (predicate(snapshot, step)) {
        return snapshot;
      }
      snapshot = await advance(page, stepMs);
    }
  } finally {
    await page.keyboard.up(key);
  }

  if (predicate(snapshot, maxSteps)) {
    return snapshot;
  }

  throw new Error(`Route step did not satisfy predicate: ${label}`);
}

export async function writeArtifacts({
  screenshotPath,
  statePath,
  consolePath,
  page,
  state,
  consoleMessages,
} = {}) {
  if (screenshotPath && page) {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }
  if (statePath) {
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
  }
  if (consolePath && consoleMessages) {
    await fs.writeFile(consolePath, JSON.stringify(consoleMessages, null, 2), "utf-8");
  }
}

export async function runScriptedTimeline(page, steps = []) {
  let snapshot = await readSnapshot(page);

  for (const step of steps) {
    const {
      holdKey,
      keyDown,
      keyUp,
      press,
      advanceMs = 0,
      stepMs = 120,
      maxSteps = 24,
      predicate,
      label = holdKey || press || keyDown || keyUp || "timeline-step",
    } = step;

    if (typeof holdKey === "string") {
      if (typeof predicate !== "function") {
        throw new Error(`Timeline holdKey step requires predicate: ${label}`);
      }
      snapshot = await holdKeyUntil(page, holdKey, predicate, {
        stepMs,
        maxSteps,
        label,
      });
      continue;
    }

    if (typeof keyDown === "string") {
      await page.keyboard.down(keyDown);
    }
    if (typeof press === "string") {
      await page.keyboard.press(press);
    }
    if (advanceMs > 0) {
      snapshot = await advance(page, advanceMs);
    }
    if (typeof keyUp === "string") {
      await page.keyboard.up(keyUp);
    }
    if (typeof predicate === "function" && !predicate(snapshot)) {
      throw new Error(`Timeline step failed predicate: ${label}`);
    }
  }

  return snapshot;
}

export async function assertNoCriticalRuntimeErrors({
  pageErrors = [],
  consoleMessages = [],
} = {}) {
  const criticalConsoleErrors = consoleMessages.filter(
    (item) => item.type === "error" && isCriticalConsoleError(item.text),
  );

  if (pageErrors.length > 0 || criticalConsoleErrors.length > 0) {
    throw new Error(
      `Critical runtime errors detected: ${JSON.stringify({ pageErrors, criticalConsoleErrors }, null, 2)}`,
    );
  }
}

export async function cleanupSession({ page, browser, server } = {}) {
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

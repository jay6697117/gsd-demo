import { buildWorldTraversalSummary } from "./world-sectors.js";

export const DETERMINISM_SCHEMA_VERSION = "1.0.0";
export const MAX_ADVANCE_STEPS = 60 * 120;

const MIN_FIXED_STEP_SECONDS = 1 / 240;
const DEFAULT_FIXED_STEP_SECONDS = 1 / 60;

function toFinite(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toRounded(value, digits = 3) {
  const num = toFinite(value, 0);
  return Number(num.toFixed(digits));
}

function safeSortedKeys(setLike, sortedKeysFn) {
  if (typeof sortedKeysFn === "function") {
    return sortedKeysFn(setLike);
  }
  return Array.from(setLike || []).sort((a, b) => a.localeCompare(b));
}

function normalizeFixedStep(fixedStepSeconds) {
  const candidate = toFinite(fixedStepSeconds, DEFAULT_FIXED_STEP_SECONDS);
  return candidate >= MIN_FIXED_STEP_SECONDS ? candidate : DEFAULT_FIXED_STEP_SECONDS;
}

function normalizeOrderedEntries(entries, valueKey) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => typeof entry?.sectorId === "string")
    .map((entry) => ({
      sectorId: entry.sectorId,
      [valueKey]: valueKey === "count" ? Math.floor(toFinite(entry?.[valueKey], 0)) : toRounded(entry?.[valueKey], 6),
    }));
}

export function computeAdvanceSteps(ms, fixedStepSeconds = DEFAULT_FIXED_STEP_SECONDS) {
  const clampedMs = Math.max(0, toFinite(ms, 0));
  const stepSeconds = normalizeFixedStep(fixedStepSeconds);
  const stepMs = stepSeconds * 1000;
  const requested = Math.max(1, Math.round(clampedMs / stepMs));
  return Math.min(MAX_ADVANCE_STEPS, requested);
}

export function buildDeterministicSnapshot({
  state,
  keyboardDown,
  pressedThisStep,
  sortedKeysFn,
  fixedStepSeconds = DEFAULT_FIXED_STEP_SECONDS,
  particleCap = 0,
  manualSteppingMode = false,
  determinismMeta = null,
}) {
  const stepSeconds = normalizeFixedStep(fixedStepSeconds);
  const stepMs = stepSeconds * 1000;
  const currentState = state || {};
  const player = currentState.player || {};
  const control = currentState.control || {};
  const pause = control.pause || {};
  const focus = control.focus || {};
  const fullscreen = control.fullscreen || {};
  const feedback = currentState.feedback || {};
  const enemies = Array.isArray(currentState.enemies) ? currentState.enemies : [];
  const slashEffects = Array.isArray(currentState.slashEffects) ? currentState.slashEffects : [];
  const particles = Array.isArray(currentState.particles) ? currentState.particles : [];
  const world = currentState.world || {};
  const spawnDirector = currentState.spawnDirector || {};

  const meta = determinismMeta || currentState.determinism || {};

  return {
    schemaVersion: DETERMINISM_SCHEMA_VERSION,
    determinism: {
      fixedStepSeconds: toRounded(stepSeconds, 6),
      fixedStepMs: toRounded(stepMs, 3),
      manualSteppingMode: Boolean(manualSteppingMode),
      lastAdvanceMs: toRounded(meta.lastAdvanceMs, 3),
      lastAdvanceSteps: Math.floor(toFinite(meta.lastAdvanceSteps, 0)),
      totalAdvanceSteps: Math.floor(toFinite(meta.totalAdvanceSteps, 0)),
      renderBackend: meta.renderBackend || "unknown",
      webglAvailable: Boolean(meta.webglAvailable),
      renderError: meta.renderError ?? null,
    },
    coordinateSystem: {
      origin: "arena center",
      x: "positive right",
      y: "positive downward on screen (mapped to world +z)",
    },
    mode: currentState.mode || "unknown",
    seed: toFinite(currentState.randomSeed, 0),
    time: toRounded(currentState.time, 3),
    score: Math.floor(toFinite(currentState.score, 0)),
    kills: Math.floor(toFinite(currentState.kills, 0)),
    chain: Math.floor(toFinite(currentState.chain, 0)),
    nextSpawnIn: toRounded(currentState.spawnCooldown, 3),
    world: buildWorldTraversalSummary(world),
    spawnState: {
      eventSeq: Math.floor(toFinite(spawnDirector.eventSeq, 0)),
      sectorWeights: normalizeOrderedEntries(spawnDirector.sectorWeights, "weight"),
      sectorEnemyCounts: normalizeOrderedEntries(spawnDirector.sectorEnemyCounts, "count"),
      lastSpawnSectorId: spawnDirector.lastSpawnSectorId ?? null,
      spawnCooldown: toRounded(
        spawnDirector.spawnCooldown ?? currentState.spawnCooldown,
        3,
      ),
      spawnRngState: Math.floor(toFinite(spawnDirector.spawnRngState, 0)) >>> 0,
    },
    inputState: {
      pressedKeys: safeSortedKeys(keyboardDown, sortedKeysFn),
      edgeKeys: safeSortedKeys(pressedThisStep, sortedKeysFn),
      pressedCount: keyboardDown?.size ?? 0,
      edgeCount: pressedThisStep?.size ?? 0,
    },
    pauseState: {
      mode: currentState.mode || "unknown",
      lastTransition: pause.lastTransition || "unknown",
      lastFrom: pause.lastFrom || "unknown",
      lastTo: pause.lastTo || "unknown",
      lastReason: pause.lastReason || "unknown",
      lastAt: toRounded(pause.lastAt, 3),
      recoveryPending: Boolean(focus.recoveryPending),
    },
    fullscreenState: {
      isFullscreen: Boolean(fullscreen.isFullscreen),
      lastIntent: fullscreen.lastIntent || "none",
      lastSource: fullscreen.lastSource || "unknown",
      lastResult: fullscreen.lastResult || "idle",
      lastError: fullscreen.lastError ?? null,
      lastAt: toRounded(fullscreen.lastAt, 3),
      attemptCount: Math.floor(toFinite(fullscreen.attemptCount, 0)),
      failureCount: Math.floor(toFinite(fullscreen.failureCount, 0)),
    },
    focusState: {
      visibility: focus.visibility || "unknown",
      hasWindowFocus: Boolean(focus.hasWindowFocus),
      recoveryPending: Boolean(focus.recoveryPending),
      lastEvent: focus.lastEvent || "unknown",
      lastAt: toRounded(focus.lastAt, 3),
    },
    player: {
      x: toRounded(player.x, 3),
      y: toRounded(player.y, 3),
      vx: toRounded(player.vx, 3),
      vy: toRounded(player.vy, 3),
      hp: toRounded(player.hp, 2),
      attackCooldown: toRounded(player.attackCooldown, 3),
      invulnerable: toRounded(player.invulnerable, 3),
      facingX: toRounded(player.facingX, 3),
      facingY: toRounded(player.facingY, 3),
    },
    enemies: enemies
      .map((enemy) => ({
        id: Math.floor(toFinite(enemy.id, 0)),
        kind: enemy.kind || "unknown",
        x: toRounded(enemy.x, 3),
        y: toRounded(enemy.y, 3),
        hp: toRounded(enemy.hp, 2),
        maxHp: Math.floor(toFinite(enemy.maxHp, 0)),
      }))
      .sort((a, b) => a.id - b.id),
    activeSlashEffects: slashEffects.length,
    activeParticles: particles.length,
    feedback: {
      hitFlash: toRounded(feedback.hitFlash, 3),
      killFlash: toRounded(feedback.killFlash, 3),
      dangerOverlay: toRounded(feedback.dangerOverlay, 3),
      killPriorityTimer: toRounded(feedback.killPriorityTimer, 3),
      bannerText: feedback.bannerText || "",
      bannerKind: feedback.bannerKind || "neutral",
      bannerTimer: toRounded(feedback.bannerTimer, 3),
      particleCap: Math.floor(toFinite(particleCap, 0)),
    },
  };
}

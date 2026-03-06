import * as THREE from "three";
import {
  consumeEdge,
  getFocusStatusLabel,
  resolveFullscreenToggleIntent,
  resolveFocusLossMode,
  resolvePauseMode,
  shouldClearInputForVisibility,
  sortedKeys,
} from "./control-rules.js";
import { buildDeterministicSnapshot, computeAdvanceSteps } from "./determinism-harness.js";
import { getComboMilestone, getDangerState } from "./feedback-rules.js";
import {
  advanceWorldTraversalState,
  createWorldTraversalState,
  getSectorById,
  resolveSectorIdForPosition,
  WORLD_SECTORS,
  WORLD_SECTOR_IDS,
} from "./world-sectors.js";
import { resolveEnemyBoundaryMovement, resolvePlayerBoundaryMovement } from "./world-collision.js";
import {
  buildSectorEnemyCounts,
  computeSectorWeights,
  createSpawnDirectorState,
  planSpawnSector,
} from "./spawn-director.js";
import {
  buildWorldTacticsState,
  filterSpawnCandidates,
  getBuildingColliders,
  planBuildingAwareSteering,
  WORLD_BUILDINGS,
} from "./building-system.js";
import { createWorldBreakables, resolveBreakableAttackStep } from "./breakable-system.js";
import { createDropSeed, createLootState, resolveDestroyedBreakableDrops } from "./drop-system.js";
import {
  acceptCompareCandidate,
  createEquipmentState,
  rejectCompareCandidate,
  resolveAutoPickupStep,
} from "./equipment-system.js";
import {
  beginLevelUpChoice,
  confirmLevelUpChoice,
  createLevelUpState,
  createOfferSeed,
  createUpgradeState,
  moveLevelUpSelection,
} from "./levelup-system.js";
import {
  applyEnemyKillXp,
  createProgressionState,
  getLevelWindow,
} from "./progression-system.js";

const FIXED_STEP = 1 / 60;
const ARENA_HALF_WIDTH = 21;
const ARENA_HALF_HEIGHT = 11.5;
const GROUND_WIDTH = 68;
const GROUND_HEIGHT = 42;
const GROUND_HALF_WIDTH = GROUND_WIDTH / 2;
const GROUND_HALF_HEIGHT = GROUND_HEIGHT / 2;
const PLAYER_MOVEMENT_FALLBACK_BOUNDS = Object.freeze({
  minX: -ARENA_HALF_WIDTH + 1,
  maxX: ARENA_HALF_WIDTH - 1,
  minY: -ARENA_HALF_HEIGHT + 1,
  maxY: ARENA_HALF_HEIGHT - 1,
});
const ENEMY_MOVEMENT_FALLBACK_BOUNDS = Object.freeze({
  minX: -ARENA_HALF_WIDTH + 0.5,
  maxX: ARENA_HALF_WIDTH - 0.5,
  minY: -ARENA_HALF_HEIGHT + 0.5,
  maxY: ARENA_HALF_HEIGHT - 0.5,
});
const PLAYER_BASE_SPEED = 9.2;
const PLAYER_ATTACK_COOLDOWN = 0.32;
const PLAYER_ATTACK_RADIUS = 2.9;
const PLAYER_ATTACK_DAMAGE = 21;
const PLAYER_ATTACK_FRONT_DOT_THRESHOLD = -0.2;
const PLAYER_MAX_HP = 100;
const MAX_ACTIVE_ENEMIES = 26;
const SPAWN_DIRECTOR_SOFT_CAP = 4;
const SPAWN_RNG_SEED_SALT = 0x6d2b79f5;
const INITIAL_RUN_SEED = 0x57b1c4;
const RESTART_TRANSITION_SECONDS = 0.8;
const FEEDBACK_HIT_FLASH_PEAK = 0.36;
const FEEDBACK_KILL_FLASH_PEAK = 0.66;
const FEEDBACK_FLASH_DECAY_PER_SECOND = 2.8;
const FEEDBACK_BANNER_DEFAULT_SECONDS = 0.56;
const FEEDBACK_PARTICLE_HARD_CAP = 120;
const FEEDBACK_PARTICLE_RESERVED_FOR_KILL = 18;
const FEEDBACK_PARTICLE_EVENT_CAP = 20;
const FEEDBACK_BANNER_RATE_LIMIT_SECONDS = 0.68;
const READABILITY_PRESSURE_STYLE = Object.freeze({
  low: Object.freeze({ hudLabel: "CALM", color: 0x87f6c2, floorTint: 0xffffff }),
  medium: Object.freeze({ hudLabel: "TENSE", color: 0xffde75, floorTint: 0xfff7e3 }),
  high: Object.freeze({ hudLabel: "HOT", color: 0xff7e62, floorTint: 0xffe8e1 }),
});
const SECTOR_SURFACE_COLORS = Object.freeze({
  hub: "rgba(255, 241, 164, 0.18)",
  north: "rgba(126, 239, 255, 0.16)",
  east: "rgba(255, 160, 126, 0.16)",
  south: "rgba(142, 255, 192, 0.16)",
});
const LANE_STYLE_BY_KIND = Object.freeze({
  main: Object.freeze({ stroke: "rgba(255, 248, 179, 0.62)", width: 18, beaconColor: 0xffef9e }),
  bypass: Object.freeze({ stroke: "rgba(125, 241, 255, 0.5)", width: 10, beaconColor: 0x7df1ff }),
});
const WORLD_BUILDING_COLLIDERS = getBuildingColliders(WORLD_BUILDINGS);

const startScreen = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const gameoverStats = document.getElementById("gameover-stats");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");
const hud = document.getElementById("hud");
const canvas = document.getElementById("game-canvas");
const canvasStage = canvas.parentElement;
const forceNoWebgl = Boolean(globalThis.__GSD_DISABLE_WEBGL__);

const feedbackOverlay = document.createElement("div");
feedbackOverlay.className = "feedback-overlay";
feedbackOverlay.setAttribute("aria-hidden", "true");

const feedbackDangerLayer = document.createElement("div");
feedbackDangerLayer.className = "feedback-danger-layer";

const feedbackFlashLayer = document.createElement("div");
feedbackFlashLayer.className = "feedback-flash-layer";

const feedbackBanner = document.createElement("div");
feedbackBanner.className = "feedback-center-banner";

feedbackOverlay.append(feedbackDangerLayer, feedbackFlashLayer, feedbackBanner);
canvasStage.append(feedbackOverlay);

const compareOverlay = document.createElement("div");
compareOverlay.className = "compare-overlay hidden";
compareOverlay.setAttribute("aria-hidden", "true");

const comparePanel = document.createElement("div");
comparePanel.className = "compare-panel";

const compareTitle = document.createElement("h2");
compareTitle.className = "compare-title";

const compareBody = document.createElement("pre");
compareBody.className = "compare-body";

const compareHint = document.createElement("p");
compareHint.className = "compare-hint";
compareHint.textContent = "Enter / Space equip  ·  Escape keep current";

comparePanel.append(compareTitle, compareBody, compareHint);
compareOverlay.append(comparePanel);
canvasStage.append(compareOverlay);

const levelUpOverlay = document.createElement("div");
levelUpOverlay.className = "levelup-overlay hidden";
levelUpOverlay.setAttribute("aria-hidden", "true");

const levelUpPanel = document.createElement("div");
levelUpPanel.className = "levelup-panel";

const levelUpTitle = document.createElement("h2");
levelUpTitle.className = "levelup-title";
levelUpTitle.textContent = "LEVEL UP";

const levelUpSubtitle = document.createElement("p");
levelUpSubtitle.className = "levelup-subtitle";

const levelUpChoices = document.createElement("div");
levelUpChoices.className = "levelup-choices";

const levelUpChoiceCards = Array.from({ length: 3 }, () => {
  const card = document.createElement("article");
  card.className = "levelup-choice";

  const kind = document.createElement("p");
  kind.className = "levelup-choice-kind";

  const label = document.createElement("h3");
  label.className = "levelup-choice-label";

  const body = document.createElement("p");
  body.className = "levelup-choice-body";

  const meta = document.createElement("p");
  meta.className = "levelup-choice-meta";

  card.append(kind, label, body, meta);
  levelUpChoices.append(card);
  return { card, kind, label, body, meta };
});

const levelUpHint = document.createElement("p");
levelUpHint.className = "levelup-hint";
levelUpHint.textContent = "A / Left  D / Right  Enter / Space choose  ·  P ignored";

levelUpPanel.append(levelUpTitle, levelUpSubtitle, levelUpChoices, levelUpHint);
levelUpOverlay.append(levelUpPanel);
canvasStage.append(levelUpOverlay);

function createRendererRuntime(targetCanvas, disableWebgl) {
  if (disableWebgl) {
    return {
      renderer: {
        outputColorSpace: THREE.SRGBColorSpace,
        setClearColor: () => {},
        setPixelRatio: () => {},
        setSize: () => {},
        render: () => {},
      },
      meta: {
        renderBackend: "noop",
        webglAvailable: false,
        renderError: "disabled-by-test-flag",
      },
    };
  }

  try {
    const webglRenderer = new THREE.WebGLRenderer({
      canvas: targetCanvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    webglRenderer.setClearColor(0x81d8ff, 1);
    return {
      renderer: webglRenderer,
      meta: {
        renderBackend: "webgl",
        webglAvailable: true,
        renderError: null,
      },
    };
  } catch (error) {
    console.warn("Renderer fallback activated:", error);
    return {
      renderer: {
        outputColorSpace: THREE.SRGBColorSpace,
        setClearColor: () => {},
        setPixelRatio: () => {},
        setSize: () => {},
        render: () => {},
      },
      meta: {
        renderBackend: "noop-fallback",
        webglAvailable: false,
        renderError: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const rendererRuntime = createRendererRuntime(canvas, forceNoWebgl);
const renderer = rendererRuntime.renderer;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8bd6ff, 26, 52);

const camera = new THREE.OrthographicCamera(-24, 24, 13.5, -13.5, 0.1, 100);
camera.position.set(0, 24, 0);
camera.lookAt(0, 0, 0);

const light = new THREE.HemisphereLight(0xffffff, 0x0f3c56, 1.35);
scene.add(light);

const PALETTE_PLAYER = {
  "1": "#1f2e5a",
  "2": "#324f91",
  "3": "#fef6d8",
  "4": "#f35656",
  "5": "#f0d79f",
  "6": "#222222",
};

const PALETTE_ENEMY = {
  leafling: {
    "1": "#24461a",
    "2": "#4e8e3a",
    "3": "#86c972",
    "4": "#f7f3dd",
    "5": "#1f1f1f",
  },
  embercub: {
    "1": "#632117",
    "2": "#bf3f26",
    "3": "#ff8748",
    "4": "#ffe0ac",
    "5": "#1f1f1f",
  },
  sparkowl: {
    "1": "#1a315f",
    "2": "#2e5db7",
    "3": "#72bcff",
    "4": "#fdf2cf",
    "5": "#202020",
  },
};

const PATTERN_PLAYER = [
  "....1111....",
  "...122221...",
  "..12333221..",
  "..12344321..",
  ".1123454321.",
  ".1234554321.",
  ".1233555321.",
  ".1235665321.",
  "..12666621..",
  "..12666621..",
  "..126..621..",
  "..11....11..",
];

const PATTERN_LEAFLING = [
  "....1111....",
  "...122221...",
  "..12333321..",
  "..12344321..",
  ".1234444321.",
  ".1234554321.",
  ".1234444321.",
  "..12333221..",
  "...125521...",
  "...15..51...",
  "..11....11..",
  "............",
];

const PATTERN_EMBERCUB = [
  "....1111....",
  "...122221...",
  "..12333321..",
  "..12344321..",
  ".1234444321.",
  ".1234454321.",
  ".1234555321.",
  "..12333221..",
  "...122221...",
  "..11....11..",
  ".11......11.",
  "............",
];

const PATTERN_SPARKOWL = [
  "....1111....",
  "...122221...",
  "..12333321..",
  ".1233444331.",
  ".1233555331.",
  ".1233555331.",
  ".1233444331.",
  "..12333321..",
  "...125521...",
  "...155551...",
  "..11....11..",
  "............",
];

const state = {
  mode: "start",
  time: 0,
  score: 0,
  kills: 0,
  chain: 0,
  chainTimer: 0,
  player: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hp: PLAYER_MAX_HP,
    radius: 0.96,
    attackCooldown: 0,
    invulnerable: 0,
    facingX: 0,
    facingY: -1,
  },
  enemies: [],
  slashEffects: [],
  particles: [],
  spawnCooldown: 1.2,
  nextEnemyId: 1,
  randomSeed: INITIAL_RUN_SEED,
  shakeTime: 0,
  shakeStrength: 0,
  gameOverSummary: "",
  restartTimer: 0,
  feedback: {
    hitFlash: 0,
    killFlash: 0,
    killPriorityTimer: 0,
    dangerOverlay: 0,
    bannerText: "",
    bannerKind: "neutral",
    bannerTimer: 0,
    lastBannerAt: -999,
  },
  determinism: {
    lastAdvanceMs: 0,
    lastAdvanceSteps: 0,
    totalAdvanceSteps: 0,
    renderBackend: rendererRuntime.meta.renderBackend,
    webglAvailable: rendererRuntime.meta.webglAvailable,
    renderError: rendererRuntime.meta.renderError,
  },
  world: {
    ...createWorldTraversalState(),
    breakables: createWorldBreakables(),
    buildings: WORLD_BUILDINGS,
    tactics: buildWorldTacticsState({
      currentSectorId: WORLD_SECTOR_IDS[0],
      playerPosition: { x: 0, y: 0 },
      buildings: WORLD_BUILDINGS,
      sectorEnemyCounts: [],
    }),
  },
  spawnDirector: createSpawnDirectorState({
    sectorIds: WORLD_SECTOR_IDS,
    spawnCooldown: 1.2,
    spawnRngState: (INITIAL_RUN_SEED ^ SPAWN_RNG_SEED_SALT) >>> 0,
  }),
  loot: createLootState({
    dropRngState: createDropSeed(INITIAL_RUN_SEED),
  }),
  equipment: createEquipmentState(),
  levelUp: createLevelUpState({
    offerRngState: createOfferSeed(INITIAL_RUN_SEED),
  }),
  upgrades: createUpgradeState(),
  progression: createProgressionState(),
  control: {
    pause: {
      lastTransition: "init",
      lastFrom: "start",
      lastTo: "start",
      lastReason: "init",
      lastAt: 0,
    },
    focus: {
      visibility: document.visibilityState || "visible",
      hasWindowFocus: typeof document.hasFocus === "function" ? document.hasFocus() : true,
      recoveryPending: false,
      lastEvent: "init",
      lastAt: 0,
    },
    fullscreen: {
      isFullscreen: Boolean(document.fullscreenElement),
      lastIntent: "none",
      lastSource: "init",
      lastResult: "idle",
      lastError: null,
      lastAt: 0,
      attemptCount: 0,
      failureCount: 0,
    },
  },
};

const keyboardDown = new Set();
const pressedThisStep = new Set();

const world = {
  playerSprite: null,
  enemyRoot: new THREE.Group(),
  slashRoot: new THREE.Group(),
  particleRoot: new THREE.Group(),
  breakableRoot: new THREE.Group(),
  breakableVisuals: [],
  dropRoot: new THREE.Group(),
  dropVisuals: new Map(),
  buildingRoot: new THREE.Group(),
  buildingVisuals: [],
  guideRoot: new THREE.Group(),
  arenaBounds: null,
  floor: null,
  sectorGuides: [],
  laneBeacons: [],
};
scene.add(world.enemyRoot);
scene.add(world.slashRoot);
scene.add(world.particleRoot);
scene.add(world.breakableRoot);
scene.add(world.dropRoot);
scene.add(world.buildingRoot);
scene.add(world.guideRoot);

buildWorld();
resizeRenderer();
window.addEventListener("resize", resizeRenderer);

window.addEventListener("keydown", (event) => {
  const code = event.code;

  if (code === "Escape" && document.fullscreenElement) {
    requestFullscreenTransition("exit", "escape-key");
  }

  if (!keyboardDown.has(code)) {
    pressedThisStep.add(code);
  }
  keyboardDown.add(code);

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keyboardDown.delete(event.code);
});

window.addEventListener("blur", () => {
  applyFocusLoss("window-blur");
});

window.addEventListener("visibilitychange", () => {
  if (shouldClearInputForVisibility(document.visibilityState)) {
    applyFocusLoss("visibility-hidden");
    return;
  }
  applyFocusGain("visibility-visible");
});

window.addEventListener("focus", () => {
  applyFocusGain("window-focus");
});

window.addEventListener("fullscreenchange", () => {
  state.control.fullscreen.isFullscreen = Boolean(document.fullscreenElement);
  state.control.fullscreen.lastResult = "changed";
  state.control.fullscreen.lastError = null;
  state.control.fullscreen.lastAt = Number(state.time.toFixed(3));
  resizeRenderer();
});

startButton.addEventListener("click", () => {
  startRun();
});

restartButton.addEventListener("click", () => {
  requestRestart();
});

function clearInputState() {
  keyboardDown.clear();
  pressedThisStep.clear();
}

function updateFocusSnapshot(eventName) {
  state.control.focus.visibility = document.visibilityState || "visible";
  state.control.focus.hasWindowFocus = typeof document.hasFocus === "function" ? document.hasFocus() : true;
  state.control.focus.lastEvent = eventName;
  state.control.focus.lastAt = Number(state.time.toFixed(3));
}

function transitionPauseMode(nextMode, reason) {
  const previousMode = state.mode;
  if (previousMode === nextMode) {
    return false;
  }

  state.mode = nextMode;
  state.control.pause.lastTransition = `${previousMode}->${nextMode}`;
  state.control.pause.lastFrom = previousMode;
  state.control.pause.lastTo = nextMode;
  state.control.pause.lastReason = reason;
  state.control.pause.lastAt = Number(state.time.toFixed(3));
  return true;
}

function applyFocusLoss(reason) {
  clearInputState();
  const nextMode = resolveFocusLossMode(state.mode);
  if (nextMode !== state.mode) {
    transitionPauseMode(nextMode, reason);
    setCenterBanner("FOCUS LOST · PAUSED", "neutral", 0.72, true);
  }
  state.control.focus.recoveryPending = true;
  updateFocusSnapshot(reason);
}

function applyFocusGain(reason) {
  clearInputState();
  updateFocusSnapshot(reason);
  if (state.mode === "paused" && state.control.focus.recoveryPending) {
    setCenterBanner("FOCUS RESTORED · PRESS P", "neutral", 0.84, true);
  }
}

function normalizeErrorMessage(error) {
  if (!error) {
    return "unknown";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function requestFullscreenTransition(intent, source) {
  const now = Number(state.time.toFixed(3));
  state.control.fullscreen.lastIntent = intent;
  state.control.fullscreen.lastSource = source;
  state.control.fullscreen.lastAt = now;
  state.control.fullscreen.lastError = null;
  state.control.fullscreen.attemptCount += 1;

  if (intent === "exit" && !document.fullscreenElement) {
    state.control.fullscreen.lastResult = "noop";
    state.control.fullscreen.isFullscreen = false;
    return;
  }

  const action =
    intent === "enter" ? canvas.requestFullscreen?.bind(canvas) : document.exitFullscreen?.bind(document);
  if (!action) {
    state.control.fullscreen.lastResult = "unsupported";
    return;
  }

  state.control.fullscreen.lastResult = "pending";
  action()
    .then(() => {
      state.control.fullscreen.lastResult = "fulfilled";
      state.control.fullscreen.lastError = null;
    })
    .catch((error) => {
      state.control.fullscreen.lastResult = "rejected";
      state.control.fullscreen.lastError = normalizeErrorMessage(error);
      state.control.fullscreen.failureCount += 1;
      setCenterBanner("FULLSCREEN UNAVAILABLE", "neutral", 0.72, true);
    });
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createVisualSeed(seed) {
  return (seed ^ 0x9e3779b9) >>> 0;
}

let simulationRng = createRng(state.randomSeed);
let visualRng = createRng(createVisualSeed(state.randomSeed));

function randomRangeSimulation(min, max) {
  return min + (max - min) * simulationRng();
}

function randomRangeVisual(min, max) {
  return min + (max - min) * visualRng();
}

function randomRangeFromUnit(min, max, unitValue) {
  return min + (max - min) * unitValue;
}

function createSpawnSeed(seed) {
  return (seed ^ SPAWN_RNG_SEED_SALT) >>> 0;
}

function nextSpawnRngValue() {
  const nextState = (1664525 * (state.spawnDirector?.spawnRngState ?? 0) + 1013904223) >>> 0;
  state.spawnDirector.spawnRngState = nextState;
  return nextState / 0x100000000;
}

function getEffectiveAttackDamage() {
  return PLAYER_ATTACK_DAMAGE + (state.equipment?.derivedStats?.attackDamage ?? 0);
}

function getEffectiveMaxHp() {
  return PLAYER_MAX_HP + (state.equipment?.derivedStats?.maxHp ?? 0);
}

function getEffectiveMoveSpeed() {
  return PLAYER_BASE_SPEED + (state.equipment?.derivedStats?.moveSpeed ?? 0);
}

function formatStatValue(statKey, value) {
  if (statKey === "moveSpeed") {
    return Number(toFiniteNumber(value, 0).toFixed(1));
  }
  return Math.round(toFiniteNumber(value, 0));
}

function formatStatLabel(statKey) {
  if (statKey === "attackDamage") {
    return "ATK";
  }
  if (statKey === "maxHp") {
    return "HP";
  }
  if (statKey === "moveSpeed") {
    return "SPD";
  }
  return "STAT";
}

function chooseEnemyType(roll = simulationRng()) {
  if (roll < 0.42) {
    return { key: "leafling", hp: 26, speed: 3.1, points: 100, pattern: PATTERN_LEAFLING };
  }
  if (roll < 0.78) {
    return { key: "embercub", hp: 34, speed: 2.65, points: 130, pattern: PATTERN_EMBERCUB };
  }
  return { key: "sparkowl", hp: 22, speed: 3.95, points: 90, pattern: PATTERN_SPARKOWL };
}

function getSectorCountById(sectorEnemyCounts, sectorId) {
  const entry = sectorEnemyCounts.find((candidate) => candidate.sectorId === sectorId);
  return entry?.count ?? 0;
}

function buildSpawnHeatState(sectorEnemyCounts) {
  const playerSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const pressure = clamp(state.enemies.length / MAX_ACTIVE_ENEMIES, 0, 1);
  const healthDanger = clamp(1 - state.player.hp / getEffectiveMaxHp(), 0, 1);
  const danger = clamp(healthDanger * 0.55 + pressure * 0.45, 0, 1);
  const playerSectorCount = getSectorCountById(sectorEnemyCounts, playerSectorId);

  let hotSectorId = playerSectorId;
  let hotSectorCount = -1;
  let reliefSectorId = playerSectorId;
  let reliefSectorCount = Number.POSITIVE_INFINITY;

  for (const sectorId of WORLD_SECTOR_IDS) {
    const count = getSectorCountById(sectorEnemyCounts, sectorId);
    if (count > hotSectorCount) {
      hotSectorCount = count;
      hotSectorId = sectorId;
    }
    if (sectorId !== playerSectorId && count < reliefSectorCount) {
      reliefSectorCount = count;
      reliefSectorId = sectorId;
    }
  }

  return {
    danger,
    hotSectorId,
    reliefSectorId,
    sideBufferActive:
      playerSectorCount >= SPAWN_DIRECTOR_SOFT_CAP || (pressure >= 0.65 && danger >= 0.45),
    lastSpawnSectorId: state.spawnDirector?.lastSpawnSectorId ?? null,
  };
}

function refreshSpawnDirectorState() {
  const sectorEnemyCounts = buildSectorEnemyCounts({
    sectorIds: WORLD_SECTOR_IDS,
    enemies: state.enemies,
  });
  const heatState = buildSpawnHeatState(sectorEnemyCounts);
  const sectorWeights = computeSectorWeights({
    sectorIds: WORLD_SECTOR_IDS,
    playerSectorId: state.world?.currentSectorId,
    sectorEnemyCounts,
    heatState,
    activeEnemyCount: state.enemies.length,
    maxActiveEnemies: MAX_ACTIVE_ENEMIES,
    perSectorSoftCap: SPAWN_DIRECTOR_SOFT_CAP,
  });

  state.spawnDirector = {
    ...(state.spawnDirector || createSpawnDirectorState({ sectorIds: WORLD_SECTOR_IDS })),
    sectorWeights,
    sectorEnemyCounts,
    spawnCooldown: state.spawnCooldown,
  };

  return {
    sectorEnemyCounts,
    sectorWeights,
    heatState,
  };
}

function resolveSpawnPointForSector(sectorId, lateralRoll = 0.5, depthRoll = 0.5) {
  const sector = getSectorById(sectorId);
  if (!sector) {
    return { x: 0, y: 0 };
  }

  const bounds = sector.bounds;
  const inset = 0.9;
  const minX = bounds.minX + inset;
  const maxX = bounds.maxX - inset;
  const minY = bounds.minY + inset;
  const maxY = bounds.maxY - inset;
  let primaryPoint = null;

  if (sectorId === "north") {
    primaryPoint = {
      x: randomRangeFromUnit(minX, maxX, lateralRoll),
      y: randomRangeFromUnit(minY, Math.min(minY + 2.1, maxY), depthRoll),
    };
  } else if (sectorId === "east") {
    primaryPoint = {
      x: randomRangeFromUnit(Math.max(maxX - 2.1, minX), maxX, depthRoll),
      y: randomRangeFromUnit(minY, maxY, lateralRoll),
    };
  } else if (sectorId === "south") {
    primaryPoint = {
      x: randomRangeFromUnit(minX, maxX, lateralRoll),
      y: randomRangeFromUnit(Math.max(maxY - 2.1, minY), maxY, depthRoll),
    };
  } else {
    const mainLanes = sector.lanes.filter((lane) => lane.kind === "main");
    const laneIndex = Math.min(mainLanes.length - 1, Math.floor(lateralRoll * mainLanes.length));
    const lane = mainLanes[Math.max(0, laneIndex)] || sector.lanes[0] || null;
    if (!lane) {
      primaryPoint = {
        x: randomRangeFromUnit(minX, maxX, lateralRoll),
        y: randomRangeFromUnit(minY, maxY, depthRoll),
      };
    } else {
      const spread = (depthRoll - 0.5) * Math.max(0.6, lane.width * 0.65);
      if (Math.abs(lane.entry.y - bounds.minY) < 0.15) {
        primaryPoint = { x: clamp(lane.entry.x + spread, minX, maxX), y: minY + 0.55 };
      } else if (Math.abs(lane.entry.y - bounds.maxY) < 0.15) {
        primaryPoint = { x: clamp(lane.entry.x + spread, minX, maxX), y: maxY - 0.55 };
      } else if (Math.abs(lane.entry.x - bounds.maxX) < 0.15) {
        primaryPoint = { x: maxX - 0.55, y: clamp(lane.entry.y + spread, minY, maxY) };
      } else {
        primaryPoint = { x: minX + 0.55, y: clamp(lane.entry.y + spread, minY, maxY) };
      }
    }
  }

  const candidates = [
    primaryPoint,
    { x: clamp(primaryPoint.x + 1.1, minX, maxX), y: primaryPoint.y },
    { x: clamp(primaryPoint.x - 1.1, minX, maxX), y: primaryPoint.y },
    { x: primaryPoint.x, y: clamp(primaryPoint.y + 1.1, minY, maxY) },
    { x: primaryPoint.x, y: clamp(primaryPoint.y - 1.1, minY, maxY) },
  ];
  const safeCandidates = filterSpawnCandidates({
    sectorId,
    buildings: WORLD_BUILDINGS,
    candidates,
    padding: 0.9,
  });
  return safeCandidates[0] || primaryPoint;
}

function makeCanvasTexture(width, height, drawFn) {
  const texCanvas = document.createElement("canvas");
  texCanvas.width = width;
  texCanvas.height = height;
  const ctx = texCanvas.getContext("2d", { alpha: true });
  drawFn(ctx, width, height);
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function worldToTexturePoint(x, y, width, height) {
  return {
    x: clamp(((x + GROUND_HALF_WIDTH) / GROUND_WIDTH) * width, 0, width),
    y: clamp(((y + GROUND_HALF_HEIGHT) / GROUND_HEIGHT) * height, 0, height),
  };
}

function getPressureStyle(level = "low") {
  return READABILITY_PRESSURE_STYLE[level] || READABILITY_PRESSURE_STYLE.low;
}

function buildWorldReadabilityState(sectorEnemyCounts = buildSectorEnemyCounts({
  sectorIds: WORLD_SECTOR_IDS,
  enemies: state.enemies,
})) {
  const currentSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const sector = getSectorById(currentSectorId) || getSectorById(WORLD_SECTOR_IDS[0]);
  const sectorEnemyCount = getSectorCountById(sectorEnemyCounts, sector?.id ?? WORLD_SECTOR_IDS[0]);
  const mainLaneCount = sector?.lanes.filter((lane) => lane.kind === "main").length ?? 0;
  const bypassLaneCount = sector?.lanes.filter((lane) => lane.kind === "bypass").length ?? 0;
  const chokeCount = sector?.lanes.length ?? 0;
  const localDensity = sectorEnemyCount / Math.max(1, mainLaneCount + bypassLaneCount + 0.75);
  const globalPressure = clamp(state.enemies.length / MAX_ACTIVE_ENEMIES, 0, 1);
  const chokePressure = chokeCount * 0.22 + mainLaneCount * 0.12 - bypassLaneCount * 0.08;
  const pressureScore = localDensity + chokePressure + globalPressure * 1.1;

  let pressureLevel = "low";
  if (pressureScore >= 2.45 || sectorEnemyCount >= 5) {
    pressureLevel = "high";
  } else if (pressureScore >= 1.15 || sectorEnemyCount >= 2) {
    pressureLevel = "medium";
  }

  return {
    sectorLabel: String(sector?.id || currentSectorId || "unknown").toUpperCase(),
    pressureLevel,
    pressureLabel: getPressureStyle(pressureLevel).hudLabel,
    sectorEnemyCount,
    mainLaneCount,
    bypassLaneCount,
    chokeCount,
  };
}

function updateWorldReadabilityState() {
  const sectorEnemyCounts = buildSectorEnemyCounts({
    sectorIds: WORLD_SECTOR_IDS,
    enemies: state.enemies,
  });
  const currentSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const tactics = buildWorldTacticsState({
    currentSectorId,
    playerPosition: { x: state.player.x, y: state.player.y },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts,
  });
  state.world = {
    ...(state.world || createWorldTraversalState()),
    buildings: WORLD_BUILDINGS,
    tactics,
    readability: buildWorldReadabilityState(sectorEnemyCounts),
  };
  return state.world.readability;
}

function distanceToSectorBoundary(sector, point) {
  if (!sector) {
    return Number.POSITIVE_INFINITY;
  }

  const bounds = sector.bounds;
  return Math.min(
    Math.abs(point.x - bounds.minX),
    Math.abs(bounds.maxX - point.x),
    Math.abs(point.y - bounds.minY),
    Math.abs(bounds.maxY - point.y),
  );
}

function createSectorGuide(sector) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(sector.bounds.minX, 0.05, sector.bounds.minY),
    new THREE.Vector3(sector.bounds.maxX, 0.05, sector.bounds.minY),
    new THREE.Vector3(sector.bounds.maxX, 0.05, sector.bounds.maxY),
    new THREE.Vector3(sector.bounds.minX, 0.05, sector.bounds.maxY),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0x1a557a,
    transparent: true,
    opacity: 0.18,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.renderOrder = 3;
  return { sectorId: sector.id, line };
}

function createLaneBeacon(sectorId, lane) {
  const style = LANE_STYLE_BY_KIND[lane.kind] || LANE_STYLE_BY_KIND.bypass;
  const geometry = new THREE.RingGeometry(0.16, lane.kind === "main" ? 0.38 : 0.28, 24);
  const material = new THREE.MeshBasicMaterial({
    color: style.beaconColor,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(lane.entry.x, 0.045, lane.entry.y);
  mesh.renderOrder = 4;
  return {
    sectorId,
    laneKind: lane.kind,
    toSectorId: lane.toSectorId,
    mesh,
  };
}

function buildReadabilityGuides() {
  world.sectorGuides = [];
  world.laneBeacons = [];

  for (const sector of WORLD_SECTORS) {
    const guide = createSectorGuide(sector);
    world.sectorGuides.push(guide);
    world.guideRoot.add(guide.line);

    for (const lane of sector.lanes) {
      const beacon = createLaneBeacon(sector.id, lane);
      world.laneBeacons.push(beacon);
      world.guideRoot.add(beacon.mesh);
    }
  }
}

function syncReadabilityGuides() {
  const currentSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const currentSector = getSectorById(currentSectorId);
  const readability = state.world?.readability || buildWorldReadabilityState();
  const visited = new Set(state.world?.visitedSectorIds || []);
  const pressureStyle = getPressureStyle(readability.pressureLevel);
  const boundaryDistance = distanceToSectorBoundary(currentSector, { x: state.player.x, y: state.player.y });
  const boundaryBoost = clamp(1 - boundaryDistance / 2.2, 0, 1);

  if (world.floor?.material?.color) {
    world.floor.material.color.setHex(pressureStyle.floorTint);
  }

  for (const guide of world.sectorGuides) {
    const isCurrent = guide.sectorId === currentSectorId;
    const isVisited = visited.has(guide.sectorId);
    guide.line.material.color.setHex(isCurrent ? pressureStyle.color : isVisited ? 0x9ee8dd : 0x1a557a);
    guide.line.material.opacity = isCurrent ? 0.64 + boundaryBoost * 0.28 : isVisited ? 0.34 : 0.14;
    guide.line.scale.setScalar(isCurrent ? 1 + boundaryBoost * 0.02 : 1);
  }

  const pulse = 0.7 + Math.sin(state.time * 4.8) * 0.08;
  for (const beacon of world.laneBeacons) {
    const isCurrent = beacon.sectorId === currentSectorId;
    const isConnected = beacon.toSectorId === currentSectorId;
    const isVisited = visited.has(beacon.sectorId) || visited.has(beacon.toSectorId);
    const opacityBase =
      beacon.laneKind === "main"
        ? isCurrent
          ? 0.72
          : isConnected
            ? 0.42
            : isVisited
              ? 0.2
              : 0.08
        : isCurrent
          ? 0.48
          : isConnected
            ? 0.32
            : isVisited
              ? 0.16
              : 0.06;
    beacon.mesh.material.opacity = opacityBase * pulse;
    beacon.mesh.scale.setScalar(isCurrent ? 1.08 + boundaryBoost * 0.08 : 1);
  }
}

function syncBuildingVisuals() {
  const currentSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const visited = new Set(state.world?.visitedSectorIds || []);
  const tactics = state.world?.tactics || buildWorldTacticsState({
    currentSectorId,
    playerPosition: { x: state.player.x, y: state.player.y },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts: buildSectorEnemyCounts({
      sectorIds: WORLD_SECTOR_IDS,
      enemies: state.enemies,
    }),
  });

  for (const visual of world.buildingVisuals) {
    const isCurrent = visual.sectorId === currentSectorId;
    const isVisited = visited.has(visual.sectorId);
    const cueMatch =
      (tactics.cueLabel === "BREAK" && visual.role === "blocker") ||
      (tactics.cueLabel === "FUNNEL" && visual.role === "funnel") ||
      (tactics.cueLabel === "POCKET" && visual.role === "soft-cover");

    const panelOpacity = isCurrent ? 0.42 : isVisited ? 0.24 : 0.12;
    const outlineOpacity = isCurrent ? 0.82 : isVisited ? 0.42 : 0.22;
    const markerOpacity = isCurrent ? 0.72 : isVisited ? 0.34 : 0.14;

    visual.group.scale.setScalar(cueMatch ? 1.03 : 1);
    for (const panel of visual.panels) {
      panel.material.opacity = panelOpacity + (cueMatch ? 0.1 : 0);
    }
    for (const outline of visual.outlines) {
      outline.material.opacity = outlineOpacity + (cueMatch ? 0.08 : 0);
    }
    for (const marker of visual.markers) {
      marker.material.opacity =
        markerOpacity + (visual.role === "soft-cover" && tactics.retreatPocketActive && isCurrent ? 0.18 : 0);
      marker.scale.setScalar(visual.role === "soft-cover" && tactics.retreatPocketActive && isCurrent ? 1.26 : 1);
    }
  }
}

function createBreakablePanel(breakable, fill) {
  const geometry = new THREE.PlaneGeometry(breakable.size.width, breakable.size.height, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: fill,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(breakable.x, 0.045, breakable.y);
  mesh.renderOrder = 3;
  return mesh;
}

function createBreakableOutline(breakable, edge) {
  const halfWidth = breakable.size.width / 2;
  const halfHeight = breakable.size.height / 2;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(breakable.x - halfWidth, 0.07, breakable.y - halfHeight),
    new THREE.Vector3(breakable.x + halfWidth, 0.07, breakable.y - halfHeight),
    new THREE.Vector3(breakable.x + halfWidth, 0.07, breakable.y + halfHeight),
    new THREE.Vector3(breakable.x - halfWidth, 0.07, breakable.y + halfHeight),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: edge,
    transparent: true,
    opacity: 0.8,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.renderOrder = 4;
  return line;
}

function createBreakableAccent(breakable, accent) {
  const geometry = new THREE.RingGeometry(0.09, 0.24, 16);
  const material = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(breakable.x, 0.08, breakable.y);
  mesh.renderOrder = 5;
  return mesh;
}

function createBreakableVisual(breakable) {
  const group = new THREE.Group();
  const fillColor = new THREE.Color(breakable.visual.fill);
  const edgeColor = new THREE.Color(breakable.visual.edge);
  const accentColor = new THREE.Color(breakable.visual.accent);
  const panel = createBreakablePanel(breakable, fillColor);
  const outline = createBreakableOutline(breakable, edgeColor);
  const accent = createBreakableAccent(breakable, accentColor);
  group.add(panel, outline, accent);

  return {
    breakableId: breakable.id,
    sectorId: breakable.sectorId,
    group,
    panel,
    outline,
    accent,
  };
}

function buildWorldBreakables() {
  world.breakableVisuals = [];
  for (const breakable of state.world?.breakables || []) {
    const visual = createBreakableVisual(breakable);
    world.breakableVisuals.push(visual);
    world.breakableRoot.add(visual.group);
  }
}

function syncBreakableVisuals() {
  const currentSectorId = state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const visited = new Set(state.world?.visitedSectorIds || []);
  const breakablesById = new Map((state.world?.breakables || []).map((breakable) => [breakable.id, breakable]));

  for (const visual of world.breakableVisuals) {
    const breakable = breakablesById.get(visual.breakableId);
    if (!breakable) {
      visual.group.visible = false;
      continue;
    }

    const isCurrent = visual.sectorId === currentSectorId;
    const isVisited = visited.has(visual.sectorId);
    const isBroken = Boolean(breakable.broken);
    visual.group.visible = true;
    visual.group.scale.setScalar(isBroken ? 0.82 : isCurrent ? 1.05 : 1);

    visual.panel.material.opacity = isBroken ? 0.08 : isCurrent ? 0.66 : isVisited ? 0.42 : 0.24;
    visual.outline.material.opacity = isBroken ? 0.14 : isCurrent ? 0.92 : isVisited ? 0.56 : 0.32;
    visual.accent.material.opacity = isBroken ? 0.06 : isCurrent ? 0.52 : isVisited ? 0.28 : 0.14;
  }
}

function getDropRarityColor(rarity) {
  if (rarity === "epic") {
    return 0xc58cff;
  }
  if (rarity === "rare") {
    return 0x7fd9ff;
  }
  return 0xffd88a;
}

function createDropVisual(drop) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.34, 20),
    new THREE.MeshBasicMaterial({
      color: getDropRarityColor(drop.rarity),
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 5;

  const core = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    new THREE.MeshBasicMaterial({
      color: getDropRarityColor(drop.rarity),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  core.rotation.x = -Math.PI / 2;
  core.rotation.z = Math.PI / 4;
  core.position.y = 0.05;
  core.renderOrder = 6;

  group.add(ring, core);
  world.dropRoot.add(group);

  return {
    dropId: drop.id,
    group,
    ring,
    core,
  };
}

function disposeDropVisual(visual) {
  if (!visual) {
    return;
  }
  world.dropRoot.remove(visual.group);
  visual.ring.geometry.dispose();
  visual.ring.material.dispose();
  visual.core.geometry.dispose();
  visual.core.material.dispose();
}

function clearDropVisuals() {
  for (const visual of world.dropVisuals.values()) {
    disposeDropVisual(visual);
  }
  world.dropVisuals.clear();
}

function syncDropVisuals() {
  const groundDrops = state.loot?.groundDrops || [];
  const activeIds = new Set(groundDrops.map((drop) => drop.id));

  for (const [dropId, visual] of world.dropVisuals.entries()) {
    if (!activeIds.has(dropId)) {
      disposeDropVisual(visual);
      world.dropVisuals.delete(dropId);
    }
  }

  for (const drop of groundDrops) {
    let visual = world.dropVisuals.get(drop.id);
    if (!visual) {
      visual = createDropVisual(drop);
      world.dropVisuals.set(drop.id, visual);
    }

    const pending = state.loot?.pendingPickupId === drop.id;
    const disarmed = !drop.pickupArmed || drop.needsRearm;
    const pulse = 0.86 + Math.sin(state.time * 5.4 + drop.order) * 0.08;
    visual.group.position.set(drop.x, 0.02, drop.y);
    visual.group.scale.setScalar((pending ? 1.18 : 1) * pulse);
    visual.ring.material.color.setHex(getDropRarityColor(drop.rarity));
    visual.core.material.color.setHex(getDropRarityColor(drop.rarity));
    visual.ring.material.opacity = disarmed ? 0.22 : pending ? 0.9 : 0.64;
    visual.core.material.opacity = disarmed ? 0.18 : pending ? 0.94 : 0.76;
  }
}

function pixelTextureFromPattern(pattern, palette) {
  const width = pattern[0].length;
  const height = pattern.length;
  return makeCanvasTexture(width, height, (ctx) => {
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < pattern.length; y += 1) {
      const row = pattern[y];
      for (let x = 0; x < row.length; x += 1) {
        const key = row[x];
        if (key === ".") continue;
        const color = palette[key] || "#000000";
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

function createSprite(pattern, palette, worldSize) {
  const tex = pixelTextureFromPattern(pattern, palette);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = pattern.length > 0 ? pattern[0].length / pattern.length : 1;
  sprite.scale.set(worldSize * aspect, worldSize, 1);
  sprite.position.set(0, 0.35, 0);
  return sprite;
}

function createBuildingPanel(bounds, fill) {
  const width = Math.max(0.15, bounds.maxX - bounds.minX);
  const height = Math.max(0.15, bounds.maxY - bounds.minY);
  const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: fill,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((bounds.minX + bounds.maxX) / 2, 0.03, (bounds.minY + bounds.maxY) / 2);
  mesh.renderOrder = 2;
  return mesh;
}

function createBuildingOutline(bounds, edge) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.minX, 0.06, bounds.minY),
    new THREE.Vector3(bounds.maxX, 0.06, bounds.minY),
    new THREE.Vector3(bounds.maxX, 0.06, bounds.maxY),
    new THREE.Vector3(bounds.minX, 0.06, bounds.maxY),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: edge,
    transparent: true,
    opacity: 0.44,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.renderOrder = 3;
  return line;
}

function createBuildingMarker(anchor, accent) {
  const geometry = new THREE.RingGeometry(0.08, 0.22, 16);
  const material = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(anchor.x, 0.08, anchor.y);
  mesh.renderOrder = 4;
  return mesh;
}

function createBuildingVisual(building) {
  const group = new THREE.Group();
  const panels = [];
  const outlines = [];
  const markers = [];
  const fillColor = new THREE.Color(building.visual.fill);
  const edgeColor = new THREE.Color(building.visual.edge);
  const accentColor = new THREE.Color(building.visual.accent);

  for (const collider of building.colliders) {
    const panel = createBuildingPanel(collider.bounds, fillColor);
    const outline = createBuildingOutline(collider.bounds, edgeColor);
    panels.push(panel);
    outlines.push(outline);
    group.add(panel, outline);
  }

  for (const anchor of Object.values(building.anchors || {})) {
    const marker = createBuildingMarker(anchor, accentColor);
    markers.push(marker);
    group.add(marker);
  }

  return {
    buildingId: building.id,
    sectorId: building.sectorId,
    role: building.role,
    group,
    panels,
    outlines,
    markers,
  };
}

function createGroundTexture() {
  return makeCanvasTexture(512, 512, (ctx, width, height) => {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#98f8be");
    grad.addColorStop(0.6, "#68d3b2");
    grad.addColorStop(1, "#5fa8e7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 16) {
      for (let x = 0; x < width; x += 16) {
        const shade = (x + y) % 32 === 0 ? "rgba(255,255,255,0.13)" : "rgba(11,58,76,0.08)";
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 16, 16);
      }
    }

    for (const sector of WORLD_SECTORS) {
      const topLeft = worldToTexturePoint(sector.bounds.minX, sector.bounds.minY, width, height);
      const bottomRight = worldToTexturePoint(sector.bounds.maxX, sector.bounds.maxY, width, height);
      ctx.fillStyle = SECTOR_SURFACE_COLORS[sector.id] || "rgba(255,255,255,0.12)";
      ctx.fillRect(
        topLeft.x,
        topLeft.y,
        Math.max(4, bottomRight.x - topLeft.x),
        Math.max(4, bottomRight.y - topLeft.y),
      );

      ctx.strokeStyle = sector.kind === "hub" ? "rgba(255, 245, 168, 0.58)" : "rgba(223, 245, 255, 0.36)";
      ctx.lineWidth = sector.kind === "hub" ? 6 : 4;
      ctx.strokeRect(
        topLeft.x + 1,
        topLeft.y + 1,
        Math.max(2, bottomRight.x - topLeft.x - 2),
        Math.max(2, bottomRight.y - topLeft.y - 2),
      );

      for (const lane of sector.lanes) {
        const from = worldToTexturePoint(lane.entry.x, lane.entry.y, width, height);
        const to = worldToTexturePoint(lane.exit.x, lane.exit.y, width, height);
        const style = LANE_STYLE_BY_KIND[lane.kind] || LANE_STYLE_BY_KIND.bypass;

        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.fillStyle = lane.kind === "main" ? "rgba(255, 244, 192, 0.72)" : "rgba(145, 240, 255, 0.66)";
        ctx.beginPath();
        ctx.arc(from.x, from.y, lane.kind === "main" ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(9,36,58,0.22)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, width - 12, height - 12);
  });
}

function buildWorldBuildings() {
  world.buildingVisuals = [];
  for (const building of WORLD_BUILDINGS) {
    const visual = createBuildingVisual(building);
    world.buildingVisuals.push(visual);
    world.buildingRoot.add(visual.group);
  }
}

function buildWorld() {
  const floorGeometry = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_HEIGHT, 1, 1);
  const floorMaterial = new THREE.MeshBasicMaterial({ map: createGroundTexture() });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);
  world.floor = floor;

  const rimGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-ARENA_HALF_WIDTH, 0.05, -ARENA_HALF_HEIGHT),
    new THREE.Vector3(ARENA_HALF_WIDTH, 0.05, -ARENA_HALF_HEIGHT),
    new THREE.Vector3(ARENA_HALF_WIDTH, 0.05, ARENA_HALF_HEIGHT),
    new THREE.Vector3(-ARENA_HALF_WIDTH, 0.05, ARENA_HALF_HEIGHT),
    new THREE.Vector3(-ARENA_HALF_WIDTH, 0.05, -ARENA_HALF_HEIGHT),
  ]);
  const rim = new THREE.Line(rimGeometry, new THREE.LineBasicMaterial({ color: 0x173f66 }));
  scene.add(rim);
  world.arenaBounds = rim;

  world.playerSprite = createSprite(PATTERN_PLAYER, PALETTE_PLAYER, 2.7);
  scene.add(world.playerSprite);
  buildWorldBreakables();
  buildWorldBuildings();
  buildReadabilityGuides();
}

function resizeRenderer() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(2, Math.floor(rect.width));
  const height = Math.max(2, Math.floor(rect.height));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);

  const aspect = width / height;
  const halfHeight = 13.5;
  const halfWidth = halfHeight * aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

function syncSpritePosition(sprite, x, y) {
  sprite.position.set(x, 0.38, y);
}

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function spawnEnemy() {
  const spawnTelemetry = refreshSpawnDirectorState();
  const sectorRoll = nextSpawnRngValue();
  const plannedSpawn = planSpawnSector({
    directorState: state.spawnDirector,
    sectorIds: WORLD_SECTOR_IDS,
    playerSectorId: state.world?.currentSectorId,
    sectorEnemyCounts: spawnTelemetry.sectorEnemyCounts,
    heatState: spawnTelemetry.heatState,
    activeEnemyCount: state.enemies.length,
    maxActiveEnemies: MAX_ACTIVE_ENEMIES,
    perSectorSoftCap: SPAWN_DIRECTOR_SOFT_CAP,
    rngValue: sectorRoll,
    spawnRngState: state.spawnDirector.spawnRngState,
    spawnCooldown: state.spawnCooldown,
  });
  const selectedSectorId = plannedSpawn.selectedSectorId ?? state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0];
  const enemyType = chooseEnemyType(nextSpawnRngValue());
  const spawnPoint = resolveSpawnPointForSector(selectedSectorId, nextSpawnRngValue(), nextSpawnRngValue());

  state.spawnDirector = {
    ...plannedSpawn.directorState,
    spawnCooldown: state.spawnCooldown,
    spawnRngState: state.spawnDirector.spawnRngState,
  };

  const sprite = createSprite(enemyType.pattern, PALETTE_ENEMY[enemyType.key], 2.25);
  world.enemyRoot.add(sprite);

  state.enemies.push({
    id: state.nextEnemyId,
    kind: enemyType.key,
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: 0,
    vy: 0,
    radius: 0.82,
    hp: enemyType.hp,
    maxHp: enemyType.hp,
    speed: enemyType.speed,
    points: enemyType.points,
    flash: 0,
    blockedFrames: 0,
    steerSign: 1,
    steeringMode: "direct",
    sectorId: selectedSectorId,
    sprite,
  });
  state.nextEnemyId += 1;
  refreshSpawnDirectorState();
}

function addHitShake(strength, duration) {
  state.shakeStrength = Math.max(state.shakeStrength, strength);
  state.shakeTime = Math.max(state.shakeTime, duration);
}

function disposeParticle(particle) {
  world.particleRoot.remove(particle.mesh);
  particle.mesh.geometry.dispose();
  particle.mesh.material.dispose();
}

function reclaimParticleBudget(requiredSlots) {
  let remaining = requiredSlots;
  for (let i = state.particles.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const particle = state.particles[i];
    if (particle.priority === "kill") {
      continue;
    }
    disposeParticle(particle);
    state.particles.splice(i, 1);
    remaining -= 1;
  }
}

function spawnParticles(
  x,
  y,
  count,
  color = 0xfff2a0,
  options = { priority: "hit", speedMin: 2.2, speedMax: 6.1, lifeMin: 0.2, lifeMax: 0.52 },
) {
  const priority = options.priority ?? "hit";
  const boundedCount = clamp(Math.floor(count), 0, FEEDBACK_PARTICLE_EVENT_CAP);
  if (boundedCount <= 0) {
    return;
  }

  let spawnCount = boundedCount;
  if (priority === "kill") {
    const missingSlots = state.particles.length + spawnCount - FEEDBACK_PARTICLE_HARD_CAP;
    if (missingSlots > 0) {
      reclaimParticleBudget(missingSlots);
    }
    spawnCount = Math.min(spawnCount, FEEDBACK_PARTICLE_HARD_CAP - state.particles.length);
  } else {
    const nonKillCap = FEEDBACK_PARTICLE_HARD_CAP - FEEDBACK_PARTICLE_RESERVED_FOR_KILL;
    if (state.particles.length >= nonKillCap) {
      return;
    }
    spawnCount = Math.min(spawnCount, nonKillCap - state.particles.length);
  }

  for (let i = 0; i < spawnCount; i += 1) {
    const geometry = new THREE.PlaneGeometry(0.16, 0.16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, y);
    world.particleRoot.add(mesh);

    const angle = randomRangeVisual(0, Math.PI * 2);
    const speed = randomRangeVisual(options.speedMin ?? 2.2, options.speedMax ?? 6.1);
    const maxLife = randomRangeVisual(options.lifeMin ?? 0.2, options.lifeMax ?? 0.52);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      mesh,
      priority,
    });
  }
}

function setCenterBanner(text, kind = "neutral", duration = FEEDBACK_BANNER_DEFAULT_SECONDS, force = false) {
  const now = state.time;
  if (!force && now - state.feedback.lastBannerAt < FEEDBACK_BANNER_RATE_LIMIT_SECONDS) {
    return false;
  }
  state.feedback.lastBannerAt = now;
  state.feedback.bannerText = text;
  state.feedback.bannerKind = kind;
  state.feedback.bannerTimer = duration;
  return true;
}

function clearCenterBanner() {
  state.feedback.bannerText = "";
  state.feedback.bannerKind = "neutral";
  state.feedback.bannerTimer = 0;
}

function triggerHitFeedback(x, y) {
  state.feedback.hitFlash = Math.max(state.feedback.hitFlash, FEEDBACK_HIT_FLASH_PEAK);
  spawnParticles(x, y, 5, 0xffb983, {
    priority: "hit",
    speedMin: 1.8,
    speedMax: 4.1,
    lifeMin: 0.18,
    lifeMax: 0.36,
  });
}

function triggerKillFeedback(x, y) {
  state.feedback.killFlash = Math.max(state.feedback.killFlash, FEEDBACK_KILL_FLASH_PEAK);
  state.feedback.killPriorityTimer = Math.max(state.feedback.killPriorityTimer, 0.28);
  spawnParticles(x, y, 15, 0xfff2a0, {
    priority: "kill",
    speedMin: 2.8,
    speedMax: 6.4,
    lifeMin: 0.26,
    lifeMax: 0.56,
  });
  addHitShake(0.44, 0.16);
}

function triggerBreakableFeedback(x, y, destroyed = false) {
  if (destroyed) {
    spawnParticles(x, y, 10, 0x9edcff, {
      priority: "kill",
      speedMin: 2.4,
      speedMax: 5.2,
      lifeMin: 0.2,
      lifeMax: 0.48,
    });
    setCenterBanner("PROP DOWN", "chain", 0.4);
    return;
  }

  spawnParticles(x, y, 4, 0xf7c58f, {
    priority: "hit",
    speedMin: 1.5,
    speedMax: 3.4,
    lifeMin: 0.16,
    lifeMax: 0.3,
  });
}

function triggerMilestoneFeedback(killsThisSwing, chainValue) {
  if (killsThisSwing >= 3) {
    setCenterBanner("TRIPLE KO", "kill", 0.66, true);
    state.feedback.killFlash = Math.max(state.feedback.killFlash, 0.84);
    return;
  }

  if (killsThisSwing === 2) {
    setCenterBanner("DOUBLE KO", "kill", 0.62);
    return;
  }

  const comboMilestone = getComboMilestone(chainValue);
  if (comboMilestone !== null) {
    setCenterBanner(`CHAIN x${comboMilestone}`, "chain", 0.58);
  }
}

function triggerProgressionFeedback(gainedEvents) {
  if (!Array.isArray(gainedEvents) || gainedEvents.length === 0) {
    return;
  }

  const lastEvent = gainedEvents[gainedEvents.length - 1];
  setCenterBanner(`LEVEL UP · LV ${lastEvent.reachedLevel}`, "chain", 0.72, true);
}

function resetFeedbackState() {
  state.feedback.hitFlash = 0;
  state.feedback.killFlash = 0;
  state.feedback.killPriorityTimer = 0;
  state.feedback.dangerOverlay = 0;
  state.feedback.lastBannerAt = -999;
  clearCenterBanner();
}

function updateFeedbackState(dt) {
  state.feedback.hitFlash = Math.max(0, state.feedback.hitFlash - dt * FEEDBACK_FLASH_DECAY_PER_SECOND);
  state.feedback.killFlash = Math.max(0, state.feedback.killFlash - dt * FEEDBACK_FLASH_DECAY_PER_SECOND * 0.9);
  state.feedback.killPriorityTimer = Math.max(0, state.feedback.killPriorityTimer - dt);
  state.feedback.bannerTimer = Math.max(0, state.feedback.bannerTimer - dt);

  const dangerState =
    state.mode === "playing"
      ? getDangerState(state.player.hp, getEffectiveMaxHp(), state.time)
      : { isDanger: false, flashAlpha: 0 };
  const dangerDemand = clamp(dangerState.flashAlpha * 0.72, 0, 0.72);
  const dangerTarget = state.feedback.killPriorityTimer > 0 ? dangerDemand * 0.35 : dangerDemand;
  const interp = clamp(dt * 8.2, 0, 1);
  state.feedback.dangerOverlay += (dangerTarget - state.feedback.dangerOverlay) * interp;

  if (state.feedback.bannerTimer <= 0) {
    clearCenterBanner();
  }
}

function clearCombatObjects() {
  for (const enemy of state.enemies) {
    world.enemyRoot.remove(enemy.sprite);
    enemy.sprite.material.map.dispose();
    enemy.sprite.material.dispose();
  }
  state.enemies = [];

  for (const slash of state.slashEffects) {
    world.slashRoot.remove(slash.mesh);
    slash.mesh.geometry.dispose();
    slash.mesh.material.dispose();
  }
  state.slashEffects = [];

  for (const particle of state.particles) {
    disposeParticle(particle);
  }
  state.particles = [];
}

function updateWorldTraversalFromPlayerPosition(nextSectorHint = null) {
  const nextSectorId =
    typeof nextSectorHint === "string"
      ? nextSectorHint
      : resolveSectorIdForPosition({ x: state.player.x, y: state.player.y }, state.world?.currentSectorId);
  const traversalState = advanceWorldTraversalState(state.world, nextSectorId);
  state.world = {
    ...(state.world || {}),
    ...traversalState,
  };
}

function startRun() {
  clearCombatObjects();
  clearDropVisuals();
  clearInputState();
  state.mode = "playing";
  state.time = 0;
  state.score = 0;
  state.kills = 0;
  state.chain = 0;
  state.chainTimer = 0;
  state.spawnCooldown = 0.75;
  state.nextEnemyId = 1;
  state.equipment = createEquipmentState();
  state.levelUp = createLevelUpState({
    offerRngState: createOfferSeed(INITIAL_RUN_SEED),
  });
  state.upgrades = createUpgradeState();
  state.progression = createProgressionState();
  state.player.x = 0;
  state.player.y = 0;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.hp = getEffectiveMaxHp();
  state.player.attackCooldown = 0;
  state.player.invulnerable = 0;
  state.player.facingX = 0;
  state.player.facingY = -1;
  const initialSectorId = resolveSectorIdForPosition({ x: state.player.x, y: state.player.y });
  const worldBreakables = createWorldBreakables();
  state.world = {
    ...createWorldTraversalState(initialSectorId),
    breakables: worldBreakables,
    buildings: WORLD_BUILDINGS,
    tactics: buildWorldTacticsState({
      currentSectorId: initialSectorId,
      playerPosition: { x: state.player.x, y: state.player.y },
      buildings: WORLD_BUILDINGS,
      sectorEnemyCounts: [],
    }),
  };
  state.gameOverSummary = "";
  state.shakeTime = 0;
  state.shakeStrength = 0;
  state.restartTimer = 0;
  resetFeedbackState();
  state.determinism.lastAdvanceMs = 0;
  state.determinism.lastAdvanceSteps = 0;
  state.determinism.totalAdvanceSteps = 0;
  state.control.focus.recoveryPending = false;
  updateFocusSnapshot("start-run");
  state.control.fullscreen.isFullscreen = Boolean(document.fullscreenElement);
  state.control.fullscreen.lastIntent = "none";
  state.control.fullscreen.lastSource = "start-run";
  state.control.fullscreen.lastResult = "idle";
  state.control.fullscreen.lastError = null;
  state.control.fullscreen.lastAt = Number(state.time.toFixed(3));
  state.control.fullscreen.attemptCount = 0;
  state.control.fullscreen.failureCount = 0;
  state.control.pause.lastTransition = "start->playing";
  state.control.pause.lastFrom = "start";
  state.control.pause.lastTo = "playing";
  state.control.pause.lastReason = "start-run";
  state.control.pause.lastAt = Number(state.time.toFixed(3));
  // Keep run initialization deterministic for repeatable automated testing.
  state.randomSeed = INITIAL_RUN_SEED;
  simulationRng = createRng(state.randomSeed);
  visualRng = createRng(createVisualSeed(state.randomSeed));
  state.spawnDirector = createSpawnDirectorState({
    sectorIds: WORLD_SECTOR_IDS,
    spawnCooldown: state.spawnCooldown,
    spawnRngState: createSpawnSeed(state.randomSeed),
  });
  state.loot = createLootState({
    dropRngState: createDropSeed(state.randomSeed),
  });

  for (let i = 0; i < 3; i += 1) {
    spawnEnemy();
  }
  refreshSpawnDirectorState();
  updateWorldReadabilityState();

  startScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
}

function enterGameOver() {
  state.mode = "gameover";
  state.gameOverSummary = `Time ${state.time.toFixed(1)}s · Score ${Math.floor(state.score)} · Kills ${state.kills}`;
  state.restartTimer = 0;
  clearCenterBanner();
  gameoverStats.textContent = state.gameOverSummary;
  gameoverScreen.classList.remove("hidden");
}

function requestRestart() {
  if (state.mode !== "gameover") {
    return;
  }
  clearInputState();
  state.mode = "restart_pending";
  state.restartTimer = RESTART_TRANSITION_SECONDS;
}

function maybeToggleFullscreen() {
  if (!consumeEdge(pressedThisStep, "KeyF")) {
    return;
  }
  requestFullscreenTransition(resolveFullscreenToggleIntent(Boolean(document.fullscreenElement)), "toggle-key");
}

function maybeHandlePauseAndRestart() {
  if (consumeEdge(pressedThisStep, "KeyP")) {
    const nextMode = resolvePauseMode(state.mode);
    if (nextMode !== state.mode) {
      transitionPauseMode(nextMode, "key-p");
      state.control.focus.recoveryPending = false;
      clearInputState();
    }
  }

  if (
    state.mode === "gameover" &&
    (consumeEdge(pressedThisStep, "KeyR") ||
      consumeEdge(pressedThisStep, "Enter") ||
      consumeEdge(pressedThisStep, "Space"))
  ) {
    requestRestart();
  }

  if (state.mode === "start" && (consumeEdge(pressedThisStep, "Enter") || consumeEdge(pressedThisStep, "Space"))) {
    startRun();
  }
}

function applyEquipmentState(nextEquipmentState, nextLootState, nextMode = state.mode, bannerText = null) {
  state.equipment = nextEquipmentState;
  state.loot = nextLootState;
  state.mode = nextMode;
  state.player.hp = Math.min(state.player.hp, getEffectiveMaxHp());
  if (bannerText) {
    setCenterBanner(bannerText, "chain", 0.42, true);
  }
}

function updateAutoPickup() {
  const result = resolveAutoPickupStep({
    equipmentState: state.equipment,
    lootState: state.loot,
    playerPosition: { x: state.player.x, y: state.player.y },
    pickupRadius: 1.25,
  });

  if (result.action === "equipped") {
    const equippedItem = result.appliedItem;
    applyEquipmentState(
      result.equipmentState,
      result.lootState,
      result.nextMode,
      `EQUIPPED ${formatStatLabel(equippedItem.statKey)} +${formatStatValue(equippedItem.statKey, equippedItem.statValue)}`,
    );
    return;
  }

  if (result.action === "compare") {
    state.equipment = result.equipmentState;
    state.loot = result.lootState;
    state.mode = result.nextMode;
    setCenterBanner("COMPARE ITEM", "neutral", 0.38, true);
    return;
  }

  state.equipment = result.equipmentState;
  state.loot = result.lootState;
}

function handleEquipCompareInput() {
  if (consumeEdge(pressedThisStep, "Escape")) {
    const rejected = rejectCompareCandidate({
      equipmentState: state.equipment,
      lootState: state.loot,
    });
    applyEquipmentState(rejected.equipmentState, rejected.lootState, rejected.nextMode, "KEEP CURRENT");
    return;
  }

  if (consumeEdge(pressedThisStep, "Enter") || consumeEdge(pressedThisStep, "Space")) {
    const accepted = acceptCompareCandidate({
      equipmentState: state.equipment,
      lootState: state.loot,
    });
    const acceptedItem = accepted.acceptedItem;
    applyEquipmentState(
      accepted.equipmentState,
      accepted.lootState,
      accepted.nextMode,
      acceptedItem
        ? `EQUIPPED ${formatStatLabel(acceptedItem.statKey)} +${formatStatValue(acceptedItem.statKey, acceptedItem.statValue)}`
        : "EQUIPPED",
    );
  }
}

function maybeEnterLevelUpChoice() {
  if (state.mode !== "playing") {
    return;
  }
  if ((state.progression?.pendingLevelUps?.length ?? 0) === 0) {
    return;
  }
  if (state.equipment?.compareCandidate) {
    return;
  }

  const opened = beginLevelUpChoice({
    progressionState: state.progression,
    upgradeState: state.upgrades,
    levelUpState: state.levelUp,
  });
  if (!opened.didOpen) {
    return;
  }

  state.progression = opened.progressionState;
  state.upgrades = opened.upgradeState;
  state.levelUp = opened.levelUpState;
  state.mode = "levelup_choice";
  setCenterBanner("LEVEL UP", "neutral", 0.44, true);
}

function handleLevelUpChoiceInput() {
  if (consumeEdge(pressedThisStep, "ArrowLeft") || consumeEdge(pressedThisStep, "KeyA")) {
    state.levelUp = moveLevelUpSelection({
      levelUpState: state.levelUp,
      direction: -1,
    });
    return;
  }

  if (consumeEdge(pressedThisStep, "ArrowRight") || consumeEdge(pressedThisStep, "KeyD")) {
    state.levelUp = moveLevelUpSelection({
      levelUpState: state.levelUp,
      direction: 1,
    });
    return;
  }

  if (consumeEdge(pressedThisStep, "Enter") || consumeEdge(pressedThisStep, "Space")) {
    const confirmed = confirmLevelUpChoice({
      progressionState: state.progression,
      upgradeState: state.upgrades,
      levelUpState: state.levelUp,
    });

    if (!confirmed.didConfirm) {
      return;
    }

    state.progression = confirmed.progressionState;
    state.upgrades = confirmed.upgradeState;
    state.levelUp = confirmed.levelUpState;
    state.mode = "playing";
    clearInputState();
    setCenterBanner(
      confirmed.chosenChoice ? `SELECTED ${confirmed.chosenChoice.label}` : "UPGRADE SELECTED",
      "chain",
      0.44,
      true,
    );
  }
}

function applyPlayerInput(dt) {
  const left = keyboardDown.has("ArrowLeft") || keyboardDown.has("KeyA");
  const right = keyboardDown.has("ArrowRight") || keyboardDown.has("KeyD");
  const up = keyboardDown.has("ArrowUp") || keyboardDown.has("KeyW");
  const down = keyboardDown.has("ArrowDown") || keyboardDown.has("KeyS");

  const xDir = (right ? 1 : 0) - (left ? 1 : 0);
  const yDir = (down ? 1 : 0) - (up ? 1 : 0);

  const len = Math.hypot(xDir, yDir);
  let desiredVx = 0;
  let desiredVy = 0;
  if (len > 0) {
    desiredVx = (xDir / len) * getEffectiveMoveSpeed();
    desiredVy = (yDir / len) * getEffectiveMoveSpeed();
    state.player.facingX = xDir / len;
    state.player.facingY = yDir / len;
  }

  const resolved = resolvePlayerBoundaryMovement({
    position: { x: state.player.x, y: state.player.y },
    velocity: { x: desiredVx, y: desiredVy },
    dt,
    currentSectorId: state.world?.currentSectorId,
    buildingColliders: WORLD_BUILDING_COLLIDERS,
    fallbackBounds: PLAYER_MOVEMENT_FALLBACK_BOUNDS,
  });

  state.player.x = resolved.x;
  state.player.y = resolved.y;
  state.player.vx = resolved.vx;
  state.player.vy = resolved.vy;
  updateWorldTraversalFromPlayerPosition(resolved.sectorId);
}

function doAttack() {
  if (state.player.attackCooldown > 0) {
    return;
  }

  state.player.attackCooldown = PLAYER_ATTACK_COOLDOWN;
  const angle = Math.atan2(state.player.facingY, state.player.facingX);

  const slashGeometry = new THREE.CircleGeometry(PLAYER_ATTACK_RADIUS + 0.25, 28, angle - 0.72, 1.44);
  const slashMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7b3b,
    transparent: true,
    opacity: 0.45,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const slashMesh = new THREE.Mesh(slashGeometry, slashMaterial);
  slashMesh.rotation.x = -Math.PI / 2;
  slashMesh.position.set(state.player.x, 0.44, state.player.y);
  world.slashRoot.add(slashMesh);

  state.slashEffects.push({
    x: state.player.x,
    y: state.player.y,
    angle,
    lifetime: 0.22,
    maxLifetime: 0.22,
    mesh: slashMesh,
  });

  const orderedEnemies = state.enemies.slice().sort((a, b) => a.id - b.id);
  const hitMoments = [];
  for (const enemy of orderedEnemies) {
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > PLAYER_ATTACK_RADIUS + enemy.radius) {
      continue;
    }

    const nx = distance > 0 ? dx / distance : 0;
    const ny = distance > 0 ? dy / distance : 0;
    const frontDot = nx * state.player.facingX + ny * state.player.facingY;
    if (frontDot < PLAYER_ATTACK_FRONT_DOT_THRESHOLD) {
      continue;
    }

    enemy.hp -= getEffectiveAttackDamage();
    enemy.flash = 0.1;
    hitMoments.push({ x: enemy.x, y: enemy.y });
  }

  const breakableResolution = resolveBreakableAttackStep({
    breakables: state.world?.breakables || [],
    attackOrigin: { x: state.player.x, y: state.player.y },
    attackFacing: { x: state.player.facingX, y: state.player.facingY },
    attackRadius: PLAYER_ATTACK_RADIUS,
    attackDamage: getEffectiveAttackDamage(),
    frontDotThreshold: PLAYER_ATTACK_FRONT_DOT_THRESHOLD,
  });
  state.world = {
    ...(state.world || {}),
    breakables: breakableResolution.breakables,
  };
  if (breakableResolution.destroyedBreakables.length > 0) {
    state.loot = resolveDestroyedBreakableDrops({
      lootState: state.loot,
      destroyedBreakables: breakableResolution.destroyedBreakables,
    }).lootState;
  }

  const survivors = [];
  const killMoments = [];
  const levelUpEvents = [];
  for (const enemy of orderedEnemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
      continue;
    }

    world.enemyRoot.remove(enemy.sprite);
    enemy.sprite.material.map.dispose();
    enemy.sprite.material.dispose();

    const bonus = Math.max(0, state.chain - 1) * 18;
    state.score += enemy.points + bonus;
    state.kills += 1;
    if (state.chainTimer > 0) {
      state.chain += 1;
    } else {
      state.chain = 1;
    }
    state.chainTimer = 2.4;
    const progressionUpdate = applyEnemyKillXp({
      progressionState: state.progression,
      enemyKind: enemy.kind,
    });
    state.progression = progressionUpdate.progressionState;
    levelUpEvents.push(...progressionUpdate.gainedEvents);
    killMoments.push({ x: enemy.x, y: enemy.y });
  }

  state.enemies = survivors;

  for (const hit of hitMoments) {
    triggerHitFeedback(hit.x, hit.y);
  }
  for (const breakable of breakableResolution.hitBreakables) {
    triggerBreakableFeedback(breakable.x, breakable.y, false);
  }
  for (const breakable of breakableResolution.destroyedBreakables) {
    triggerBreakableFeedback(breakable.x, breakable.y, true);
  }

  if (killMoments.length > 0) {
    for (const kill of killMoments) {
      triggerKillFeedback(kill.x, kill.y);
    }
    triggerMilestoneFeedback(killMoments.length, state.chain);
  }
  triggerProgressionFeedback(levelUpEvents);
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    const steering = planBuildingAwareSteering({
      position: { x: enemy.x, y: enemy.y },
      targetPosition: { x: state.player.x, y: state.player.y },
      speed: enemy.speed,
      dt,
      buildingColliders: WORLD_BUILDING_COLLIDERS,
      blockedFrames: enemy.blockedFrames ?? 0,
      steerSign: enemy.steerSign ?? 1,
      padding: enemy.radius * 0.95,
    });

    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: steering.velocity,
      dt,
      currentSectorId: enemy.sectorId,
      buildingColliders: WORLD_BUILDING_COLLIDERS,
      fallbackBounds: ENEMY_MOVEMENT_FALLBACK_BOUNDS,
    });

    enemy.vx = resolved.vx;
    enemy.vy = resolved.vy;
    enemy.x = resolved.x;
    enemy.y = resolved.y;
    enemy.sectorId = resolved.sectorId;
    enemy.blockedFrames = resolved.blocked ? steering.blockedFrames + 1 : steering.blockedFrames;
    enemy.steerSign = steering.steerSign;
    enemy.steeringMode = steering.mode;

    const collideDistance = state.player.radius + enemy.radius;
    const postMoveDx = state.player.x - enemy.x;
    const postMoveDy = state.player.y - enemy.y;
    const postMoveDistance = Math.hypot(postMoveDx, postMoveDy);
    if (postMoveDistance <= collideDistance && state.player.invulnerable <= 0) {
      state.player.hp -= 11;
      state.player.invulnerable = 0.54;
      addHitShake(0.32, 0.1);
      spawnParticles(state.player.x, state.player.y, 8, 0xff88a1, {
        priority: "danger",
        speedMin: 1.7,
        speedMax: 4.4,
        lifeMin: 0.2,
        lifeMax: 0.4,
      });
    }

    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.sprite.material.color.setHex(enemy.flash > 0 ? 0xffc8c8 : 0xffffff);
  }
}

function updateSlashEffects(dt) {
  const next = [];
  for (const slash of state.slashEffects) {
    slash.lifetime -= dt;
    slash.mesh.material.opacity = Math.max(0, slash.lifetime / slash.maxLifetime) * 0.76;
    if (slash.lifetime <= 0) {
      world.slashRoot.remove(slash.mesh);
      slash.mesh.geometry.dispose();
      slash.mesh.material.dispose();
      continue;
    }
    next.push(slash);
  }
  state.slashEffects = next;
}

function updateParticles(dt) {
  const nextParticles = [];
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.9;
    particle.vy *= 0.9;

    particle.mesh.position.set(particle.x, 0.06, particle.y);
    particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);

    if (particle.life <= 0) {
      disposeParticle(particle);
      continue;
    }

    nextParticles.push(particle);
  }
  state.particles = nextParticles;
}

function updateSpawning(dt) {
  refreshSpawnDirectorState();
  state.spawnCooldown -= dt;
  state.spawnDirector.spawnCooldown = state.spawnCooldown;
  if (state.spawnCooldown > 0) {
    return;
  }

  if (state.enemies.length >= MAX_ACTIVE_ENEMIES) {
    state.spawnCooldown = clamp(0.16 + randomRangeFromUnit(0, 0.06, nextSpawnRngValue()), 0.12, 0.26);
    state.spawnDirector.spawnCooldown = state.spawnCooldown;
    return;
  }

  spawnEnemy();
  const intensity = Math.min(1, state.time / 65);
  state.spawnCooldown = clamp(1.1 - intensity * 0.78 + randomRangeFromUnit(-0.05, 0.05, nextSpawnRngValue()), 0.24, 1.1);
  refreshSpawnDirectorState();
  state.spawnDirector.spawnCooldown = state.spawnCooldown;
}

function updateHud() {
  const hp = Math.max(0, Math.floor(state.player.hp));
  const maxHp = Math.max(1, Math.floor(getEffectiveMaxHp()));
  const score = Math.floor(state.score);
  const progressionWindow = getLevelWindow(state.progression?.totalXp ?? 0);
  const currentLevel = state.progression?.level ?? progressionWindow.level;
  const currentXp = state.progression?.totalXp ?? 0;
  const pendingLevelUpCount = state.progression?.pendingLevelUps?.length ?? 0;
  const chainText = state.chain > 1 && state.chainTimer > 0 ? `x${state.chain}` : "-";
  const bannerText = state.feedback.bannerTimer > 0 ? state.feedback.bannerText : "-";
  const attackText = state.player.attackCooldown > 0 ? `${state.player.attackCooldown.toFixed(2)}s` : "READY";
  const gearText = state.equipment?.derivedStats
    ? `Gear ATK+${formatStatValue("attackDamage", state.equipment.derivedStats.attackDamage)} HP+${formatStatValue("maxHp", state.equipment.derivedStats.maxHp)} SPD+${formatStatValue("moveSpeed", state.equipment.derivedStats.moveSpeed)}`
    : "Gear ATK+0 HP+0 SPD+0";
  const readability = state.world?.readability || buildWorldReadabilityState();
  const tactics = state.world?.tactics || buildWorldTacticsState({
    currentSectorId: state.world?.currentSectorId ?? WORLD_SECTOR_IDS[0],
    playerPosition: { x: state.player.x, y: state.player.y },
    buildings: WORLD_BUILDINGS,
    sectorEnemyCounts: buildSectorEnemyCounts({
      sectorIds: WORLD_SECTOR_IDS,
      enemies: state.enemies,
    }),
  });
  const tacticCounts = Object.fromEntries(tactics.roleCounts.map((entry) => [entry.role, entry.count]));

  let modeText = "ACTIVE";
  if (state.mode === "paused") {
    modeText = "PAUSED";
  } else if (state.mode === "equip_compare") {
    modeText = "COMPARE";
  } else if (state.mode === "levelup_choice") {
    modeText = "LEVEL UP";
  } else if (state.mode === "gameover") {
    modeText = "GAME OVER";
  } else if (state.mode === "restart_pending") {
    modeText = `RESTART ${state.restartTimer.toFixed(1)}s`;
  }

  const focusText = getFocusStatusLabel({
    mode: state.mode,
    hasWindowFocus: state.control.focus.hasWindowFocus,
    recoveryPending: state.control.focus.recoveryPending,
  });
  const fullscreenText = state.control.fullscreen.isFullscreen ? "FS ON" : "FS OFF";
  hud.dataset.pressure = readability.pressureLevel;
  hud.dataset.tactic = String(tactics.cueLabel || "open").toLowerCase();
  hud.dataset.pocket = tactics.retreatPocketActive ? "active" : "idle";

  hud.textContent =
    `HP ${hp}/${maxHp}\n` +
    `Score ${score}  Kills ${state.kills}\n` +
    `Lvl ${currentLevel}  XP ${currentXp}/${progressionWindow.nextLevelXp}  Queue ${pendingLevelUpCount}\n` +
    `Time ${state.time.toFixed(1)}s  Chain ${chainText}\n` +
    `Atk ${attackText}  Enemies ${state.enemies.length}\n` +
    `${gearText}\n` +
    `Sector ${readability.sectorLabel}  Pressure ${readability.pressureLabel}\n` +
    `Tactic ${tactics.cueLabel}  B${tacticCounts.blocker ?? 0} F${tacticCounts.funnel ?? 0} S${tacticCounts["soft-cover"] ?? 0}\n` +
    `${modeText}  ${focusText}  ${fullscreenText}\n` +
    `Cue ${bannerText}`;
}

function updateFeedbackOverlay() {
  const hitOpacity = clamp(state.feedback.hitFlash * 0.6, 0, 0.42);
  const killOpacity = clamp(state.feedback.killFlash * 0.76, 0, 0.78);
  const killDominant = killOpacity >= hitOpacity;
  feedbackFlashLayer.style.opacity = String(killDominant ? killOpacity : hitOpacity);
  feedbackFlashLayer.dataset.kind = killDominant ? "kill" : "hit";

  feedbackDangerLayer.style.opacity = String(clamp(state.feedback.dangerOverlay, 0, 0.72));

  if (state.feedback.bannerTimer > 0 && state.feedback.bannerText) {
    feedbackBanner.textContent = state.feedback.bannerText;
    feedbackBanner.dataset.kind = state.feedback.bannerKind;
    feedbackBanner.classList.add("is-visible");
  } else {
    feedbackBanner.textContent = "";
    feedbackBanner.dataset.kind = "neutral";
    feedbackBanner.classList.remove("is-visible");
  }
}

function updateCompareOverlay() {
  const compareCandidate = state.equipment?.compareCandidate;
  if (state.mode !== "equip_compare" || !compareCandidate) {
    compareOverlay.classList.add("hidden");
    compareOverlay.setAttribute("aria-hidden", "true");
    compareTitle.textContent = "";
    compareBody.textContent = "";
    return;
  }

  const currentItem = compareCandidate.equippedItem;
  const nextItem = compareCandidate.candidateItem;
  const sign = compareCandidate.statDelta >= 0 ? "+" : "";
  const statLabel = formatStatLabel(nextItem.statKey);
  compareOverlay.classList.remove("hidden");
  compareOverlay.setAttribute("aria-hidden", "false");
  comparePanel.dataset.slot = compareCandidate.slot;
  compareTitle.textContent = `${compareCandidate.slot.toUpperCase()} COMPARE`;
  compareBody.textContent =
    `Current  ${currentItem ? `${currentItem.rarity.toUpperCase()} ${statLabel} ${formatStatValue(currentItem.statKey, currentItem.statValue)}` : "EMPTY"}\n` +
    `Next     ${nextItem.rarity.toUpperCase()} ${statLabel} ${formatStatValue(nextItem.statKey, nextItem.statValue)}\n` +
    `Delta    ${sign}${formatStatValue(nextItem.statKey, compareCandidate.statDelta)}`;
}

function updateLevelUpOverlay() {
  const levelUpState = state.levelUp;
  if (state.mode !== "levelup_choice" || !levelUpState?.activeEventId) {
    levelUpOverlay.classList.add("hidden");
    levelUpOverlay.setAttribute("aria-hidden", "true");
    levelUpSubtitle.textContent = "";
    for (const entry of levelUpChoiceCards) {
      entry.card.dataset.selected = "false";
      entry.card.dataset.kind = "none";
      entry.kind.textContent = "";
      entry.label.textContent = "";
      entry.body.textContent = "";
      entry.meta.textContent = "";
    }
    return;
  }

  levelUpOverlay.classList.remove("hidden");
  levelUpOverlay.setAttribute("aria-hidden", "false");
  levelUpSubtitle.textContent = `Event ${levelUpState.activeEventId}  ·  Choose 1 of ${levelUpState.offeredChoices.length}`;

  for (let index = 0; index < levelUpChoiceCards.length; index += 1) {
    const entry = levelUpChoiceCards[index];
    const choice = levelUpState.offeredChoices[index];
    const isSelected = index === levelUpState.selectedIndex;
    const effectLabel = choice?.effect?.kind
      ? String(choice.effect.kind).replace(/([A-Z])/g, " $1").trim().toUpperCase()
      : "EFFECT";

    entry.card.dataset.selected = isSelected ? "true" : "false";
    entry.card.dataset.kind = choice?.kind ?? "none";
    entry.kind.textContent = choice ? `${choice.kind.toUpperCase()} · Rank ${choice.nextRank}/${choice.maxRank}` : "";
    entry.label.textContent = choice?.label ?? "EMPTY";
    entry.body.textContent = choice?.description ?? "";
    entry.meta.textContent = choice
      ? `${effectLabel} ${formatStatValue(choice.effect.kind, choice.effect.amount)}`
      : "";
  }
}

function syncVisuals() {
  syncSpritePosition(world.playerSprite, state.player.x, state.player.y);

  for (const enemy of state.enemies) {
    syncSpritePosition(enemy.sprite, enemy.x, enemy.y);
  }

  const shakeX = state.shakeTime > 0 ? randomRangeVisual(-state.shakeStrength, state.shakeStrength) : 0;
  const shakeZ = state.shakeTime > 0 ? randomRangeVisual(-state.shakeStrength, state.shakeStrength) : 0;
  camera.position.x = shakeX;
  camera.position.z = shakeZ;
  syncBreakableVisuals();
  syncDropVisuals();
  syncBuildingVisuals();
  syncReadabilityGuides();
  updateFeedbackOverlay();
  updateCompareOverlay();
  updateLevelUpOverlay();

  renderer.render(scene, camera);
}

function updateGameStep(dt) {
  maybeToggleFullscreen();
  maybeHandlePauseAndRestart();

  if (state.mode === "playing") {
    state.time += dt;
    state.player.attackCooldown = Math.max(0, state.player.attackCooldown - dt);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.chainTimer = Math.max(0, state.chainTimer - dt);
    if (state.chainTimer <= 0) {
      state.chain = 0;
    }

    applyPlayerInput(dt);
    updateAutoPickup();
    maybeEnterLevelUpChoice();

    if (state.mode === "playing") {
      if (consumeEdge(pressedThisStep, "Space")) {
        doAttack();
      }

      updateEnemies(dt);
      updateSpawning(dt);
    }
    updateSlashEffects(dt);
    updateParticles(dt);
    updateFeedbackState(dt);

    if (state.player.hp <= 0) {
      state.player.hp = 0;
      enterGameOver();
    }
  } else if (state.mode === "equip_compare") {
    handleEquipCompareInput();
    updateSlashEffects(dt);
    updateParticles(dt);
    updateFeedbackState(dt);
  } else if (state.mode === "levelup_choice") {
    handleLevelUpChoiceInput();
    updateSlashEffects(dt);
    updateParticles(dt);
    updateFeedbackState(dt);
  } else if (state.mode === "restart_pending") {
    state.restartTimer = Math.max(0, state.restartTimer - dt);
    gameoverStats.textContent =
      `${state.gameOverSummary}\n` + `Restarting in ${state.restartTimer.toFixed(1)}s...`;
    if (state.restartTimer <= 0) {
      startRun();
    }
    updateFeedbackState(dt);
  } else {
    updateSlashEffects(dt);
    updateParticles(dt);
    updateFeedbackState(dt);
  }

  state.shakeTime = Math.max(0, state.shakeTime - dt);
  if (state.shakeTime <= 0) {
    state.shakeStrength = 0;
  }

  if (state.mode === "start") {
    startScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.add("hidden");
  } else if (state.mode === "gameover" || state.mode === "restart_pending") {
    gameoverScreen.classList.remove("hidden");
    hud.classList.remove("hidden");
  } else {
    startScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.remove("hidden");
  }

  updateWorldReadabilityState();
  updateHud();
  syncVisuals();
  pressedThisStep.clear();
}

let accumulator = 0;
let lastTimestamp = performance.now();
let manualSteppingMode = false;

function frame(now) {
  if (!manualSteppingMode) {
    const elapsed = Math.min(0.08, (now - lastTimestamp) / 1000);
    lastTimestamp = now;
    accumulator += elapsed;

    while (accumulator >= FIXED_STEP) {
      updateGameStep(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  } else {
    lastTimestamp = now;
    accumulator = 0;
    syncVisuals();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function renderGameToText() {
  const snapshot = buildDeterministicSnapshot({
    state,
    keyboardDown,
    pressedThisStep,
    sortedKeysFn: sortedKeys,
    fixedStepSeconds: FIXED_STEP,
    particleCap: FEEDBACK_PARTICLE_HARD_CAP,
    manualSteppingMode,
    determinismMeta: state.determinism,
  });
  return JSON.stringify(snapshot);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  manualSteppingMode = true;
  accumulator = 0;
  lastTimestamp = performance.now();
  const steps = computeAdvanceSteps(ms, FIXED_STEP);
  state.determinism.lastAdvanceMs = Math.max(0, Number(ms) || 0);
  state.determinism.lastAdvanceSteps = steps;
  state.determinism.totalAdvanceSteps += steps;
  for (let i = 0; i < steps; i += 1) {
    updateGameStep(FIXED_STEP);
  }
  return renderGameToText();
};

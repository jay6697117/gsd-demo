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
  buildWorldTraversalSummary,
  createWorldTraversalState,
  resolveSectorIdForPosition,
} from "./world-sectors.js";
import { resolveEnemyBoundaryMovement, resolvePlayerBoundaryMovement } from "./world-collision.js";

const FIXED_STEP = 1 / 60;
const ARENA_HALF_WIDTH = 21;
const ARENA_HALF_HEIGHT = 11.5;
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
const RESTART_TRANSITION_SECONDS = 0.8;
const FEEDBACK_HIT_FLASH_PEAK = 0.36;
const FEEDBACK_KILL_FLASH_PEAK = 0.66;
const FEEDBACK_FLASH_DECAY_PER_SECOND = 2.8;
const FEEDBACK_BANNER_DEFAULT_SECONDS = 0.56;
const FEEDBACK_PARTICLE_HARD_CAP = 120;
const FEEDBACK_PARTICLE_RESERVED_FOR_KILL = 18;
const FEEDBACK_PARTICLE_EVENT_CAP = 20;
const FEEDBACK_BANNER_RATE_LIMIT_SECONDS = 0.68;

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
  randomSeed: 0x57b1c4,
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
  world: createWorldTraversalState(),
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
  arenaBounds: null,
};
scene.add(world.enemyRoot);
scene.add(world.slashRoot);
scene.add(world.particleRoot);

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

function chooseEnemyType() {
  const roll = simulationRng();
  if (roll < 0.42) {
    return { key: "leafling", hp: 26, speed: 3.1, points: 100, pattern: PATTERN_LEAFLING };
  }
  if (roll < 0.78) {
    return { key: "embercub", hp: 34, speed: 2.65, points: 130, pattern: PATTERN_EMBERCUB };
  }
  return { key: "sparkowl", hp: 22, speed: 3.95, points: 90, pattern: PATTERN_SPARKOWL };
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

    ctx.strokeStyle = "rgba(9,36,58,0.22)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, width - 12, height - 12);
  });
}

function buildWorld() {
  const floorGeometry = new THREE.PlaneGeometry(68, 42, 1, 1);
  const floorMaterial = new THREE.MeshBasicMaterial({ map: createGroundTexture() });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function spawnEnemy() {
  const enemyType = chooseEnemyType();
  const side = Math.floor(simulationRng() * 4);
  const xEdge = randomRangeSimulation(-ARENA_HALF_WIDTH + 0.8, ARENA_HALF_WIDTH - 0.8);
  const yEdge = randomRangeSimulation(-ARENA_HALF_HEIGHT + 0.8, ARENA_HALF_HEIGHT - 0.8);

  let x = xEdge;
  let y = yEdge;
  if (side === 0) y = -ARENA_HALF_HEIGHT - 0.45;
  if (side === 1) x = ARENA_HALF_WIDTH + 0.45;
  if (side === 2) y = ARENA_HALF_HEIGHT + 0.45;
  if (side === 3) x = -ARENA_HALF_WIDTH - 0.45;

  const sprite = createSprite(enemyType.pattern, PALETTE_ENEMY[enemyType.key], 2.25);
  world.enemyRoot.add(sprite);

  state.enemies.push({
    id: state.nextEnemyId,
    kind: enemyType.key,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 0.82,
    hp: enemyType.hp,
    maxHp: enemyType.hp,
    speed: enemyType.speed,
    points: enemyType.points,
    flash: 0,
    sectorId: null,
    sprite,
  });
  state.nextEnemyId += 1;
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
      ? getDangerState(state.player.hp, PLAYER_MAX_HP, state.time)
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
  state.world = advanceWorldTraversalState(state.world, nextSectorId);
}

function startRun() {
  clearCombatObjects();
  clearInputState();
  state.mode = "playing";
  state.time = 0;
  state.score = 0;
  state.kills = 0;
  state.chain = 0;
  state.chainTimer = 0;
  state.spawnCooldown = 0.75;
  state.nextEnemyId = 1;
  state.player.x = 0;
  state.player.y = 0;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.hp = PLAYER_MAX_HP;
  state.player.attackCooldown = 0;
  state.player.invulnerable = 0;
  state.player.facingX = 0;
  state.player.facingY = -1;
  state.world = createWorldTraversalState(resolveSectorIdForPosition({ x: state.player.x, y: state.player.y }));
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
  state.randomSeed = 0x57b1c4;
  simulationRng = createRng(state.randomSeed);
  visualRng = createRng(createVisualSeed(state.randomSeed));

  for (let i = 0; i < 3; i += 1) {
    spawnEnemy();
  }

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
    desiredVx = (xDir / len) * PLAYER_BASE_SPEED;
    desiredVy = (yDir / len) * PLAYER_BASE_SPEED;
    state.player.facingX = xDir / len;
    state.player.facingY = yDir / len;
  }

  const resolved = resolvePlayerBoundaryMovement({
    position: { x: state.player.x, y: state.player.y },
    velocity: { x: desiredVx, y: desiredVy },
    dt,
    currentSectorId: state.world?.currentSectorId,
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

    enemy.hp -= PLAYER_ATTACK_DAMAGE;
    enemy.flash = 0.1;
    hitMoments.push({ x: enemy.x, y: enemy.y });
  }

  const survivors = [];
  const killMoments = [];
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
    killMoments.push({ x: enemy.x, y: enemy.y });
  }

  state.enemies = survivors;

  for (const hit of hitMoments) {
    triggerHitFeedback(hit.x, hit.y);
  }

  if (killMoments.length > 0) {
    for (const kill of killMoments) {
      triggerKillFeedback(kill.x, kill.y);
    }
    triggerMilestoneFeedback(killMoments.length, state.chain);
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const desiredVx = (dx / len) * enemy.speed;
    const desiredVy = (dy / len) * enemy.speed;

    const resolved = resolveEnemyBoundaryMovement({
      position: { x: enemy.x, y: enemy.y },
      velocity: { x: desiredVx, y: desiredVy },
      dt,
      currentSectorId: enemy.sectorId,
      fallbackBounds: ENEMY_MOVEMENT_FALLBACK_BOUNDS,
    });

    enemy.vx = resolved.vx;
    enemy.vy = resolved.vy;
    enemy.x = resolved.x;
    enemy.y = resolved.y;
    enemy.sectorId = resolved.sectorId;

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
  state.spawnCooldown -= dt;
  if (state.spawnCooldown > 0) {
    return;
  }

  if (state.enemies.length >= MAX_ACTIVE_ENEMIES) {
    state.spawnCooldown = clamp(0.16 + randomRangeSimulation(0, 0.06), 0.12, 0.26);
    return;
  }

  spawnEnemy();
  const intensity = Math.min(1, state.time / 65);
  state.spawnCooldown = clamp(1.1 - intensity * 0.78 + randomRangeSimulation(-0.05, 0.05), 0.24, 1.1);
}

function updateHud() {
  const hp = Math.max(0, Math.floor(state.player.hp));
  const score = Math.floor(state.score);
  const chainText = state.chain > 1 && state.chainTimer > 0 ? `x${state.chain}` : "-";
  const bannerText = state.feedback.bannerTimer > 0 ? state.feedback.bannerText : "-";
  const attackText = state.player.attackCooldown > 0 ? `${state.player.attackCooldown.toFixed(2)}s` : "READY";

  let modeText = "ACTIVE";
  if (state.mode === "paused") {
    modeText = "PAUSED";
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

  hud.textContent =
    `HP ${hp}/${PLAYER_MAX_HP}\n` +
    `Score ${score}  Kills ${state.kills}\n` +
    `Time ${state.time.toFixed(1)}s  Chain ${chainText}\n` +
    `Atk ${attackText}  Enemies ${state.enemies.length}\n` +
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

function syncVisuals() {
  syncSpritePosition(world.playerSprite, state.player.x, state.player.y);

  for (const enemy of state.enemies) {
    syncSpritePosition(enemy.sprite, enemy.x, enemy.y);
  }

  const shakeX = state.shakeTime > 0 ? randomRangeVisual(-state.shakeStrength, state.shakeStrength) : 0;
  const shakeZ = state.shakeTime > 0 ? randomRangeVisual(-state.shakeStrength, state.shakeStrength) : 0;
  camera.position.x = shakeX;
  camera.position.z = shakeZ;
  updateFeedbackOverlay();

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

    if (consumeEdge(pressedThisStep, "Space")) {
      doAttack();
    }

    updateEnemies(dt);
    updateSpawning(dt);
    updateSlashEffects(dt);
    updateParticles(dt);
    updateFeedbackState(dt);

    if (state.player.hp <= 0) {
      state.player.hp = 0;
      enterGameOver();
    }
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
  snapshot.world = buildWorldTraversalSummary(state.world);
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

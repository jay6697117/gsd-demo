import * as THREE from "three";

const FIXED_STEP = 1 / 60;
const ARENA_HALF_WIDTH = 21;
const ARENA_HALF_HEIGHT = 11.5;
const PLAYER_BASE_SPEED = 9.2;
const PLAYER_ATTACK_COOLDOWN = 0.32;
const PLAYER_ATTACK_RADIUS = 2.9;
const PLAYER_MAX_HP = 100;
const START_TRANSITION_SECONDS = 0.96;

const startScreen = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const gameoverStats = document.getElementById("gameover-stats");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");
const hud = document.getElementById("hud");
const canvas = document.getElementById("game-canvas");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x81d8ff, 1);

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
};

const keyboardDown = new Set();
const pressedThisStep = new Set();
let startTransitionHandle = null;

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
    document.exitFullscreen?.().catch(() => {});
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
  keyboardDown.clear();
  pressedThisStep.clear();
  if (state.mode === "playing") {
    state.mode = "paused";
  }
});

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    keyboardDown.clear();
    pressedThisStep.clear();
    if (state.mode === "playing") {
      state.mode = "paused";
    }
  }
});

window.addEventListener("fullscreenchange", () => {
  resizeRenderer();
});

startButton.addEventListener("click", () => {
  requestStartRun();
});

restartButton.addEventListener("click", () => {
  startRun();
});

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

let rng = createRng(state.randomSeed);

function randomRange(min, max) {
  return min + (max - min) * rng();
}

function chooseEnemyType() {
  const roll = rng();
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
  const side = Math.floor(rng() * 4);
  const xEdge = randomRange(-ARENA_HALF_WIDTH + 0.8, ARENA_HALF_WIDTH - 0.8);
  const yEdge = randomRange(-ARENA_HALF_HEIGHT + 0.8, ARENA_HALF_HEIGHT - 0.8);

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
    sprite,
  });
  state.nextEnemyId += 1;
}

function addHitShake(strength, duration) {
  state.shakeStrength = Math.max(state.shakeStrength, strength);
  state.shakeTime = Math.max(state.shakeTime, duration);
}

function spawnParticles(x, y, count, color = 0xfff2a0) {
  for (let i = 0; i < count; i += 1) {
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

    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(2.4, 6.2);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomRange(0.22, 0.5),
      maxLife: 0.5,
      mesh,
    });
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
    world.particleRoot.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    particle.mesh.material.dispose();
  }
  state.particles = [];
}

function clearInputBuffers() {
  keyboardDown.clear();
  pressedThisStep.clear();
}

function cancelStartTransition() {
  if (startTransitionHandle !== null) {
    clearTimeout(startTransitionHandle);
    startTransitionHandle = null;
  }
}

function requestStartRun() {
  if (state.mode !== "start" || startTransitionHandle !== null) {
    return;
  }

  state.mode = "starting";
  startScreen.classList.add("is-transitioning");
  clearInputBuffers();

  if (!document.fullscreenElement) {
    canvas.requestFullscreen?.().catch(() => {});
  }

  startTransitionHandle = window.setTimeout(() => {
    startTransitionHandle = null;
    startRun();
  }, START_TRANSITION_SECONDS * 1000);
}

function startRun() {
  cancelStartTransition();
  clearInputBuffers();
  clearCombatObjects();
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
  state.gameOverSummary = "";
  state.shakeTime = 0;
  state.shakeStrength = 0;
  // Keep run initialization deterministic for repeatable automated testing.
  state.randomSeed = 0x57b1c4;
  rng = createRng(state.randomSeed);

  for (let i = 0; i < 3; i += 1) {
    spawnEnemy();
  }

  startScreen.classList.add("hidden");
  startScreen.classList.remove("is-transitioning");
  gameoverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
}

function enterGameOver() {
  state.mode = "gameover";
  state.gameOverSummary = `Time ${state.time.toFixed(1)}s · Score ${Math.floor(state.score)} · Kills ${state.kills}`;
  gameoverStats.textContent = state.gameOverSummary;
  gameoverScreen.classList.remove("hidden");
}

function maybeToggleFullscreen() {
  if (!pressedThisStep.has("KeyF")) {
    return;
  }
  if (!document.fullscreenElement) {
    canvas.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function maybeHandlePauseAndRestart() {
  if (pressedThisStep.has("KeyP")) {
    if (state.mode === "playing") {
      state.mode = "paused";
    } else if (state.mode === "paused") {
      state.mode = "playing";
    }
  }

  if (state.mode === "gameover" && (pressedThisStep.has("KeyR") || pressedThisStep.has("Enter") || pressedThisStep.has("Space"))) {
    startRun();
  }

  if (state.mode === "start" && (pressedThisStep.has("Enter") || pressedThisStep.has("Space"))) {
    requestStartRun();
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
  if (len > 0) {
    state.player.vx = (xDir / len) * PLAYER_BASE_SPEED;
    state.player.vy = (yDir / len) * PLAYER_BASE_SPEED;
    state.player.facingX = xDir / len;
    state.player.facingY = yDir / len;
  } else {
    state.player.vx *= 0.65;
    state.player.vy *= 0.65;
  }

  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  state.player.x = clamp(state.player.x, -ARENA_HALF_WIDTH + 1, ARENA_HALF_WIDTH - 1);
  state.player.y = clamp(state.player.y, -ARENA_HALF_HEIGHT + 1, ARENA_HALF_HEIGHT - 1);
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

  let anyHit = false;
  for (const enemy of state.enemies) {
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > PLAYER_ATTACK_RADIUS + enemy.radius) {
      continue;
    }

    const nx = distance > 0 ? dx / distance : 0;
    const ny = distance > 0 ? dy / distance : 0;
    const frontDot = nx * state.player.facingX + ny * state.player.facingY;
    if (frontDot < -0.2) {
      continue;
    }

    enemy.hp -= 21;
    enemy.flash = 0.1;
    anyHit = true;
  }

  if (anyHit) {
    addHitShake(0.2, 0.06);
  }

  const survivors = [];
  for (const enemy of state.enemies) {
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

    spawnParticles(enemy.x, enemy.y, 13, 0xfff2a0);
    addHitShake(0.36, 0.12);
  }

  state.enemies = survivors;
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;

    enemy.vx = (dx / len) * enemy.speed;
    enemy.vy = (dy / len) * enemy.speed;

    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;

    enemy.x = clamp(enemy.x, -ARENA_HALF_WIDTH + 0.5, ARENA_HALF_WIDTH - 0.5);
    enemy.y = clamp(enemy.y, -ARENA_HALF_HEIGHT + 0.5, ARENA_HALF_HEIGHT - 0.5);

    const collideDistance = state.player.radius + enemy.radius;
    if (len <= collideDistance && state.player.invulnerable <= 0) {
      state.player.hp -= 11;
      state.player.invulnerable = 0.54;
      addHitShake(0.32, 0.1);
      spawnParticles(state.player.x, state.player.y, 8, 0xff88a1);
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
      world.particleRoot.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
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

  spawnEnemy();
  const intensity = Math.min(1, state.time / 65);
  state.spawnCooldown = clamp(1.1 - intensity * 0.78 + randomRange(-0.05, 0.05), 0.24, 1.1);
}

function updateHud() {
  const hp = Math.max(0, Math.floor(state.player.hp));
  const score = Math.floor(state.score);
  const chainText = state.chain > 1 && state.chainTimer > 0 ? `x${state.chain}` : "-";
  const modeText = state.mode === "paused" ? "PAUSED" : "ACTIVE";

  hud.textContent =
    `HP ${hp}/${PLAYER_MAX_HP}\n` +
    `Score ${score}  Kills ${state.kills}\n` +
    `Time ${state.time.toFixed(1)}s  Chain ${chainText}\n` +
    `Enemies ${state.enemies.length}  ${modeText}`;
}

function syncVisuals() {
  syncSpritePosition(world.playerSprite, state.player.x, state.player.y);

  for (const enemy of state.enemies) {
    syncSpritePosition(enemy.sprite, enemy.x, enemy.y);
  }

  const shakeX = state.shakeTime > 0 ? randomRange(-state.shakeStrength, state.shakeStrength) : 0;
  const shakeZ = state.shakeTime > 0 ? randomRange(-state.shakeStrength, state.shakeStrength) : 0;
  camera.position.x = shakeX;
  camera.position.z = shakeZ;

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

    if (pressedThisStep.has("Space")) {
      doAttack();
    }

    updateEnemies(dt);
    updateSpawning(dt);
    updateSlashEffects(dt);
    updateParticles(dt);

    if (state.player.hp <= 0) {
      state.player.hp = 0;
      enterGameOver();
    }
  } else {
    updateSlashEffects(dt);
    updateParticles(dt);
  }

  state.shakeTime = Math.max(0, state.shakeTime - dt);
  if (state.shakeTime <= 0) {
    state.shakeStrength = 0;
  }

  if (state.mode === "start" || state.mode === "starting") {
    startScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.add("hidden");
  } else if (state.mode === "gameover") {
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
  const payload = {
    coordinateSystem: {
      origin: "arena center",
      x: "positive right",
      y: "positive downward on screen (mapped to world +z)",
    },
    mode: state.mode,
    seed: state.randomSeed,
    time: Number(state.time.toFixed(3)),
    score: Math.floor(state.score),
    kills: state.kills,
    chain: state.chain,
    nextSpawnIn: Number(state.spawnCooldown.toFixed(3)),
    player: {
      x: Number(state.player.x.toFixed(3)),
      y: Number(state.player.y.toFixed(3)),
      vx: Number(state.player.vx.toFixed(3)),
      vy: Number(state.player.vy.toFixed(3)),
      hp: Number(state.player.hp.toFixed(2)),
      attackCooldown: Number(state.player.attackCooldown.toFixed(3)),
      invulnerable: Number(state.player.invulnerable.toFixed(3)),
      facingX: Number(state.player.facingX.toFixed(3)),
      facingY: Number(state.player.facingY.toFixed(3)),
    },
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      x: Number(enemy.x.toFixed(3)),
      y: Number(enemy.y.toFixed(3)),
      hp: Number(enemy.hp.toFixed(2)),
      maxHp: enemy.maxHp,
    })),
    activeSlashEffects: state.slashEffects.length,
    activeParticles: state.particles.length,
  };

  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  manualSteppingMode = true;
  const clamped = Math.max(0, Number(ms) || 0);
  const steps = Math.max(1, Math.round(clamped / (FIXED_STEP * 1000)));
  for (let i = 0; i < steps; i += 1) {
    updateGameStep(FIXED_STEP);
  }
};

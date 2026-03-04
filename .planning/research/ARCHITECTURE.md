# Architecture Research

**Domain:** Three.js Browser Action Kill Game (HD Pixel Art)
**Researched:** 2026-03-04
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Experience Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ StartEndUI    │  │ HUDView      │  │ InputAdapter │  │ CameraRig      │ │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│          │                 │                 │                 │           │
├──────────┴─────────────────┴─────────────────┴─────────────────┴───────────┤
│                     Gameplay Orchestration Layer                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ GameLoop     │  │ SceneDirector│  │ CombatSystem │  │ SpawnSystem    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘ │
│         │                 │                 │                 │            │
├─────────┴─────────────────┴─────────────────┴─────────────────┴────────────┤
│                        Domain & Runtime Layer                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ EntityStore  │  │ EventBus     │  │ ConfigRepo   │  │ DebugAPI       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `GameLoop` | 统一驱动固定步长更新、渲染插值与暂停控制 | `requestAnimationFrame` + fixed timestep accumulator |
| `SceneDirector` | 管理 `menu/combat/gameover` 场景切换与资源生命周期 | state machine + scene factory |
| `InputAdapter` | 键盘输入标准化为领域命令（move/attack/pause/restart/fullscreen） | key map + command queue |
| `CombatSystem` | 命中检测、伤害结算、击杀事件派发、得分更新 | spatial partition + deterministic damage rules |
| `SpawnSystem` | 敌人刷新节奏与难度曲线控制 | time budget + weighted enemy table |
| `PixelRenderPipeline` | 保证 HD pixel art 清晰输出与击中反馈特效 | nearest filtering + postprocess pass + palette constraints |
| `DebugAPI` | 暴露 `window.render_game_to_text` 和 `window.advanceTime(ms)` | readonly snapshot serializer + simulation clock bridge |

### Component Boundaries

| Boundary | Owns | Exposes | Must Not Do |
|----------|------|---------|-------------|
| Experience → Gameplay | 输入事件、HUD展示、场景按钮 | command/event only | 直接修改实体状态 |
| Gameplay → Domain | 战斗规则、刷新逻辑、生命周期调度 | system calls + domain events | 依赖 Three.js 具体渲染对象 |
| Domain → Infra | 配置读取、随机源、调试接口 | pure data contracts | 触碰 UI 控件和画面节点 |
| Infra → Runtime | 本地存储、时间推进、测试桥接 | adapter methods | 侵入核心规则实现 |

## Recommended Project Structure

```text
src/
├── app/
│   ├── main.ts
│   ├── boot-game.ts
│   └── scene-registry.ts
├── core/
│   ├── loop/
│   │   ├── fixed-step-loop.ts
│   │   └── game-clock.ts
│   ├── state/
│   │   ├── game-state.ts
│   │   └── event-bus.ts
│   └── scene/
│       ├── scene-director.ts
│       └── scene-types.ts
├── gameplay/
│   ├── entities/
│   │   ├── player.ts
│   │   ├── enemy.ts
│   │   └── projectile.ts
│   ├── systems/
│   │   ├── movement-system.ts
│   │   ├── combat-system.ts
│   │   ├── spawn-system.ts
│   │   └── score-system.ts
│   └── rules/
│       ├── damage-model.ts
│       └── difficulty-curve.ts
├── render/
│   ├── pixel/
│   │   ├── pixel-material.ts
│   │   ├── nearest-texture.ts
│   │   └── palette-lut.ts
│   ├── fx/
│   │   ├── hit-flash.ts
│   │   ├── screen-shake.ts
│   │   └── kill-burst.ts
│   └── ui/
│       ├── hud-view.ts
│       ├── start-screen.ts
│       └── gameover-screen.ts
├── infra/
│   ├── input/
│   │   └── keyboard-adapter.ts
│   ├── debug/
│   │   ├── render-game-to-text.ts
│   │   └── advance-time.ts
│   └── persistence/
│       └── local-storage-adapter.ts
├── assets/
│   ├── atlas/
│   ├── audio/
│   └── shaders/
└── tests/
    ├── unit/
    │   ├── damage-model.spec.ts
    │   └── spawn-system.spec.ts
    └── e2e/
        ├── combat-loop.spec.ts
        └── restart-flow.spec.ts
```

### Structure Rationale

- `core/`：只放运行时骨架（时钟、状态、场景调度），保证可替换性。
- `gameplay/`：聚焦玩法规则与实体行为，避免与 Three.js API 深耦合。
- `render/`：将像素渲染与战斗规则解耦，便于后续替换视觉风格。
- `infra/`：放输入、调试、持久化等边界适配器，便于测试中 mock。
- `tests/`：将高频变更的规则测试与端到端回归分层，缩短反馈回路。

## Architectural Patterns

### Pattern 1: Fixed Timestep + Render Interpolation

**What:** 模拟层使用固定步长，渲染层插值，保证战斗判定可重复。
**When to use:** 需要稳定 hitbox 与自动化回放一致性时。
**Trade-offs:** 判定稳定、回归可靠；实现复杂度高于纯可变帧更新。

**Example:**
```typescript
export class FixedStepLoop {
  private readonly stepMs = 1000 / 60;
  private accumulatorMs = 0;

  tick(frameMs: number) {
    this.accumulatorMs += frameMs;

    while (this.accumulatorMs >= this.stepMs) {
      this.simulate(this.stepMs);
      this.accumulatorMs -= this.stepMs;
    }

    const alpha = this.accumulatorMs / this.stepMs;
    this.render(alpha);
  }

  private simulate(_dt: number) {}
  private render(_alpha: number) {}
}
```

### Pattern 2: ECS-lite System Pipeline

**What:** 轻量 ECS 思路，实体持有数据，系统按顺序处理。
**When to use:** 敌人数量上升后，规则扩展频繁、需要减少对象间耦合时。
**Trade-offs:** 扩展新系统快；但初期理解门槛高于面向对象脚本式写法。

**Example:**
```typescript
type World = { entities: Entity[]; events: GameEvent[] };

type System = (world: World, dt: number) => void;

const systems: System[] = [
  movementSystem,
  combatSystem,
  deathSystem,
  scoreSystem,
];

export function runSystems(world: World, dt: number) {
  for (const system of systems) {
    system(world, dt);
  }
}
```

### Pattern 3: Event-Driven Kill Feedback

**What:** `EnemyKilled` 事件驱动视觉反馈、得分、音效和掉落。
**When to use:** 同一击杀行为需要触发多个子模块且保持低耦合时。
**Trade-offs:** 横向扩展好；但需要控制事件风暴与顺序一致性。

## Data Flow

### Request Flow

```text
[Keyboard Input]
    ↓
[InputAdapter] → [CommandQueue] → [Gameplay Systems] → [EntityStore]
    ↓                  ↓                 ↓                 ↓
[HUD Update] ← [Game Events] ← [Rule Results] ← [State Mutation]
```

### State Management

```text
[GameStateStore]
    ↓ (subscribe)
[HUDView / SceneDirector / DebugAPI]
    ↑            ↓ dispatch
[Commands] → [Systems] → [Reducers] → [GameStateStore]
```

### Key Data Flows

1. **Combat Resolution Flow**：输入攻击命令后，`CombatSystem` 计算命中与伤害，写入 `EnemyKilled` 事件，再由 `ScoreSystem` 与 `FX` 订阅处理。
2. **Spawn Difficulty Flow**：`GameClock` 驱动 `SpawnSystem`，按时间和击杀数读取 `difficulty-curve`，输出敌人波次配置并创建实体。
3. **Automation Bridge Flow**：测试脚本调用 `window.advanceTime(ms)` 推进模拟，再用 `window.render_game_to_text()` 抓取状态快照进行断言。

## Phase Build Order

| Phase | Goal | Main Outputs | Exit Criteria |
|-------|------|--------------|---------------|
| 1 | Runtime Skeleton | `GameLoop`, `SceneDirector`, start/combat/gameover state machine | 能进入战斗并可重开 |
| 2 | Core Combat Loop | player movement, attack, enemy spawn, hp/death/score | 30 秒内形成可重复击杀循环 |
| 3 | HD Pixel Art Pipeline | nearest texture path, palette constraints, hit flash, screen shake | 画面无模糊插值且击杀反馈明显 |
| 4 | Progression & Balance | difficulty curve, spawn table, scoring pacing | 难度曲线平滑且无明显节奏断层 |
| 5 | Automation Observability | `render_game_to_text`, `advanceTime`, Playwright E2E cases | 核心流程可自动回归验证 |
| 6 | Performance & Polish | object pooling, draw-call audit, audio/UI polish | 中端设备稳定 60 FPS（战斗高峰） |

### Build Dependency Notes

1. 先完成 Phase 1/2，确保玩法闭环，再进行视觉优化，避免美术工作掩盖规则缺陷。
2. Phase 3 必须在规则稳定后推进，否则像素渲染调优会被反复打断。
3. Phase 5 在 Phase 2 后立即开始最小版本，避免后期集中补测试导致风险累积。

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Prototype (single arena) | 单进程前端单体结构，优先规则正确性与调试可观测性 |
| Content expansion (multiple enemy families) | 将敌人参数和技能行为配置化，减少硬编码分支 |
| High intensity combat | 引入对象池、批处理更新与剔除策略，控制 GC 与 draw calls |

### Scaling Priorities

1. **First bottleneck:** draw calls 和 overdraw，先做 sprite atlas 合批与可见性裁剪。
2. **Second bottleneck:** 高频创建临时对象导致 GC 抖动，改为对象池与复用向量实例。

## Anti-Patterns

### Anti-Pattern 1: Mixing Gameplay Rules With Three.js Objects

**What people do:** 在 `Mesh`/`Sprite` 对象上直接叠加战斗判定和状态字段。
**Why it's wrong:** 渲染层与规则层耦合，测试难、重构风险高。
**Do this instead:** 规则数据存在 `EntityStore`，渲染层只做映射和展示。

### Anti-Pattern 2: Variable Delta-Time Combat Logic

**What people do:** 直接用每帧 `delta` 做碰撞和伤害累计。
**Why it's wrong:** 帧率变化导致命中和 DPS 漂移，自动化回放不稳定。
**Do this instead:** 用固定步长模拟，渲染层插值。

### Anti-Pattern 3: Late Testing Hook Integration

**What people do:** 功能基本完成后再补 `render_game_to_text` 和时间控制接口。
**Why it's wrong:** 状态不可观测时 bug 定位成本陡增，回归覆盖不足。
**Do this instead:** 在核心循环落地时同步建设调试桥接接口。

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Three.js | runtime rendering engine | lock version early to reduce shader/material drift |
| Vite | dev/build pipeline | keep asset hashing stable for Playwright fixtures |
| Playwright | browser automation | validate combat loop, restart, pause and fullscreen controls |
| Web Audio API | local audio output | route through a small adapter for mute/pause sync |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `infra/input` ↔ `gameplay/systems` | command queue | one-way flow prevents UI coupling |
| `gameplay/systems` ↔ `render/fx` | domain events | treat events as immutable payloads |
| `core/state` ↔ `infra/debug` | readonly snapshot API | avoid direct state mutation in debug hooks |
| `app/scene-registry` ↔ `core/scene` | scene factory contract | centralize lifecycle ownership |

## Sources

- Three.js documentation: [https://threejs.org/docs/](https://threejs.org/docs/)
- Vite documentation: [https://vite.dev/guide/](https://vite.dev/guide/)
- Playwright documentation: [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- MDN Web Docs (Keyboard/Event Loop/Web Audio): [https://developer.mozilla.org/](https://developer.mozilla.org/)

---
*Architecture research for: Three.js browser action kill game with HD pixel art*
*Researched: 2026-03-04*

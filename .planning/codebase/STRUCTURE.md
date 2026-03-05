# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```text
gsd-demo/
├── src/                             # Runtime source code (game loop, rules, deterministic snapshot)
│   ├── main.js                      # Composition root + fixed-step loop + gameplay orchestration
│   ├── control-rules.js             # Pure control/focus/fullscreen transition helpers
│   ├── feedback-rules.js            # Pure feedback/combo/danger rule helpers
│   ├── determinism-harness.js       # Snapshot contract + deterministic step computation
│   └── style.css                    # UI shell and overlay styles
├── tests/                           # Unit + contract + browser burst verification
│   ├── control-rules.test.js
│   ├── feedback-rules.test.js
│   ├── determinism-contract.test.js
│   └── playwright-burst.test.js
├── .planning/                       # GSD planning state, research, phase artifacts, codebase mapping
│   ├── codebase/                    # Codebase map documents (this folder)
│   ├── phases/                      # Per-phase plans, summaries, verification
│   ├── research/                    # Domain research and architecture references
│   └── artifacts/phase-05/          # Determinism screenshot/json/console evidence
├── .codex/                          # Workflow/skill/agent definitions used by GSD process
├── index.html                       # Browser entry HTML + DOM overlay structure
├── package.json                     # Scripts and dependency manifest
├── package-lock.json                # Locked dependency graph
├── progress.md                      # Human-readable execution log
├── dist/                            # Vite build output (generated)
├── output/                          # Local web-game run outputs (generated)
└── node_modules/                    # Installed dependencies (generated)
```

## Directory Purposes

### `src/`
- **Purpose:** 放置运行时代码与规则模块，是产品逻辑主目录。
- **Contains:** 入口脚本、规则纯函数、确定性快照构建、样式文件。
- **Key Files:** `src/main.js`, `src/control-rules.js`, `src/feedback-rules.js`, `src/determinism-harness.js`, `src/style.css`
- **Subdirectories:** 当前无子目录（扁平结构）。

### `tests/`
- **Purpose:** 放置可执行回归测试，覆盖纯函数规则、确定性契约与浏览器端端到端最小闭环。
- **Contains:** Node test runner 用例 + Playwright 脚本。
- **Key Files:** `tests/determinism-contract.test.js`, `tests/playwright-burst.test.js`
- **Subdirectories:** 当前无子目录（扁平结构）。

### `.planning/`
- **Purpose:** 规划资产与阶段化过程记录，包含需求、路线图、状态与验证证据。
- **Contains:** `PROJECT/REQUIREMENTS/ROADMAP/STATE`、阶段文档、研究文档、产物文件。
- **Key Files:** `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`
- **Subdirectories:** `.planning/codebase/`, `.planning/phases/`, `.planning/research/`, `.planning/artifacts/`

### `.codex/`
- **Purpose:** GSD 工作流模板、agent 定义和技能说明。
- **Contains:** `get-shit-done/` workflows/templates/references、`skills/`、`agents/`。
- **Key Files:** `.codex/get-shit-done/workflows/map-codebase.md`, `.codex/skills/gsd-map-codebase/SKILL.md`
- **Subdirectories:** `.codex/get-shit-done/`, `.codex/skills/`, `.codex/agents/`

### Generated/Tooling Directories
- `dist/`: 构建产物目录，由 `vite build` 生成。
- `output/`: 本地测试/调试输出目录。
- `node_modules/`: 依赖安装目录。

## Key File Locations

### Entry Points
- `index.html`: 浏览器入口与 HUD/overlay DOM 容器。
- `src/main.js`: 运行时主入口，初始化 renderer/scene/state 并启动帧循环。

### Configuration
- `package.json`: npm scripts（`dev`, `build`, `test:determinism`, `test:burst`）与依赖声明。
- `.planning/config.json`: GSD 流程配置。
- `.gitignore`: 本地忽略规则。

### Core Logic
- `src/main.js`: 游戏循环、输入处理、敌人生成、战斗结算、反馈渲染同步。
- `src/control-rules.js`: pause/focus/fullscreen 纯规则函数。
- `src/feedback-rules.js`: combo milestone、danger state、tempo helper。
- `src/determinism-harness.js`: 快照 schema 与手动推进步数计算。

### Testing
- `tests/control-rules.test.js`: 控制规则单测。
- `tests/feedback-rules.test.js`: 反馈规则单测。
- `tests/determinism-contract.test.js`: 快照契约与稳定性测试。
- `tests/playwright-burst.test.js`: 启动 dev server + 浏览器 burst 回归并落盘产物。

### Documentation And Planning
- `progress.md`: 阶段日志与 TODO 记录。
- `.planning/PROJECT.md`: 项目目标与约束。
- `.planning/research/ARCHITECTURE.md`: 前期架构研究（参考，不等同于当前实现）。

## Naming Conventions (Observed)

### Files
- 源码文件使用 kebab-case：`control-rules.js`, `feedback-rules.js`, `determinism-harness.js`。
- 测试文件统一 `*.test.js`：`control-rules.test.js`, `determinism-contract.test.js`。
- 规划文档大量使用 UPPERCASE：`.planning/ROADMAP.md`, `.planning/STATE.md`。

### Directories
- 业务代码目录短名且语义直观：`src/`, `tests/`。
- 规划目录按职责分层：`.planning/phases/`, `.planning/research/`, `.planning/artifacts/`。

### Special Patterns
- 自动化证据集中在 `.planning/artifacts/phase-05/`，由 `tests/playwright-burst.test.js` 产出。
- 浏览器自动化测试通过全局钩子 `window.render_game_to_text` 与 `window.advanceTime` 采样。

## Where To Add New Code

### Option A: Keep Current Flat Layout (minimal change)
- **新控制规则:** `src/control-rules.js`，测试放 `tests/control-rules.test.js`。
- **新反馈/节奏规则:** `src/feedback-rules.js`，测试放 `tests/feedback-rules.test.js`。
- **新确定性字段/快照契约:** `src/determinism-harness.js`，测试放 `tests/determinism-contract.test.js`。
- **运行时行为接线:** `src/main.js`（仅做调用编排，避免继续膨胀具体算法）。

### Option B: Introduce Targeted Subdirectories (recommended for growth)
- **Runtime skeleton:** 新建 `src/runtime/`，优先放 `src/runtime/game-loop.js`, `src/runtime/game-state.js`。
- **Gameplay systems:** 新建 `src/systems/`，优先放 `src/systems/combat-system.js`, `src/systems/spawn-system.js`, `src/systems/feedback-system.js`。
- **Render mapping:** 新建 `src/render/`，优先放 `src/render/sprite-factory.js`, `src/render/overlay-sync.js`。
- **UI controller helpers:** 新建 `src/ui/`，优先放 `src/ui/hud-controller.js`, `src/ui/screen-controller.js`。
- **Test layout upgrade:** 将 `tests/` 分层为 `tests/unit/` 与 `tests/e2e/`，并把 `tests/playwright-burst.test.js` 迁到 `tests/e2e/playwright-burst.test.js`。

### Placement Rules (practical)
- 任何“纯计算 + 可复用”逻辑优先放规则/系统模块，不直接写入 `src/main.js`。
- 任何“窗口/DOM/浏览器 API 绑定”逻辑放在入口或 UI 适配模块，不放入纯规则文件。
- 任何新增公开自动化字段必须同时更新：
  - `src/determinism-harness.js`
  - `tests/determinism-contract.test.js`
  - （如影响运行时）`tests/playwright-burst.test.js`

## Special Directories And Generated Artifacts

### `.planning/artifacts/phase-05/`
- **Purpose:** 保存 burst 回归截图、状态 JSON、console 采样。
- **Source:** `tests/playwright-burst.test.js` 自动写入。
- **Committed:** 当前仓库已提交该目录中的示例产物。

### `dist/`
- **Purpose:** Vite 构建输出。
- **Source:** `npm run build`。
- **Committed:** 当前仓库存在 `dist/` 目录（是否长期保留取决于团队策略）。

### `output/`
- **Purpose:** 本地开发与手工/脚本运行输出。
- **Source:** 调试流程与 web-game 客户端脚本。
- **Committed:** 当前仓库存在该目录内容。

---
*Structure analysis: 2026-03-05*
*Update when directory layout or code placement conventions change*

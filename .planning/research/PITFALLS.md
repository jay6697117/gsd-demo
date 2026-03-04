# Pitfalls Research

**Domain:** Three.js 浏览器动作击杀游戏（HD pixel art）
**Researched:** 2026-03-04
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: HD pixel art 被渲染管线“悄悄模糊”

**What goes wrong:**
像素角色和场景在静态截图看似清晰，但在移动、缩放、全屏切换或高 DPI 设备上出现边缘抖动、发糊、颜色串线，最终丢失“高清像素感”。

**Why it happens:**
开发者只在贴图层设置了 `NearestFilter`，却忽略了 renderer、camera、pixel ratio、后处理链与 CSS 缩放之间的联动；不同浏览器和设备 DPR 下表现不一致。

**How to avoid:**
建立统一的像素渲染基线：锁定整数缩放策略、明确 `setPixelRatio` 策略、禁用不兼容的平滑后处理、为关键 sprite/material 做启动时断言；把“像素清晰度快照”纳入回归测试。

**Warning signs:**
同一场景在 100% 与全屏模式观感明显不一致；角色移动时轮廓闪烁；UI 字体比角色更清晰或更模糊（说明管线不统一）。

**Phase to address:**
Phase 1 - Rendering Baseline & Art Pipeline

---

### Pitfall 2: 帧率驱动逻辑导致战斗手感漂移

**What goes wrong:**
高帧率设备上角色移动/攻击变快，低帧率设备上命中判定延迟甚至“吞输入”；玩家感知为“这游戏不跟手”。

**Why it happens:**
把移动、攻击冷却、击退、无敌帧直接绑定每帧步进，而非统一 `deltaTime`/固定步长；暂停与恢复后时间累积处理不一致。

**How to avoid:**
采用“固定模拟步长 + 渲染插值”或“受控 deltaTime 上限裁剪”；把攻击窗口、受击硬直、无敌帧抽象为时间状态机；为 `advanceTime(ms)` 建立确定性测试样例。

**Warning signs:**
同一输入序列在 30 FPS 与 144 FPS 下得分差异明显；暂停恢复后敌人瞬移或连续受击；自动化回放偶发失败。

**Phase to address:**
Phase 2 - Core Combat Loop Determinism

---

### Pitfall 3: 视觉命中与逻辑命中不一致

**What goes wrong:**
玩家看到“刀砍到了”却未命中，或看起来没碰到却掉血，破坏击杀爽感与公平性。

**Why it happens:**
2D 像素表现与 3D 空间碰撞体未对齐；动画帧、朝向、攻击扇区与碰撞更新顺序不一致；hitbox 随美术迭代漂移但未同步。

**How to avoid:**
建立“可视化碰撞调试层”（开发环境开关）；把攻击判定拆分为 wind-up/active/recovery 三段并可观测；定义 hitbox 数据驱动配置并纳入审查。

**Warning signs:**
玩家反馈“判定玄学”；同类型敌人偶发穿模；录像复盘中命中结果不可解释。

**Phase to address:**
Phase 2 - Core Combat Loop Determinism

---

### Pitfall 4: 敌人刷新与难度曲线失控

**What goes wrong:**
前 20 秒无压力、后 10 秒难度雪崩，或者反过来长期无挑战，导致留存差。

**Why it happens:**
把刷怪频率、敌人速度、攻击欲望等参数线性叠加，缺少上限与分段；未定义“目标战斗时长”和关键指标（DPS、受击率、击杀/分钟）。

**How to avoid:**
先定义可玩区间（例如 60-120 秒可存活）；采用分段难度与导演器（director）策略；使用可回放脚本对典型玩家输入做 Monte Carlo 风险扫描。

**Warning signs:**
测试者评价两极分化（“太无聊”或“突然必死”）；击杀数方差过大；版本迭代后平衡频繁回滚。

**Phase to address:**
Phase 3 - Enemy System & Difficulty Tuning

---

### Pitfall 5: 自动化可观测性缺失，回归无法闭环

**What goes wrong:**
功能“看起来能玩”，但每次改动都担心破坏手感或状态流转；CI 无法稳定复现问题。

**Why it happens:**
未把 `window.render_game_to_text` 与 `window.advanceTime(ms)` 当作一等接口；状态输出不稳定（包含随机数、时间戳、浮点抖动）。

**How to avoid:**
定义稳定的文本状态 schema（state, hp, score, enemyCount, cooldowns）；把随机源可注入化；为关键场景建立 golden text snapshots 与容差规则。

**Warning signs:**
自动化脚本依赖 `wait(1000)` 这类脆弱时序；相同提交在不同机器测试结果不一致；问题只能“肉眼复现”。

**Phase to address:**
Phase 5 - Testability & Regression Harness

---

### Pitfall 6: Three.js 资源生命周期管理失效导致性能退化

**What goes wrong:**
运行几分钟后 FPS 持续下滑、内存上涨、输入延迟增加，长局体验崩溃。

**Why it happens:**
频繁创建/销毁 geometry、material、texture、audio 节点却未 `dispose`；对象池缺失；每帧分配临时对象触发 GC 抖动。

**How to avoid:**
为敌人与特效建立对象池；统一资源注册表和销毁协议；把 draw calls、GPU memory、JS heap 纳入开发 HUD 与性能门禁。

**Warning signs:**
同局时长越久越卡；Chrome Performance 里 GC spike 频繁；场景重开后内存不回落。

**Phase to address:**
Phase 6 - Performance Hardening

---

### Pitfall 7: 键盘输入、焦点与全屏状态机互相打架

**What goes wrong:**
按键偶发失效、暂停后角色继续移动、重开后按键粘滞，尤其在切出窗口与全屏切换后高发。

**Why it happens:**
输入层直接读 DOM 事件，没有统一输入缓冲与状态重置；`blur/focus/visibilitychange/fullscreenchange` 处理不完整。

**How to avoid:**
设计单一 Input Manager：区分“瞬时动作键”和“持续状态键”；在页面失焦、暂停、结束态统一清空按键状态；对全屏切换做集成测试。

**Warning signs:**
QA 报告“偶尔按了没反应”；切屏回来后角色自动移动；同一按键在不同浏览器行为不同。

**Phase to address:**
Phase 4 - Input/State Integration

---

### Pitfall 8: 宝可梦风格边界处理不当引发版权风险

**What goes wrong:**
视觉语言与知名 IP 过于接近，导致发布受阻、素材重做、品牌风险。

**Why it happens:**
团队把“风格参考”误当“可直接复刻”；早期缺少风格差异化清单与审查门槛。

**How to avoid:**
建立“可识别但不相同”的原创美术规范：轮廓、配色、比例、动作语义均做差异化；发布前做素材法律审查清单。

**Warning signs:**
外部评审第一反应是“这就是某官方角色”；美术评审意见集中在“太像”；迭代中频繁改名改图。

**Phase to address:**
Phase 1 - Art Direction Guardrails

---

## Technical Debt Patterns

短期看似省事、长期会反噬的常见捷径。

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 把战斗参数硬编码在多个脚本中 | 调参快 | 平衡无法追踪，改一处漏三处 | 仅限首日原型，24 小时内必须收敛到配置表 |
| 自动化只做 happy path | 很快“有测试” | 回归误报/漏报，关键缺陷上线 | Never |
| 每个特效临时 new 对象 | 开发顺手 | GC 抖动 + 长局掉帧 | 仅限一次性过场，不可用于战斗循环 |
| 输入逻辑分散在多个组件 | 局部实现快 | 焦点/暂停/重开问题指数增长 | Never |

## Integration Gotchas

常见“接上了但不稳定”的集成错误。

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Playwright 回放 + 游戏主循环 | 依赖固定 sleep 等待动画结束 | 暴露 `advanceTime(ms)` 并以状态断言驱动测试 |
| Browser Fullscreen API | 只处理进入全屏，不处理退出与失败分支 | 统一监听 `fullscreenchange`，失败时回退 UI 状态 |
| Vite HMR + 游戏单例 | 热更新后重复绑定事件/重复主循环 | 在模块热替换钩子里显式 `dispose` 旧实例 |
| Web Audio API | 首次交互前提前播放导致静音异常 | 首次用户手势后再解锁 audio context |

## Performance Traps

小规模可运行、大规模（长局/高敌人数）就崩的模式。

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 每敌人独立材质与贴图实例 | Draw call 激增，FPS 急降 | 材质复用 + 图集（texture atlas） | 敌人数 > 80 或 draw calls > 500 |
| 每帧全量碰撞检测（O(n^2)） | 敌人一多即卡顿 | 网格分区/空间哈希做宽相检测 | 敌人数 > 120 |
| 每帧构造大量临时 Vector 对象 | 间歇性卡顿、输入迟滞 | 复用数学对象，热点路径零分配 | 运行 3-5 分钟后明显 |
| UI 文本每帧重排重绘 | HUD 抖动、CPU 占用高 | 仅在状态变化时更新 HUD | 分数与计时高频刷新场景 |

## Security Mistakes

该领域相对常见、但常被忽略的安全问题。

| Mistake | Risk | Prevention |
|---------|------|------------|
| 生产环境暴露调试接口（含无鉴权作弊入口） | 被脚本篡改分数与状态，排行榜污染 | 构建时按环境开关调试 API，生产只读或移除 |
| 信任本地存档分数用于展示/排行 | 分数伪造，破坏竞争公平 | 客户端分数仅作展示，排行榜校验放服务端 |
| 动态加载未校验的远程资源 URL | 注入恶意资源或追踪脚本 | 资源白名单 + CSP + 子资源完整性校验 |

## UX Pitfalls

动作击杀游戏里最容易被忽略的体验问题。

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 命中反馈弱（音效/屏幕震动/闪白不足） | 击杀不爽、战斗“空” | 为命中和击杀建立分层反馈强度 |
| 敌人攻击无前摇可读性 | 玩家感到不公平 | 给高伤技能增加清晰 telegraph |
| HUD 与场景对比不足 | 读不清生命与冷却 | 使用固定对比度与像素字体栅格规则 |
| 新手缺少 10 秒内可理解的操作提示 | 初始流失高 | 开场提供极简可关闭提示（移动/攻击/暂停） |

## "Looks Done But Isn't" Checklist

看起来“能玩了”，但经常漏掉的关键验证项。

- [ ] **主循环状态机：** 常漏暂停/重开后的状态清理 — 验证 start -> battle -> pause -> gameover -> restart 全链路
- [ ] **HD pixel art：** 常漏高 DPI 与全屏一致性 — 验证窗口缩放、全屏切换、不同 DPR 下像素清晰度
- [ ] **击杀逻辑：** 常漏无敌帧与连击边界 — 验证连续受击、边缘碰撞、同帧多目标命中
- [ ] **输入系统：** 常漏失焦恢复行为 — 验证 alt-tab、浏览器失焦、重新聚焦后按键状态
- [ ] **自动化接口：** 常漏稳定 schema — 验证 `render_game_to_text` 字段稳定且可用于快照比较
- [ ] **性能基线：** 常漏长局稳定性 — 验证 10 分钟压力局 FPS、内存、GC 曲线

## Recovery Strategies

即使预防失败，也要能快速止损。

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 渲染模糊或抖动上线后暴露 | MEDIUM | 冻结美术增量 -> 回滚到最后稳定渲染配置 -> 增加 DPR/全屏回归用例 -> 分阶段恢复特效 |
| 战斗判定“玄学” | HIGH | 启用判定可视化 -> 录制失败回放 -> 对齐 hitbox 与动画时间窗 -> 增补 deterministic 用例 |
| 长局性能崩溃 | HIGH | 先降载（刷怪上限/特效频率）止血 -> 排查未释放资源 -> 引入对象池 -> 建立性能门禁 |
| 自动化不稳定导致 CI 红灯 | MEDIUM | 去除脆弱 sleep -> 改为状态驱动断言 -> 固定随机种子 -> 维护 golden snapshots |
| 焦点/全屏输入错乱 | LOW | 集中化输入状态 -> 统一 reset hooks -> 新增跨浏览器集成回归 |

## Pitfall-to-Phase Mapping

将风险前置到阶段里，避免“后补救”。

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 渲染管线模糊与像素抖动 | Phase 1 - Rendering Baseline & Art Pipeline | 视觉回归截图在多 DPR/全屏下保持像素边缘清晰 |
| 版权相似度过高 | Phase 1 - Art Direction Guardrails | 素材审查清单通过，外部评审不出现“高度雷同”反馈 |
| 帧率影响手感与判定漂移 | Phase 2 - Core Combat Loop Determinism | 同脚本输入在 30/60/144 FPS 下得分与状态差异在阈值内 |
| 视觉命中与逻辑命中不一致 | Phase 2 - Core Combat Loop Determinism | hitbox 可视化与回放结果一致，无“不可解释 miss/hit” |
| 难度曲线雪崩或过平 | Phase 3 - Enemy System & Difficulty Tuning | 存活时长与击杀分布落在目标区间，方差受控 |
| 输入/焦点/全屏冲突 | Phase 4 - Input/State Integration | 失焦/切屏/全屏切换后输入状态一致，无粘键 |
| 自动化不可回归 | Phase 5 - Testability & Regression Harness | `render_game_to_text` 快照稳定，CI 可复现关键流程 |
| Three.js 资源泄漏与长局掉帧 | Phase 6 - Performance Hardening | 10 分钟压力局 FPS/内存/GC 满足门禁阈值 |

## Sources

- Three.js 官方文档（renderer、texture filtering、performance 与 resource disposal）
- Playwright 自动化实践（稳定断言优先于固定等待）
- 浏览器游戏开发常见事故复盘（输入焦点、帧率耦合、内存泄漏）
- 动作游戏手感与可读性设计经验（telegraph、hit feedback、deterministic simulation）

---
*Pitfalls research for: Three.js 浏览器动作击杀游戏（HD pixel art）*
*Researched: 2026-03-04*

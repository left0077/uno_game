# UNO Online 实施计划

> 版本：v2.1 | 基于架构 Review + 规则审计 + 代码审计 | 2026-04-29

---

## 总体策略

**一次改一个层，改完验证。** 从底层数据结构往上改，每层改完跑测试。

```
服务端核心数据结构 → 游戏引擎基类 → Out模式实现 → AI/时钟 → Socket层 → 客户端
```

---

## Phase 1：修复服务端核心数据结构

**目标**：统一 GameStateV2，消除 PlayerManager 双实例，补全缺失字段。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 1.1 | G-01 | GameStateV2 新增 `gameStartTime`、`phaseTimers: number[]`、`responseDeadline?`、`penaltySourceId?` |
| 1.2 | G-01 | **删除** SocketHandler 中 `new PlayerManager(state)`，`gameInstance.playerManager = mode.playerManager` |
| 1.3 | F-09, D-08 | 删除 OutModeV2.PHASE_CONFIG（旧），改为引用统一配置 |
| 1.4 | D-07 | 删除 OutModeV2.COMBO_PENALTY 表 |
| 1.5 | D-02 | 新建 `server/src/config/gameConfig.ts`，包含 standard 和 out 模式全部参数 |

**验证**：`npm test` 通过（预期 7 个测试变绿）。提交。

---

## Phase 2：修复游戏引擎基类

**目标**：修 BaseGameModeV2 的 5 个 P0 bug + 动作系统改进。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 2.1 | G-03 | `applyDrawEffect` 改为累加：`pendingDraw += N`，支持跨类型叠加 |
| 2.2 | G-04 | `executeDraw` 改为摸 `pendingDraw` 张（有累积时），清空 `pendingDraw` |
| 2.3 | G-05 | `nextTurn()` 中检查 `skippedPlayerId`，如果当前玩家是被跳过者则再 advance 一次 |
| 2.4 | F-08 | `validateChallenge` 加检查：目标手牌 = 1 且未喊 UNO |
| 2.5 | D-01 | `handleAction` 返回 `ActionResult` 替代 `boolean`，包含 `error.code` + `error.message` |
| 2.6 | S-01 | 清理 `skippedPlayerId` 在跳过逻辑中正确使用 |
| 2.7 | S-02 | `applyCardEffect` 补全 `draw3`/`draw5`/`draw8` case |

**验证**：`npm test` 全部通过（含 Phase 1 残留失败项）。提交。

---

## Phase 3：重写 OutModeV2

**目标**：对齐规则书 v2.1。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 3.1 | F-09 | 手牌上限改为固定 20（不再递减） |
| 3.2 | D-08 | 删除 `checkPhaseProgression`（手牌数触发版），改为 `checkGameTime()` 检查 3/6/9 分钟 |
| 3.3 | D-07 | `executeCombo` 中的 `applyComboPenalty` 调用改为按新规则（对子无效果、三条跳过、彩虹+3、顺子+N-2） |
| 3.4 | F-07 | `validateCombo` 开头加 `isMyTurn()` 检查 |
| 3.5 | F-06 | 新增 `handlePenaltyResponse(action)` 方法，处理被惩罚玩家的响应（彩虹/反转/跟+/连打/接受） |

**验证**：`npm test` 全部通过。提交。

---

## Phase 4：实现游戏时钟和 AI 触发

**目标**：游戏能自动推进（AI 回合、阶段推进、超时）。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 4.1 | F-05 | 新建 `server/src/game/core/GameClock.ts`，管理 `gameStartTime`、阶段时间、回合超时、全局超时 |
| 4.2 | G-02 | SocketHandler 中 `startGame()` 后启动 `GameClock`，`tick()` 每秒检查：当前玩家是 AI → 调度 AI 行动 |
| 4.3 | F-05 | `tick()` 中检查阶段推进：elapsed >= 180/360/540s → 注入对应惩罚卡到牌库 |
| 4.4 | F-05 | `tick()` 中检查全局超时：elapsed >= 1200s → 强制结束游戏 |
| 4.5 | D-03 | `CardManager` 新增 `createPenaltyCards(type, count)` 方法 |

**验证**：手动启动服务端，创建游戏加 AI，观察日志 AI 自动行动。提交。

---

## Phase 5：修复 Socket 层和客户端数据流

**目标**：消除多余往返，修复断线重连，正确传递游戏结果。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 5.1 | F-04 | `broadcastGameStateV2` 中直接计算当前玩家的 `availableActions`，合并到 `player:turn` 推送 |
| 5.2 | F-04 | 删除客户端 `requestAvailableActions()` 调用 |
| 5.3 | F-01 | 删除 `useSocket.ts` 中多余的 `auth:register` 事件发送 |
| 5.4 | F-02, F-03 | 修复 `onGameEnded` 回调签名，接收 `{ winnerId, rankings }` 并在 UI 展示 |
| 5.5 | D-06 | 断线重连后，检查玩家是否被托管 → 恢复控制权（isAI=false, aiType=undefined） |
| 5.6 | D-05 | `game:error` 事件后自动请求一次完整状态同步（`v2:getState`） |

**验证**：手动测试完整一局游戏流程，确认游戏结束显示排名。提交。

---

## Phase 6：客户端体验改善

**目标**：加载状态、错误提示、派生状态。

| 任务 | 对应 Issue | 改动 |
|------|-----------|------|
| 6.1 | D-04 | GamePage 加载状态加 10 秒超时提示和重试按钮 |
| 6.2 | D-04 | GameEngine 新增 `getDerivedState()`：`mustDraw`、`handWarning`、`countdownUrgency` |
| 6.3 | — | RoomPage 展示游戏结束后的排名结果 |

**验证**：断网测试、慢网络测试。提交。

---

## Phase 7：测试补齐

**目标**：代码覆盖率提升，新规则全部有测试。

| 任务 | 改动 |
|------|------|
| 7.1 | 新建 `server/src/test/fixtures/`，提供 `createTestState()`、`createTestCards()` 工厂函数 |
| 7.2 | 新建 `BaseGameModeV2.test.ts`：叠加链、摸牌数、跳过效果、UNO 挑战 |
| 7.3 | 新建 `PenaltyStacking.test.ts`：跨类型 +2→+3→+5→+8，反转弹回 |
| 7.4 | 新建 `GameClock.test.ts`：阶段推进、超时触发 |
| 7.5 | 安装 vitest 到 client，新建 `GameEngine.test.ts`、`gameStore.test.ts` |

**验证**：`npm test` 覆盖率 > 80%。提交。

---

## Phase 8：清理和文档

| 任务 | 改动 |
|------|------|
| 8.1 | 更新 `docs/ARCHITECTURE.md` 反映 Phase 1-5 的架构变更 |
| 8.2 | 更新 `REPAIR_TRACKING.md` 标记所有已修复项 |
| 8.3 | 运行 E2E 测试套件，修复与新规则不一致的测试用例 |

---

## 执行顺序和依赖

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
                                      │                         │
                                      └── Phase 7 ──────────────┘
                                      (可与 5/6 并行)
Phase 8 最后
```

---

## 预估工时

| Phase | 内容 | 预估 |
|-------|------|------|
| 1 | 数据结构 + 配置 | 1.5h |
| 2 | 基类 bug 修复 | 2h |
| 3 | OutModeV2 重写 | 3h |
| 4 | 时钟 + AI | 3h |
| 5 | Socket + 客户端 | 2h |
| 6 | 客户端体验 | 1.5h |
| 7 | 测试补齐 | 3h |
| 8 | 文档清理 | 1h |
| **总计** | | **17h** |

---

*版本：v2.1 | 2026-04-29*

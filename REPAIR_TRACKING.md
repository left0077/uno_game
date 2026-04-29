# UNO Online 修复追踪

> 更新：2026-04-29 | 共 27 项待修复

---

## 🔴 P0 — 游戏无法正常运行（5 项）

| # | 问题 | 文件:行 | 现象 |
|---|------|---------|------|
| G-01 | PlayerManager 双重实例化 | SocketHandler.ts:291 | `mode.playerManager` 和 `gameInstance.playerManager` 是两个独立实例，内部计数器不同步 |
| G-02 | AI 从不行动 | SocketHandler.ts | AIPlayer 导入但从未调用，AI 回合永久卡住 |
| G-03 | 叠加惩罚不累加 | BaseGameModeV2.ts:455 | `applyDrawEffect` 只在 `!pendingDraw` 时设置，叠 +2 不增到 +4 |
| G-04 | 摸牌忽略累积惩罚 | BaseGameModeV2.ts:297 | `drawCardsForPlayer(id, 1)` 永远摸 1 张，被 +8 也只摸 1 张 |
| G-05 | Skip 效果无效 | BaseGameModeV2.ts:435 | `skippedPlayerId` 被设置但 `nextTurn()` 从未检查 |

## 🟠 P1 — 功能缺陷（9 项）

| # | 问题 | 文件:行 | 现象 |
|---|------|---------|------|
| F-01 | Auth 事件名称不一致 | useSocket.ts:63 | 客户端发 `auth:register`，服务端监听 `auth` |
| F-02 | 游戏结束结果被丢弃 | App.tsx:87 | `handleGameEnded` 不接受参数，排名信息丢失 |
| F-03 | game:ended 类型错误 | SocketClient.ts:32 | 声明 `{ winner: Player }`，服务端发 `{ winnerId: string }` |
| F-04 | 可用动作多余往返 | GameService.ts:64 | `game:state` → `player:actions` 请求 → 响应，多一次往返 |
| F-05 | 无游戏时钟 | 整体 | 无 gameStartTime、无阶段定时器、无回合超时 |
| F-06 | 无惩罚响应状态机 | 整体 | pendingDraw 存在时隐式处理，无独立状态 |
| F-07 | 连打不检查回合 | OutModeV2.ts | validateCombo 不调 isMyTurn() |
| F-08 | Challenge 验证为空 | BaseGameModeV2.ts:206 | `return { valid: true }` 无任何检查 |
| F-09 | OutModeV2 使用旧配置 | OutModeV2.ts:37-42 | PHASE_CONFIG 递减上限 12→10→8→6 |

## 🟡 P2 — 设计与健壮性（8 项）

| # | 问题 | 文件:行 | 现象 |
|---|------|---------|------|
| D-01 | handleAction 返回 boolean | BaseGameModeV2.ts:70 | 验证失败原因丢失 |
| D-02 | 配置散落硬编码 | 多处 | cardsPerPlayer=7 在 3 处重复 |
| D-03 | 惩罚卡未生成 | CardManager | +3/+5/+8 类型存在但从未创建 |
| D-04 | 客户端无加载容错 | GamePage | 转圈无超时/重试/错误提示 |
| D-05 | 客户端无错误恢复 | GameService | game:error 后无状态恢复逻辑 |
| D-06 | 断线重连不完整 | SocketHandler | 转 AI 后无恢复控制权逻辑 |
| D-07 | COMBO_PENALTY 表仍存在 | OutModeV2.ts:44-50 | 与新规则（连打无惩罚）矛盾 |
| D-08 | 阶段推进逻辑错误 | OutModeV2.ts:306 | 基于手牌数而非时间 |

## 🟢 P3 — 表面问题（5 项）

| # | 问题 |
|---|------|
| S-01 | `skippedPlayerId` 设置但无用 |
| S-02 | `applyCardEffect` 不处理 draw3/5/8 |
| S-03 | `calculateResult` 用 turnStartTime 算时长 |
| S-04 | 手游屏幕适配未验证 |
| S-05 | server/package.json 测试脚本路径错误（已修复） |

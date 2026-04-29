# UNO Online — AI 开发指南

> 给 AI 助手的项目指南 | 2026-04-30

---

## 核心原则

1. **服务端权威** — 所有游戏规则由服务端计算，客户端只展示和交互。不要在客户端实现规则逻辑。
2. **最小修改** — 只改必要部分，遵循现有风格。
3. **禁止** — 创建新文档（除非明确需要）、重命名现有函数、添加不必要依赖。

---

## 关键文件

### 类型
```
shared/types/index.ts              # 前后端共享类型
server/src/shared/index.ts         # SocketEvents 枚举 + 服务端类型
```

### 服务端核心
```
server/src/game/core/BaseGameModeV2.ts   # 模板方法基类
server/src/game/core/OutModeV2.ts        # Out 大逃杀模式
server/src/game/core/StandardModeV2.ts   # 经典 UNO 模式
server/src/game/core/PlayerManager.ts    # 回合/排名管理
server/src/game/core/GameClock.ts        # 游戏时钟（AI + 阶段）
server/src/game/core/GameInitializer.ts  # 初始化
server/src/socket/SocketHandler.ts       # Socket 事件中枢
server/src/rooms/RoomManager.ts          # 房间管理
server/src/config/gameConfig.ts          # 统一游戏配置
```

### 客户端核心
```
client/src/App.tsx                  # 页面路由
client/src/pages/HomePage.tsx       # 首页
client/src/pages/RoomPage.tsx       # 房间页
client/src/pages/GamePage.tsx       # 游戏页
client/src/core/socket/SocketClient.ts  # Socket 连接管理
client/src/core/game/GameEngine.ts      # 客户端状态引擎
client/src/core/game/GameService.ts     # 游戏 Socket 操作
client/src/store/gameStore.ts           # Zustand 状态
```

---

## Socket 事件

### 房间
`room:create` `room:join` `room:leave` `room:settings` `room:start`
`room:created` `room:joined` `room:updated`

### 游戏
`game:play` `game:combo` `game:draw` `game:uno` `game:challenge`
`game:started` `game:state` `game:ended`

### 推送（服务端→客户端）
`player:turn` — 合并推送：手牌 + 可用动作（含连打选项）
`chat:message` — 聊天/表情消息

### AI
`ai:add` `ai:remove` `player:host`

### 错误
`error`

---

## 添加功能流程

### 添加新游戏动作
1. 在 `GameActionTypeV2` 类型中加
2. 在 `BaseGameModeV2.validateAction` 加 case
3. 在 `BaseGameModeV2.executeAction` 加 case
4. 在 `calculateAvailableActionsV2` 中将动作推给客户端

### 修改游戏规则
1. 改 `docs/rules/` 中的规则书
2. 改对应的 Mode 类（`OutModeV2` 或 `StandardModeV2`）
3. 更新 `server/src/test/` 中的测试

### 修改惩罚/连打机制
1. 改 `OutModeV2` 中的方法
2. 更新 `calculateAvailableActionsV2` 中的检测逻辑
3. 更新测试

---

## 测试

```
cd server && npx tsx src/test/index.ts    # 服务端单元测试
cd e2e && npx playwright test             # E2E 测试
```

---

## 文档

- [架构文档](docs/ARCHITECTURE.md)
- [协议参考](docs/PROTOCOL.md)
- [规则书](docs/game-rules/out-mode.md)
- [实施路线](docs/ROADMAP.md)
- [测试计划](docs/TEST_PLAN.md)

*最后更新：2026-04-30*

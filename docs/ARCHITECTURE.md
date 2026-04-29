# UNO Online — 架构文档

> 版本：v2.1 | 状态：实际实现（非计划） | 更新：2026-04-29

---

## 一、整体架构

```
客户端 (React + Vite)                    服务端 (Node.js + Socket.IO)
─────────────────────────                ──────────────────────────
 Pages (HomePage/RoomPage/GamePage)       SocketHandler (事件路由)
   ↕                                        ↕
 Hooks (useSocket/useGameActions/        GameInitializer (初始化)
        useRoomActions)                    ↕
   ↕                                     BaseGameModeV2 (模板方法)
 Core (SocketClient/GameEngine/           ├── OutModeV2 (大逃杀)
       RoomService/GameService)           └── StandardModeV2 (待实现)
   ↕                                        ↕
 Store (Zustand)                         PlayerManager (回合/排名)
                                              ↕
                                          CardManager (牌库)
                                              ↕
                                          AIPlayer (三级策略)
```

---

## 二、服务端架构

### 2.1 类层次

```
BaseGameModeV2 (抽象)
├── name, description
├── config: { cardsPerPlayer, turnTimer, allowStacking, allowJumpIn }
├── state: GameStateV2
├── playerManager: PlayerManager
│
├── initialize(state)          ← 模板方法入口
│   └── onInitialize()         ← 子类扩展（OutModeV2 初始化 outState）
│
├── handleAction(action)       ← 模板方法：validateAction → executeAction
│   ├── validateAction()       ← 分派到子验证器
│   │   ├── validatePlayCard   ← 检查回合、持有、canPlayCard
│   │   ├── validateCombo      ← 抽象 → OutModeV2 实现
│   │   ├── validateDraw       ← 检查回合
│   │   ├── validateCallUno    ← 检查回合、手牌 ≤ 2
│   │   ├── validateChallenge  ← 当前无限制
│   │   └── validateJumpIn     ← 检查配置、非当前玩家
│   │
│   └── executeAction()        ← 分派到子执行器
│       ├── executePlayCard    ← 移除手牌 → 设置颜色 → 检查完成 → applyCardEffect → nextTurn
│       ├── executeCombo       ← 抽象 → OutModeV2 实现
│       ├── executeDraw        ← 摸 1 张 → nextTurn
│       ├── executeSkip        ← nextTurn
│       ├── executeCallUno     ← 设置 hasCalledUno
│       ├── executeChallenge   ← 检查目标 UNO 状态 → 罚 2 张
│       └── executeJumpIn      ← 移除手牌 → 抢位当前玩家

OutModeV2 extends BaseGameModeV2
├── 阶段系统: 时间触发 3/6/9 分钟 (GameClock 驱动)
├── 连打验证: pair(2张同色/同值), three(3张同色), rainbow(4色), straight(N≥3张连续)
├── 连打效果: pair(无), three(下家跳过), rainbow(目标+3), straight(下家N-2)
├── 手牌上限: 固定 20 张，超出淘汰
├── 惩罚卡注入: +3(3分钟), +5(6分钟), +8(9分钟)

GameClock (新增)
├── tick(): 每秒执行 ─ 阶段推进 / AI回合 / 回合超时 / 全局超时
├── start() / stop()
└── 通过回调通知 SocketHandler: onPhaseAdvance / onAITurn / onTurnTimeout / onGlobalTimeout

PlayerManager
├── playerFinished(id)      ← 完成（从左往右填 finishedPlayerIds）
├── playerEliminated(id)    ← 淘汰（从右往左填）
├── finalizeSurvivor()      ← 最后一人填剩余空位
├── nextTurn()              ← 按 direction 推进 currentPlayerIndex
├── reverseDirection()      ← direction *= -1
└── checkGameOver()         ← tablePlayerIds ≤ 1 → phase = 'finished'
```

### 2.2 核心数据结构

```typescript
GameStateV2 {
  players: Map<string, Player>      // 所有玩家
  tablePlayerIds: string[]          // 在桌玩家（有序）
  finishedPlayerIds: string[]       // 已结束玩家（排名顺序）
  currentPlayerIndex: number
  direction: 1 | -1
  phase: 'waiting' | 'playing' | 'finished'
  deck: Card[]
  discardPile: Card[]
  currentColor: string
  pendingDraw?: number              // 累积惩罚数
  pendingDrawType?: string          // 惩罚类型
  skippedPlayerId?: string          // 被跳过玩家
  outState?: { phase, maxCards, nextOutAt }  // Out 模式状态
}
```

### 2.3 关键设计决策

| 决策 | 理由 |
|------|------|
| 模板方法模式（validateAction → executeAction） | 子类只需覆写差异部分，标准逻辑复用 |
| pre-allocated 排名数组 | finishedPlayerIds 预分配 null，从两端填入，无需排序 |
| V2 架构无 UnoGame.ts | 游戏循环由 SocketHandler 事件驱动，无中心控制器 |
| 无 GameModeFactory | OutMode 和 StandardMode 直接 new，扩展性足够 |
| AIPlayer 为静态类 | 策略缓存按 playerId+difficulty 存储 |

---

## 三、客户端架构

### 3.1 分层

```
Pages（纯 UI，无业务逻辑）
  └── HomePage / RoomPage / GamePage
Hooks（React 桥接）
  └── useSocket / useGameActions / useRoomActions
Core（单例，无 React 依赖）
  └── SocketClient / GameEngine / RoomService / GameService
Store（Zustand + persist 中间件）
  └── useGameStore: { room, gameState, myHand, userId, nickname, ... }
```

### 3.2 数据流

```
服务器推送 game:state → SocketClient → GameEngine.setState() → Store
服务器推送 player:hand → SocketClient → GameEngine.setMyHand() → Store
用户操作 → useGameActions.playCard() → GameService.playCard() → Socket
```

### 3.3 关键设计决策

| 决策 | 理由 |
|------|------|
| Core 层无 React 依赖 | 可独立测试，不绑定框架 |
| 服务单例模式（getSocketClient/getGameEngine） | 避免重复初始化 |
| Zustand + persist | 用户偏好持久化（昵称、服务器地址）到 localStorage |
| 无 useGameMode hook / 无 GameModeRenderer | 只有两种模式，不需要客户端渲染器工厂 |
| 游戏状态广播双层推送 | game:state（公开状态）+ player:hand（私密手牌） |

---

## 四、Socket 事件流

```
1. auth(userId, nickname) → socketUserMap 绑定
2. room:create / room:join → RoomManager 处理
3. room:start → GameInitializer.createFromRoom() → new OutModeV2() → mode.initialize()
4. game:play / game:combo / game:draw 等 → mode.handleAction() → broadcastGameStateV2()
5. game:ended → calculateResult() → 广播排名 → v2Games.delete()
```

所有游戏事件携带 `roomCode`，服务端通过 `v2Games.get(roomCode)` 定位实例。

---

## 五、AI 系统

```
AIPlayer (静态门面)
  └── calculateAvailableActions()  ← 计算可用动作列表
  └── getStrategy(playerId, difficulty)
      ├── EasyAIStrategy   (BASIC capability, 30% 失误)
      ├── NormalAIStrategy (BASIC + MEMORY, 10% 失误)
      └── HardAIStrategy   (ALL capabilities, 蒙特卡洛 + 欺骗策略)
```

当前 AI 模块存在但**未被游戏循环调用**，需要补全 SocketHandler 的 AI 回合触发。

---

## 六、已实现 vs 待实现

| 模块 | 状态 | 备注 |
|------|------|------|
| BaseGameModeV2 (核心规则引擎) | ✅ 已实现 | 模板方法模式，5个P0 bug已修复 |
| OutModeV2 (连打 + 淘汰) | ✅ 对齐规则书 v2.1 | 连打无惩罚，固定20上限，回合检查 |
| StandardModeV2 | ❌ 待实现 | 架构支持，缺子类 |
| PlayerManager (排名 + 回合) | ✅ 已实现 | Skip效果已生效 |
| GameClock (时钟) | ✅ 已实现 | 阶段推进/AI触发/超时检测 |
| AIPlayer (三级策略) | ✅ 游戏循环调用 | GameClock 自动触发 AI 回合 |
| 惩罚卡系统 (+3/+5/+8) | ✅ 已实现 | CardManager 生成 + 阶段注入 |
| 跨类型叠加 | ✅ 已实现 | applyDrawEffect 累加模式 |
| 反转弹回 | ⚠️ 框架就绪 | pendingDraw 累加 + skippedPlayerId 跳过已生效 |
| 客户端 ComboSelectorV2 | ✅ 已实现 | UI 完整 |
| 客户端 PenaltyResponsePanel | ✅ 已实现 | UI 完整 |
| 赌场风格 UI 主题 | ✅ 已实现 | 所有组件统一 |
| 服务端单元测试 | ✅ 4/4 通过 | 对齐新规则 |
| 客户端单元测试 | ❌ 待实现 | vitest 待安装 |
| E2E 测试 | ⚠️ 18 个 spec | 配置完整，待验证 |

---

## 七、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 状态管理 | Zustand + persist |
| 动画 | Framer Motion |
| 后端 | Node.js + Express + Socket.IO |
| AI | 策略模式 + 蒙特卡洛模拟（HardAIStrategy） |
| E2E | Playwright |
| 部署 | Render.com (render.yaml) |

---

## 八、扩展新模式

继承 `BaseGameModeV2`，覆写抽象方法即可：

```typescript
class StandardModeV2 extends BaseGameModeV2 {
  readonly name = 'standard';
  readonly description = '经典 UNO 规则';

  // 标准模式不支持连打
  protected validateCombo(): ValidationResult {
    return { valid: false, error: '标准模式不支持连打' };
  }
  protected executeCombo(): void {}
}
```

然后在 `SocketHandler` 的 `ROOM_START` 事件中创建对应实例。

---

*版本：v2.1 | 最后更新：2026-04-29*

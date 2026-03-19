# UNO 客户端架构指南

## 架构概览

前端采用**分层架构**，职责分离清晰：

```
┌─────────────────────────────────────────┐
│  Pages (UI 层)                          │
│  HomePage, RoomPage, GamePage           │
├─────────────────────────────────────────┤
│  Hooks (React 连接层)                   │
│  useSocket, useGameActions,             │
│  useRoomActions                         │
├─────────────────────────────────────────┤
│  Store (状态管理层)                     │
│  useGameStore (Zustand)                 │
├─────────────────────────────────────────┤
│  Core (核心业务层)                      │
│  SocketClient, GameEngine,              │
│  RoomService, GameService               │
└─────────────────────────────────────────┘
```

## 各层职责

### 1. Core 层 (`src/core/`)

**SocketClient** - Socket.IO 连接管理
```typescript
const socket = getSocketClient();
socket.connect(url, { userId, nickname });
socket.emit('room:create', { nickname });
const unsubscribe = socket.on('room:created', handler);
```

**GameEngine** - 游戏业务逻辑
```typescript
const engine = getGameEngine();
engine.setGameState(state);
engine.isMyTurn();           // 查询方法
engine.canPlayCard(cardId);  // 验证方法
const action = engine.createPlayAction(cardId); // 创建动作
```

**RoomService** - 房间相关操作
```typescript
const roomService = getRoomService();
roomService.init({ onRoomCreated, onRoomJoined });
roomService.createRoom(nickname);
roomService.joinRoom(roomCode, nickname);
```

**GameService** - 游戏相关操作
```typescript
const gameService = getGameService();
gameService.init({ onGameStarted, onGameState });
gameService.executeAction(action);  // 执行动作
```

### 2. Hooks 层 (`src/hooks/`)

**useSocket** - Socket 连接管理
```typescript
const socket = useSocket({
  serverUrl,
  userId,
  nickname,
  roomCallbacks,
  gameCallbacks
});
```

**useRoomActions** - 房间操作封装
```typescript
const { createRoom, joinRoom, startGame, isHost } = useRoomActions();
```

**useGameActions** - 游戏操作封装
```typescript
const { playCard, drawCard, callUno, canPlay } = useGameActions();
```

### 3. Store 层 (`src/store/`)

**useGameStore** - Zustand 状态管理
```typescript
const { room, gameState, nickname, setRoom } = useGameStore();
```

### 4. Pages 层 (`src/pages/`)

页面组件只负责 UI 渲染，所有数据和回调通过 props 传入。

## 关键设计原则

1. **单向数据流**: Core → Store → Hooks → Pages
2. **单例模式**: SocketClient、GameEngine、Services 都是单例
3. **订阅模式**: 事件监听返回取消订阅函数
4. **动作验证**: 所有动作先通过 Engine 验证，再执行

## Socket 事件命名

所有事件使用 `domain:action` 格式：

```
room:create       room:created
room:join         room:joined
room:start        game:started
game:play         game:played
game:draw         game:drawn
```

## 修复记录

### 2026-03-19 架构重构
- 拆分臃肿的 useSocket.ts (329 行 → 80 行)
- 修复 useGameActions 中不存在的 V2 方法引用
- 将 Room.tsx (567 行) 和 Game.tsx (347 行) 重构为 Page 组件

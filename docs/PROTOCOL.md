# Socket 协议参考

> 实际实现版本 | 2026-04-30

---

## 连接

客户端通过 Socket.IO 连接到 `http://localhost:3001`（开发环境），发送 `auth` 认证：

```
Client → Server:  'auth', { userId: string, nickname: string }
```

服务端将 `socket.id` 映射到 `userId`。

---

## 房间事件

### room:create
```
Client → Server:  'room:create', { nickname: string }
Server → Client:  'room:created', Room           // 仅发送给创建者
```

### room:join
```
Client → Server:  'room:join', { roomCode: string, nickname: string }
Server → All:      'room:updated', Room
Server → Client:   'room:joined', { success: true, room: Room, userId: string }
```

### room:leave
```
Client → Server:  'room:leave'
Server → All:      'room:updated', Room
```

### room:settings
```
Client → Server:  'room:settings', { roomCode: string, settings: Partial<RoomSettings> }
Server → All:      'room:updated', Room
```

### room:start
```
Client → Server:  'room:start', { roomCode: string, mode: 'standard' | 'out' }
Server → All:      'game:started', { roomCode, mode, players }
Server → All:      'game:state',   GameState        // 公开信息
Server → Private:  'player:turn',  PlayerTurn       // 私密：手牌+可用动作
```

---

## 游戏动作

所有游戏动作携带 `roomCode`：

### game:play（出牌）
```
Client → Server:  'game:play', { roomCode, cardId, chosenColor? }
Server → All:      'game:state'
Server → Private:  'player:turn'
```

### game:combo（连打）
```
Client → Server:  'game:combo', { roomCode, cardIds, comboType, chosenColor? }
Server → All:      'game:state'
Server → Private:  'player:turn'
```

### game:draw（摸牌）
```
Client → Server:  'game:draw', { roomCode }
Server → All:      'game:state'
Server → Private:  'player:turn'
```

### game:uno（喊 UNO）
```
Client → Server:  'game:uno', { roomCode }
```

### game:challenge（质疑 UNO）
```
Client → Server:  'game:challenge', { roomCode, targetId }
```

---

## 服务端推送

### game:state（公开信息，广播全房间）
```typescript
{
  version: 'v2',
  phase: 'playing' | 'finished',
  currentPlayerId: string,
  direction: 1 | -1,
  deckCount: number,
  topCard: Card | null,
  currentColor: string,
  pendingDraw: number,
  pendingDrawType: string,
  penaltySourceId: string,       // 惩罚来源（反转弹回用）
  skippedPlayerId: string,
  players: [{ id, nickname, cardCount, status, eliminated, isAI }],
  outState: { phase: 0-3, maxCards: number } | null,
  gameStartTime: number,
  phaseTimes: number[],           // [180, 360, 540] 阶段触发时间（秒）
  rankings: PlayerResult[] | null, // 游戏结束时
  turnStartTime: number,
}
```

### player:turn（私密信息，仅发送给对应玩家）
```typescript
{
  playerId: string,
  cards: Card[],                  // 完整手牌
  cardCount: number,
  actions: [                       // 可用动作列表
    { type: 'play', cardId, requiresColor? }   // 可出的单张牌
    | { type: 'reverse', cardId }               // 惩罚中可用反转
    | { type: 'combo', comboType, cardIds, label } // 可用的连打
    | { type: 'draw' }                          // 摸牌
    | { type: 'uno' }                           // 喊 UNO
    | { type: 'penalty_info', pendingDraw, penaltySourceId } // 惩罚信息
  ]
}
```

### game:ended（游戏结束）
```
Server → All:      'game:ended', { winnerId: string, rankings: PlayerResult[] }
```

### chat:message（聊天/表情）
```
Server → All:      'chat:message', { type: 'emoji'|'text', content, playerId, playerName, timestamp }
```

---

## AI 管理

### ai:add
```
Client → Server:  'ai:add', { roomCode, difficulty: 'easy'|'normal'|'hard', type: 'bot'|'host' }
Server → All:      'room:updated', Room
```

### ai:remove
```
Client → Server:  'ai:remove', { roomCode, aiId }
Server → All:      'room:updated', Room
```

---

## 托管

### player:host
```
Client → Server:  'player:host', { roomCode, enabled: boolean }
Server → All:      'room:updated', Room
```

---

## 错误

```
Server → Client:  'error', { code: string, message: string, action?: GameActionV2 }
```

常见错误码：`ROOM_NOT_FOUND` `PERMISSION_DENIED` `NOT_ENOUGH_PLAYERS` `GAME_NOT_FOUND` `INVALID_ACTION` `EXECUTION_FAILED`

---

## 数据流

```
用户点击出牌
  → useGameActions.playCard(cardId)
  → GameService.playCard({ cardId, roomCode })
  → Socket 发送 'game:play'

服务端收到 'game:play'
  → SocketHandler 查找 game = v2Games.get(roomCode)
  → mode.handleAction(action) → validateAction → executeAction
  → broadcastGameStateV2:
    → io.to(roomCode).emit('game:state', serializeGameStateV2(game))
    → for each player: socket.emit('player:turn', { cards, actions })
  → 如果是 AI 回合: GameClock tick 触发 onAITurn
    → AIPlayer.getAIAction → setTimeout → mode.handleAction
```

---

*版本：v2.1 | 2026-04-30*

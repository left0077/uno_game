# 修复6：淘汰玩家数据清理与过滤

## 问题
淘汰玩家还在 state.players 中，getAvailableActionsV2 还会为他们计算动作，前端还会显示

## 修复文件
- `server/src/game/modes/OutMode.ts`
- `server/src/game/modes/BaseGameMode.ts`

## 修复方案A：过滤淘汰玩家（推荐）

```typescript
// BaseGameMode.ts:556 (getAvailableActionsV2)
getAvailableActionsV2(state: GameState, playerId: string): AvailableActions {
  const player = state.players.find(p => p.id === playerId);
  
  // ✅ 新增：淘汰玩家返回空动作
  if (player?.eliminated) {
    return {
      version: '2.0',
      metadata: { ... },
      state: { type: 'eliminated', message: '你已被淘汰' },
      actions: {
        play: { enabled: false, cards: [] },
        draw: { enabled: false, count: 0 },
        skip: { enabled: false },
        combo: { enabled: false, starters: [] },
        special: { callUno: { enabled: false }, challenge: { enabled: false }, jumpIn: { enabled: false } },
        penaltyResponse: { enabled: false, options: [] }
      }
    };
  }
  
  // 原有逻辑...
}
```

## 修复方案B：清理玩家数据

```typescript
// OutMode.ts:435
player.eliminated = true;
state.rankings.unshift(player.id);
state.discardPile.push(...player.cards);
player.cards = [];
player.cardCount = 0;

// ✅ 可选：从当前玩家轮换中移除
// 注意：保留在 state.players 中以便显示排名
```

## 前端过滤显示

```typescript
// Game.tsx
// 只显示未淘汰玩家
const activePlayers = gameState.players.filter(p => !p.eliminated);

// 排名显示用 rankings
const rankedPlayers = gameState.rankings?.map(id => 
  gameState.players.find(p => p.id === id)
).filter(Boolean);
```

## 验证方式
1. Out模式让玩家被淘汰
2. 验证：淘汰玩家不再收到可用动作
3. 游戏界面只显示存活玩家

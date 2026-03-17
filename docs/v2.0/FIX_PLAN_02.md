# 修复2：出完牌立即停止后续效果

## 问题
玩家出完最后一张牌后，游戏还在继续执行（如+2/+4惩罚、反转效果等），可能导致玩家又要摸牌

## 修复文件
- `server/src/game/modes/BaseGameMode.ts`

## 修复代码

```typescript
// BaseGameMode.ts:282
protected executePlayCard(state: GameState, action: GameAction, playerId: string): GameState {
  const player = state.players.find(p => p.id === playerId)!;
  const cardId = action.cardIds![0];
  const cardIndex = player.cards.findIndex(c => c.id === cardId);
  const card = player.cards[cardIndex];
  
  // 出牌
  player.cards.splice(cardIndex, 1);
  player.cardCount = player.cards.length;
  
  state.discardPile.push(card);
  
  // 设置颜色
  if (card.type === 'wild' || card.type === 'draw4') {
    state.currentColor = action.chosenColor || action.color || 'red';
  } else {
    state.currentColor = card.color;
  }
  
  // ✅ 新增：检查是否出完牌，如果是则立即结束
  if (player.cards.length === 0) {
    console.log(`[BaseGameMode] 玩家 ${player.nickname} 出完所有牌，游戏结束`);
    
    // 设置排名
    if (!state.rankings) state.rankings = [];
    if (!state.rankings.includes(player.id)) {
      state.rankings.push(player.id);
    }
    
    state.winner = player.id;
    state.isRoundEnded = true;
    
    // 跳过所有后续效果
    return state;
  }
  
  // 原有逻辑继续...
  this.handlePendingDraw(state, card, playerId);
  // ...
}
```

## 验证方式
1. 玩家出最后一张牌（刚好是+2/+4）
2. 验证：玩家获胜，下一个玩家不被惩罚

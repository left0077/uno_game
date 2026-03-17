# 修复1：已完成/胜利玩家不再接受惩罚

## 问题
`drawCardsForPlayer` 没有检查玩家是否已出完牌或已胜利，导致胜利玩家还会被惩罚抽牌

## 修复文件
- `server/src/game/modes/BaseGameMode.ts`
- `server/src/game/modes/OutMode.ts` (如有覆盖)

## 修复代码

```typescript
// BaseGameMode.ts:457
protected drawCardsForPlayer(state: GameState, playerId: string, count: number): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;
  
  // ✅ 新增：检查玩家是否已完成或已淘汰
  if (player.cards.length === 0) {
    console.log(`[BaseGameMode] 玩家 ${player.nickname} 已出完牌，不再发牌`);
    return;
  }
  
  if (player.eliminated) {
    console.log(`[BaseGameMode] 玩家 ${player.nickname} 已被淘汰，不再发牌`);
    return;
  }
  
  if (state.rankings?.includes(player.id)) {
    console.log(`[BaseGameMode] 玩家 ${player.nickname} 已排名，不再发牌`);
    return;
  }
  
  // 原有发牌逻辑...
  for (let i = 0; i < count; i++) {
    // ...
  }
}
```

## 验证方式
1. 开始一局游戏
2. 让某个玩家出完最后一张牌获胜
3. 其他玩家出+2/+4惩罚牌
4. 验证：胜利玩家手牌保持0张，不被惩罚

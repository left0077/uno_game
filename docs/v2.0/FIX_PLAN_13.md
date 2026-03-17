# 问题13: 出牌后无法点击UNO / hasCalledUno未重置

## 问题描述
1. 玩家只能在自己的回合点击UNO按钮
2. 出牌后（还剩1张牌时）无法点击UNO
3. `hasCalledUno` 状态在回合间没有正确重置

## 根本原因

### 1. `hasCalledUno` 在出牌后未重置

```typescript
// BaseGameMode.ts:282-329 executePlayCard
protected executePlayCard(...) {
  player.cards.splice(cardIndex, 1);
  player.cardCount = player.cards.length;
  // ❌ 没有重置 hasCalledUno！
  
  // ... 其他逻辑
  return state;
}
```

### 2. 回合流转后未清除 UNO 状态

```typescript
// BaseGameMode.ts:411-417 executeSkip
protected executeSkip(...) {
  state.currentPlayerId = this.getNextPlayer(state, playerId);
  state.turnStartTime = Date.now();
  
  // 清除跳过标记
  state.skippedPlayerId = undefined;
  // ❌ 没有清除上一玩家的 hasCalledUno！
  
  return state;
}
```

### 3. OutMode 的 executeCombo 也未重置

```typescript
// OutMode.ts:277-290
player.cardCount = player.cards.length;
// ❌ 没有重置 hasCalledUno！
```

## 正确逻辑

**UNO规则**：
1. 玩家出倒数第二张牌后（剩1张牌），必须立即喊UNO
2. 喊UNO后，`hasCalledUno = true`
3. **下一回合开始时**，应该清除上一回合的 `hasCalledUno`
4. 或者，**玩家出牌后**（无论剩几张），都应该清除 `hasCalledUno`

**建议方案**：在回合流转时清除 `hasCalledUno`

```typescript
// 回合结束时清除 UNO 状态
protected endTurn(state: GameState, playerId: string): void {
  const player = state.players.find(p => p.id === playerId);
  if (player) {
    player.hasCalledUno = false;
  }
}
```

## 修复方案

### 方案A：回合流转时清除（推荐）

在 `executeSkip`、`executePlayCard`、OutMode的`executeCombo`等方法中，在流转回合前清除当前玩家的 `hasCalledUno`：

```typescript
// BaseGameMode.ts executePlayCard
protected executePlayCard(...) {
  // ... 出牌逻辑 ...
  
  // ✅ 清除当前玩家的 UNO 状态
  player.hasCalledUno = false;
  
  // 流转回合
  state.currentPlayerId = this.getNextPlayer(state, playerId);
  state.turnStartTime = Date.now();
  return state;
}
```

### 方案B：在 checkWinCondition 或回合开始时清除

```typescript
// 在每回合开始时清除所有玩家的 hasCalledUno
// 或者在每个玩家回合开始时清除该玩家的状态
```

## 相关问题

- **问题11**: 连打出牌后不检查UNO - 可能也是因为没有重置 `hasCalledUno`
- **问题12**: 游戏结束卡住 - 在 `executePlayCard` 中设置了 `isRoundEnded` 但没有触发回调

## 验证方式

1. 玩家剩2张牌，喊UNO
2. 玩家出1张牌，剩1张
3. 验证：
   - UNO按钮应该可用（因为刚出过牌，剩1张）
   - 或者按照规则，应该在出牌时自动喊UNO
4. 回合流转到下一玩家
5. 再流转回来
6. 验证：上一玩家的 `hasCalledUno` 应该被清除

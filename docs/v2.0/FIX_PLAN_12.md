# 问题12: 胜利玩家必须点击摸牌才能让游戏继续

## 问题描述
玩家出完最后一张牌获胜后，游戏没有立即结束，而是卡住，必须点击摸牌才能继续。

## 根本原因

### 代码流程
```
UnoGame.handleAction()
  ├─ mode.executeAction() → BaseGameMode.executePlayCard()
  │   └─ 检测到 cards.length === 0
  │       ├─ 设置 state.winner = player.id
  │       ├─ 设置 state.isRoundEnded = true  ← 问题！
  │       └─ return state
  │
  └─ this.checkWinCondition()  ← 第109行
      └─ if (state.isRoundEnded || state.winner) return;  ← 第148行，提前返回！
          └─ 没有触发 onGameEnd！
```

### 问题代码
```typescript
// BaseGameMode.ts:299-314
if (player.cards.length === 0) {
  // ... 设置 winner 和 isRoundEnded
  state.isRoundEnded = true;  // ← 这里设置了
  return state;
}

// UnoGame.ts:146-163
checkWinCondition() {
  if (this.gameState.isRoundEnded || this.gameState.winner) {  // ← 这里检查到，直接返回
    return;  // ← 没有触发 onGameEnd！
  }
  // ... 触发 onGameEnd 的逻辑
}
```

## 修复方案

### 方案A：移除 executePlayCard 中的 isRoundEnded 设置（推荐）

```typescript
// BaseGameMode.ts:299-314
if (player.cards.length === 0) {
  // ... 设置 winner
  state.winner = player.id;
  // state.isRoundEnded = true;  // ← 删除这行
  state.turnStartTime = Date.now();
  return state;
}
```

这样 `checkWinCondition` 会正常检测到 winner 并触发 `onGameEnd`。

### 方案B：修改 checkWinCondition 逻辑

```typescript
// UnoGame.ts:146-163
checkWinCondition() {
  // 防止重复触发
  if (this.gameState.isRoundEnded && this.callbacksCalled) {
    return;
  }
  
  // 如果有 winner，触发游戏结束
  if (this.gameState.winner) {
    // ... 触发 onGameEnd
    return;
  }
  
  // 原有逻辑...
}
```

### 方案C：在 handleAction 中直接检查

```typescript
// UnoGame.ts:104-116
this.gameState = this.mode.executeAction(this.gameState, action, playerId);

// 如果执行后检测到胜利，立即触发游戏结束
if (this.gameState.winner && !this.gameState.isRoundEnded) {
  this.endGame(this.room.players.find(p => p.id === this.gameState.winner));
  return true;
}
```

## 推荐方案

**方案A** 最简单，只需删除一行代码。

## 验证方式

1. 玩家出最后一张牌
2. 验证：游戏立即结束，显示获胜界面
3. 不需要点击摸牌

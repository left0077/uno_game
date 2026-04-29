# UNO Online v2.0 - 高度可用架构重构方案

## 核心问题

当前架构的问题是：**玩家状态（存活/胜利/淘汰）散落在各处判断**，导致：
- 回合流转要考虑胜利玩家
- 发牌时要排除已完成玩家
- 前端要过滤显示
- 到处都有 `rankings.includes()` 检查

## 新架构设计

### 状态结构

```typescript
// GameState 核心状态
interface GameStateV2 {
  // === 玩家管理 ===
  players: Map<string, Player>;           // 全部玩家信息（ID -> Player）
  tablePlayerIds: string[];               // 牌桌上玩家ID顺序（存活玩家）
  finishedPlayerIds: string[];            // 完成游戏玩家ID（按完成顺序）
  eliminatedPlayerIds: string[];          // 淘汰玩家ID（Out模式）
  
  // === 回合管理 ===
  currentPlayerIndex: number;             // 当前玩家在 tablePlayerIds 中的索引
  direction: 1 | -1;                      // 方向：1=顺时针，-1=逆时针
  
  // === 游戏状态 ===
  phase: 'playing' | 'finished' | 'waiting';
  winnerId?: string;                      // 最终胜者（标准模式）
  // ... 其他状态
}
```

### 关键改进

#### 1. 回合流转简化
```typescript
// 当前复杂逻辑
getNextPlayer(state, currentId) {
  let nextIndex = (currentIndex + direction + totalPlayers) % totalPlayers;
  while (state.players[nextIndex].eliminated || rankings.includes(id)) {
    nextIndex = ...; // 跳过无效玩家
  }
}

// 新架构：简单数组操作
nextTurn(state) {
  state.currentPlayerIndex = 
    (state.currentPlayerIndex + state.direction + state.tablePlayerIds.length) 
    % state.tablePlayerIds.length;
  
  // 无需循环检查，因为 tablePlayerIds 只包含有效玩家
}
```

#### 2. 玩家离开牌桌
```typescript
// 玩家胜利/淘汰时
removeFromTable(state, playerId) {
  const index = state.tablePlayerIds.indexOf(playerId);
  if (index > -1) {
    state.tablePlayerIds.splice(index, 1);
    
    // 如果移除的是当前玩家之前的玩家，需要调整索引
    if (index < state.currentPlayerIndex) {
      state.currentPlayerIndex--;
    }
    // 如果移除的是当前玩家，下一玩家自动接替（索引不变）
  }
}
```

#### 3. 发牌逻辑简化
```typescript
// 当前：需要检查玩家状态
drawCardsForPlayer(state, playerId) {
  const player = state.players.get(playerId);
  if (player.cards.length === 0) return; // 已胜利
  if (player.eliminated) return;         // 已淘汰
  // ...
}

// 新架构：只给牌桌上玩家发牌
drawCards(state, count) {
  const currentId = state.tablePlayerIds[state.currentPlayerIndex];
  const player = state.players.get(currentId);
  // 直接发牌，无需检查状态
}
```

## 重构步骤

### Phase 1: 类型定义和基础方法（2小时）

1. **新增类型** `shared/types/v2.ts`
   - GameStateV2
   - PlayerV2（保持兼容）

2. **工具类** `game/core/PlayerManager.ts`
```typescript
class PlayerManager {
  private state: GameStateV2;
  
  // 核心操作
  moveToFinished(playerId: string): void;
  moveToEliminated(playerId: string): void;
  getCurrentPlayer(): Player;
  getNextPlayer(): string;
  getPreviousPlayer(): string;
  
  // 查询
  isOnTable(playerId: string): boolean;
  isFinished(playerId: string): boolean;
  getAliveCount(): number;
}
```

### Phase 2: 重写 BaseGameMode（4小时）

创建 `BaseGameModeV2.ts`，完全重写：

```typescript
abstract class BaseGameModeV2 {
  protected playerManager: PlayerManager;
  
  // 抽象方法：各模式实现特定逻辑
  abstract onCardPlayed(card: Card, playerId: string): void;
  abstract onPlayerFinished(playerId: string): void;
  abstract onPlayerEliminated(playerId: string): void;
  
  // 通用逻辑
  playCard(playerId: string, cardId: string): GameStateV2 {
    // 1. 验证玩家在当前回合
    // 2. 执行出牌
    // 3. 检查是否出完（调用 onPlayerFinished）
    // 4. 触发效果
    // 5. 流转回合
  }
  
  protected nextTurn(): void {
    // 简单索引移动
    this.state.currentPlayerIndex = 
      (this.state.currentPlayerIndex + this.state.direction) 
      % this.state.tablePlayerIds.length;
  }
}
```

### Phase 3: OutMode 适配（3小时）

```typescript
class OutModeV2 extends BaseGameModeV2 {
  // 重写特定逻辑
  onCardPlayed(card, playerId) {
    // Out模式特有：检查手牌上限
    this.checkHandLimit(playerId);
  }
  
  onPlayerEliminated(playerId) {
    this.playerManager.moveToEliminated(playerId);
    // 检查是否只剩1人
    if (this.playerManager.getAliveCount() === 1) {
      this.endGame();
    }
  }
  
  // 阶段推进
  advancePhase() {
    // 更新阶段
    // 注入惩罚卡
  }
}
```

### Phase 4: 前端适配（3小时）

```typescript
// 前端使用适配器
const useGameStateV2 = () => {
  const gameState = useSocketGameState();
  
  return {
    // 兼容层
    allPlayers: Array.from(gameState.players.values()),
    tablePlayers: gameState.tablePlayerIds.map(id => gameState.players.get(id)),
    currentPlayer: gameState.players.get(
      gameState.tablePlayerIds[gameState.currentPlayerIndex]
    ),
    
    // 便捷方法
    isPlayerFinished: (id) => gameState.finishedPlayerIds.includes(id),
    isPlayerEliminated: (id) => gameState.eliminatedPlayerIds.includes(id),
  };
};
```

## 优势对比

| 场景 | 旧架构 | 新架构 |
|------|--------|--------|
| 回合流转 | 循环检查+跳过 | 简单索引移动 |
| 发牌 | 检查胜利/淘汰状态 | 直接发给当前玩家 |
| 胜利检测 | 遍历所有玩家 | tablePlayerIds.length === 1 |
| 前端过滤 | 每次渲染过滤 | 直接使用 tablePlayers |
| 新增模式 | 修改多处代码 | 继承并重写方法 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 重构时间长 | 分Phase进行，每个Phase独立测试 |
| 破坏现有功能 | 保留旧代码，并行开发v2 |
| 前端适配复杂 | 提供兼容层hooks |
| 数据迁移 | 提供migrate函数 |

## 时间估算

- **总计**: 2天（12小时）
- **Phase 1**: 2小时
- **Phase 2**: 4小时  
- **Phase 3**: 3小时
- **Phase 4**: 3小时

## 建议

**是否值得？**
- 如果计划长期维护 → **值得**，2天投入换来长期收益
- 如果只是Demo → **不值得**，用方案B快速修复

**你的决定？**

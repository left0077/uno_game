# 简化架构设计

## 核心思路

只需要 **两个数组**：
1. `playingIds`: 正在游戏的玩家ID（按座位顺序）
2. `finishedIds`: 已结束的玩家ID（按完成/淘汰顺序）

## 玩家状态判断

```typescript
// 玩家在不在牌桌上
const isPlaying = playingIds.includes(playerId);

// 玩家是否已结束（胜利或淘汰）
const isFinished = finishedIds.includes(playerId);

// 玩家最终排名
const rank = finishedIds.indexOf(playerId) + 1;
```

## 数据结构

```typescript
interface GameStateV2 {
  // 玩家数据（全部玩家信息都存在这里）
  players: Map<string, Player>;
  
  // 核心：两个数组
  playingIds: string[];     // 正在游戏的玩家（按座位顺序）
  finishedIds: string[];    // 已结束的玩家（按结束顺序）
  
  // 当前回合索引（指向 playingIds）
  currentIndex: number;
  
  // 方向
  direction: 1 | -1;
}
```

## 回合流转

```typescript
nextTurn() {
  // 简单索引移动
  this.currentIndex = (this.currentIndex + this.direction) % this.playingIds.length;
}
```

## 玩家结束游戏

```typescript
playerFinished(playerId) {
  // 1. 从 playingIds 移除
  const index = this.playingIds.indexOf(playerId);
  this.playingIds.splice(index, 1);
  
  // 2. 添加到 finishedIds
  this.finishedIds.push(playerId);
  
  // 3. 调整 currentIndex
  if (index < this.currentIndex) {
    this.currentIndex--;
  }
  // 如果 index === currentIndex，下一位自动接替
}
```

## 游戏结束判断

```typescript
// 只剩1人，游戏结束
if (playingIds.length === 1) {
  // 最后一人自动获胜（Out模式）
  finishedIds.push(playingIds[0]);
  playingIds = [];
}

// 或者标准模式：有人出完牌
if (player.cards.length === 0) {
  playerFinished(player.id);
  // 如果 finishedIds.length === 总玩家数 - 1，游戏结束
}
```

## 优势

1. **超简单**：两个数组搞定所有状态
2. **回合流转**：一行代码，无需循环检查
3. **排名自然**：finishedIds 就是完成顺序
4. **易扩展**：要加淘汰标记，在 Player 里加字段即可

## 代码简化

```typescript
// 获取当前玩家
const currentId = playingIds[currentIndex];

// 获取存活玩家数
const aliveCount = playingIds.length;

// 获取已完成玩家数  
const finishedCount = finishedIds.length;

// 判断游戏结束
const isGameOver = playingIds.length <= 1;
```

这个方案足够吗？还是需要保留 eliminated 的单独区分？

# 修复8：反转反击颜色匹配检查

## 问题
Out模式的反转反击允许任何颜色的反转牌反击，违反了UNO基本规则

## 修复文件
- `server/src/game/modes/OutMode.ts`

## 修复代码

```typescript
// OutMode.ts:801
// 2. 反转反击（Out模式特有）
// ✅ 修复：只选择颜色匹配的反转牌
const reverseCards = player.cards.filter(c => 
  c.type === 'reverse' && 
  this.canPlayCard(c, state, player)  // 添加颜色匹配检查
);

if (reverseCards.length > 0) {
  console.log(`[ActionAPI] [OutMode] 找到可反击的反转牌: ${reverseCards.length}张`);
  for (const card of reverseCards) {
    // ... 原有逻辑
  }
}
```

或者更明确的检查：

```typescript
const reverseCards = player.cards.filter(c => {
  if (c.type !== 'reverse') return false;
  
  // 必须匹配当前颜色或者是万能牌
  const topCard = state.discardPile[state.discardPile.length - 1];
  return c.color === state.currentColor || 
         c.color === topCard.color || 
         c.type === 'wild' || 
         c.type === 'draw4';
});
```

## 规则说明

**反转反击的正确规则**：
1. 反转牌必须**颜色匹配**当前弃牌堆（或+2牌的颜色）
2. 万能反转牌（如果有）可以无条件使用
3. 颜色不匹配时，反转牌**不能用来反击**

## 验证方式

1. Out模式，上家出红色+2
2. 玩家手牌有蓝色反转牌和红色反转牌
3. 验证：只有红色反转牌显示为可出
4. 验证：蓝色反转牌显示为灰色（不可出）

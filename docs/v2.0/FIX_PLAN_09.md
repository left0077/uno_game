# 修复9：彩虹转移颜色匹配检查

## 问题
彩虹转移检测只检查了是否有4张同数字不同颜色的牌，没有检查这些牌是否可以合法出牌

## 问题代码
```typescript
// OutMode.ts:1093-1099
detectRainbowTransferOption(cards, state, pendingDraw) {
  // ...
  if (cardList.length >= 4) {
    const colors = new Set(cardList.map(c => c.color));
    if (colors.size === 4) {
      const rainbowCards = cardList.filter(...);
      // ❌ 没有检查 rainbowCards[0] 是否可以打出！
      return { type: 'rainbow', ... };
    }
  }
}
```

## 修复代码

```typescript
// OutMode.ts:1093
if (cardList.length >= 4) {
  const colors = new Set(cardList.map(c => c.color));
  if (colors.size === 4) {
    const rainbowCards = cardList.filter((c, i, arr) => 
      arr.findIndex(x => x.color === c.color) === i
    );
    
    // ✅ 新增：检查第一张彩虹牌是否可出
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!this.canPlayCardForCombo(rainbowCards[0], state.currentColor, topCard)) {
      return null; // 不能合法出牌，不返回彩虹选项
    }
    
    // ... 原有逻辑
  }
}
```

## 规则说明

**彩虹转移的正确规则**：
1. 必须有4张同数字不同颜色的牌
2. **第一张牌必须颜色匹配**当前弃牌堆（或+2牌颜色）
3. 只有同时满足条件，才能使用彩虹转移

## 验证方式

1. Out模式，上家出红色+2
2. 玩家有4张数字3的彩虹（红3、黄3、绿3、蓝3）
3. 移除红色3，只剩3张
4. 验证：不能触发彩虹转移（因为红色3是唯一能匹配红色+2的牌）

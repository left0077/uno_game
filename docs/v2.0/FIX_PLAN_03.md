# 修复3：连打牌可出状态标记

## 问题
`playableCardIds` 只包含单张可出牌，对子中的第二张牌显示灰色，用户误以为不能选

## 修复文件
- `server/src/game/modes/OutMode.ts`
- `server/src/shared/actionApi.ts` (类型定义)
- `client/src/pages/Game.tsx`

## 修复方案A：后端扩展 playableCardIds（推荐）

```typescript
// OutMode.ts:987 (getAvailableActionsV2 中)
// 在返回 playableCards 时，把可组成对子的牌也标记为可出

// 原有逻辑：添加单张可出牌
for (const card of numberCards) {
  if (this.canPlayCard(card, state, player)) {
    playableCards.push({...});
  }
}

// ✅ 新增：检查是否可以组成对子，如果是也加入 playableCards
const pairCards = this.detectPairCards(state, player);
for (const card of pairCards) {
  // 如果还没在 playableCards 中，以较低优先级加入
  if (!playableCards.find(p => p.cardId === card.id)) {
    playableCards.push({
      cardId: card.id,
      reasons: [{
        type: 'combo',
        description: '可组成对子',
        priority: 1  // 低优先级
      }],
      effects: [],
      requiresInput: {}
    });
  }
}
```

## 修复方案B：前端扩展判断（快速修复）

```typescript
// Game.tsx:842
const isPlayable = playableCardIds.has(card.id);
const canJumpIn = jumpInCards.has(card.id);
const isComboSelected = isOutMode && selectedComboCards.includes(card.id);

// ✅ 新增：检查是否可作为连打的一部分
const canBeComboPart = isOutMode && selectedComboCards.length > 0 && canFormCombo(card, selectedComboCards);

// 使用
${!isPlayable && !canJumpIn && !isComboSelected && !canBeComboPart ? 'opacity-50 brightness-75' : 'cursor-pointer'}

// 辅助函数
function canFormCombo(card: Card, selectedCards: Card[]): boolean {
  if (selectedCards.length === 0) return false;
  if (selectedCards.length >= 4) return false; // 顺子最多4张
  
  // 检查数值是否相同（对子/三条）
  const selectedValue = selectedCards[0].value;
  return card.type === 'number' && card.value === selectedValue;
}
```

## 验证方式
1. Out模式，弃牌堆是红色4
2. 手牌有红色4（亮）、黄色4（灰）、蓝色4（灰）
3. 选中红色4后，黄色4和蓝色4应该变亮（可组成对子）

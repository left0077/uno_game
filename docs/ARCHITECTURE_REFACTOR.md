# 出牌验证架构重构方案

## 当前问题

1. **前后端规则重复**：前端 `playableCards` 硬编码规则，后端 `getAvailableActions` 也有规则
2. **不一致风险**：前端认为可出的牌，后端可能拒绝
3. **难以维护**：规则变更需要修改两处

## 新架构设计

### 核心原则：服务端权威 (Server-Authority)

所有规则判断由服务端完成，前端只负责展示。

### 数据流

```
┌─────────┐    getAvailableActions     ┌─────────┐
│  Client │ ───────────────────────────> │ Server  │
│ (Front) │                              │ (Back)  │
└─────────┘                              └─────────┘
     ↑                                        │
     │     {                                  │
     │       canPlay: ['card-1', 'card-2'],   │
     │       canCombo: [                      │
     │         {type: 'pair', cards: ['c1', 'c2']},
     │         {type: 'three', cards: ['c3', 'c4', 'c5']}
     │       ],                               │
     │       canDraw: true,                   │
     │       canStack: ['card-6'],            │
     │       mustActions: ['draw']            │
     │     }                                  │
     └────────────────────────────────────────┘
```

### 新的 API 数据结构

```typescript
// 服务器返回的可用动作
interface AvailableActions {
  // 可以单张出的牌（点击后直接出）
  playableCards: Array<{
    cardId: string;
    reasons: string[]; // 为什么可以出（用于提示）
  }>;
  
  // 可以作为连打第一张的牌（选择后进入连打选择模式）
  comboStarters: Array<{
    cardId: string;
    possibleCombos: Array<{
      type: 'pair' | 'three' | 'rainbow' | 'straight';
      requires: string[]; // 还需要哪些牌
      effect: string; // 效果描述
    }>;
  }>;
  
  // 可以跟+的牌（如果有pendingDraw）
  stackableCards: string[];
  
  // 可以响应惩罚的其他方式
  penaltyResponses: Array<{
    type: 'rainbow' | 'reverse' | 'combo' | 'accept';
    cardIds?: string[];
    description: string;
  }>;
  
  // 可以摸牌
  canDraw: boolean;
  drawReason?: string; // 'no_playable' | 'penalty' | 'optional'
  
  // 必须执行的动作（如接受惩罚）
  mandatoryActions?: string[];
  
  // 当前状态提示
  stateHint: {
    type: 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target';
    message: string;
    pendingDraw?: number;
    pendingDrawType?: string;
  };
}
```

### 前端交互流程

#### 场景1：正常回合

```
1. 前端请求 getAvailableActions
2. 后端返回：
   {
     playableCards: ['red-2', 'blue-skip'],
     comboStarters: [
       {cardId: 'red-2', possibleCombos: [{type: 'pair', requires: ['red-2-2'], effect: '出对子'}]}
     ],
     canDraw: true,
     stateHint: {type: 'normal', message: '你的回合'}
   }
3. 前端：
   - 可出牌高亮绿色
   - 点击可出牌：直接出
   - 点击连打启动牌：进入连打选择模式
   - 显示"摸牌"按钮
```

#### 场景2：被+惩罚

```
1. 前端请求 getAvailableActions
2. 后端返回：
   {
     playableCards: ['draw2-1'], // 可以跟+
     comboStarters: [
       {cardId: 'red-2', possibleCombos: [{type: 'pair', requires: ['red-2-2'], effect: '连打响应'}]}
     ],
     penaltyResponses: [
       {type: 'rainbow', cardIds: ['r-7','g-7','b-7','y-7'], description: '彩虹转移'},
       {type: 'reverse', cardIds: ['red-reverse'], description: '反转弹回'},
       {type: 'accept', description: '接受惩罚 +4'}
     ],
     canDraw: true,
     drawReason: 'penalty',
     stateHint: {type: 'pending_draw', message: '累积 +4', pendingDraw: 4}
   }
3. 前端显示：
   - 可跟+的牌高亮（+2/+4）
   - 可作为连打第一张的牌高亮（带特殊标记）
   - 显示惩罚响应选项栏（彩虹/反转/接受）
   - "点击摸4牌"按钮
```

### 实现步骤

#### 第一步：后端接口改造

```typescript
// server/src/game/modes/BaseGameMode.ts
getAvailableActions(state: GameState, playerId: string): AvailableActions {
  const actions: AvailableActions = {
    playableCards: [],
    comboStarters: [],
    stackableCards: [],
    penaltyResponses: [],
    canDraw: false,
    stateHint: {type: 'normal', message: ''}
  };
  
  // 1. 检查是否是当前玩家回合
  if (state.currentPlayerId !== playerId) {
    return actions; // 空动作
  }
  
  const player = state.players.find(p => p.id === playerId)!;
  
  // 2. 检查是否有惩罚需要响应
  if (state.pendingDraw && state.pendingDraw > 0) {
    actions.stateHint = {
      type: 'pending_draw',
      message: `累积 +${state.pendingDraw}`,
      pendingDraw: state.pendingDraw,
      pendingDrawType: state.pendingDrawType
    };
    
    // 2.1 可以跟+
    const stackCards = player.cards.filter(c => 
      c.type === state.pendingDrawType
    );
    actions.stackableCards = stackCards.map(c => c.id);
    actions.playableCards.push(...stackCards.map(c => ({
      cardId: c.id,
      reasons: ['可以跟+']
    })));
    
    // 2.2 可以反转
    const reverseCards = player.cards.filter(c => c.type === 'reverse');
    if (reverseCards.length > 0) {
      actions.penaltyResponses.push({
        type: 'reverse',
        cardIds: reverseCards.map(c => c.id),
        description: '反转弹回'
      });
    }
    
    // 2.3 可以彩虹（Out模式）
    // ... 检测彩虹
    
    // 2.4 可以连打响应（新规则）
    const comboStarters = this.detectComboStarters(player.cards, state);
    actions.comboStarters = comboStarters;
    
    // 2.5 可以接受惩罚
    actions.penaltyResponses.push({
      type: 'accept',
      description: `接受惩罚 +${state.pendingDraw}`
    });
    
    // 可以摸牌（接受惩罚）
    actions.canDraw = true;
    actions.drawReason = 'penalty';
    
    return actions;
  }
  
  // 3. 正常回合
  // ... 检测可出牌、连打等
  
  return actions;
}
```

#### 第二步：前端改造

```typescript
// client/src/hooks/useGameActions.ts
export function useGameActions(gameState: GameState, playerId: string) {
  const [availableActions, setAvailableActions] = useState<AvailableActions | null>(null);
  
  // 当游戏状态变化时，重新获取可用动作
  useEffect(() => {
    if (!gameState || !playerId) return;
    
    // 从 gameState 中读取服务器提供的可用动作
    // 或者通过 socket 请求
    const actions = gameState.availableActions?.[playerId];
    if (actions) {
      setAvailableActions(actions);
    }
  }, [gameState, playerId]);
  
  return {
    playableCards: availableActions?.playableCards || [],
    comboStarters: availableActions?.comboStarters || [],
    penaltyResponses: availableActions?.penaltyResponses || [],
    canDraw: availableActions?.canDraw || false,
    stateHint: availableActions?.stateHint
  };
}
```

#### 第三步：UI 适配

```typescript
// 前端不再计算可出牌，直接使用服务器数据
const { playableCards, comboStarters, penaltyResponses, canDraw, stateHint } = useGameActions(gameState, playerId);

// 渲染手牌
{cards.map(card => {
  const isPlayable = playableCards.some(p => p.cardId === card.id);
  const isComboStarter = comboStarters.some(c => c.cardId === card.id);
  
  return (
    <Card 
      card={card}
      highlight={isPlayable ? 'green' : isComboStarter ? 'blue' : 'none'}
      onClick={() => {
        if (isPlayable) {
          playCard(card.id);
        } else if (isComboStarter) {
          startComboSelection(card.id);
        }
      }}
    />
  );
})}

// 渲染惩罚响应选项（如果有）
{penaltyResponses.length > 0 && (
  <PenaltyResponsePanel 
    responses={penaltyResponses}
    onSelect={handlePenaltyResponse}
  />
)}
```

### 优势

1. **单一数据源**：规则只在服务端维护
2. **前后端一致**：前端只展示服务端返回的数据
3. **易于扩展**：新规则只需改服务端
4. **更好的用户体验**：可以显示详细的出牌原因
5. **支持复杂交互**：如连打预览、惩罚响应选项等

### 风险

1. **网络延迟**：需要等待服务端响应
   - 解决：乐观更新 + 本地缓存
   
2. **状态同步**：服务端和客户端状态可能不一致
   - 解决：服务端权威，客户端以服务端为准

### 实施计划

1. **Phase 1**：后端新增 `getAvailableActions` 接口，返回详细动作信息
2. **Phase 2**：前端使用新接口，移除硬编码规则
3. **Phase 3**：测试所有场景，确保一致性
4. **Phase 4**：优化性能，添加缓存

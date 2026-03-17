# 修复5：Out模式缩圈倒计时预警

## 问题
Out模式 phase 0 时没有显示缩圈倒计时，玩家不知道还有多久缩圈

## 修复文件
- `client/src/core/hooks/useGameMode.ts`
- `client/src/pages/Game.tsx` (OutPhaseIndicator组件)

## 修复代码

```typescript
// useGameMode.ts:47
const outCountdown = useMemo(() => {
  if (!gameState.outState) return 0;
  // ✅ 修改：phase 0 也要显示倒计时
  // if (gameState.outState.phase >= 3) return 0;  // 原代码
  
  return Math.max(0, gameState.outState.nextOutAt - Date.now());
}, [gameState.outState]);

// 新增：格式化倒计时显示
const outPhaseText = useMemo(() => {
  const phase = gameState.outState?.phase || 0;
  switch (phase) {
    case 0: return '缩圈预警';
    case 1: return '第一阶段';
    case 2: return '第二阶段';
    case 3: return '最终阶段';
    default: return '';
  }
}, [gameState.outState?.phase]);
```

```tsx
// Game.tsx OutPhaseIndicator
{isOutMode && gameState.outState && (
  <OutPhaseIndicator
    phase={gameState.outState.phase}
    countdown={outCountdown}
    maxCards={gameState.outState.maxCards}
    text={outPhaseText}  // ✅ 传入文案
  />
)}
```

## 文案对照规则书

| 阶段 | 显示文案 | 手牌上限 |
|------|----------|----------|
| 0 (预警) | "缩圈预警 - X分后进入第一阶段" | 20 |
| 1 | "第一阶段 - 手牌上限15张" | 15 |
| 2 | "第二阶段 - 手牌上限10张" | 10 |
| 3 | "最终阶段 - 手牌上限5张" | 5 |

## 验证方式
1. 开始Out模式游戏
2. 观察顶部/侧边out指示器
3. phase 0 时显示倒计时
4. 文案符合规则书

# 修复7：UI错位与拥挤

## 问题1：牌堆和文字错位
牌堆图标和"146张 点击摸牌"文字重叠

## 修复文件
- `client/src/pages/Game.tsx`

## 修复代码

```tsx
// 当前代码（问题）
<div className="relative w-24 h-36...">
  <Card ... />
  <span>146张 点击摸牌</span>  // 重叠在牌上
</div>

// ✅ 修复：分开布局
<div className="flex flex-col items-center gap-2">
  {/* 牌堆 */}
  <div className="relative w-24 h-36">
    <Card ... />
    {/* 牌数显示在牌上角 */}
    <span className="absolute -top-2 -right-2 bg-slate-800 text-white text-xs px-2 py-1 rounded-full">
      {gameState.deck.length}
    </span>
  </div>
  
  {/* 操作提示 */}
  <span className="text-sm text-slate-400">点击摸牌</span>
</div>
```

## 问题2：顶部元素太多

### 修复：信息分层显示

```tsx
// 顶部栏只保留关键信息
<div className="top-bar">
  <span>房间 {room.code}</span>
  <span>{gameState.players.length}人</span>
  <Countdown />
</div>

// 游戏信息放在侧边或底部
<div className="game-info">
  <OutPhaseIndicator />  // Out模式状态
  <PendingDrawInfo />    // 累积惩罚
  <DirectionIndicator /> // 出牌方向
</div>
```

### 具体修改

```tsx
// Game.tsx 顶部栏精简
<div className="flex items-center justify-between px-4 py-3 bg-slate-900/80">
  <div className="flex items-center gap-4">
    {/* 只保留房间号 */}
    <span className="text-lg font-bold">房间 {room.code}</span>
    
    {/* 人数 */}
    <span className="text-sm text-slate-400">{gameState.players.length}人</span>
    
    {/* 倒计时 */}
    <div className="...">
      <Clock /> {formatTime(turnCountdown)}
    </div>
  </div>
  
  {/* 右侧：Out模式指示器（如果有） */}
  {isOutMode && <OutPhaseIndicator compact />}
</div>

// 底部控制栏合并
<div className="bottom-controls">
  {/* 手牌区域 */}
  
  {/* 操作按钮精简 */}
  <div className="flex gap-2">
    <UNOButton />
    <PlayButton />
    {isOutMode && <ComboButton />}  // 只有Out模式显示
  </div>
</div>
```

## 验证方式
1. 观察牌堆和文字不再重叠
2. 顶部栏只显示关键信息
3. 界面不再拥挤

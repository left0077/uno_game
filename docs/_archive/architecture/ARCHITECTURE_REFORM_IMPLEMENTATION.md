# 单一数据流架构改造实施计划

## 状态：✅ 已完成

---

## 已完成任务

### 任务1: 移除前端可出牌计算 ✅

**改造清单**
- [x] 1. 更新 `useGameActions` Hook，确保可靠获取后端数据
- [x] 2. 修改 `Game.tsx`，移除 `playableCardsV1` useMemo
- [x] 3. 修改 `Game.tsx`，使用 `playableCardIdsV2` 替代
- [x] 4. 移除 `isV2` 条件判断，强制使用后端数据
- [x] 5. 删除 `useGameStore.getPlayableCards` 方法

### 任务2: 移除前端抢牌计算 ✅

**改造清单**
- [x] 1. 修改 `Game.tsx`，移除 `jumpInCards` 计算
- [x] 2. 修改后端返回 `cardIds` 字段
- [x] 3. 前端使用后端返回的 `jumpIn.cardIds` 数据

### 任务3: 简化连打逻辑 ✅

**改造清单**
- [x] 1. 修改 `useGameMode`，简化 `suggestedComboCards` 逻辑
- [x] 2. 移除 `matchedCombo` 和 `suggestedComboCards` 计算
- [x] 3. 简化出牌按钮逻辑，让后端验证连打

### 任务4: 统一玩家状态存储 ✅

**改造清单**
- [x] 1. 后端 `BaseGameMode.initialize` 深拷贝 players 到 gameState
- [x] 2. 前端 `Game.tsx` 移除 `room.players` fallback
- [x] 3. `currentPlayer` 只从 `gameState.players` 获取
- [x] 4. `otherPlayers` 只从 `gameState.players` 计算
- [x] 5. `activePlayer` 只从 `gameState.players` 获取
- [x] 6. 排名显示只从 `gameState.players` 获取玩家信息

### 任务5: 倒计时同步 ✅

**改造清单**
- [x] 1. `useGameActions` 添加 `countdown` 返回
- [x] 2. `Game.tsx` 使用后端返回的 `countdown.remaining`
- [x] 3. 移除前端本地倒计时计算逻辑
- [x] 4. 警告状态使用后端 `countdown.warning`

### 任务6: 清理 localStorage ✅

**改造清单**
- [x] 1. `useGameStore` 不再保存 `uno-game-state`
- [x] 2. `App.tsx` 初始化不再读取 `uno-game-state`
- [x] 3. 保留 `uno-current-room` 用于重连
- [x] 4. 保留 `uno-user-id`、`uno-nickname`、`uno-server-url`

### 任务7: 清理 v1 兼容代码 ✅

**改造清单**
- [x] 1. `Game.tsx` 移除 `isV2` 条件渲染
- [x] 2. `Game.tsx` 移除 `isV2` 排序逻辑
- [x] 3. `useGameActions` 移除 `isV2` 返回和版本检测
- [x] 4. 移除 v1 降级分支注释

---

## 架构变更总结

### 数据流
```
用户操作 → Socket → 后端验证计算 → 广播新状态 → 前端渲染
```

### 单一数据源
- 可出牌：`gameState.availableActions[playerId].actions.play.cards`
- 抢牌：`gameState.availableActions[playerId].actions.special.jumpIn.cardIds`
- 连打：`gameState.availableActions[playerId].actions.combo.starters`
- 倒计时：`gameState.availableActions[playerId].state.countdown`
- 玩家状态：`gameState.players`

### 已移除
- 前端可出牌计算
- 前端抢牌计算
- 前端连打匹配计算
- 前端倒计时计算
- `uno-game-state` localStorage 存储
- `isV2` 版本判断和 v1 兼容分支

---

## 验收标准

### 功能验收
- [ ] 所有出牌场景正常工作
- [ ] 连打功能正常工作
- [ ] 抢牌功能正常工作
- [ ] 托管功能正常工作
- [ ] 断线重连正常工作

### 代码验收
- [x] 前端无游戏规则计算逻辑
- [x] 玩家状态只存储在一处
- [x] 无 v1/v2 兼容代码
- [ ] 测试覆盖率 > 80%

---

## 风险应对

| 风险 | 应对策略 |
|------|----------|
| 改造期间 Bug | 每阶段充分测试后再进入下一阶段 |
| 性能下降 | 乐观更新机制保证用户体验 |
| 功能回退 | 保留 Git 历史，可快速回滚 |

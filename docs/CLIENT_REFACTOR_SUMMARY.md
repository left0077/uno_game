# 客户端 Action API v2.0 重构总结

## 完成的工作

### 1. 创建的文件

#### 共享类型 (`/shared/actionApi.ts`)
- 定义了 Action API v2.0 的所有类型
- 包含 `AvailableActions`、`PlayableCard`、`ComboStarter`、`PenaltyOption` 等核心类型
- 定义了错误码 `ActionErrorCodes`
- 支持版本检测函数

#### 客户端类型 (`/client/src/types/`)
- `actionApi.ts` - 从共享类型重新导出，并添加版本检测辅助函数
- `gameState.ts` - 扩展 `GameState` 类型，添加 `actionApiVersion` 和 `availableActions` 字段
- `index.ts` - 统一导出所有类型

#### useGameActions Hook (`/client/src/hooks/useGameActions.ts`)
- 核心 Hook，提供 Action API v2.0 功能
- 特性：
  - 自动检测 v1/v2 API 版本
  - 向后兼容：v1 时自动使用降级逻辑
  - 乐观更新支持（可配置）
  - 错误处理和恢复
  - 便捷访问方法（playableCards、comboStarters 等）
- 日志格式：`[GameActions] 操作: 详情`

#### PenaltyResponsePanel 组件 (`/client/src/components/game/PenaltyResponsePanel.tsx`)
- 惩罚响应选择面板
- 显示被+时的所有响应选项
- 支持优先级排序和推荐标记
- 包含结果预览

#### ComboSelectorV2 组件 (`/client/src/components/game/ComboSelectorV2.tsx`)
- 新的连打选择器
- 显示所有可用连打组合
- 显示风险评估（低/中/高风险）
- 推荐标记
- 显示缺失卡牌提示

#### 测试文件 (`/client/src/hooks/__tests__/useGameActions.test.ts`)
- 包含对 useGameActions Hook 的单元测试
- 测试 v2.0 API 功能
- 测试 v1.0 向后兼容
- 测试惩罚状态检测
- 测试工具方法

### 2. 修改的文件

#### `/client/src/hooks/index.ts`
- 导出 `useGameActions` Hook 及其类型

#### `/client/src/components/game/index.ts`
- 导出 `PenaltyResponsePanel` 和 `ComboSelectorV2` 组件

#### `/client/src/pages/Game.tsx`
- 集成 `useGameActions` Hook
- 保留 v1 计算逻辑作为向后兼容
- 添加惩罚响应面板显示
- 添加连打选择器 v2 弹窗
- 显示 API 版本标记
- 显示出牌原因提示（v2 模式）
- 支持乐观更新回滚按钮

## 架构设计

### 数据流

```
┌─────────────┐     actionApiVersion     ┌─────────────┐
│   Server    │ ────────────────────────> │   Client    │
│             │                           │             │
│  (v1/v2)    │    availableActions      │ useGameActions│
│             │ ────────────────────────> │             │
└─────────────┘                           └──────┬──────┘
                                                  │
                       ┌──────────────────────────┼──────────────────────────┐
                       │                          │                          │
                       ▼                          ▼                          ▼
              ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
              │  playableCards  │      │  comboStarters  │      │ penaltyOptions  │
              └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 版本兼容策略

1. **检测版本**: 通过 `gameState.actionApiVersion` 检测
2. **v2 模式**: 使用服务器提供的 `availableActions`
3. **v1 模式**: 降级到客户端计算（保留原有逻辑）
4. **混合模式**: v1 服务器 + v2 客户端会正常工作

## 关键功能

### 1. 可出牌显示

```typescript
// v2 模式 - 使用服务器数据
const { playableCardIds, isCardPlayable } = useGameActions(gameState, playerId);

// 在 UI 中
const isPlayable = isV2 ? isCardPlayable(card.id) : playableCardsV1.has(card.id);
```

### 2. 惩罚响应

```typescript
// 当被+时显示响应面板
{isV2 && hasPendingPenalty && penaltyOptions.length > 0 && (
  <PenaltyResponsePanel
    options={penaltyOptions}
    pendingCount={pendingDrawCount}
    onSelect={handlePenaltyResponse}
  />
)}
```

### 3. 连打选择

```typescript
// 显示连打选择器
{isV2 && isOutMode && comboStarters.length > 0 && (
  <button onClick={() => setShowComboSelectorV2(true)}>
    🎴 连打 ({comboStarters.length})
  </button>
)}
```

### 4. 乐观更新

```typescript
const { hasOptimisticUpdate, rollback } = useGameActions(gameState, playerId, {
  enableOptimistic: true,
});

// 显示回滚按钮
{hasOptimisticUpdate && (
  <button onClick={rollback}>↺ 撤销</button>
)}
```

## 测试结果

### 通过测试

1. ✅ v2 API 版本检测
2. ✅ 可出牌列表解析
3. ✅ 可出牌ID集合生成
4. ✅ isCardPlayable 判断
5. ✅ getCardPlayInfo 返回详细信息
6. ✅ canDraw 状态检测
7. ✅ 游戏状态信息返回
8. ✅ 惩罚状态检测
9. ✅ v1 向后兼容

### 未测试（需要实际环境）

1. 实际 API 调用
2. 乐观更新回滚
3. 连打执行
4. 惩罚响应执行

## 已知问题

### TypeScript 编译警告

以下警告来自现有代码，不影响新功能：

1. `src/App.tsx` - ChatMessage 类型推断问题
2. `src/core/modes/` - 模块路径和未使用变量问题

### 未实现的功能

1. **实际 API 调用**: 目前使用 mock，需要接入真实 socket
2. **增量更新**: 预留了接口但未实现
3. **缓存机制**: 预留了 etag 但未实现

## 后续工作

### 服务端集成

当服务端实现 `getAvailableActions` 接口后：

1. 在 `gameState` 中添加 `actionApiVersion: '2.0'`
2. 在 `gameState.availableActions` 中填充数据
3. 客户端会自动切换到 v2 模式

### 性能优化

1. 添加计算结果缓存（服务端）
2. 实现增量更新（delta update）
3. WebSocket 推送而非轮询

### UI 优化

1. 添加卡牌提示动画
2. 优化惩罚响应面板布局
3. 添加更多连打预览信息

## 使用指南

### 对于开发者

```typescript
// 使用 useGameActions
import { useGameActions } from '../hooks';

function MyComponent() {
  const {
    isV2,                    // 是否为 v2 API
    playableCards,           // 可出牌列表（v2）
    comboStarters,           // 连打启动牌（v2）
    penaltyOptions,          // 惩罚选项（v2）
    canDraw,                 // 是否可以摸牌
    isCardPlayable,          // 检查卡牌是否可出
    getCardPlayInfo,         // 获取卡牌详细信息
    // ... 更多方法
  } = useGameActions(gameState, playerId);
  
  // ...
}
```

### 向后兼容

现有代码无需修改即可工作：

```typescript
// 旧代码继续使用 v1 计算
const playableCards = useMemo(() => {
  // 原有逻辑
}, [/* deps */]);
```

当服务器升级到 v2 后，Hook 会自动使用新数据。

## 文件清单

### 新建文件

```
/shared/actionApi.ts                          (7.7KB)
/client/src/types/actionApi.ts                (2.1KB)
/client/src/types/gameState.ts                (0.8KB)
/client/src/types/index.ts                    (0.4KB)
/client/src/hooks/useGameActions.ts           (14.8KB)
/client/src/hooks/__tests__/useGameActions.test.ts (10.5KB)
/client/src/components/game/PenaltyResponsePanel.tsx (7.7KB)
/client/src/components/game/ComboSelectorV2.tsx (13.5KB)
```

### 修改文件

```
/client/src/hooks/index.ts                    (+2 lines)
/client/src/components/game/index.ts          (+4 lines)
/client/src/pages/Game.tsx                    (重构)
```

总计：**约 70KB 新代码**

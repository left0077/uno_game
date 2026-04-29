# UNO Online 单一数据源架构改造方案

## 文档信息
- **版本**: v1.0
- **日期**: 2026-03-17
- **状态**: 待实施

---

## 1. 现状分析

### 1.1 核心问题
当前架构存在多处"数据源不一致"问题，导致：
- 前后端游戏规则计算结果可能不一致
- 同一状态多处存储，同步困难
- 代码维护复杂度高，Bug 难以定位

### 1.2 问题分布图

```
┌─────────────────────────────────────────────────────────────┐
│                     当前架构问题分布                          │
├─────────────────────────────────────────────────────────────┤
│  前端                         后端                           │
│  ┌──────────────┐            ┌──────────────┐               │
│  │ Game.tsx     │◄──────────►│ SocketHandler │              │
│  │ - 可出牌计算  │   Socket   │ - 状态同步    │              │
│  │ - 抢牌计算   │            │ - 房间管理    │              │
│  │ - 连打检测   │            └──────┬───────┘               │
│  └──────┬───────┘                   │                       │
│         │                           ▼                       │
│  ┌──────▼───────┐            ┌──────────────┐               │
│  │ useGameMode  │◄──────────►│   OutMode    │               │
│  │ - 连打转换   │   HTTP?    │ - 连打检测    │◄───┐         │
│  └──────────────┘            │ - 可出牌计算  │    │         │
│                              └──────────────┘    │         │
│                                                   │         │
│  ┌──────────────┐            ┌──────────────┐    │         │
│  │ useGameStore │◄──────────►│  GameState   │────┘         │
│  │ - localStorage│            │ - players    │               │
│  │ - React State│            │ - 倒计时     │               │
│  └──────────────┘            └──────────────┘               │
│                                                             │
│  问题：                                                     │
│  1. 可出牌前后端都计算 ❌                                   │
│  2. 玩家状态 room/gameState 重复 ❌                          │
│  3. 倒计时前后端都计算 ❌                                   │
│  4. localStorage 与服务器不一致 ❌                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 问题清单与改造方案

### 2.1 P0 - 关键问题（立即修复）

#### 问题 1: 可出牌计算前后端重复

| 项目 | 详情 |
|------|------|
| **严重程度** | P0 - 高 |
| **当前位置** | `client/src/pages/Game.tsx:147-197`<br>`client/src/hooks/useGameStore.ts:146-168` |
| **问题描述** | 前端通过 `playableCardsV1` useMemo 和 `getPlayableCards` 独立计算可出牌，与后端 Action API 重复 |
| **风险** | 规则变更需多处修改；前后端判断不一致导致玩家困惑 |

**当前代码**:
```typescript
// Game.tsx - 前端自己计算可出牌
const playableCardsV1 = useMemo(() => {
  // 颜色匹配、数字匹配、万能牌规则...
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  // ...
}, [...]);

// useGameStore.ts - 又一个计算
const getPlayableCards = useCallback(() => {
  // 重复的规则判断
}, []);
```

**改造方案**:
```typescript
// 改造后 - 完全信任后端数据
const { playableCardIds } = useGameActions(gameState, playerId);
// 移除所有前端计算逻辑
```

**改造步骤**:
1. [ ] 移除 `Game.tsx` 中 `playableCardsV1` useMemo
2. [ ] 移除 `useGameStore.ts` 中 `getPlayableCards` 方法
3. [ ] 移除 v1/v2 兼容判断，强制使用 v2 Action API
4. [ ] 更新所有使用 `playableCardsV1` 的组件

---

#### 问题 2: 玩家状态多处存储不同步

| 项目 | 详情 |
|------|------|
| **严重程度** | P0 - 高 |
| **当前位置** | `server/src/socket/SocketHandler.ts`<br>`server/src/game/modes/OutMode.ts` |
| **问题描述** | 玩家状态同时存储在 `room.players` 和 `gameState.players`，需要手动同步 |
| **风险** | 状态不同步导致托管、淘汰等功能异常 |

**当前流程**:
```
切换托管 -> 更新 room.players -> 手动同步 gameState.players
玩家重连 -> 更新 room.players -> 手动同步 gameState.players
玩家淘汰 -> 更新 gameState.players -> 可能遗漏 room.players
```

**改造方案**:
```typescript
// 改造后 - gameState 为唯一数据源
interface Room {
  code: string;
  hostId: string;
  playerIds: string[];  // 只存ID
  // 移除 players 详情
}

// 所有玩家状态从 gameState.players 获取
const player = gameState.players.find(p => p.id === playerId);
```

**改造步骤**:
1. [ ] 修改 `Room` 类型，`players` 改为 `playerIds: string[]`
2. [ ] 创建 `getPlayerFromGameState(room, playerId)` 辅助函数
3. [ ] 更新所有访问 `room.players` 的代码
4. [ ] 删除手动同步逻辑

---

### 2.2 P1 - 重要问题（近期修复）

#### 问题 3: 连打检测逻辑重复

| 项目 | 详情 |
|------|------|
| **严重程度** | P1 - 中 |
| **当前位置** | `client/src/pages/Game.tsx:261-289`<br>`client/src/core/hooks/useGameMode.ts` |
| **问题描述** | 后端已通过 Action API 返回连打组合，前端又进行匹配计算 |

**当前代码**:
```typescript
// Game.tsx - 前端再次计算连打匹配
const matchedCombo = useMemo(() => {
  return availableCombos.find(c => 
    c.cardIds.length === selectedComboCards.length &&
    c.cardIds.every(id => selectedComboCards.includes(id))
  );
}, [...]);
```

**改造方案**:
- 完全信任后端返回的 `comboStarters`
- 前端仅展示，验证出牌请求由后端处理

**改造步骤**:
1. [ ] 简化 `useGameMode.ts`，直接透传后端 `comboStarters`
2. [ ] 移除 `matchedCombo` 前端计算
3. [ ] 出牌时直接发送选中的牌，由后端验证是否可组成连打

---

#### 问题 4: 抢牌(Jump-in)逻辑重复

| 项目 | 详情 |
|------|------|
| **严重程度** | P1 - 中 |
| **当前位置** | `client/src/pages/Game.tsx:209-220` |
| **问题描述** | 前端本地计算 `jumpInCards`，后端 Action API 也返回 |

**改造步骤**:
1. [ ] 移除 `jumpInCards` 前端计算
2. [ ] 使用 `actions.special.jumpIn` 数据判断是否可抢牌

---

#### 问题 5: 倒计时多处计算

| 项目 | 详情 |
|------|------|
| **严重程度** | P1 - 中 |
| **当前位置** | `client/src/pages/Game.tsx:85-115`<br>`client/src/core/hooks/useGameMode.ts` |
| **问题描述** | 前端基于本地时间计算倒计时，与服务器可能不同步 |

**改造方案**:
```typescript
// 改造后 - 直接使用服务端倒计时
const { state } = useGameActions(gameState, playerId);
const remaining = state?.countdown?.remaining;
```

---

### 2.3 P2 - 优化问题（后续迭代）

#### 问题 6: localStorage 与服务器状态双轨

| 项目 | 详情 |
|------|------|
| **严重程度** | P2 - 低 |
| **当前位置** | `client/src/hooks/useGameStore.ts` |
| **问题描述** | 游戏状态保存在 localStorage，可能与服务器不同步 |

**改造方案**:
- localStorage 只保存 `userId` 和 `roomCode`
- 游戏状态完全由服务器推送
- 重连时重新请求完整状态

---

#### 问题 7: v1/v2 API 兼容层

| 项目 | 详情 |
|------|------|
| **严重程度** | P2 - 低 |
| **当前位置** | `client/src/pages/Game.tsx`<br>`client/src/hooks/useGameActions.ts` |
| **问题描述** | 保留 v1 API 兼容代码，增加复杂度 |

**改造方案**:
- 移除所有 v1 兼容代码
- 强制使用 v2 Action API

---

## 3. 目标架构

### 3.1 改造后架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     目标架构：单一数据源                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   前端（纯展示层）              后端（唯一数据源）              │
│   ┌──────────────┐             ┌──────────────┐             │
│   │   Game.tsx   │◄────────────│ SocketHandler │             │
│   │   - 渲染UI   │   Socket    │   - 事件路由   │             │
│   │   - 处理交互 │   推送状态   │   - 广播状态   │             │
│   └──────┬───────┘             └──────┬───────┘             │
│          │                            │                    │
│   ┌──────▼───────┐             ┌──────▼───────┐             │
│   │useGameActions│◄────────────│   OutMode    │             │
│   │   - 缓存数据  │   HTTP/API   │   - 游戏规则  │             │
│   │   - 格式化   │              │   - 计算可出牌 │             │
│   └──────────────┘             │   - 计算连打  │             │
│                                └──────┬───────┘             │
│                                       │                    │
│                                ┌──────▼───────┐             │
│                                │  GameState   │             │
│                                │  - 玩家状态   │             │
│                                │  - 游戏状态   │             │
│                                │  - 倒计时    │             │
│                                └──────────────┘             │
│                                                             │
│   原则：                                                     │
│   ✅ 前端不计算游戏规则（可出牌、连打等）                       │
│   ✅ GameState 是唯一数据源                                   │
│   ✅ Socket 推送状态变更                                      │
│   ✅ localStorage 只存用户ID                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据流图

```
用户操作 ──► Game.tsx ──► useSocket.emit() ──► 服务器处理
                              ▲                      │
                              │                      ▼
                              │              ┌──────────────┐
                              │              │  游戏规则计算  │
                              │              │  - 可出牌     │
                              │              │  - 连打检测   │
                              │              └──────┬───────┘
                              │                     │
                              │              ┌──────▼───────┐
                              │              │  更新GameState│
                              │              └──────┬───────┘
                              │                     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  socket.emit('game: │
                              │    state', newState)│
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   所有客户端更新     │
                              │   - 渲染新状态      │
                              │   - 不本地计算      │
                              └─────────────────────┘
```

---

## 4. 改造计划

### 阶段一：移除前端计算（Week 1）

- [ ] **Day 1-2**: 移除可出牌前端计算
  - 删除 `playableCardsV1` useMemo
  - 删除 `getPlayableCards` store 方法
  - 更新所有依赖组件

- [ ] **Day 3-4**: 移除抢牌前端计算
  - 删除 `jumpInCards` useMemo
  - 使用后端 `actions.special.jumpIn`

- [ ] **Day 5**: 简化连打逻辑
  - 信任后端 `comboStarters`
  - 移除前端 `matchedCombo` 计算

### 阶段二：统一玩家状态（Week 2）

- [ ] **Day 1-2**: 重构 Room 类型
  - `players` → `playerIds`
  - 创建辅助查询函数

- [ ] **Day 3-4**: 更新 SocketHandler
  - 移除手动同步逻辑
  - 统一从 gameState 获取玩家

- [ ] **Day 5**: 测试验证
  - 托管功能
  - 重连功能
  - 淘汰功能

### 阶段三：清理遗留代码（Week 3）

- [ ] **Day 1-2**: 移除 v1 API 兼容代码
- [ ] **Day 3-4**: 优化 localStorage 使用
- [ ] **Day 5**: 代码审查和文档更新

---

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 改造期间功能回退 | 高 | 分阶段实施，每阶段充分测试 |
| 前后端数据格式不兼容 | 中 | 保持 API 兼容性，渐进式迁移 |
| 性能下降（全部依赖后端） | 低 | 后端计算已优化；可添加客户端缓存 |

---

## 6. 收益

- **可维护性**: 游戏规则只在后端实现，修改只需一处
- **一致性**: 消除前后端判断不一致的 Bug
- **性能**: 减少前端计算负担
- **可读性**: 简化代码逻辑，易于理解

---

## 附录：相关文件清单

### 前端文件
- `client/src/pages/Game.tsx` - 主游戏界面
- `client/src/hooks/useGameActions.ts` - Action API Hook
- `client/src/hooks/useGameStore.ts` - 游戏状态 Store
- `client/src/core/hooks/useGameMode.ts` - 游戏模式 Hook
- `client/src/hooks/useSocket.ts` - Socket Hook

### 后端文件
- `server/src/game/modes/OutMode.ts` - Out 模式逻辑
- `server/src/game/modes/BaseGameMode.ts` - 基础模式
- `server/src/socket/SocketHandler.ts` - Socket 处理器
- `server/src/shared/actionApi.ts` - Action API 类型

### 共享文件
- `shared/types/index.ts` - 基础类型
- `shared/actionApi.ts` - Action API 定义

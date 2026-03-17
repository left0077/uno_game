# UNO Online v2.0 项目问题报告

> 生成时间: 2026-03-17
> 审查范围: 服务端、客户端、E2E测试、配置文件

---

## 📊 执行摘要

| 类别 | 问题数量 | 严重程度 |
|------|----------|----------|
| 代码错误 | 15 | 🔴 高 |
| 类型不匹配 | 12 | 🟡 中 |
| 未使用代码 | 25 | 🟢 低 |
| 配置问题 | 8 | 🟡 中 |
| 测试问题 | 10 | 🟡 中 |
| **总计** | **70** | - |

---

## 🔴 高优先级问题（阻止构建/运行）

### 1. 客户端 Hook 引用错误

**文件**: `client/src/hooks/useGameActions.ts`

**问题描述**:
```typescript
// 第8行错误地引用已删除的 useSocketV2
import { useSocketV2 } from './useSocketV2';  // ❌ 文件已不存在

// 第14行使用了错误的 hook 名
export function useGameActionsV2({ roomCode }: UseGameActionsV2Props) {
  const { socket, isConnected } = useSocketV2();  // ❌ 应该是 useSocket
```

**修复方案**:
```typescript
import { useSocket } from './useSocket';

export function useGameActions({ roomCode }: UseGameActionsV2Props) {
  const { socket, isConnected } = useSocket();
```

---

### 2. 客户端调用不存在的方法

**文件**: `client/src/pages/Game.tsx`

**问题描述**:
```typescript
// 第34行 - refreshActionsV2 不存在
const { refreshActionsV2 } = useSocket();  // ❌ 方法不存在

// 第45行 - availableActions 不存在  
const { availableActions } = useGameActions({ roomCode: roomCode || '' });  // ❌ 属性不存在
```

**影响**: 游戏页面无法正确获取可用动作，玩家无法进行游戏操作。

---

### 3. 错误的模块导出

**文件**: `client/src/hooks/index.ts`

**问题描述**:
```typescript
// 导出不存在的类型
export { useGameActions, type UseGameActionsReturn } from './useGameActions';
// ❌ UseGameActionsReturn 类型未在 useGameActions.ts 中定义
```

---

### 4. 服务端 Socket 事件逻辑错误

**文件**: `server/src/socket/SocketHandler.ts` (第203-212行)

**问题描述**: `v2:playCard` 快捷事件处理器中，错误地使用 `socket.emit` 给自己发送消息，而不是调用实际的处理逻辑。

```typescript
socket.on('v2:playCard', (data) => {
  const userId = socketUserMap.get(socket.id) || socket.id;
  socket.emit('v2:action', {  // ❌ 应该是直接处理，而不是 emit
    roomCode: data.roomCode,
    action: { type: 'play', playerId: userId, cardIds: [data.cardId] }
  });
});
```

**修复方案**: 应该直接调用 `game.mode.handleAction(action)` 而不是 emit 事件。

---

### 5. 测试脚本引用已删除文件

**文件**: `/Users/left0077/Projects/Kimi_Uno/test-all.sh`

**问题描述**: 脚本尝试运行以下已删除的测试文件:
- `test-card.mjs`
- `test-room.mjs`
- `test-game.mjs`

**修复方案**: 更新测试脚本以使用新的测试运行器:
```bash
npm run test  # 使用 server/src/test/index.ts
```

---

## 🟡 中优先级问题（功能缺陷）

### 6. Socket 事件名称不一致

**服务端**: `server/src/socket/SocketHandler.ts`
**客户端**: `client/src/hooks/useSocket.ts`

| 服务端发送 | 客户端监听 | 状态 |
|------------|-----------|------|
| `SocketEvents.CREATE_ROOM` ('room:create') | `'room:created'` | ❌ 不匹配 |
| `SocketEvents.JOIN_ROOM` ('room:join') | `'room:joined'` | ❌ 不匹配 |
| `SocketEvents.ROOM_UPDATED` ('room:updated') | `'room:updated'` | ✅ 匹配 |

**修复方案**: 统一使用 `'room:created'`, `'room:joined'` 等事件名。

---

### 7. V2 API 返回值类型不匹配

**文件**: `server/src/socket/SocketHandler.ts` (第276-284行)

**问题描述**: `v2:getAvailableActions` 返回数组，但前端期望对象结构:

```typescript
// 服务端返回
socket.emit('v2:availableActions', { playerId: userId, actions: [...] });

// 前端期望
interface AvailableActionsV2 {
  canPlay: boolean;
  playableCards: string[];
  canDraw: boolean;
  // ...
}
```

---

### 8. App.tsx 未使用的代码

**文件**: `client/src/App.tsx`

**未使用的导入/变量**:
- `SOCKET_URL` (第11行) - 声明但未使用
- `chatMessages` (第17行) - 声明但未使用
- `availableActionsV2` (第19行) - 声明但未使用
- `handleRoomCreated`, `handleRoomJoined` 等 - 10+ 个 handler 未使用

**建议**: 清理未使用的代码，或实现缺失的功能。

---

### 9. E2E 测试配置问题

**文件**: `e2e/run-tests.sh`

**问题描述**: 脚本引用了不存在的测试文件:
- `basic.spec.ts` → 实际为 `tests/core-features/basic.spec.ts`
- `reconnect.spec.ts` → 实际为 `tests/core-features/reconnect.spec.ts`

**修复方案**: 更新脚本中的路径。

---

### 10. TypeScript 严格模式关闭

**文件**: `client/tsconfig.json`, `server/tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": false,           // ❌ 应该启用
    "noImplicitAny": false     // ❌ 应该启用
  }
}
```

**影响**: 潜在的类型错误无法在编译期捕获。

---

## 🟢 低优先级问题（代码质量）

### 11. 未使用的导入（服务端）

| 文件 | 导入 | 行号 |
|------|------|------|
| `SocketHandler.ts` | `ACTION_API_VERSION` | 14 |
| `SocketHandler.ts` | `RoomManager` (类型) | 11 |
| `BaseGameModeV2.ts` | `Player` | 10 |

### 12. 类型强制转换 (any)

**文件**: `server/src/socket/SocketHandler.ts`

```typescript
// 第209, 227, 251行 - 应该使用正确的类型
chosenColor: data.chosenColor as any,  // ❌ 应该是 'red' | 'yellow' | 'green' | 'blue'
```

### 13. 重复导出声明

**文件**: `client/src/hooks/useSocket.ts` (第335行)

```typescript
// 已在文件顶部 export interface
export type { V2GameState, V2PlayerInfo, AvailableAction, AvailableActionsV2 };
```

---

## 📋 测试覆盖率问题

### 单元测试

| 模块 | 测试文件 | 状态 |
|------|----------|------|
| PlayerManager | `test/unit/v2/PlayerManager.test.ts` | ✅ 存在 |
| OutModeV2 | `test/unit/v2/OutModeV2.test.ts` | ✅ 存在 |
| calculateResult | `test/unit/v2/calculateResult.test.ts` | ✅ 存在 |
| CardManager | `test/unit/game/card.test.ts` | ✅ 存在 |
| SocketHandler | ❌ 缺失 | - |
| RoomManager | ❌ 缺失 | - |
| useSocket Hook | ❌ 缺失 | - |
| useGameActions Hook | ❌ 缺失 | - |

### E2E 测试

| 测试文件 | 状态 | 备注 |
|----------|------|------|
| `basic.spec.ts` | ⚠️ 部分通过 | 房间创建后页面跳转失败 |
| `out-mode.spec.ts` | ⚠️ 未验证 | 依赖基础功能 |
| `hosting.spec.ts` | ❌ 未运行 | - |
| `reconnect.spec.ts` | ❌ 未运行 | - |

---

## 🔧 修复建议

### 立即修复（本周内）

1. **修复客户端 Hook 错误**
   ```bash
   cd client/src/hooks
   # 修复 useGameActions.ts 中的引用错误
   ```

2. **统一 Socket 事件名称**
   ```bash
   cd server/src/socket
   # 更新 SocketHandler.ts 使用正确的事件名
   ```

3. **更新测试脚本**
   ```bash
   # 修复 test-all.sh 引用已删除文件的问题
   ```

### 短期修复（2周内）

4. **完善 V2 API 前端实现**
   - 实现缺失的 `playCardV2`, `playComboV2` 等方法
   - 统一 `availableActions` 的数据格式

5. **清理未使用代码**
   - 使用 ESLint 检测并删除未使用的导入和变量

6. **添加缺失的单元测试**
   - SocketHandler 测试
   - RoomManager 测试
   - React Hooks 测试

### 长期改进（1个月内）

7. **启用 TypeScript 严格模式**
   ```json
   {
     "strict": true,
     "noImplicitAny": true,
     "strictNullChecks": true
   }
   ```

8. **统一类型定义**
   - 将共享类型移到 `shared/` 目录
   - 消除服务端和客户端的类型不一致

9. **完善 E2E 测试**
   - 修复基础功能测试
   - 添加更多场景覆盖

---

## 📈 当前构建状态

```
✅ 服务端构建: 通过
✅ 前端构建: 通过  
❌ 根目录测试脚本: 失败（引用已删除文件）
⚠️ E2E测试: 部分失败（房间跳转问题）
```

---

## 📝 附录: 关键文件检查清单

### 服务端关键文件
- [x] `src/index.ts` - 服务入口
- [x] `src/socket/SocketHandler.ts` - Socket 事件处理
- [x] `src/game/core/OutModeV2.ts` - V2 游戏模式
- [x] `src/game/core/PlayerManager.ts` - 玩家管理
- [x] `src/rooms/RoomManager.ts` - 房间管理

### 客户端关键文件
- [x] `src/App.tsx` - 应用主组件
- [x] `src/hooks/useSocket.ts` - Socket Hook
- [x] `src/hooks/useGameActions.ts` - 游戏动作 Hook
- [x] `src/pages/Game.tsx` - 游戏页面
- [x] `src/pages/Room.tsx` - 房间页面

### 配置文件
- [x] `package.json` - 项目配置
- [x] `tsconfig.json` - TypeScript 配置
- [x] `test-all.sh` - 测试脚本

---

**报告生成完成** | 共发现 70 个问题 | 建议优先修复高优先级问题

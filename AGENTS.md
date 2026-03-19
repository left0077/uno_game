# UNO Online - AI 开发指南

> 给 Kimi 和其他 AI 助手的项目指南

---

## 🎯 核心原则

### 开发前必做
1. **查现有代码** - 不要创造新约定
2. **对齐现有模式** - 遵循项目已有风格
3. **最小修改** - 只改必要部分

### 禁止事项
- ❌ 创建新的规范文档（项目已有约定）
- ❌ 修改现有测试结构
- ❌ 重命名现有函数/变量（除非必要）
- ❌ 添加新依赖（除非必要）

---

## 📂 关键文件

### 类型定义
```
shared/types/index.ts       # 共享类型
server/src/shared/index.ts  # SocketEvents 枚举
```

### 前端核心
```
client/src/App.tsx          # 主应用
client/src/hooks/useSocket.ts    # Socket 管理
client/src/hooks/useGameActions.ts  # 游戏动作
client/src/pages/
  ├── Home.tsx              # 首页
  ├── Room.tsx              # 房间页
  └── Game.tsx              # 游戏页
```

### 后端核心
```
server/src/socket/SocketHandler.ts   # Socket 事件处理
server/src/game/                     # 游戏逻辑
```

---

## 🔌 Socket 事件规范

**格式**: `domain:action` (全小写，冒号分隔)

### 已定义的事件 (在 `SocketEvents` 枚举中)

```typescript
// 房间
room:create, room:join, room:leave
room:settings, room:start
room:created, room:joined, room:updated

// 游戏
game:play, game:combo, game:draw
game:uno, game:challenge, game:jump
game:started, game:state, game:ended

// AI
ai:add, ai:remove

// 玩家
player:host, player:actions
player:reconnected, player:reconnectFailed

// 聊天
chat:send, chat:message

// 错误
error
```

### 使用方式

**后端监听**:
```typescript
socket.on(SocketEvents.JOIN_ROOM, (data) => {
  // 处理逻辑
});
```

**后端发送**:
```typescript
socket.emit('room:created', room);
io.to(roomCode).emit('game:state', state);
```

**前端发送**:
```typescript
socketRef.current?.emit('room:join', { roomCode, nickname });
```

**前端监听**:
```typescript
socket.on('game:state', (state) => {
  setGameState(state);
});
```

---

## 🧪 测试规范

### E2E 测试
- 位置: `e2e/tests/`
- 框架: Playwright
- 运行: `cd e2e && npx playwright test`

### 后端单元测试
- 位置: `server/src/test/`
- 运行: `cd server && npm test`

### 添加新测试
- **E2E 测试必须模拟真实用户操作流程**，而不仅仅是验证功能存在
- 优先使用现有辅助函数
- 不要修改 test-helpers.ts 的结构
- 保持测试简单直接

### ⚠️ E2E 测试核心原则
**目标**: 确保用户能够正确使用功能，而不仅仅是测试通过

**正确做法**:
```typescript
// ✅ 模拟完整用户流程
test('用户可以添加 AI', async ({ page }) => {
  // 1. 用户创建房间
  await createRoom(page, '房主');
  
  // 2. 用户看到添加按钮并点击
  await expect(page.getByText('+ 添加 AI')).toBeVisible();
  await page.click('+ 添加 AI');
  
  // 3. 用户选择难度
  await expect(page.getByText('简单')).toBeVisible();
  await page.click('text=简单');
  
  // 4. 用户确认添加
  await page.click('text=确认添加');
  
  // 5. 验证 AI 出现在玩家列表
  await expect(page.locator('.player-list')).toContainText('AI');
});
```

**错误做法**:
```typescript
// ❌ 只验证内容存在，不验证操作流程
test('AI 功能存在', async ({ page }) => {
  await createRoom(page, '房主');
  const content = await page.content();
  expect(content).toContain('AI'); // 这只是检查字符串！
});
```

---

## 🐛 调试技巧

### 后端日志
```bash
# 查看 Socket 事件
DEBUG=* npm run dev

# 查看游戏日志
npm run dev | grep "game\|room"
```

### 前端日志
```typescript
// 在 useSocket.ts 中已内置
console.log('[Socket] Connected');
console.log('[Socket] Room created:', room.code);
```

---

## 📋 常见任务

### 添加新 Socket 事件
1. 在 `server/src/shared/index.ts` 的 `SocketEvents` 枚举中添加
2. 在 `SocketHandler.ts` 中实现处理逻辑
3. 在 `useSocket.ts` 中添加前端方法

### 修改游戏规则
1. 查看 `server/src/game/` 下的游戏逻辑
2. 修改对应的游戏类
3. 更新测试

### 修复 Bug
1. 先写/运行测试复现问题
2. 修复代码
3. 确保测试通过
4. 不要创建新文档

---

## 📂 文件存放规范（必须遵守）

### 目录结构
```
项目根目录/
├── docs/                      # 文档目录
│   ├── README.md              # 文档索引
│   ├── rules/                 # 游戏规则文档
│   ├── architecture/          # 架构设计文档
│   ├── assets/                # 正式资源文件
│   │   ├── screenshots/       # ✅ 正式截图放这里
│   │   ├── images/            # 其他图片
│   │   └── diagrams/          # 架构图
│   ├── v1.0/                  # v1.0 稳定版文档
│   └── v2.0/                  # v2.0 开发文档
│       ├── FEATURE_PLAN.md    # 功能规划清单
│       └── ...
│
└── .temp/                     # 临时文件夹（已gitignore）
    └── screenshots/           # 📝 临时截图放这里
```

### ⚠️ 强制规则

#### 1. 截图存放
| 类型 | 存放位置 | 说明 |
|------|----------|------|
| **正式截图** | `docs/assets/screenshots/` | 需要保留的截图 |
| **临时截图** | `.temp/screenshots/` | 调试用，用完即删 |

#### 2. 其他文件
- **功能规划文档** → `docs/v2.0/FEATURE_PLAN.md`
- **不要创建新规范文档** → 用现有的 AGENTS.md
- **文档更新后标注时间** → `**最后更新**: YYYY-MM-DD`

#### 3. .temp 目录已加入 .gitignore
临时文件不会进入版本控制，放心使用。

---

## 🔗 相关文档

- `docs/rules/` - 游戏规则
- `docs/architecture/` - 架构设计
- `docs/v2.0/FEATURE_PLAN.md` - 功能规划
- `.kimi/workflow.md` - 详细工作流

---

**最后更新**: 2026-03-19（添加了文档存放规范、临时截图目录、E2E测试用户流程规范）

## 🎯 记住的规范

### E2E 测试原则（必须遵守）
**核心目标**: 确保用户能够正确使用功能，而不仅仅是测试通过

**修复 E2E 测试时必须**：
1. 检查前端实际 UI 文本（placeholder、按钮文字等）
2. 选择器必须与实际 DOM 匹配
3. 测试流程必须模拟真实用户操作
4. 验证点必须是用户可见的结果（如：AI 标签出现）
5. 截图保存到 `.temp/screenshots/` 便于调试

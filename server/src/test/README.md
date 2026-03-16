# 服务端测试规范

## 目录结构

```
server/src/test/
├── README.md              # 本文档
├── test-runner.ts         # 测试运行器
├── mocks/                 # 模拟数据/对象
│   ├── mock-game.ts
│   └── mock-players.ts
├── unit/                  # 单元测试
│   ├── game/
│   │   ├── Card.test.ts
│   │   └── UnoGame.test.ts
│   ├── modes/
│   │   ├── BaseGameMode.test.ts
│   │   └── OutMode.test.ts
│   ├── ai/
│   │   └── AIPlayer.test.ts
│   └── rooms/
│       └── RoomManager.test.ts
└── integration/           # 集成测试
    ├── game-flow.test.ts
    └── multiplayer.test.ts
```

## 测试规范

### 1. 测试文件命名
- 单元测试: `{模块名}.test.ts`
- 集成测试: `{场景}.test.ts`

### 2. 测试框架
使用项目自带的轻量级测试框架 (test-runner.ts)

```typescript
import { test, expect } from '../test-runner.js';

test('测试描述', () => {
  const result = someFunction();
  expect(result).toBe(expected);
});
```

### 3. 断言方法
- `toBe(expected)` - 严格相等
- `toEqual(expected)` - 深度相等
- `toHaveLength(n)` - 数组长度
- `toBeTruthy()` - 真值
- `toBeFalsy()` - 假值
- `toThrow(fn)` - 抛出异常

### 4. Mock 数据
使用 `mocks/` 目录下的预设数据：

```typescript
import { mockRoom, mockPlayers } from '../mocks/mock-game.js';
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- Card.test.ts

# 运行单元测试
npm test -- unit

# 运行集成测试
npm test -- integration
```

## 测试覆盖目标

| 模块 | 目标覆盖率 | 优先级 |
|------|-----------|--------|
| Card | 90% | 🔴 高 |
| BaseGameMode | 85% | 🔴 高 |
| OutMode | 80% | 🔴 高 |
| AIPlayer | 70% | 🟡 中 |
| RoomManager | 70% | 🟡 中 |

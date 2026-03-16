# E2E 测试说明

## 目录结构

```
tests/
├── utils/
│   └── test-helpers.ts      # 测试工具函数
├── game-modes/              # 游戏模式测试
│   ├── out-mode.spec.ts     # Out模式测试
│   └── game-mode.spec.ts    # 模式切换测试
├── core-features/           # 核心功能测试
│   ├── basic.spec.ts        # 基础流程
│   ├── core-game.spec.ts    # 核心游戏逻辑
│   ├── gameplay.spec.ts     # 游戏流程
│   ├── uno.spec.ts          # UNO喊话
│   ├── reconnect.spec.ts    # 重连
│   └── hosting.spec.ts      # 托管功能
├── regression/              # 回归测试
│   ├── features.spec.ts
│   ├── new-cards.spec.ts
│   ├── mobile-ui.spec.ts
│   └── timer-test.spec.ts
└── bugs/                    # Bug回归测试
    ├── no-card-hint.spec.ts # 禁止出牌提示Bug
    └── hosting-sync.spec.ts # 托管同步Bug
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定目录
npm test -- game-modes
npm test -- core-features
npm test -- bugs

# 运行特定文件
npm test -- out-mode.spec.ts
npm test -- hosting-sync.spec.ts

# 本地运行
npm run test:local
```

## 编写测试

使用共享工具函数：

```typescript
import { test, expect } from '@playwright/test';
import { setupGame, playCard, drawCard } from '../utils/test-helpers';

test('示例测试', async ({ page }) => {
  await setupGame(page, '测试玩家', { aiCount: 1 });
  await playCard(page);
  // ...
});
```

## Bug回归测试

当修复一个Bug时，应在 `bugs/` 目录添加对应的回归测试，防止Bug再次出现。

```typescript
// tests/bugs/example-bug.spec.ts
test.describe('Bug: 问题描述', () => {
  test('修复后应该...', async ({ page }) => {
    // 复现Bug的步骤
    // 验证Bug已修复
  });
});
```

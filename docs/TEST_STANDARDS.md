# E2E 测试规范

> 2026-04-30

---

## 一、运行方式

```bash
cd e2e && npx playwright test
```

Playwright 自动启动前后端服务器（`reuseExistingServer: !isCI`），无需手动启动。

---

## 二、工具函数

所有测试使用 `e2e/tests/utils/test-helpers.ts` 中的工具函数，**不要手写选择器**。

| 函数 | 用途 |
|------|------|
| `setupServerUrl(page, url?)` | 设置 localStorage 中的服务端地址 |
| `createRoom(page, nickname)` | 创建房间，返回房间号 |
| `joinRoom(page, nickname, roomCode)` | 加入房间 |
| `addAI(page, difficulty?)` | 添加 AI（easy/normal/hard） |
| `startGame(page)` | 开始游戏 |
| `setupGame(page, nickname, opts?)` | 一键：创建房间 + 加 AI + 开始游戏 |
| `playCard(page, index?)` | 出手牌 |
| `drawCard(page)` | 摸牌 |
| `callUno(page)` | 喊 UNO |
| `selectColor(page, color)` | 万能牌选颜色 |
| `getHandCardCount(page)` | 获取手牌数量 |
| `waitForTurn(page, timeout?)` | 等待自己回合 |
| `expectOnHomePage / expectOnRoomPage / expectOnGamePage` | 页面位置断言 |

---

## 三、选择器规范

### 必须遵守

1. **使用 `SELECTORS` 常量**：`test-helpers.ts` 中定义了 `SELECTORS` 对象，所有选择器通过它引用
2. **优先使用 `getByRole`**：`page.getByRole('button', { name: /开始/ })`
3. **其次是 `getByText`**：`page.getByText(/房间/)`
4. **避免 CSS 类选择器**：类名会随 UI 改版而变化
5. **避免 `data-testid`**：当前项目未使用 data-testid

### 导航

```typescript
await page.goto('/uno/');  // 必须带 /uno/ 前缀
```

---

## 四、测试文件结构

```
tests/
├── core-features/     # 核心功能：首页、房间、游戏、托管、重连、UNO
├── game-modes/        # 模式测试：Standard、Out
├── bugs/              # Bug 回归测试
├── regression/        # 回归测试：计时器、移动端、新卡牌
├── utils/
│   └── test-helpers.ts  # 公共工具函数和选择器
├── socket-events.spec.ts
├── mobile-layout.spec.ts
└── mobile-layout-optimized.spec.ts
```

---

## 五、当前测试清单

| 文件 | 测试数 | 状态 | 备注 |
|------|--------|------|------|
| `core-features/basic.spec.ts` | 7 | ⚠️ 待修 | 选择器过时 |
| `core-features/core-game.spec.ts` | 1 | ✅ 已修 | |
| `core-features/gameplay.spec.ts` | 5 | ⚠️ 待修 | |
| `core-features/hosting.spec.ts` | 12 | ⚠️ 待修 | getHandCardCount 引用已修复 |
| `core-features/reconnect.spec.ts` | 6 | ⚠️ 待修 | |
| `core-features/uno.spec.ts` | 7 | ⚠️ 待修 | |
| `game-modes/game-mode.spec.ts` | 4 | ⚠️ 待修 | 模式按钮 CSS 断言过时 |
| `game-modes/out-mode.spec.ts` | 10+ | ⚠️ 部分无效 | 阶段测试基于旧规则 |
| `bugs/hosting-sync.spec.ts` | 8 | ⚠️ 待修 | |
| `bugs/no-card-hint.spec.ts` | 3 | ⚠️ 待修 | |
| `regression/features.spec.ts` | 5 | ⚠️ 待修 | 表情/设置选择器过时 |
| `regression/mobile-ui.spec.ts` | 3 | ⚠️ 待修 | |
| `regression/new-cards.spec.ts` | 3 | ⚠️ 待修 | |
| `regression/timer-test.spec.ts` | 1 | ⚠️ 待修 | AI 添加流程过时 |
| `socket-events.spec.ts` | 7 | ✅ 事件名正确 | 选择器可能过时 |
| `mobile-layout.spec.ts` | 5 | ⚠️ 待修 | |
| `mobile-layout-optimized.spec.ts` | 5 | ⚠️ 待修 | |

---

## 六、写新测试的模板

```typescript
import { test, expect } from '@playwright/test';
import { setupGame, playCard, drawCard, waitForTurn } from '../utils/test-helpers';

test.describe('功能名称', () => {
  test('场景描述', async ({ page }) => {
    // 1. 准备
    const roomCode = await setupGame(page, '测试玩家', { aiCount: 2, aiDifficulty: 'easy' });

    // 2. 等待回合
    const isMyTurn = await waitForTurn(page);
    expect(isMyTurn).toBeTruthy();

    // 3. 操作
    await playCard(page, 0);

    // 4. 验证
    await page.waitForTimeout(2000);
    const cards = await getHandCardCount(page);
    expect(cards).toBeLessThan(7);
  });
});
```

---

## 七、禁止事项

- ❌ 手写 `page.goto('/')`（应为 `/uno/`）
- ❌ 硬编码 CSS 类名断言
- ❌ 依赖概率的场景（如"等待 AI 出某张牌"）
- ❌ 等待固定秒数替代状态检查（用 `waitForSelector` / `waitForFunction`）
- ❌ 在测试中实现游戏规则逻辑

---

*版本：v1.0 | 2026-04-30*

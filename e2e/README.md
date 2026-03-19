# UNO Online E2E 测试

使用 Playwright 进行的端到端测试。

## 📁 目录结构

```
e2e/
├── playwright.config.ts          # 主配置（自动启动服务器）
├── playwright.config.local.ts    # 本地配置（手动启动服务器）
├── tests/
│   ├── core-features/            # 核心功能测试
│   │   ├── basic.spec.ts         # 首页、房间、AI
│   │   ├── gameplay.spec.ts      # 游戏流程
│   │   └── reconnect.spec.ts     # 重连功能
│   ├── game-modes/               # 游戏模式测试
│   │   ├── out-mode.spec.ts      # Out 模式
│   │   └── game-mode.spec.ts     # 其他模式
│   ├── regression/               # 回归测试
│   └── utils/
│       └── test-helpers.ts       # 测试工具函数
├── test-results/                 # 测试结果
└── playwright-report/            # HTML 报告
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd e2e
npm install
npx playwright install
```

### 2. 运行测试

#### 方式一：自动启动服务器（推荐）

```bash
# 运行所有测试（自动启动前后端）
npx playwright test

# 运行特定测试文件
npx playwright test basic.spec.ts

# 运行特定测试
npx playwright test -g "创建房间成功"

#  headed 模式（可见浏览器）
npx playwright test --headed

# UI 模式
npx playwright test --ui
```

#### 方式二：手动启动服务器

```bash
# 终端1：启动后端
cd server && npm run dev

# 终端2：启动前端
cd client && npm run dev

# 终端3：运行测试（使用本地配置）
npx playwright test --config=playwright.config.local.ts
```

## 📊 查看报告

```bash
# 查看 HTML 报告
npx playwright show-report

# 查看本地测试报告
npx playwright show-report playwright-report-local
```

## 🧪 测试分类

### 核心功能测试 (core-features)

| 测试文件 | 覆盖范围 |
|----------|----------|
| `basic.spec.ts` | 首页、创建房间、加入房间、AI管理 |
| `gameplay.spec.ts` | 开始游戏、出牌、摸牌、UNO规则 |
| `reconnect.spec.ts` | 网络断开重连 |

### 游戏模式测试 (game-modes)

| 测试文件 | 覆盖范围 |
|----------|----------|
| `out-mode.spec.ts` | Out 模式特殊规则 |
| `game-mode.spec.ts` | 其他游戏模式 |

### 回归测试 (regression)

| 测试文件 | 覆盖范围 |
|----------|----------|
| `features.spec.ts` | 功能回归 |
| `mobile-ui.spec.ts` | 移动端适配 |

## 🛠️ 测试工具

### 核心辅助函数

```typescript
// 房间操作
await createRoom(page, '昵称');        // 创建房间，返回房间号
await joinRoom(page, '昵称', '1234');  // 加入房间
await addAI(page, 'normal');           // 添加 AI
await startGame(page);                 // 开始游戏

// 游戏操作
await playCard(page, 0);               // 出第 N 张牌
await drawCard(page);                  // 摸牌
await callUno(page);                   // 喊 UNO
await selectColor(page, 'red');        // 选择颜色

// 验证
await expectOnHomePage(page);          // 验证在首页
await expectOnRoomPage(page);          // 验证在房间页
await expectOnGamePage(page);          // 验证在游戏页
```

### 多玩家测试

```typescript
import { createMultiPlayerContext, cleanupMultiPlayerContext } from './utils/test-helpers';

test('多人游戏', async ({ browser }) => {
  const contexts = await createMultiPlayerContext(browser, [
    { nickname: '玩家1' },
    { nickname: '玩家2' },
    { nickname: '玩家3' },
  ]);
  
  try {
    // 测试代码...
  } finally {
    await cleanupMultiPlayerContext(contexts);
  }
});
```

## 🐛 调试技巧

### 1. 使用 headed 模式

```bash
npx playwright test --headed
```

### 2. 使用 UI 模式

```bash
npx playwright test --ui
```

### 3. 暂停调试

```typescript
test('示例', async ({ page }) => {
  await page.goto('/');
  await page.pause();  // 暂停执行
});
```

### 4. 慢动作模式

```bash
npx playwright test --headed --slowmo 1000
```

### 5. 保留浏览器状态

```typescript
test('示例', async ({ page, context }) => {
  // 测试代码...
  
  // 保持浏览器打开
  await page.pause();
});
```

## 📝 编写测试的最佳实践

### 1. 使用数据属性选择器

```html
<!-- 推荐 -->
<button data-testid="create-room-btn">创建房间</button>

<!-- 避免 -->
<button class="btn-primary">创建房间</button>
```

### 2. 等待元素可见

```typescript
// 推荐
await page.locator('[data-testid="room-code"]').waitFor({ state: 'visible' });

// 避免
await page.waitForTimeout(3000);
```

### 3. 清理资源

```typescript
test('示例', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    // 测试代码...
  } finally {
    await context.close();
  }
});
```

### 4. 使用辅助函数

```typescript
// 推荐
await createRoom(page, '房主');

// 避免
await page.goto('/');
await page.fill('input[placeholder="昵称"]', '房主');
await page.click('button:has-text("创建房间")');
await page.waitForTimeout(3000);
```

## 🔧 故障排除

### 测试超时

增加超时时间：

```typescript
test.setTimeout(120000);
```

### 服务器未启动

检查服务器是否在运行：

```bash
curl http://localhost:3001/health
curl http://localhost:3000
```

### 浏览器未安装

```bash
npx playwright install chromium
```

## 📈 CI/CD 集成

在 GitHub Actions 中使用：

```yaml
- name: Run E2E tests
  run: |
    cd e2e
    npx playwright test
  env:
    CI: true
```

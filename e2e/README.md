# E2E 测试

> UNO Online 端到端测试

---

## 📂 目录结构

```
e2e/
├── tests/              # Playwright 测试（推荐）
│   ├── action-api.spec.ts      # Action API v2.0 测试
│   ├── core-features/          # 核心功能测试
│   ├── game-modes/             # 游戏模式测试
│   ├── regression/             # 回归测试
│   ├── bugs/                   # Bug 修复验证
│   └── utils/                  # 测试工具
│
├── puppeteer/          # Puppeteer 测试（旧版）
│   ├── puppeteer-test.mjs
│   └── puppeteer-full-test.mjs
│
├── scripts/            # 独立测试脚本
│   ├── test-action-api.mjs
│   ├── test-game.mjs
│   ├── test-host.mjs
│   └── ...
│
├── archive/            # 归档文档
│   └── ux-evaluation*.mjs
│
├── playwright.config.ts        # 生产环境配置
├── playwright.config.local.ts  # 本地环境配置
└── package.json
```

---

## 🚀 快速开始

### Playwright 测试（推荐）

```bash
# 安装依赖
npm install

# 运行所有测试
npx playwright test

# 运行特定测试
npx playwright test tests/action-api.spec.ts

# 本地环境测试
npx playwright test --config=playwright.config.local.ts
```

### 独立测试脚本

```bash
# 需要服务器运行在 localhost:3001
node scripts/test-game.mjs
node scripts/test-host.mjs
```

---

## 📝 测试分类

### 1. Playwright 测试 (`tests/`)

| 目录 | 说明 |
|------|------|
| `action-api.spec.ts` | Action API v2.0 完整测试 |
| `core-features/` | 核心功能（托管、聊天等） |
| `game-modes/` | 游戏模式（经典、Out） |
| `regression/` | 回归测试 |
| `bugs/` | Bug 修复验证 |

### 2. 独立脚本 (`scripts/`)

| 脚本 | 说明 |
|------|------|
| `test-action-api.mjs` | Action API 测试 |
| `test-game.mjs` | 游戏流程测试 |
| `test-host.mjs` | 托管功能测试 |
| `test-bot-auto-play.mjs` | AI 自动出牌测试 |
| `test-hand-cards.mjs` | 手牌显示测试 |
| `test-play-card.mjs` | 出牌功能测试 |

---

## ⚙️ 配置文件

| 文件 | 用途 |
|------|------|
| `playwright.config.ts` | 生产环境配置 (GitHub Pages) |
| `playwright.config.local.ts` | 本地开发配置 (localhost:4173) |

---

## 📊 测试报告

测试报告和截图保存在 `test-results/` 目录

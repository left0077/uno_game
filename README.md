# UNO Online

> 🎮 在线 UNO 游戏，支持实时多人对战

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%2B-61dafb)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0%2B-black)](https://socket.io/)

---

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/left0077/uno.git
cd uno

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

访问 http://localhost:3000 开始游戏

---

## 📂 项目结构

```
uno/
├── client/           # 🎨 前端 (React + Vite)
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── hooks/        # React Hooks
│   │   └── core/         # 核心逻辑
│   └── dist/             # 构建输出
│
├── server/           # 🖥️ 后端 (Node.js + Socket.IO)
│   ├── src/
│   │   ├── game/         # 游戏逻辑
│   │   ├── socket/       # Socket 处理器
│   │   └── test/         # 单元测试
│   └── tests/            # 独立测试脚本
│
├── e2e/              # 🧪 E2E 测试 (Playwright)
│   ├── tests/            # 主力测试
│   ├── scripts/          # 独立脚本
│   └── puppeteer/        # Puppeteer 测试
│
├── shared/           # 🔗 共享类型定义
│   └── types/
│
└── docs/             # 📚 文档中心
    ├── v1.0/             # v1.0 稳定版文档
    ├── v2.0/             # v2.0 开发版文档
    ├── rules/            # 游戏规则
    └── architecture/     # 架构设计
```

---

## ✨ 核心特性

### v2.0 (当前开发版)
- **Action API v2.0** - 服务器权威的游戏动作接口
- **Out 模式** - 大逃杀玩法，手牌上限 20 张
- **连打系统** - 对子/三条/彩虹/顺子组合出牌
- **彩虹转移** - 将惩罚转移给任意玩家
- **反转反击** - 用反转牌弹回惩罚

### v1.0 (稳定版)
- **经典 UNO** - 标准规则完整实现
- **实时对战** - Socket.IO 低延迟通信
- **多人游戏** - 支持 2-8 人同时游戏
- **房间系统** - 创建/加入房间，支持邀请链接

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + TypeScript + Vite + Tailwind CSS |
| **后端** | Node.js + Express + Socket.IO |
| **测试** | Playwright + 自定义测试框架 |
| **部署** | Docker + GitHub Actions |

---

## 📖 文档导航

### 按版本
- [v2.0 文档](./docs/v2.0/README.md) - Action API v2.0、Out 模式
- [v1.0 文档](./docs/v1.0/README.md) - 经典 UNO、基础架构

### 按主题
- [游戏规则](./docs/rules/README.md) - 经典模式 & Out 模式
- [架构设计](./docs/architecture/README.md) - 系统架构

### 开发相关
- [API 设计](./docs/v2.0/API_DESIGN.md) - Action API v2.0
- [测试计划](./docs/v2.0/TEST_PLAN.md) - 测试策略

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 单元测试
npm run test:unit

# E2E 测试
cd e2e && npx playwright test

# 独立测试脚本
node server/tests/test-game.mjs
```

---

## 🚀 部署

### Docker 部署
```bash
docker build -t uno-server ./server
docker run -p 3001:3001 uno-server
```

### 手动部署
```bash
cd server
npm install
npm run build
npm start
```

---

## 📜 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.0.0 | 2026-03-17 | Action API v2.0、Out 模式 |
| v1.0.0 | 2026-03-15 | 经典 UNO 稳定版 |

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

1. Fork 项目
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

> 💡 **提示**: 项目文档已按版本整理，详情请查看 [docs/](./docs/) 目录

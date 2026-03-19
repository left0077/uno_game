# UNO Online

> 🎮 在线 UNO 游戏，支持 2-8 人实时对战

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%2B-61dafb)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0%2B-black)](https://socket.io/)

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev
```

访问 http://localhost:3000/uno/ 开始游戏

---

## 📂 项目结构

```
uno/
├── client/           # 前端 (React + Vite)
│   ├── src/
│   │   ├── pages/    # 页面组件
│   │   ├── hooks/    # React Hooks
│   │   └── core/     # 核心逻辑
│   └── dist/         # 构建输出
│
├── server/           # 后端 (Node.js + Socket.IO)
│   └── src/
│       ├── game/     # 游戏逻辑
│       ├── socket/   # Socket 处理器
│       └── test/     # 单元测试
│
├── e2e/              # E2E 测试 (Playwright)
│   └── tests/        # 测试文件
│
└── shared/           # 共享类型定义
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node.js + Express + Socket.IO |
| 测试 | Playwright E2E + 后端单元测试 |

---

## ✅ 当前状态

### 已完成
- ✅ Socket 事件命名标准化 (`domain:action` 格式)
- ✅ E2E 测试基础功能全部通过 (11/11)
- ✅ 后端单元测试全部通过
- ✅ 前后端构建通过

### Socket 事件规范
```typescript
// 房间管理
room:create, room:join, room:leave
room:settings, room:start

// 游戏操作
game:play, game:combo, game:draw
game:uno, game:challenge

// AI 管理
ai:add, ai:remove

// 玩家操作
player:host, player:actions

// 聊天
chat:send, chat:message
```

详见 `server/src/shared/index.ts` 中的 `SocketEvents` 枚举。

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# E2E 测试
cd e2e && npx playwright test
```

---

## 📖 文档

- `docs/rules/` - 游戏规则说明
- `docs/architecture/` - 架构设计文档
- `.kimi/workflow.md` - 开发工作流指南

---

## 📝 项目状态

**最后更新**: 2026-03-19
**状态**: 核心功能稳定，E2E 测试通过

# UNO Online

> 在线 UNO 卡牌游戏，支持 2-8 人实时对战，含 Out 大逃杀模式

---

## 快速开始

```bash
npm install
npm run dev
```

- 前端 http://localhost:3000/uno/
- 后端 http://localhost:3001/health

---

## 项目结构

```
uno/
├── client/           # 前端 (React + Vite + Tailwind)
│   └── src/
│       ├── core/     # 服务单例层（无 React 依赖）
│       ├── hooks/    # React 桥接
│       ├── pages/    # HomePage / RoomPage / GamePage
│       ├── components/  # Card, EmojiOverlay, game/
│       └── store/    # Zustand 状态管理
├── server/           # 后端 (Node.js + Socket.IO)
│   └── src/
│       ├── game/core/   # BaseGameModeV2, OutModeV2, PlayerManager, GameClock
│       ├── game/ai/     # AI 三级策略
│       ├── socket/      # SocketHandler
│       ├── rooms/       # RoomManager
│       └── config/      # gameConfig.ts
├── shared/           # 共享类型（前后端统一）
├── e2e/              # E2E 测试 (Playwright)
└── docs/             # 文档中心
```

---

## 两个游戏模式

| | Standard | Out |
|---|---------|-----|
| 规则 | 经典 UNO | 连打 + 淘汰 |
| 手牌上限 | 无 | 20 张 |
| 惩罚卡 | +2, +4 | +2, +3, +4, +5, +8 |
| 连打 | 无 | 对子/三条/彩虹/顺子 |
| 阶段 | 无 | 3/6/9 分钟注入惩罚卡 |
| AI | ✅ | ✅ |

---

## 核心设计

- **服务端权威**：所有规则由服务端计算，客户端只展示
- **策略模式**：`BaseGameModeV2` 定义流程，子类覆写差异
- **游戏时钟**：`GameClock` 每秒 tick 驱动 AI 回合和阶段推进
- **双层推送**：`game:state` 公开广播 + `player:turn` 私密推送

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 测试

```bash
# 服务端单元测试
cd server && npx tsx src/test/index.ts

# E2E 测试
cd e2e && npx playwright test
```

---

## 文档

- [架构文档](docs/ARCHITECTURE.md)
- [规则书](docs/rules/)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)

---

*最后更新：2026-04-30*

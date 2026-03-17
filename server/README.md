# UNO Server

> UNO Online 游戏服务端

---

## 📂 目录结构

```
server/
├── src/                 # 源代码
│   ├── game/           # 游戏逻辑
│   │   ├── modes/      # 游戏模式 (标准/Out)
│   │   ├── ai/         # AI 玩家
│   │   └── UnoGame.ts  # 游戏主类
│   ├── rooms/          # 房间管理
│   ├── socket/         # Socket.IO 处理器
│   ├── shared/         # 共享类型
│   └── test/           # 单元测试
│       ├── action-api/     # Action API 测试
│       ├── integration/    # 集成测试
│       ├── mocks/          # Mock 数据
│       └── unit/           # 单元测试
│
├── tests/              # 独立测试脚本
│   ├── test-action-api.mjs
│   ├── test-game.mjs
│   ├── test-room.mjs
│   └── ...
│
├── dist/               # 编译输出
└── package.json        # 依赖配置
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 编译
npm run build

# 生产模式
npm start

# 运行测试
npm test
```

---

## 🧪 测试

### 单元测试
```bash
npm test
```

### 独立测试脚本
```bash
# Action API 测试
node tests/test-action-api.mjs

# 游戏逻辑测试
node tests/test-game.mjs

# 房间测试
node tests/test-room.mjs
```

---

## 📚 相关文档

- [API 设计](../docs/v2.0/API_DESIGN.md)
- [架构设计](../docs/v1.0/ARCHITECTURE.md)


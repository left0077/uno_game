# UNO Online 文档

---

## 📂 文档结构

```
docs/
├── README.md           # 本文档
├── rules/              # 游戏规则
│   ├── CLASSIC_MODE.md # 经典模式
│   └── out-mode.md     # Out 模式
│
├── architecture/       # 架构设计
│   └── README.md
│
├── v1.0/               # v1.0 稳定版文档
│   └── README.md
│
└── v2.0/               # v2.0 开发文档
    ├── README.md
    └── API_DESIGN.md   # API 设计
```

---

## 🚀 快速入口

| 主题 | 文档 |
|------|------|
| **游戏规则** | [rules/CLASSIC_MODE.md](./rules/CLASSIC_MODE.md) |
| **Out 模式** | [rules/out-mode.md](./rules/out-mode.md) |
| **API 设计** | [v2.0/API_DESIGN.md](./v2.0/API_DESIGN.md) |
| **架构设计** | [architecture/README.md](./architecture/README.md) |

---

## 📝 项目状态

**当前版本**: v2.0  
**最后更新**: 2026-03-19

### 已完成
- ✅ Socket 事件命名标准化
- ✅ E2E 测试基础功能通过
- ✅ 前后端构建稳定

---

## 💡 提示

- 项目根目录的 `README.md` 有快速开始指南
- `AGENTS.md` 是给 AI 的开发指南
- `server/src/shared/index.ts` 定义了 Socket 事件枚举

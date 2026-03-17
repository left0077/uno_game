# UNO Online 文档中心

> 📚 按版本整理的文档索引

---

## 📂 文档结构

```
docs/
└── README.md          # 本文档
│
├── v1.0/              # v1.0 稳定版
├── v2.0/              # v2.0 开发版
├── rules/             # 游戏规则
├── architecture/      # 架构设计
├── bug-fixes/         # Bug修复记录
└── archived/          # 归档文档
```

---

## 🚀 快速入口

| 版本 | 链接 | 说明 |
|------|------|------|
| **v2.0** | [v2.0/README.md](./v2.0/README.md) | 当前开发版本 (Action API v2.0) |
| **v1.0** | [v1.0/README.md](./v1.0/README.md) | 稳定版本 (经典UNO) |

---

## 📦 版本文档

### v2.0 (开发版)
**特性**: Action API v2.0、Out模式、连打系统、彩虹转移

- [API_DESIGN.md](./v2.0/API_DESIGN.md) - Action API v2.0 设计
- [REFACTOR_PLAN.md](./v2.0/REFACTOR_PLAN.md) - 架构重构计划
- [FINAL_DELIVERY_REPORT.md](./v2.0/FINAL_DELIVERY_REPORT.md) - 交付报告
- [单一数据源改造方案](./v2.0/ARCHITECTURE_REFACTOR_SINGLE_SOURCE.md)

### v1.0 (稳定版)
**特性**: 经典UNO、基础架构

- [API.md](./v1.0/API.md) - API 文档
- [ARCHITECTURE.md](./v1.0/ARCHITECTURE.md) - 架构设计
- [GAME_RULES.md](./v1.0/GAME_RULES.md) - 游戏规则

---

## 📚 专题文档

### 游戏规则
- [rules/CLASSIC_MODE.md](./rules/CLASSIC_MODE.md) - 经典模式
- [rules/out-mode.md](./rules/out-mode.md) - Out 模式 (大逃杀)

### 架构设计
- [architecture/GAME_MODE_REFACTOR.md](./architecture/GAME_MODE_REFACTOR.md)
- [architecture/TASKS.md](./architecture/TASKS.md)

### Bug 修复
- [bug-fixes/v1.0.0.md](./bug-fixes/v1.0.0.md)
- [bug-fixes/UI_ISSUES.md](./bug-fixes/UI_ISSUES.md)

---

## 🗺️ 按角色导航

### 开发者
1. 了解架构 → [v1.0/ARCHITECTURE.md](./v1.0/ARCHITECTURE.md)
2. 查看 API → [v2.0/API_DESIGN.md](./v2.0/API_DESIGN.md)
3. 运行项目 → [server/README.md](../server/README.md)

### 游戏设计
1. 游戏规则 → [v1.0/GAME_RULES.md](./v1.0/GAME_RULES.md)
2. Out 模式 → [rules/out-mode.md](./rules/out-mode.md)

---

> 💡 **提示**: 所有文档已按版本整理，根目录仅保留 README.md

---

## 📂 项目目录总览

```
Kimi_Uno/
├── docs/               # 📚 文档中心
│   ├── README.md
│   ├── v1.0/          # v1.0 稳定版文档
│   ├── v2.0/          # v2.0 开发版文档
│   ├── rules/         # 游戏规则
│   ├── architecture/  # 架构设计
│   └── bug-fixes/     # Bug 修复记录
│
├── client/            # 🎨 前端代码
│   └── ...
│
├── server/            # 🖥️ 后端代码
│   ├── README.md
│   ├── src/           # 源代码
│   │   └── test/      # 单元测试
│   └── tests/         # 独立测试脚本
│
├── e2e/               # 🧪 E2E 测试
│   ├── tests/         # Playwright 测试
│   ├── scripts/       # 独立测试脚本
│   └── puppeteer/     # Puppeteer 测试
│
└── shared/            # 🔗 共享类型
    └── ...
```

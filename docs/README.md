# UNO Online 文档中心

## 核心文档（始终准确）

| 文档 | 说明 | 状态 |
|------|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 统一架构文档 + 核心设计原则 | ✅ 当前 |
| [rules/out-mode.md](./rules/out-mode.md) | Out 模式规则书 v2.1 | ✅ 当前 |
| [rules/CLASSIC_MODE.md](./rules/CLASSIC_MODE.md) | 经典 UNO 规则 | ✅ 当前 |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 实施计划（27项修复 + 9项新功能） | ✅ 当前 |
| [TEST_PLAN.md](./TEST_PLAN.md) | E2E 测试计划 | ✅ 当前 |

## 参考文档

| 文档 | 说明 |
|------|------|
| [v2.0/API_DESIGN.md](./v2.0/API_DESIGN.md) | Action API v2.0 接口设计 |
| [v2.0/HARDCODED_VALUES.md](./v2.0/HARDCODED_VALUES.md) | 硬编码值提取记录 |

## 历史文档（_archive）

旧版本文档、已完成的 Bug 追踪、废弃的架构方案均归档至 `_archive/`。

---

## 设计原则（节选）

1. **服务端权威**：所有游戏规则由服务端计算，客户端只展示和交互
2. **策略模式**：`BaseGameModeV2` 模板方法，子类覆写差异
3. **事件驱动 + 游戏时钟**：SocketHandler 处理事件，GameClock 驱动 AI/阶段
4. **双层推送**：`game:state` 公开广播，`player:turn` 私密推送

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

*最后更新：2026-04-30*

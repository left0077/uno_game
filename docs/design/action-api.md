# Action API v2.0 设计（历史草案）

> ⚠️ 此文档是早期设计草案，描述了一个更复杂的 `AvailableActions` 接口（含 `gameId`、`metadata` 等字段），实际实现采用了更简洁的方案。

当前实际协议见 [PROTOCOL.md](../PROTOCOL.md)。

## 与实际的差异

| 设计的 | 实际的 |
|--------|--------|
| `GameMode.getAvailableActions()` 方法 | `calculateAvailableActionsV2()` 在 SocketHandler 中 |
| `AvailableActions` 带 `gameId`、`metadata` | 简化为 `actions[]` 数组在 `player:turn` 中 |
| 客户端 `ComboStarter`、`ComboInfo` 复杂接口 | 简化为 `{ type:'combo', comboType, cardIds, label }` |
| 客户端 `PenaltyOption` 优先级系统 | 简化为 `penalty_info` + 可用动作列表 |

## 以下为原文（保留参考）

---


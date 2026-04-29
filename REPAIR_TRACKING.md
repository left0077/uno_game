# UNO Online 修复记录

## 2026-04-29 — 文档和架构整理

- ✅ Out 模式规则书 v2.1（修复矛盾、完善机制、跨类型叠加、反转 ping-pong）
- ✅ 统一架构文档 docs/ARCHITECTURE.md（反映真实实现）
- ✅ 归档旧版本文档（v1.0、旧架构方案）
- ✅ 赌场风格 UI 主题（所有组件统一）
- ✅ TypeScript 编译错误修复（25+ errors）
- ✅ SocketClient 事件类型补全（12 个缺失事件）
- ✅ RoomSettings 扩展（initialCards、maxPlayers）

## 当前状态

| 项目 | 状态 |
|------|------|
| 客户端 TypeScript | ✅ 通过（不含测试文件） |
| 服务端 TypeScript | ✅ 通过 |
| 服务端单元测试 | ✅ 4/4 通过 |
| 客户端单元测试 | ❌ vitest 未安装 |
| E2E 测试 | ⚠️ 配置完整，待跑通 |

## P0 Bug（待修复）

| Bug | 文件 | 描述 |
|-----|------|------|
| 叠加不生效 | BaseGameModeV2.ts:454 | applyDrawEffect 只在 pendingDraw 为空时初始化 |
| 摸牌忽略累积惩罚 | BaseGameModeV2.ts:293 | executeDraw 永远只摸 1 张 |
| 跳过效果无效 | BaseGameModeV2.ts:435 | skippedPlayerId 设置但从未使用 |
| AI 不被触发 | SocketHandler.ts | AIPlayer 导入但从未调用 |

## 规则 vs 代码差距

| 规则 | 代码 | 状态 |
|------|------|------|
| 阶段=时间触发 3/6/9min | 阶段=手牌数触发 | ❌ 待对齐 |
| 手牌上限=固定20 | 手牌上限=递减 12→10→8→6 | ❌ 待对齐 |
| 连打不产生惩罚 | 连打产生 COMBO_PENALTY | ❌ 待对齐 |
| 惩罚卡注入 +3/+5/+8 | 无注入机制 | ❌ 待实现 |
| 跨类型叠加 | 叠加不生效 | ❌ 待修复 |
| 反转 ping-pong | 反转不弹回惩罚 | ❌ 待实现 |
| 惩罚响应=自主选择 | 有优先级表（代码中未使用） | ⚠️ 调整 |

---

*最后更新：2026-04-29*

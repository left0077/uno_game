# UNO Online 实施计划

> 2026-04-30

---

## 已完成 ✅

### Phase 1-5：核心引擎修复
- 服务端数据结构统一（GameStateV2, PlayerManager 去重）
- 引擎 Bug 修复（叠加累加、跳过生效、挑战验证、ActionResult）
- OutModeV2 重写（连打、固定20上限、回合检查）
- GameClock + AI 触发 + 惩罚卡注入
- Socket/客户端数据流（player:turn 合并推送）

### 额外完成
- AI 表情系统修复（AIPlayer.onSendEmoji 接入 + EmojiOverlay 显示）
- StandardModeV2 实现
- 惩罚响应系统（反转弹回 + 跨类型叠加）
- 全局阶段计时器（PhaseTimer 组件）
- UI 优化（移动端控制栏、TurnHint、颜色弹窗）
- 服务端连打检测（detectCombos → player:turn 推送）
- 文档整理（统一架构、归档旧版、AGENTS 更新）
- AI 昵称升级
- AI 出牌逻辑优化（过滤可出牌）

---

## 待完成 ⬜

### 功能接入
| # | 任务 | 预估 |
|---|------|------|
| F1 | ComboSelectorV2 接入 GamePage（连打选择 UI） | 2h |
| F2 | PenaltyResponsePanel 接入惩罚响应流 | 2h |
| F3 | 游戏结束排名展示（RoomPage/GamePage） | 0.5h |
| F4 | Jump In 抢牌 | 1h |
| F5 | 断线重连恢复控制权 | 1h |

### 测试
| # | 任务 | 预估 |
|---|------|------|
| T1 | E2E 测试选择器修复（18 文件） | 2h |
| T2 | 新增 E2E 测试（AI 回合、惩罚、连打、阶段） | 3h |
| T3 | 客户端单测（vitest + GameEngine test） | 2h |

---

## 预估总计

功能接入 ~6.5h | 测试 ~7h | **合计 ~13.5h**

# UNO 游戏模式架构重构设计文档

> 版本: 1.0  
> 日期: 2026-03-16  
> 状态: 进行中

---

## 一、重构背景

### 1.1 当前问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 代码重复 | OutMode 复制了 StandardMode 70% 逻辑 | 🔴 高 |
| 硬编码判断 | 各处散布 `mode === 'out'` 条件 | 🔴 高 |
| 职责混乱 | OutSystem 和 OutMode 重复处理阶段 | 🟡 中 |
| 缺乏扩展性 | 新增模式需要修改多处代码 | 🟡 中 |

### 1.2 设计目标

1. **单一职责**: 每个模式只处理自己的特有逻辑
2. **开闭原则**: 新增模式无需修改现有代码
3. **DRY**: 消除重复代码
4. **可测试性**: 各组件可独立测试

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      UnoGame                                 │
│                   (游戏流程控制器)                            │
│  - 回合管理 / 计时器 / AI协调 / 状态同步                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ 委托游戏逻辑
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    GameMode (接口)                           │
│  initialize() / validateAction() / executeAction()           │
│  getAvailableActions() / checkWinCondition()                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ 继承 / 实现
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ BaseGameMode │ │   OutMode    │ │  FutureMode  │
│  (标准规则)   │ │ (连打+淘汰)  │ │   (扩展)     │
└──────────────┘ └──────────────┘ └──────────────┘
         │             │
         │ 继承        │ 继承
         └─────────────┘
```

### 2.2 服务端架构

#### 2.2.1 核心接口

```typescript
// GameMode.ts
interface GameMode {
  readonly name: string;
  readonly description: string;
  
  initialize(room: Room): GameState;
  validateAction(state, action, playerId): ValidationResult;
  executeAction(state, action, playerId): GameState;
  getAvailableActions(state, playerId): GameAction[];
  checkWinCondition(state): string | null;
  onTurnEnd(state, playerId): GameState;
  destroy?(): void;
}
```

#### 2.2.2 类层次

| 类 | 职责 | 状态 |
|----|------|------|
| `BaseGameMode` | 标准UNO规则实现 | ✅ 已完成 |
| `OutMode` | 继承BaseGameMode，添加连打/淘汰/阶段 | ✅ 已完成 |
| `GameModeFactory` | 模式注册和创建 | ✅ 已完成 |

### 2.3 客户端架构

#### 2.3.1 渲染器模式

```
┌─────────────────────────────────────────────────────────┐
│              GameModeRenderer (接口)                     │
│  renderStatusBar() / renderHandArea()                   │
│  renderControls() / detectCombos()                      │
└─────────────────────┬───────────────────────────────────┘
                      │ 实现
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ StandardMode │ │   OutMode    │ │  FutureMode  │
│  Renderer    │ │  Renderer    │ │  Renderer    │
└──────────────┘ └──────────────┘ └──────────────┘
```

#### 2.3.2 组件职责

| 组件 | 职责 | 状态 |
|------|------|------|
| `GameModeRenderer` | UI渲染抽象接口 | ✅ 已完成 |
| `useGameMode` Hook | 封装模式逻辑 | ✅ 已完成 |
| `StandardModeRenderer` | 标准模式渲染 | ✅ 已完成 |
| `OutModeRenderer` | Out模式渲染（含连打检测） | ✅ 已完成 |
| `Game.tsx` | 整合渲染器，处理交互 | 🔄 待重构 |

---

## 三、重构任务清单

### 3.1 服务端任务

| 任务 | 文件 | 工作量 | 状态 |
|------|------|--------|------|
| 创建 BaseGameMode | `server/src/game/modes/BaseGameMode.ts` | M | ✅ |
| 重构 OutMode 继承 BaseGameMode | `server/src/game/modes/OutMode.ts` | L | ✅ |
| 清理冗余文件 | 删除 StandardMode.ts, OutSystem.ts 等 | S | ✅ |
| 更新 UnoGame 使用工厂 | `server/src/game/UnoGame.ts` | S | ✅ |
| 编译验证 | `npm run build` | S | ✅ |

### 3.2 客户端任务

| 任务 | 文件 | 工作量 | 状态 |
|------|------|--------|------|
| 创建 GameModeRenderer 接口 | `client/src/game/GameModeRenderer.ts` | M | ✅ |
| 创建 useGameMode Hook | `client/src/hooks/useGameMode.ts` | S | ✅ |
| 重构 Game.tsx 使用 Hook | `client/src/pages/Game.tsx` | L | 🔄 |
| 分离模式特定组件 | 创建 OutStatusBar, ComboSelector 等 | M | ⏳ |
| 编译验证 | `npm run build` | S | ⏳ |

### 3.3 测试任务

| 任务 | 说明 | 状态 |
|------|------|------|
| 标准模式测试 | 确保标准模式功能正常 | ⏳ |
| Out模式测试 | 测试连打、淘汰、阶段推进 | ⏳ |
| AI测试 | 验证AI在各模式下的行为 | ⏳ |

---

## 四、详细设计

### 4.1 连打系统 (Combo System)

#### 规则
- **对子**: 2张同数字，无特殊效果
- **三条**: 3张同数字，下家跳过1回合
- **彩虹**: 4张同数字不同颜色，+3并可转移惩罚
- **顺子**: 3+张同色连续数字，下家摸 N-2 张

#### 实现
```typescript
// 检测连打
function detectCombos(cards: Card[]): Combo[] {
  // 按数字分组检测对子/三条/彩虹
  // 按颜色分组检测顺子
}
```

### 4.2 惩罚响应优先级

```
当玩家被+牌惩罚时，响应优先级：
1. 彩虹转移 (最高)
2. 反转反击
3. 跟+继续叠加
4. 接受惩罚 (最低)
```

### 4.3 阶段推进 (Out Mode)

```
Phase 0: 开局 (0-4分钟)
  └─ 无惩罚卡
Phase 1: (3-7分钟累计)
  └─ 注入 +3 牌
Phase 2: (5-10分钟累计)
  └─ 注入 +5 牌
Phase 3: (6-10分钟累计)
  └─ 注入 +8 牌
```

---

## 五、扩展指南

### 5.1 添加新模式

#### 服务端

```typescript
// 1. 创建模式类
class MyMode extends BaseGameMode {
  readonly name = 'mymode';
  
  protected onInitialize(state, room) {
    // 特有初始化
  }
}

// 2. 注册模式
GameModeFactory.register('mymode', MyMode);
```

#### 客户端

```typescript
// 1. 创建渲染器
class MyModeRenderer implements GameModeRenderer {
  readonly name = 'mymode';
  
  renderStatusBar(props) { /* ... */ }
}

// 2. 注册渲染器
GameModeRendererFactory.register('mymode', MyModeRenderer);
```

### 5.2 注意事项

1. **不要**在 BaseGameMode 中添加模式特有逻辑
2. **不要**在组件中硬编码模式判断，使用渲染器
3. **必须**为新模式添加测试
4. **应该**复用已有的 ComboDefinition 等类型

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构引入Bug | 游戏功能异常 | 1. 保留旧代码备份 2. 分阶段重构 3. 充分测试 |
| 性能下降 | 连打检测变慢 | 使用 useMemo 缓存检测结果 |
| 复杂度增加 | 新开发者难理解 | 完善文档，添加代码注释 |

---

## 七、验收标准

- [ ] 服务端编译无错误
- [ ] 客户端编译无错误
- [ ] 标准模式游戏正常
- [ ] Out模式连打功能正常
- [ ] Out模式淘汰机制正常
- [ ] Out模式阶段推进正常
- [ ] AI在各模式下正常运作
- [ ] 新增模式可在5分钟内完成（测试）

---

**维护者**: Kimi Code  
**最后更新**: 2026-03-16

# UNO 游戏模式架构重构文档

## 文档导航

| 文档 | 说明 |
|------|------|
| [GAME_MODE_REFACTOR.md](./GAME_MODE_REFACTOR.md) | 架构设计文档 - 整体架构、接口设计、扩展指南 |
| [TASKS.md](./TASKS.md) | 子任务清单 - 详细分解的7个子任务 |

## 快速开始

### 1. 查看架构设计
阅读 [GAME_MODE_REFACTOR.md](./GAME_MODE_REFACTOR.md) 了解：
- 重构背景和目标
- 服务端/客户端架构设计
- 连打系统、惩罚响应、阶段推进设计
- 如何添加新模式

### 2. 查看任务清单
阅读 [TASKS.md](./TASKS.md) 了解：
- 7个详细子任务
- 每个任务的规格、验收标准
- 时间线规划
- 测试目录结构

## 目录结构

### 源码目录

```
client/src/
├── core/                    # 重构后的核心游戏逻辑
│   ├── modes/              # 游戏模式渲染器
│   └── hooks/              # 游戏模式Hook
├── components/             # UI组件
├── hooks/                  # React Hooks
└── pages/                  # 页面

server/src/
├── game/                   # 重构后的游戏逻辑
│   ├── modes/             # 游戏模式
│   ├── ai/                # AI逻辑
│   └── index.ts           # 统一导出
├── rooms/                 # 房间管理
└── socket/                # Socket处理器
```

### 测试目录

```
e2e/tests/
├── utils/                 # 测试工具
├── game-modes/           # 游戏模式测试
├── core-features/        # 核心功能测试
└── regression/           # 回归测试
```

## 开发流程

1. **先阅读架构设计** - 理解整体架构
2. **按顺序执行任务** - 从子任务1开始
3. **每个任务完成后验收** - 对照验收标准
4. **最后执行E2E测试** - 确保整体功能正常

## 关键设计原则

1. **单一职责** - 每个模式只处理自己的特有逻辑
2. **开闭原则** - 新增模式无需修改现有代码
3. **DRY** - 消除重复代码
4. **可测试性** - 各组件可独立测试

## 扩展新模式

### 服务端
```typescript
class MyMode extends BaseGameMode {
  readonly name = 'mymode';
  protected onInitialize(state, room) { /* ... */ }
}
GameModeFactory.register('mymode', MyMode);
```

### 客户端
```typescript
class MyModeRenderer implements GameModeRenderer {
  readonly name = 'mymode';
  renderStatusBar(props) { /* ... */ }
}
GameModeRendererFactory.register('mymode', MyModeRenderer);
```

---

**维护者**: Kimi Code  
**最后更新**: 2026-03-16

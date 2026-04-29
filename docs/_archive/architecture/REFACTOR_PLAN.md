# v2.0 架构重构计划

## 目标
建立服务端权威的出牌验证架构，彻底消除前后端规则不一致问题。

## 版本管理策略

### 分支策略
```
main (稳定版 v1.x)
  └── refactor/v2.0-server-authority (重构分支)
       ├── feature/action-api-redesign
       ├── feature/client-action-refactor
       ├── feature/test-suite
       └── feature/integration-tests
```

### 提交规范
```
type(scope): subject

[type]
- feat: 新功能
- refactor: 重构
- test: 测试
- docs: 文档
- fix: 修复

[scope]
- server/action-api
- client/game-logic
- shared/types
- test/unit
- test/e2e
```

## 重构阶段

### Phase 1: 架构设计（当前）
- [x] 问题分析
- [x] 新架构设计
- [ ] 接口详细设计
- [ ] 测试策略设计

### Phase 2: 服务端重构
- [ ] 定义新的 Action API 接口
- [ ] 重构 BaseGameMode.getAvailableActions
- [ ] 重构 OutMode.getAvailableActions
- [ ] 添加详细日志
- [ ] 单元测试

### Phase 3: 客户端重构
- [ ] 创建 useGameActions hook
- [ ] 重构 Game.tsx 移除硬编码规则
- [ ] 新的 UI 组件（PenaltyResponsePanel, ComboSelector）
- [ ] 集成测试

### Phase 4: 共享类型
- [ ] 更新 shared/types.ts
- [ ] 添加 Action API 类型

### Phase 5: 测试验证
- [ ] 编写完整测试套件
- [ ] E2E 测试
- [ ] 性能测试

### Phase 6: 文档和交付
- [ ] API 文档
- [ ] 重构日志
- [ ] 回滚方案

## 核心架构

### 数据流
```
┌─────────────┐      getAvailableActions      ┌─────────────┐
│   Client    │ ─────────────────────────────> │   Server    │
│             │                                  │             │
│  ┌───────┐  │      AvailableActions          │  ┌───────┐  │
│  │  UI   │  │ <───────────────────────────── │  │ Rules │  │
│  └───────┘  │                                  │  └───────┘  │
│      ↑      │                                  │      ↑      │
│      │      │                                  │      │      │
│  ┌───────┐  │                                  │  ┌───────┐  │
│  │Hooks  │  │                                  │  │Modes  │  │
│  └───────┘  │                                  │  └───────┘  │
└─────────────┘                                  └─────────────┘
```

### 关键接口

```typescript
// 服务端返回的完整可用动作
interface AvailableActions {
  version: '2.0';
  timestamp: number;
  playerId: string;
  
  // 状态提示
  state: {
    type: 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target' | 'eliminated';
    message: string;
    pendingDraw?: number;
    pendingDrawType?: 'draw2' | 'draw4';
    timeout?: number;
  };
  
  // 单张可出牌
  playableCards: PlayableCardInfo[];
  
  // 连打启动牌（可作为连打第一张的牌）
  comboStarters: ComboStarterInfo[];
  
  // 惩罚响应选项（被+时）
  penaltyResponses: PenaltyResponseOption[];
  
  // 摸牌选项
  draw: {
    canDraw: boolean;
    reason?: 'optional' | 'no_playable' | 'penalty' | 'forced';
    count?: number;
  };
  
  // 其他动作
  otherActions: OtherActionOption[];
}

interface PlayableCardInfo {
  cardId: string;
  card: Card;
  reasons: PlayReason[];
  effects: string[];
  requiresColorSelect?: boolean;
}

interface PlayReason {
  type: 'color_match' | 'value_match' | 'wild' | 'stack' | 'combo_first';
  description: string;
}

interface ComboStarterInfo {
  cardId: string;
  card: Card;
  possibleCombos: PossibleCombo[];
}

interface PossibleCombo {
  type: 'pair' | 'three' | 'rainbow' | 'straight';
  name: string;
  requiredCards: string[]; // 还需要的牌ID
  missingCards: string[]; // 手牌中缺少的（用于提示）
  effect: string;
  risk: 'low' | 'medium' | 'high';
}

interface PenaltyResponseOption {
  type: 'rainbow' | 'reverse' | 'stack' | 'combo' | 'accept';
  priority: number;
  cardIds?: string[];
  description: string;
  effect: string;
  risk: string;
}

interface OtherActionOption {
  type: 'call_uno' | 'challenge' | 'jump_in';
  canDo: boolean;
  reason?: string;
}
```

## 测试策略

### 单元测试矩阵
| 场景 | 正常回合 | 被+2 | 被+4 | 彩虹转移 | 反转 |
|------|---------|------|------|---------|------|
| 有可出牌 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 无可出牌 | ✓ | ✓ | ✓ | - | - |
| 可连打 | ✓ | ✓ | ✓ | - | - |
| 可跟+ | - | ✓ | ✓ | - | - |
| 手牌危险 | ✓ | ✓ | ✓ | ✓ | ✓ |

### E2E 测试场景
1. 完整游戏流程
2. +2累积链
3. +4累积链
4. 彩虹转移
5. 反转反击
6. 连打响应惩罚
7. 超时处理
8. 托管切换

## 风险与回滚

### 风险点
1. 网络延迟导致UI卡顿
2. 状态不同步
3. 向后兼容性问题

### 缓解措施
1. 乐观更新 + 本地缓存
2. 状态版本控制
3. 保持v1.x接口兼容

### 回滚方案
```bash
# 紧急回滚到v1.x
git checkout main
git branch -D refactor/v2.0-server-authority
npm run build
npm start
```

## 验收标准

### 功能验收
- [ ] 所有v1.x功能正常工作
- [ ] 连打响应惩罚功能正常
- [ ] 前后端规则完全一致
- [ ] 所有测试通过

### 性能验收
- [ ] API响应时间 < 50ms
- [ ] 前端渲染无卡顿
- [ ] 内存占用合理

### 代码质量
- [ ] 代码覆盖率 > 80%
- [ ] 无TypeScript错误
- [ ] ESLint无警告
- [ ] 代码复杂度 < 10

## 时间线

| 阶段 | 预计时间 | 负责人 |
|------|---------|--------|
| Phase 1 | 2h | Kimi |
| Phase 2 | 4h | SubAgent A |
| Phase 3 | 4h | SubAgent B |
| Phase 4 | 1h | Kimi |
| Phase 5 | 4h | SubAgent C |
| Phase 6 | 1h | Kimi |
| **总计** | **16h** | - |

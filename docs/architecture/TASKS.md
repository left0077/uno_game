# 重构子任务清单

---

## 子任务1: 重构 Game.tsx 使用 useGameMode Hook

**负责人**: 前端开发  
**依赖**: useGameMode.ts (已完成)  
**预计耗时**: 2-3小时

### 目标
将 Game.tsx 中的硬编码模式判断替换为 useGameMode Hook 调用。

### 当前代码问题
```typescript
// 硬编码判断 ❌
const isOutMode = room.settings.mode === 'out';

// 硬编码连打检测 ❌
const availableCombos = useMemo(() => {
  if (room.settings.mode !== 'out') return [];
  // 连打检测逻辑...
}, [...]);
```

### 预期修改
```typescript
// 使用 Hook ✅
const { 
  isOutMode, 
  availableCombos, 
  detectCombos,
  getActionHint 
} = useGameMode(room, gameState);
```

### 修改点清单
- [ ] 导入 useGameMode hook
- [ ] 替换 `room.settings.mode === 'out'` 判断
- [ ] 替换连打检测逻辑
- [ ] 替换阶段倒计时计算
- [ ] **修复禁止出牌提示不消失的Bug** ⭐
  - 问题：提示组件状态管理不当
  - 解决：使用Effect监听游戏状态变化，在回合切换/摸牌后自动隐藏
- [ ] 验证功能正常

### 验收标准
1. Game.tsx 中无 `mode === 'out'` 硬编码
2. 连打功能正常工作
3. 阶段倒计时正常显示
4. 编译无错误

---

## 子任务2: 分离模式特定UI组件

**负责人**: 前端开发  
**依赖**: 子任务1完成  
**预计耗时**: 3-4小时

### 目标
将 Game.tsx 拆分为模式无关组件 + 模式特定组件。

### 组件拆分计划

```
client/src/components/game/
├── GameBoard.tsx          # 游戏主面板 (模式无关)
├── PlayerHand.tsx         # 手牌区域 (模式无关)
├── GameControls.tsx       # 控制按钮 (模式无关)
├── GameStatusBar.tsx      # 状态栏容器
│   ├── StandardStatus.tsx # 标准模式状态
│   └── OutStatus.tsx      # Out模式状态 (阶段/倒计时)
├── ComboSelector.tsx      # 连打选择器
│   └── ComboCard.tsx      # 连打牌项
└── TargetSelector.tsx     # 彩虹目标选择
```

### 文件创建清单

#### OutStatus.tsx
```typescript
interface OutStatusProps {
  phase: number;
  countdown: number;
  maxCards: number;
}
export function OutStatus({ phase, countdown, maxCards }: OutStatusProps) {
  // 显示阶段和倒计时
}
```

#### ComboSelector.tsx
```typescript
interface ComboSelectorProps {
  combos: Array<{type: string; name: string; cardIds: string[]}>;
  selectedCards: string[];
  onSelectCombo: (combo: Combo) => void;
}
export function ComboSelector({ combos, selectedCards, onSelectCombo }: ComboSelectorProps) {
  // 连打选择UI
}
```

### 验收标准
1. Game.tsx 行数从 900+ 减少到 400 以内
2. 各组件职责单一
3. 模式特定逻辑封装在对应组件
4. 编译无错误

---

## 子任务3: 整理测试目录结构

**负责人**: 测试工程师  
**预计耗时**: 30分钟

### 服务端测试目录整理

```
server/src/test/
├── README.md              # 测试规范文档
├── test-runner.ts         # 测试运行器
├── mocks/                 # 模拟数据
│   ├── mock-game.ts
│   └── mock-players.ts
├── unit/                  # 单元测试
│   ├── game/
│   │   └── Card.test.ts
│   ├── modes/
│   │   ├── BaseGameMode.test.ts
│   │   └── OutMode.test.ts
│   ├── ai/
│   │   └── AIPlayer.test.ts
│   └── rooms/
│       └── RoomManager.test.ts
└── integration/           # 集成测试
    └── game-flow.test.ts
```

### E2E测试目录整理

```
e2e/tests/
├── utils/
│   └── test-helpers.ts     # 测试工具函数
├── game-modes/             # 游戏模式测试
│   ├── out-mode.spec.ts    # Out模式测试
│   └── game-mode.spec.ts   # 模式切换测试
├── core-features/          # 核心功能测试
│   ├── basic.spec.ts       # 基础流程
│   ├── core-game.spec.ts   # 核心游戏逻辑
│   ├── gameplay.spec.ts    # 游戏流程
│   ├── uno.spec.ts         # UNO喊话
│   ├── reconnect.spec.ts   # 重连
│   └── hosting.spec.ts     # 托管
└── regression/             # 回归测试
    ├── features.spec.ts
    ├── new-cards.spec.ts
    ├── mobile-ui.spec.ts
    └── timer-test.spec.ts
```

### 需要创建的共享测试工具

```typescript
// e2e/tests/utils/test-helpers.ts
export async function setupGame(page, nickname, options) { ... }
export async function playCard(page, cardSelector) { ... }
export async function drawCard(page) { ... }
export async function callUno(page) { ... }
```

### 验收标准
- [ ] 测试文件按类别放入对应目录
- [ ] 创建 test-helpers.ts 共享工具
- [ ] 更新 playwright 配置中的测试路径
- [ ] 所有测试能正常运行

---

## 子任务4: 创建服务端测试规范与Mock数据

**负责人**: 后端开发  
**预计耗时**: 2小时

### 目标
建立服务端测试规范，创建Mock数据和基础测试。

### 需要创建的文件

#### 1. 测试规范文档
`server/src/test/README.md`
- 测试目录结构说明
- 测试命名规范
- 断言方法说明
- 运行测试命令

#### 2. Mock数据
`server/src/test/mocks/mock-game.ts`
```typescript
export function createMockRoom(overrides?: Partial<Room>): Room
export function createMockPlayer(overrides?: Partial<Player>): Player
export function createMockCard(overrides?: Partial<Card>): Card
export const mockRoom: Room
export const mockPlayers: Player[]
```

#### 3. 单元测试文件
- `server/src/test/unit/modes/BaseGameMode.test.ts`
- `server/src/test/unit/modes/OutMode.test.ts`
- `server/src/test/unit/ai/AIPlayer.test.ts`
- `server/src/test/unit/game/Card.test.ts` (移动已有测试)

### 测试覆盖目标

| 模块 | 目标覆盖率 | 优先级 |
|------|-----------|--------|
| BaseGameMode | 85% | 🔴 高 |
| OutMode | 80% | 🔴 高 |
| AIPlayer | 70% | 🟡 中 |
| CardManager | 90% | 🔴 高 |

### 验收标准
- [ ] 测试目录结构清晰
- [ ] Mock数据可用
- [ ] 所有单元测试通过
- [ ] 测试规范文档完整

---

## 子任务5: 更新 E2E 测试适配新架构

**负责人**: 测试工程师  
**依赖**: 子任务3完成  
**预计耗时**: 2-3小时

### 目标
更新现有 E2E 测试，适配新的架构和目录结构。

### 更新清单

#### 1. 更新导入路径
```typescript
// 更新前
import { test, expect } from '@playwright/test';

// 更新后
import { test, expect } from '@playwright/test';
import { setupGame, playCard, drawCard } from '../utils/test-helpers';
```

#### 2. 重构 out-mode.spec.ts
- [ ] 使用共享的 `setupGame` 替代重复代码
- [ ] 添加连打测试用例
- [ ] 添加淘汰机制测试用例
- [ ] 添加反转反击测试用例

#### 3. 更新 game-mode.spec.ts
- [ ] 添加模式切换测试（标准 <-> Out）
- [ ] 验证不同模式的UI显示

### 新增测试用例

#### Out模式连打测试
```typescript
test('连打-对子', async ({ page }) => {
  await setupGame(page, '连打测试', { aiCount: 1 });
  // 选中两张相同数字的牌
  // 验证显示"对子X ✓"
  // 点击出牌
  // 验证成功
});

test('连打-彩虹转移惩罚', async ({ page }) => {
  await setupGame(page, '彩虹测试', { aiCount: 1 });
  // 等待累积惩罚
  // 出彩虹转移给AI
  // 验证AI摸牌
});

test('反转反击惩罚', async ({ page }) => {
  await setupGame(page, '反击测试', { aiCount: 1 });
  // 等待被+牌
  // 出反转牌
  // 验证惩罚弹回
});
```

### 验收标准
- [ ] 所有测试使用共享工具函数
- [ ] 测试代码重复率 < 20%
- [ ] 新增连打/反击/淘汰测试用例
- [ ] 所有测试通过

---

## 子任务6: 添加客户端单元测试

**负责人**: 测试/前端开发  
**依赖**: 子任务1, 2完成  
**预计耗时**: 2-3小时

### 测试范围

#### 单元测试
```typescript
// client/src/core/modes/__tests__/GameModeRenderer.test.ts
describe('OutModeRenderer', () => {
  test('detectCombos - 检测对子', () => {
    const cards = [/* 红5, 黄5 */];
    const combos = renderer.detectCombos(cards);
    expect(combos).toContainEqual({ type: 'pair', ... });
  });
  
  test('detectCombos - 检测彩虹', () => {
    const cards = [/* 红5, 黄5, 绿5, 蓝5 */];
    const combos = renderer.detectCombos(cards);
    expect(combos).toContainEqual({ type: 'rainbow', ... });
  });
  
  test('detectCombos - 检测顺子', () => {
    const cards = [/* 红3, 红4, 红5 */];
    const combos = renderer.detectCombos(cards);
    expect(combos).toContainEqual({ type: 'straight', ... });
  });
});
```

#### Hook 测试
```typescript
// client/src/core/hooks/__tests__/useGameMode.test.ts
describe('useGameMode', () => {
  test('标准模式返回正确配置', () => {
    // ...
  });
  
  test('Out模式返回连打检测', () => {
    // ...
  });
});
```

### 验收标准
1. useGameMode 测试覆盖率 > 80%
2. GameModeRenderer 测试覆盖率 > 80%
3. 所有测试通过

---

## 子任务7: 端到端测试 - 标准模式

**负责人**: 测试工程师  
**依赖**: 所有开发任务完成  
**预计耗时**: 2小时

### 测试场景

#### 场景1: 基础游戏流程
1. 创建房间
2. 添加1个AI
3. 开始游戏
4. 出几张牌验证正常
5. AI能正常出牌
6. 游戏能正常结束

#### 场景2: 功能牌
1. 测试跳过牌
2. 测试反转牌
3. 测试+2牌
4. 测试万能牌
5. 测试+4牌

#### 场景3: 叠加规则
1. +2叠+2
2. +4叠+4
3. 验证不能混叠

#### 场景4: UNO喊话
1. 出倒数第二张牌
2. 点击UNO按钮
3. 验证不会被质疑

### 验收标准
- 所有场景手动测试通过
- 无明显Bug

---

## 子任务8: 端到端测试 - Out模式

**负责人**: 测试工程师  
**依赖**: 子任务6完成  
**预计耗时**: 3小时

### 测试场景

#### 场景1: 连打系统
1. **对子**
   - 手牌有红5、黄5
   - 选中两张牌
   - 验证显示"对子5 ✓"
   - 点击出牌成功

2. **三条**
   - 手牌有红5、黄5、绿5
   - 选中三张牌
   - 验证显示"三条5 ✓"
   - 点击出牌，下家被跳过

3. **彩虹**
   - 手牌有4色5
   - 选中四张牌
   - 弹出目标选择器
   - 选择目标，目标摸3张

4. **顺子**
   - 手牌有红3、红4、红5
   - 选中三张牌
   - 验证显示"red3-5 ✓"
   - 点击出牌，下家摸1张

#### 场景2: 淘汰机制
1. 通过+牌让某玩家手牌超过20张
2. 验证该玩家被淘汰
3. 验证排名更新

#### 场景3: 反转反击
1. 上家出+2，累积惩罚
2. 出反转牌
3. 验证惩罚弹回给上家

#### 场景4: 阶段推进
1. 等待3-4分钟
2. 验证进入Phase 1
3. 验证+3牌被注入
4. 继续等待验证Phase 2/3

### 🔴 P0 Bug专项测试: 禁止出牌提示不消失

**测试用例1**: 摸牌后提示消失
```typescript
test('禁止出牌提示在摸牌后应该消失', async ({ page }) => {
  await setupGame(page, '测试玩家', { aiCount: 1 });
  await waitForTurn(page);
  
  // 假设当前无牌可出，等待提示出现
  const hint = page.locator('text=无牌可出，点击牌堆摸牌');
  await expect(hint).toBeVisible({ timeout: 5000 });
  
  // 点击摸牌
  await drawCard(page);
  
  // 验证提示消失
  await expect(hint).not.toBeVisible({ timeout: 2000 });
});
```

**测试用例2**: 回合切换后提示消失
```typescript
test('禁止出牌提示在回合切换后应该消失', async ({ page, browser }) => {
  // 创建两个玩家
  const roomCode = await createRoom(page, '玩家1');
  const page2 = await browser.newPage();
  await joinRoom(page2, '玩家2', roomCode);
  
  // 开始游戏
  await addAI(page, 'normal');
  await startGame(page);
  
  // 玩家1回合，假设无牌可出
  await waitForTurn(page);
  const hint = page.locator('text=无牌可出，点击牌堆摸牌');
  
  // 摸牌结束回合
  await drawCard(page);
  
  // 等待玩家2回合
  await waitForTurn(page2);
  
  // 验证玩家1的提示已消失
  await expect(hint).not.toBeVisible({ timeout: 2000 });
  
  await page2.close();
});
```

**测试用例3**: 游戏状态重置后提示消失
```typescript
test('游戏结束后重新开始，提示状态应重置', async ({ page }) => {
  // 完成一局游戏
  await setupGame(page, '测试玩家', { aiCount: 1 });
  // ... 游戏流程
  
  // 点击再来一局
  await page.getByRole('button', { name: /再来一局/i }).click();
  
  // 验证无残留提示
  const hint = page.locator('text=无牌可出');
  await expect(hint).not.toBeVisible();
});
```

### 验收标准
- 所有连打类型工作正常
- 淘汰机制正确
- 反转反击正确
- 阶段推进正确
- **禁止出牌提示在摸牌后消失** ⭐
- **禁止出牌提示在回合切换后消失** ⭐
- **禁止出牌提示在游戏重置后消失** ⭐

---

## 子任务9: 托管功能专项测试

**负责人**: 测试工程师  
**依赖**: 子任务7完成  
**预计耗时**: 2小时

### 功能说明
托管功能允许玩家暂时离开，由AI代打出牌。

### 测试场景

#### 场景1: 开启/关闭托管
```typescript
test('玩家可以开启和关闭托管', async ({ page }) => {
  await setupGame(page, '托管测试', { aiCount: 1 });
  await waitForTurn(page);
  
  // 点击托管按钮
  await page.getByRole('button', { name: /托管/i }).click();
  
  // 验证托管状态显示
  await expect(page.locator('text=托管中')).toBeVisible();
  
  // 等待AI出牌
  await page.waitForTimeout(3000);
  
  // 取消托管
  await page.getByRole('button', { name: /取消托管/i }).click();
  
  // 验证取消成功
  await expect(page.locator('text=托管中')).not.toBeVisible();
});
```

#### 场景2: 托管状态同步
```typescript
test('托管状态应同步给其他玩家', async ({ page, browser }) => {
  const roomCode = await createRoom(page, '玩家1');
  const page2 = await browser.newPage();
  await joinRoom(page2, '玩家2', roomCode);
  
  await addAI(page, 'normal');
  await startGame(page);
  
  // 玩家1开启托管
  await page.getByRole('button', { name: /托管/i }).click();
  
  // 玩家2应看到玩家1的托管标识
  await expect(page2.locator('[data-player-id] .hosting-badge')).toBeVisible();
  
  await page2.close();
});
```

#### 场景3: 托管后自动出牌
```typescript
test('托管后AI应自动出牌', async ({ page }) => {
  await setupGame(page, '自动出牌测试', { aiCount: 1 });
  await waitForTurn(page);
  
  // 记录当前手牌数
  const handCountBefore = await getHandCardCount(page);
  
  // 开启托管
  await page.getByRole('button', { name: /托管/i }).click();
  
  // 等待AI出牌
  await page.waitForTimeout(5000);
  
  // 验证手牌减少（AI出了牌）
  const handCountAfter = await getHandCardCount(page);
  expect(handCountAfter).toBeLessThan(handCountBefore);
});
```

#### 场景4: 断线自动托管
```typescript
test('玩家断线超过2分钟应自动托管', async ({ page }) => {
  await setupGame(page, '断线测试', { aiCount: 1 });
  await waitForTurn(page);
  
  // 模拟断线（关闭页面或断开网络）
  // 实际测试中可以用其他方式模拟
  
  // 等待2分钟
  await page.waitForTimeout(2 * 60 * 1000);
  
  // 验证托管状态
  // 需要重新连接后检查
});
```

#### 场景5: 托管期间重连
```typescript
test('托管期间重连应恢复控制权', async ({ page }) => {
  await setupGame(page, '重连测试', { aiCount: 1 });
  
  // 开启托管
  await page.getByRole('button', { name: /托管/i }).click();
  
  // 刷新页面模拟重连
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // 重新输入昵称加入房间
  await page.getByPlaceholder(/昵称/i).fill('重连测试');
  await page.getByRole('button', { name: /确认/i }).click();
  
  // 验证恢复控制权（托管按钮可点击）
  await expect(page.getByRole('button', { name: /取消托管|托管/i })).toBeEnabled();
});
```

### Bug验证清单
- [ ] AI托管状态不同步
- [ ] 托管后无法取消
- [ ] 托管状态未同步给其他玩家
- [ ] 托管期间手牌对其他玩家可见
- [ ] 断线后未自动托管

### 验收标准
- 托管开启/关闭正常
- 托管状态同步给所有玩家
- 托管后AI能正常出牌
- 取消托管后玩家恢复控制
- 断线2分钟后自动托管
- 重连后恢复控制权

---

## 重点Bug测试清单

以下Bug需在E2E测试中重点验证：

### 🔴 P0 - 阻塞性Bug

| Bug | 描述 | 复现步骤 | 验证方法 | 状态 |
|-----|------|----------|----------|------|
| **禁止出牌提示不消失** | 无牌可出时显示的提示"无牌可出，点击牌堆摸牌"在摸牌后或回合切换后仍不消失 | 1. 进入自己回合且无牌可出<br>2. 看到黄色提示<br>3. 点击摸牌或等待回合切换 | E2E测试验证提示在摸牌后消失 | ⏳ 待修复 |

### 🟡 P1 - 高优先级Bug

| Bug | 描述 | 验证方法 | 状态 |
|-----|------|----------|------|
| **连打选择后无法出牌** | 选中连打牌后点击出牌按钮无响应 | 连打测试用例覆盖 | ⏳ 待验证 |
| **阶段倒计时显示错误** | Out模式倒计时显示负数或跳变 | Out模式倒计时测试 | ⏳ 待验证 |
| **AI托管状态不同步** | 玩家托管/取消托管后UI未更新 | 托管功能测试 | ⏳ 待验证 |
| **托管后无法取消** | 点击取消托管按钮无响应 | 托管功能专项测试 | ⏳ 待验证 |
| **托管状态未同步给其他玩家** | 其他玩家看不到托管标识 | 托管功能专项测试 | ⏳ 待验证 |

### 🟢 P2 - 中优先级Bug

| Bug | 描述 | 验证方法 |
|-----|------|----------|
| **手牌排序不稳定** | 出牌后手牌排序乱跳 | 手牌操作测试 |
| **聊天消息不显示** | 发送表情后其他玩家看不到 | 聊天功能测试 |

---

## 验收任务: 验证所有验收标准

**负责人**: 项目负责人  
**依赖**: 所有子任务完成

### 验收清单

- [ ] 服务端编译无错误
- [ ] 客户端编译无错误
- [ ] 标准模式游戏正常
- [ ] Out模式连打功能正常
- [ ] Out模式淘汰机制正常
- [ ] Out模式阶段推进正常
- [ ] AI在各模式下正常运作
- [ ] 代码审查通过

### 新增模式测试
创建一个新的测试模式，验证扩展性：
- [ ] 5分钟内完成新模式创建
- [ ] 新模式可正常游戏

---

## 时间线

```
Day 1: 子任务1 + 子任务2          # 客户端重构
Day 2: 子任务3 + 子任务4          # 测试目录整理 + 服务端测试
Day 3: 子任务5 + 子任务6          # E2E更新 + 客户端单元测试
Day 4: 子任务7 + 子任务8          # E2E测试
Day 5: 子任务9                   # 托管功能专项测试
Day 6: 验收
```

---

## 测试目录最终结构

```
e2e/
├── playwright.config.ts          # 主配置
├── playwright.config.local.ts    # 本地配置
├── tests/
│   ├── utils/
│   │   └── test-helpers.ts      # 共享工具 ⭐
│   ├── game-modes/               # 游戏模式测试
│   │   ├── out-mode.spec.ts
│   │   └── game-mode.spec.ts
│   ├── core-features/            # 核心功能测试
│   │   ├── basic.spec.ts
│   │   ├── core-game.spec.ts
│   │   ├── gameplay.spec.ts
│   │   ├── uno.spec.ts
│   │   ├── reconnect.spec.ts
│   │   └── hosting.spec.ts       # 需要扩充 ⭐
│   ├── regression/               # 回归测试
│   │   ├── features.spec.ts
│   │   ├── new-cards.spec.ts
│   │   ├── mobile-ui.spec.ts
│   │   └── timer-test.spec.ts
│   └── bugs/                     # Bug回归测试 ⭐ 新增
│       ├── no-card-hint.spec.ts  # 禁止出牌提示Bug
│       └── hosting-sync.spec.ts  # 托管同步Bug
├── test-results/                 # 测试结果
└── README.md                     # E2E测试说明 ⭐ 新增

server/src/test/
├── README.md                     # 测试规范 ⭐
├── index.ts                      # 测试运行入口 ⭐
├── test-runner.ts                # 测试框架 ⭐
├── mocks/
│   └── mock-game.ts              # Mock数据 ⭐
├── unit/                         # 单元测试
│   ├── game/
│   │   └── card.test.ts
│   ├── modes/
│   │   ├── BaseGameMode.test.ts  # ⭐
│   │   └── OutMode.test.ts       # ⭐
│   └── ai/
│       └── AIPlayer.test.ts      # ⭐
└── integration/
    └── game-flow.test.ts         # ⭐
```

---

**最后更新**: 2026-03-16

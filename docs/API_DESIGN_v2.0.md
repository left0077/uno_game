# Action API v2.0 详细设计

## 接口定义

### 1. 服务端接口

```typescript
// server/src/game/modes/GameMode.ts
interface GameMode {
  // ... 现有接口 ...
  
  /**
   * 获取玩家可用的所有动作
   * 这是新架构的核心接口
   */
  getAvailableActions(state: GameState, playerId: string): AvailableActions;
  
  /**
   * 验证动作是否合法
   */
  validateAction(state: GameState, action: GameAction, playerId: string): ValidationResult;
}
```

### 2. 数据类型定义

```typescript
// shared/actionApi.ts

export const ACTION_API_VERSION = '2.0';

export interface AvailableActions {
  version: typeof ACTION_API_VERSION;
  timestamp: number;
  playerId: string;
  gameId: string;
  
  state: GameStateInfo;
  actions: PlayerActions;
  metadata: ActionMetadata;
}

export interface GameStateInfo {
  type: 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target' | 'challenge_window';
  message: string;
  subMessage?: string;
  
  // 倒计时信息
  countdown?: {
    total: number;
    remaining: number;
    warning: boolean;
  };
  
  // 惩罚累积信息
  pendingDraw?: {
    count: number;
    type: 'draw2' | 'draw4';
    canStack: boolean;
    canCombo: boolean;  // 新：可以连打响应
    canReverse: boolean;
    canRainbow: boolean;
  };
}

export interface PlayerActions {
  // 单张出牌
  play: {
    enabled: boolean;
    cards: PlayableCard[];
  };
  
  // 连打
  combo: {
    enabled: boolean;
    starters: ComboStarter[];
  };
  
  // 惩罚响应
  penaltyResponse: {
    enabled: boolean;
    options: PenaltyOption[];
  };
  
  // 摸牌
  draw: {
    enabled: boolean;
    count: number;
    reason: 'optional' | 'forced' | 'penalty' | 'no_options';
    autoDraw?: boolean;  // 是否自动摸牌（如超时）
  };
  
  // 特殊动作
  special: {
    callUno: ActionOption;
    challenge: ActionOption;
    jumpIn: ActionOption;
  };
}

export interface PlayableCard {
  cardId: string;
  card: Card;
  
  // 为什么可以出
  reasons: {
    type: 'color_match' | 'value_match' | 'wild' | 'draw4' | 'stack' | 'combo_first';
    description: string;
    priority: number;
  }[];
  
  // 出牌效果
  effects: {
    type: 'change_color' | 'skip' | 'reverse' | 'draw' | 'stack' | 'combo';
    description: string;
    target?: string;
    value?: number;
  }[];
  
  // 需要额外输入
  requiresInput?: {
    color?: boolean;
    target?: boolean;
  };
  
  // UI提示
  uiHints: {
    highlight?: 'green' | 'yellow' | 'red';
    animation?: 'pulse' | 'glow' | 'shake';
    tooltip?: string;
  };
}

export interface ComboStarter {
  cardId: string;
  card: Card;
  
  // 可能的连打组合
  combos: {
    type: 'pair' | 'three' | 'rainbow' | 'straight';
    name: string;
    
    // 需要的所有牌
    requiredCards: {
      cardId: string;
      card: Card;
      inHand: boolean;  // 是否已在手牌中
    }[];
    
    // 还缺哪些牌
    missingCards: string[];
    
    // 效果
    effect: {
      description: string;
      target?: string;
      value?: number;
    };
    
    // 风险评估
    risk: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
    };
    
    // 推荐度
    recommended: boolean;
    score: number;
  }[];
}

export interface PenaltyOption {
  type: 'rainbow' | 'reverse' | 'stack' | 'combo' | 'accept';
  priority: number;
  
  name: string;
  description: string;
  detailedEffect: string;
  
  // 需要的牌
  requiresCards?: string[];
  
  // 目标选择
  requiresTarget?: {
    type: 'player';
    candidates: {
      playerId: string;
      nickname: string;
      cardCount: number;
      risk: 'safe' | 'risky' | 'dangerous';
    }[];
    recommended?: string;
  };
  
  // 结果预测
  outcome: {
    type: 'transfer' | 'bounce' | 'accumulate' | 'accept';
    value: number;
    description: string;
  };
  
  // UI配置
  ui: {
    icon: string;
    color: string;
    animation?: string;
  };
}

export interface ActionOption {
  enabled: boolean;
  reason?: string;
  cooldown?: number;
}

export interface ActionMetadata {
  // 缓存控制
  cache: {
    ttl: number;  // 缓存时间(ms)
    etag: string; // 版本标识
  };
  
  // 调试信息（开发模式）
  debug?: {
    calculationTime: number;
    rulesChecked: string[];
    source: string;
  };
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  
  // 如果验证成功，返回执行后的状态预览
  preview?: {
    stateChanges: StateChange[];
    notifications: string[];
  };
}

export interface StateChange {
  type: 'card_move' | 'turn_change' | 'penalty_apply' | 'player_eliminate';
  description: string;
  before: unknown;
  after: unknown;
}
```

### 3. 客户端Hook

```typescript
// client/src/hooks/useGameActions.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AvailableActions, PlayableCard, ComboStarter, PenaltyOption } from '../../../shared/actionApi';

interface UseGameActionsReturn {
  // 数据
  actions: AvailableActions | null;
  loading: boolean;
  error: Error | null;
  
  // 便捷访问
  state: AvailableActions['state'] | null;
  playableCards: PlayableCard[];
  comboStarters: ComboStarter[];
  penaltyOptions: PenaltyOption[];
  canDraw: boolean;
  drawCount: number;
  
  // 方法
  refresh: () => Promise<void>;
  playCard: (cardId: string, options?: { color?: string; target?: string }) => Promise<boolean>;
  playCombo: (comboType: string, cardIds: string[], target?: string) => Promise<boolean>;
  respondToPenalty: (optionType: string, options?: any) => Promise<boolean>;
  drawCards: () => Promise<boolean>;
  
  // 工具
  isCardPlayable: (cardId: string) => boolean;
  getCardPlayInfo: (cardId: string) => PlayableCard | undefined;
  getComboOptionsForCard: (cardId: string) => ComboStarter['combos'] | undefined;
}

export function useGameActions(
  gameState: GameState,
  playerId: string
): UseGameActionsReturn {
  // 实现...
}
```

### 4. 状态同步机制

```typescript
// 增量更新而非全量更新
interface ActionUpdate {
  type: 'full' | 'delta';
  timestamp: number;
  etag: string;
  
  // 如果是delta，只包含变化的部分
  changes?: Partial<AvailableActions>;
  
  // 如果是full，包含完整数据
  full?: AvailableActions;
}

// 乐观更新支持
interface OptimisticUpdate {
  id: string;
  action: GameAction;
  predictedState: Partial<GameState>;
  rollback: () => void;
}
```

### 5. 错误处理

```typescript
// 错误码定义
export const ActionErrorCodes = {
  // 玩家状态错误
  NOT_YOUR_TURN: 'E1001',
  PLAYER_ELIMINATED: 'E1002',
  PLAYER_DISCONNECTED: 'E1003',
  
  // 卡牌错误
  CARD_NOT_FOUND: 'E2001',
  CARD_NOT_PLAYABLE: 'E2002',
  CARD_NOT_IN_HAND: 'E2003',
  
  // 规则错误
  INVALID_COMBO: 'E3001',
  FIRST_CARD_MISMATCH: 'E3002',
  CANNOT_STACK: 'E3003',
  MISSING_TARGET: 'E3004',
  MISSING_COLOR: 'E3005',
  
  // 惩罚响应错误
  NO_PENDING_PENALTY: 'E4001',
  INVALID_PENALTY_RESPONSE: 'E4002',
  
  // 系统错误
  STATE_MISMATCH: 'E5001',
  TIMEOUT: 'E5002',
  SERVER_ERROR: 'E5003',
} as const;

// 错误恢复策略
interface ErrorRecovery {
  code: string;
  recoverable: boolean;
  suggestedAction: 'retry' | 'refresh' | 'rollback' | 'ignore';
  message: string;
}
```

## 性能优化

### 1. 服务端优化
- 计算结果缓存（LRU，TTL 1秒）
- 增量计算（只计算变化的部分）
- WebSocket推送而非轮询

### 2. 客户端优化
- 乐观更新（先更新UI，后等待确认）
- 本地缓存（短期缓存，快速响应）
- 防抖（避免频繁请求）

### 3. 网络优化
- 数据压缩
- 增量同步
- 心跳检测

## 安全性

### 1. 验证层
- 所有动作必须经过服务端验证
- 客户端只提供建议，不决定结果
- 状态变更原子性

### 2. 防作弊
- 手牌信息只发给持有者
- 随机数服务端生成
- 操作日志审计

## 向后兼容

```typescript
// 同时支持v1和v2接口
interface GameMode {
  // v1接口（deprecated）
  getAvailableActionsV1?(state: GameState, playerId: string): GameAction[];
  
  // v2接口（推荐）
  getAvailableActions(state: GameState, playerId: string): AvailableActions;
}

// 客户端自动检测版本
function useGameActions(gameState: GameState, playerId: string) {
  const version = gameState.actionApiVersion || '1.0';
  
  if (version === '2.0') {
    return useGameActionsV2(gameState, playerId);
  } else {
    return useGameActionsV1(gameState, playerId); // 降级
  }
}
```

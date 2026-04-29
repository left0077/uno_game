// 此文件内容与 shared/actionApi.ts 保持同步
// 单一数据源：../../../shared/actionApi.ts
// 服务端无法直接 import（rootDir 限制），故保留此副本

export const ACTION_API_VERSION = '2.0';

// ========== 状态描述 ==========

export interface GameStateInfo {
  type: 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target' | 'eliminated';
  message: string;
  pendingDraw?: number;
  pendingDrawType?: 'draw2' | 'draw3' | 'draw4' | 'draw5' | 'draw8';
  timeout?: number;
  turnStartTime: number;
}

// ========== 可出牌信息 ==========

export interface PlayableCard {
  cardId: string;
  reasons: PlayReason[];
  effects: string[];
  requiresColorSelect?: boolean;
}

export interface PlayReason {
  type: 'color_match' | 'value_match' | 'wild' | 'stack' | 'combo_first';
  description: string;
}

// ========== 连打系统 ==========

export type ComboType = 'pair' | 'three' | 'rainbow' | 'straight';

export interface ComboInfo {
  type: ComboType;
  name: string;
  requiredCards: RequiredCard[];
  missingCards: string[];
  effect: ComboEffect;
  risk: ComboRisk;
  score: number;
  recommended: boolean;
}

export interface ComboStarter {
  cardId: string;
  combos: ComboInfo[];
}

export interface RequiredCard {
  cardId: string;
  card: { color: string; value: number };
  inHand: boolean;
}

export interface ComboEffect {
  description: string;
  target?: string;
  drawCount?: number;
  skipNext?: boolean;
}

export interface ComboRisk {
  level: 'low' | 'medium' | 'high';
  factors: string[];
}

// ========== 惩罚响应 ==========

export type PenaltyResponseType = 'stack' | 'rainbow' | 'reverse' | 'combo' | 'accept';

export interface PenaltyOption {
  type: PenaltyResponseType;
  priority: number;
  name: string;
  description: string;
  cardIds?: string[];
  effect: string;
  risk: string;
}

// ========== 动作选项 ==========

export interface ActionOption {
  enabled: boolean;
  reason?: string;
}

// 出牌动作
export interface PlayAction {
  type: 'play';
  playableCards: PlayableCard[];
  canPlayAny: boolean;
  comboStarters: ComboStarter[];
}

// 连打动作
export interface ComboAction {
  type: 'combo';
  availableCombos: ComboInfo[];
  executableCombos: ComboInfo[];
}

// 摸牌动作
export interface DrawAction {
  type: 'draw';
  canDraw: boolean;
  reason?: 'optional' | 'no_playable' | 'penalty' | 'forced';
  count?: number;
}

// 惩罚响应动作
export interface PenaltyResponseAction {
  type: 'penalty_response';
  options: PenaltyOption[];
  pendingCount: number;
}

// 特殊动作
export interface SpecialActions {
  callUno: ActionOption;
  challenge: ActionOption;
  jumpIn: ActionOption & { cardIds?: string[] };
}

// 玩家可执行的所有动作
export interface PlayerActions {
  play: PlayAction;
  combo?: ComboAction;
  draw: DrawAction;
  penaltyResponse?: PenaltyResponseAction;
  special: SpecialActions;
}

// ========== 完整可用动作集合 ==========

export interface AvailableActions {
  version: '2.0';
  timestamp: number;
  playerId: string;
  state: GameStateInfo;
  playerActions: PlayerActions;
  recommendedAction?: {
    type: string;
    priority: number;
    description: string;
  };
}

// V1 兼容格式
export interface AvailableActionsV1 {
  version: '1.0';
  timestamp: number;
  playerId: string;
  actions: Array<{
    type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn' | 'combo';
    cardId?: string;
    cardIds?: string[];
    comboType?: string;
    requiresColor?: boolean;
    enabled: boolean;
    reason?: string;
  }>;
}

// ========== 辅助类型 ==========

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

// 默认可用动作
export const EMPTY_ACTIONS: AvailableActions = {
  version: '2.0',
  timestamp: Date.now(),
  playerId: '',
  state: {
    type: 'normal',
    message: '等待其他玩家操作',
    turnStartTime: Date.now()
  },
  playerActions: {
    play: {
      type: 'play',
      playableCards: [],
      canPlayAny: false,
      comboStarters: []
    },
    draw: {
      type: 'draw',
      canDraw: false
    },
    special: {
      callUno: { enabled: false },
      challenge: { enabled: false },
      jumpIn: { enabled: false }
    }
  }
};

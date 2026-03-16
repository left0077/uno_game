/**
 * Action API v2.0 类型定义
 * 
 * 客户端和服务端共享的类型定义
 */

export const ACTION_API_VERSION = '2.0';

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

// 游戏状态类型
export type GameStateType = 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target' | 'challenge_window' | 'eliminated';

// 出牌原因类型
export type PlayReasonType = 
  | 'color_match' 
  | 'value_match' 
  | 'wild' 
  | 'draw4' 
  | 'stack' 
  | 'combo_first';

// 效果类型
export type EffectType = 
  | 'change_color' 
  | 'skip' 
  | 'reverse' 
  | 'draw' 
  | 'stack' 
  | 'combo';

// 连打类型
export type ComboType = 'pair' | 'three' | 'rainbow' | 'straight';

// 惩罚响应类型
export type PenaltyResponseType = 'rainbow' | 'reverse' | 'stack' | 'combo' | 'accept';

// 摸牌原因
export type DrawReason = 'optional' | 'forced' | 'penalty' | 'no_options';

// 高亮颜色
export type HighlightColor = 'green' | 'yellow' | 'red';

// 动画类型
export type AnimationType = 'pulse' | 'glow' | 'shake';

// 风险等级
export type RiskLevel = 'low' | 'medium' | 'high';

// 目标玩家风险
export type TargetRisk = 'safe' | 'risky' | 'dangerous';

// 结果类型
export type OutcomeType = 'transfer' | 'bounce' | 'accumulate' | 'accept';

// 错误恢复建议
export type RecoveryAction = 'retry' | 'refresh' | 'rollback' | 'ignore';

// 卡牌基础信息
export interface Card {
  id: string;
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4' | 'draw3' | 'draw5' | 'draw8';
  color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
  value: number | string;
}

// 出牌原因
export interface PlayReason {
  type: PlayReasonType;
  description: string;
  priority: number;
}

// 出牌效果
export interface PlayEffect {
  type: EffectType;
  description: string;
  target?: string;
  value?: number;
}

// UI 提示
export interface UIHints {
  highlight?: HighlightColor;
  animation?: AnimationType;
  tooltip?: string;
}

// 可出牌信息
export interface PlayableCard {
  cardId: string;
  card: Card;
  reasons: PlayReason[];
  effects: PlayEffect[];
  requiresInput?: {
    color?: boolean;
    target?: boolean;
  };
  uiHints: UIHints;
}

// 连打需要的卡牌
export interface RequiredCard {
  cardId: string;
  card: Card;
  inHand: boolean;
}

// 连打效果
export interface ComboEffect {
  type: 'draw' | 'skip' | 'transfer' | 'none';
  target: 'next' | 'prev' | 'self' | 'chooser';
  value: number;
  extra?: Record<string, unknown>;
}

// 连打风险
export interface ComboRisk {
  level: RiskLevel;
  factors: string[];
}

// 连打组合
export interface ComboInfo {
  type: ComboType;
  name: string;
  requiredCards: RequiredCard[];
  missingCards: string[];
  effect: {
    description: string;
    target?: string;
    value?: number;
  };
  risk: ComboRisk;
  recommended: boolean;
  score: number;
}

// 连打启动牌
export interface ComboStarter {
  cardId: string;
  card: Card;
  combos: ComboInfo[];
}

// 目标玩家信息
export interface TargetCandidate {
  playerId: string;
  nickname: string;
  cardCount: number;
  risk: TargetRisk;
}

// 惩罚响应目标选择
export interface TargetSelection {
  type: 'player';
  candidates: TargetCandidate[];
  recommended?: string;
}

// 惩罚响应结果
export interface PenaltyOutcome {
  type: OutcomeType;
  value: number;
  description: string;
}

// 惩罚响应选项
export interface PenaltyOption {
  type: PenaltyResponseType;
  priority: number;
  name: string;
  description: string;
  detailedEffect: string;
  requiresCards?: string[];
  requiresTarget?: TargetSelection;
  outcome: PenaltyOutcome;
  ui: {
    icon: string;
    color: string;
    animation?: string;
  };
}

// 通用动作选项
export interface ActionOption {
  enabled: boolean;
  reason?: string;
  cooldown?: number;
}

// 单张出牌动作
export interface PlayAction {
  enabled: boolean;
  cards: PlayableCard[];
}

// 连打动作
export interface ComboAction {
  enabled: boolean;
  starters: ComboStarter[];
}

// 惩罚响应动作
export interface PenaltyResponseAction {
  enabled: boolean;
  options: PenaltyOption[];
}

// 摸牌动作
export interface DrawAction {
  enabled: boolean;
  count: number;
  reason: DrawReason;
  autoDraw?: boolean;
}

// 特殊动作
export interface SpecialActions {
  callUno: ActionOption;
  challenge: ActionOption;
  jumpIn: ActionOption;
}

// 玩家可执行的所有动作
export interface PlayerActions {
  play: PlayAction;
  combo: ComboAction;
  penaltyResponse: PenaltyResponseAction;
  draw: DrawAction;
  special: SpecialActions;
}

// 待摸牌信息
export interface PendingDrawInfo {
  count: number;
  type: 'draw2' | 'draw4' | 'draw3' | 'draw5' | 'draw8';
  canStack: boolean;
  canCombo: boolean;
  canReverse: boolean;
  canRainbow: boolean;
}

// 倒计时信息
export interface CountdownInfo {
  total: number;
  remaining: number;
  warning: boolean;
}

// 游戏状态信息
export interface GameStateInfo {
  type: GameStateType;
  message: string;
  subMessage?: string;
  countdown?: CountdownInfo;
  pendingDraw?: PendingDrawInfo;
}

// 缓存控制
export interface CacheInfo {
  ttl: number;
  etag: string;
}

// 调试信息
export interface DebugInfo {
  calculationTime: number;
  rulesChecked: string[];
  source: string;
}

// 动作元数据
export interface ActionMetadata {
  cache: CacheInfo;
  debug?: DebugInfo;
}

// 状态变更
export interface StateChange {
  type: 'card_move' | 'turn_change' | 'penalty_apply' | 'player_eliminate';
  description: string;
  before: unknown;
  after: unknown;
}

// 验证成功预览
export interface ValidationPreview {
  stateChanges: StateChange[];
  notifications: string[];
}

// 验证错误
export interface ValidationError {
  code: string;
  message: string;
  details?: string;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
  preview?: ValidationPreview;
}

// 错误恢复信息
export interface ErrorRecovery {
  code: string;
  recoverable: boolean;
  suggestedAction: RecoveryAction;
  message: string;
}

// 完整的可用动作信息（v2.0）
export interface AvailableActions {
  version: typeof ACTION_API_VERSION;
  timestamp: number;
  playerId: string;
  gameId: string;
  state: GameStateInfo;
  actions: PlayerActions;
  metadata: ActionMetadata;
}

// v1.0 兼容类型（简化版）
export interface AvailableActionsV1 {
  playableCards: string[];
  canDraw: boolean;
}

// 增量更新
export interface ActionUpdate {
  type: 'full' | 'delta';
  timestamp: number;
  etag: string;
  changes?: Partial<AvailableActions>;
  full?: AvailableActions;
}

// 乐观更新
export interface OptimisticUpdate {
  id: string;
  action: {
    type: string;
    cardId?: string;
    cardIds?: string[];
    [key: string]: unknown;
  };
  predictedState: Partial<{
    hand: Card[];
    discardPile: Card[];
    currentPlayerId: string;
  }>;
  rollback: () => void;
}

// 游戏动作类型
export interface GameAction {
  type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn' | 'combo';
  playerId: string;
  card?: Card;
  cards?: Card[];
  cardIds?: string[];
  color?: string;
  chosenColor?: string;
  comboType?: ComboType;
  targetId?: string;
  timestamp: number;
}

// 连打定义
export interface ComboDefinition {
  readonly type: ComboType;
  readonly name: string;
  readonly minCards: number;
  readonly maxCards?: number;
  validate(cards: Card[]): boolean;
  getEffect(state: unknown, cards: Card[], playerId: string): ComboEffect;
}

/**
 * 创建空的可用动作对象
 */
export function createEmptyActions(playerId: string, gameId: string): AvailableActions {
  const now = Date.now();
  return {
    version: ACTION_API_VERSION,
    timestamp: now,
    playerId,
    gameId,
    state: {
      type: 'normal',
      message: '等待中...',
    },
    actions: {
      play: { enabled: false, cards: [] },
      combo: { enabled: false, starters: [] },
      penaltyResponse: { enabled: false, options: [] },
      draw: { enabled: false, count: 0, reason: 'no_options' },
      special: {
        callUno: { enabled: false },
        challenge: { enabled: false },
        jumpIn: { enabled: false },
      },
    },
    metadata: {
      cache: {
        ttl: 1000,
        etag: `${playerId}-${now}`,
      },
    },
  };
}

/**
 * 创建状态变更记录
 */
export function createStateChange(
  type: StateChange['type'],
  description: string,
  before: unknown,
  after: unknown
): StateChange {
  return { type, description, before, after };
}

/**
 * 创建验证错误
 */
export function createValidationError(
  code: string,
  message: string,
  details?: string
): ValidationResult {
  return {
    valid: false,
    error: { code, message, details },
  };
}

/**
 * 创建验证成功结果
 */
export function createValidationSuccess(
  stateChanges?: StateChange[],
  notifications?: string[]
): ValidationResult {
  return {
    valid: true,
    preview: {
      stateChanges: stateChanges || [],
      notifications: notifications || [],
    },
  };
}

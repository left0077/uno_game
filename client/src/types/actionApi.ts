/**
 * Action API v2.0 客户端类型
 * 
 * 从 shared/actionApi.ts 重新导出类型
 */

export type {
  // 基础类型
  ACTION_API_VERSION,
  ActionErrorCodes,
  GameStateType,
  PlayReasonType,
  EffectType,
  ComboType,
  PenaltyResponseType,
  DrawReason,
  HighlightColor,
  AnimationType,
  RiskLevel,
  TargetRisk,
  OutcomeType,
  RecoveryAction,
  
  // 接口
  Card,
  PlayReason,
  PlayEffect,
  UIHints,
  PlayableCard,
  RequiredCard,
  ComboEffect,
  ComboRisk,
  ComboInfo,
  ComboStarter,
  TargetCandidate,
  TargetSelection,
  PenaltyOutcome,
  PenaltyOption,
  ActionOption,
  PlayAction,
  ComboAction,
  PenaltyResponseAction,
  DrawAction,
  SpecialActions,
  PlayerActions,
  PendingDrawInfo,
  CountdownInfo,
  GameStateInfo,
  CacheInfo,
  DebugInfo,
  ActionMetadata,
  StateChange,
  ValidationPreview,
  ValidationError,
  ValidationResult,
  ErrorRecovery,
  AvailableActions,
  AvailableActionsV1,
  ActionUpdate,
  OptimisticUpdate,
  GameAction,
} from '../../../shared/actionApi';

// 版本检测辅助函数
export const isV2Actions = (actions: unknown): actions is import('../../../shared/actionApi').AvailableActions => {
  if (!actions || typeof actions !== 'object') return false;
  const a = actions as Record<string, unknown>;
  return a.version === '2.0' && 'actions' in a && 'state' in a;
};

export const isV1Actions = (actions: unknown): actions is import('../../../shared/actionApi').AvailableActionsV1 => {
  if (!actions || typeof actions !== 'object') return false;
  const a = actions as Record<string, unknown>;
  return !('version' in a) && 'playableCards' in a && Array.isArray(a.playableCards);
};

// 版本降级辅助类型
export interface LegacyPlayableInfo {
  cardIds: Set<string>;
  canDraw: boolean;
}

// 将 v2 转换为 v1 的辅助函数
export function convertV2ToV1(actions: import('../../../shared/actionApi').AvailableActions): import('../../../shared/actionApi').AvailableActionsV1 {
  return {
    playableCards: actions.actions.play.cards.map(c => c.cardId),
    canDraw: actions.actions.draw.enabled,
  };
}

/**
 * useGameActions Hook
 * 
 * 客户端 Action API v2.0 的核心 Hook
 * - 支持 v1/v2 API 版本自动检测和降级
 * - 乐观更新支持
 * - 错误处理和恢复
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { 
  ExtendedGameState as GameState 
} from '../types';
import type { 
  AvailableActions, 
  PlayableCard, 
  ComboStarter, 
  PenaltyOption,
  GameStateInfo,
  OptimisticUpdate
} from '../../../shared/actionApi';
import { isV2Actions } from '../types/actionApi';

// Hook 返回类型
export interface UseGameActionsReturn {
  // === 数据 ===
  /** 完整的可用动作数据 (v2) */
  actions: AvailableActions | null;

  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  
  // === 便捷访问 ===
  /** 游戏状态信息 */
  state: GameStateInfo | null;
  /** 倒计时信息 */
  countdown: { total: number; remaining: number; warning: boolean } | null;
  /** 可出牌列表 */
  playableCards: PlayableCard[];
  /** 连打启动牌列表 */
  comboStarters: ComboStarter[];
  /** 惩罚响应选项 */
  penaltyOptions: PenaltyOption[];
  /** 是否可以摸牌 */
  canDraw: boolean;
  /** 摸牌数量 */
  drawCount: number;
  /** 是否有待处理的惩罚 */
  hasPendingPenalty: boolean;
  /** 待摸牌数量 */
  pendingDrawCount: number;
  
  // === 方法 ===
  /** 刷新可用动作 */
  refresh: () => Promise<void>;
  /** 出牌 */
  playCard: (cardId: string, options?: { color?: string; target?: string }) => Promise<boolean>;
  /** 连打出牌 */
  playCombo: (comboType: string, cardIds: string[], target?: string) => Promise<boolean>;
  /** 响应惩罚 */
  respondToPenalty: (optionType: string, options?: { cardIds?: string[]; target?: string }) => Promise<boolean>;
  /** 摸牌 */
  drawCards: () => Promise<boolean>;
  
  // === 工具方法 ===
  /** 检查卡牌是否可出 */
  isCardPlayable: (cardId: string) => boolean;
  /** 获取卡牌出牌信息 */
  getCardPlayInfo: (cardId: string) => PlayableCard | undefined;
  /** 获取卡牌的连打选项 */
  getComboOptionsForCard: (cardId: string) => ComboStarter['combos'] | undefined;
  /** 检查卡牌是否为连打启动牌 */
  isComboStarter: (cardId: string) => boolean;
  /** 获取惩罚响应选项 */
  getPenaltyOption: (type: string) => PenaltyOption | undefined;
  
  // === 乐观更新 ===
  /** 是否有正在进行的乐观更新 */
  hasOptimisticUpdate: boolean;
  /** 回滚乐观更新 */
  rollback: () => void;
  
  /** 可出牌ID集合 */
  playableCardIds: Set<string>;
}

// 日志前缀
const LOG_PREFIX = '[GameActions]';

// 模拟 API 调用（实际项目中应该调用真实的 socket 或 API）
const mockApiCall = async <T>(action: string, data: unknown): Promise<T> => {
  console.log(`${LOG_PREFIX} API调用: ${action}`, data);
  // 这里模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true } as T;
};

/**
 * useGameActions Hook
 * 
 * @param gameState - 当前游戏状态
 * @param playerId - 当前玩家ID
 * @param options - 可选配置
 * @param externalActions - 外部传入的可用动作（从 socket 事件获取）
 */
export function useGameActions(
  gameState: GameState | null,
  playerId: string,
  options?: {
    /** 自动刷新间隔(ms)，默认 0 表示不自动刷新 */
    refreshInterval?: number;
    /** 是否启用乐观更新 */
    enableOptimistic?: boolean;
  },
  externalActions?: AvailableActions | null
): UseGameActionsReturn {
  const { refreshInterval = 0, enableOptimistic = true } = options || {};
  
  // === 状态 ===
  const [actions, setActions] = useState<AvailableActions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [optimisticUpdate, setOptimisticUpdate] = useState<OptimisticUpdate | null>(null);
  
  // 用于跟踪最后一次成功的状态，用于回滚
  const lastValidStateRef = useRef<AvailableActions | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  

  
  // === 数据解析 ===
  const parsedActions = useMemo(() => {
    if (!gameState || !playerId) return null;
    
    // 优先使用外部传入的 actions（从 socket 事件获取）
    if (externalActions && isV2Actions(externalActions)) {
      return externalActions;
    }
    
    // 从 gameState.availableActions 获取
    if (gameState.availableActions?.[playerId]) {
      const v2Actions = gameState.availableActions[playerId];
      if (isV2Actions(v2Actions)) {
        return v2Actions;
      }
    }
    
    return null;
  }, [gameState, playerId, externalActions]);
  
  // === 便捷数据访问 ===
  const state = useMemo(() => {
    return actions?.state || null;
  }, [actions]);
  
  const countdown = useMemo(() => {
    return actions?.state?.countdown || null;
  }, [actions]);
  
  const playableCards = useMemo(() => {
    if (!actions) return [];
    return actions.actions.play.cards;
  }, [actions]);
  
  const comboStarters = useMemo(() => {
    if (!actions) return [];
    return actions.actions.combo.starters;
  }, [actions]);
  
  const penaltyOptions = useMemo(() => {
    if (!actions) return [];
    return actions.actions.penaltyResponse.options;
  }, [actions]);
  
  const canDraw = useMemo(() => {
    if (!actions) return false;
    return actions.actions.draw.enabled;
  }, [actions]);
  
  const drawCount = useMemo(() => {
    if (!actions) return 0;
    return actions.actions.draw.count;
  }, [actions]);
  
  const hasPendingPenalty = useMemo(() => {
    if (!actions) return false;
    return actions.state.type === 'pending_draw' && (actions.state.pendingDraw?.count || 0) > 0;
  }, [actions]);
  
  const pendingDrawCount = useMemo(() => {
    if (!actions) return 0;
    return actions.state.pendingDraw?.count || 0;
  }, [actions]);
  
  // === v1 兼容 ===
  const playableCardIds = useMemo(() => {
    if (!actions) return new Set<string>();
    return new Set(actions.actions.play.cards.map(c => c.cardId));
  }, [actions]);
  
  // === 刷新方法 ===
  const refresh = useCallback(async () => {
    if (!gameState || !playerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 实际项目中这里应该调用 API 或 socket
      console.log(`${LOG_PREFIX} 刷新可用动作: playerId=${playerId}`);
      
      // 模拟获取数据
      // const response = await fetchAvailableActions(gameId, playerId);
      
      // 如果有乐观更新，清除它（因为已经拿到最新状态）
      if (optimisticUpdate) {
        console.log(`${LOG_PREFIX} 清除乐观更新`);
        setOptimisticUpdate(null);
      }
      
      // 如果 parsedActions 有值，使用它
      if (parsedActions) {
        setActions(parsedActions);
        lastValidStateRef.current = parsedActions;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`${LOG_PREFIX} 刷新失败:`, error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [gameState, playerId, parsedActions, optimisticUpdate]);
  
  // === 乐观更新管理 ===
  const createOptimisticUpdate = useCallback((actionType: string, data: Record<string, unknown>): OptimisticUpdate => {
    const update: OptimisticUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: { type: actionType, ...data },
      predictedState: {},
      rollback: () => {
        console.log(`${LOG_PREFIX} 回滚乐观更新: ${update.id}`);
        setOptimisticUpdate(null);
        if (lastValidStateRef.current) {
          setActions(lastValidStateRef.current);
        }
      }
    };
    return update;
  }, []);
  
  const rollback = useCallback(() => {
    if (optimisticUpdate) {
      optimisticUpdate.rollback();
    }
  }, [optimisticUpdate]);
  
  // === 出牌方法 ===
  const playCard = useCallback(async (
    cardId: string, 
    options?: { color?: string; target?: string }
  ): Promise<boolean> => {
    console.log(`${LOG_PREFIX} 出牌: cardId=${cardId}`, options);
    
    if (!actions?.actions.play.enabled) {
      console.warn(`${LOG_PREFIX} 当前不能出牌`);
      return false;
    }
    
    const cardInfo = playableCards.find(c => c.cardId === cardId);
    if (!cardInfo) {
      console.warn(`${LOG_PREFIX} 卡牌不可出: ${cardId}`);
      return false;
    }
    
    // 检查是否需要额外输入
    if (cardInfo.requiresInput?.color && !options?.color) {
      console.warn(`${LOG_PREFIX} 需要选择颜色`);
      return false;
    }
    
    let optimistic: OptimisticUpdate | null = null;
    
    try {
      // 乐观更新
      if (enableOptimistic) {
        optimistic = createOptimisticUpdate('play', { cardId, ...options });
        setOptimisticUpdate(optimistic);
        
        // 乐观地从手牌中移除这张牌
        const updatedActions = { ...actions };
        updatedActions.actions.play.cards = playableCards.filter(c => c.cardId !== cardId);
        setActions(updatedActions);
      }
      
      // 实际 API 调用
      await mockApiCall('playCard', { cardId, ...options });
      
      console.log(`${LOG_PREFIX} 出牌成功`);
      return true;
    } catch (err) {
      console.error(`${LOG_PREFIX} 出牌失败:`, err);
      // 回滚
      if (optimistic) {
        optimistic.rollback();
      }
      return false;
    }
  }, [actions, playableCards, enableOptimistic, createOptimisticUpdate]);
  
  // === 连打出牌 ===
  const playCombo = useCallback(async (
    comboType: string, 
    cardIds: string[], 
    target?: string
  ): Promise<boolean> => {
    console.log(`${LOG_PREFIX} 连打出牌: type=${comboType}, cards=${cardIds.join(',')}`, target ? `target=${target}` : '');
    
    if (!actions?.actions.combo.enabled) {
      console.warn(`${LOG_PREFIX} 当前不能连打`);
      return false;
    }
    
    let optimistic: OptimisticUpdate | null = null;
    
    try {
      if (enableOptimistic) {
        optimistic = createOptimisticUpdate('combo', { comboType, cardIds, target });
        setOptimisticUpdate(optimistic);
      }
      
      await mockApiCall('playCombo', { comboType, cardIds, target });
      
      console.log(`${LOG_PREFIX} 连打成功`);
      return true;
    } catch (err) {
      console.error(`${LOG_PREFIX} 连打失败:`, err);
      if (optimistic) {
        optimistic.rollback();
      }
      return false;
    }
  }, [actions, enableOptimistic, createOptimisticUpdate]);
  
  // === 惩罚响应 ===
  const respondToPenalty = useCallback(async (
    optionType: string, 
    options?: { cardIds?: string[]; target?: string }
  ): Promise<boolean> => {
    console.log(`${LOG_PREFIX} 惩罚响应: type=${optionType}`, options);
    
    if (!actions?.actions.penaltyResponse.enabled) {
      console.warn(`${LOG_PREFIX} 当前没有需要响应的惩罚`);
      return false;
    }
    
    const option = penaltyOptions.find(o => o.type === optionType);
    if (!option) {
      console.warn(`${LOG_PREFIX} 无效的惩罚响应选项: ${optionType}`);
      return false;
    }
    
    let optimistic: OptimisticUpdate | null = null;
    
    try {
      if (enableOptimistic) {
        optimistic = createOptimisticUpdate('penaltyResponse', { optionType, ...options });
        setOptimisticUpdate(optimistic);
      }
      
      await mockApiCall('respondToPenalty', { optionType, ...options });
      
      console.log(`${LOG_PREFIX} 惩罚响应成功`);
      return true;
    } catch (err) {
      console.error(`${LOG_PREFIX} 惩罚响应失败:`, err);
      if (optimistic) {
        optimistic.rollback();
      }
      return false;
    }
  }, [actions, penaltyOptions, enableOptimistic, createOptimisticUpdate]);
  
  // === 摸牌 ===
  const drawCards = useCallback(async (): Promise<boolean> => {
    console.log(`${LOG_PREFIX} 摸牌: count=${drawCount}`);
    
    if (!canDraw) {
      console.warn(`${LOG_PREFIX} 当前不能摸牌`);
      return false;
    }
    
    let optimistic: OptimisticUpdate | null = null;
    
    try {
      if (enableOptimistic) {
        optimistic = createOptimisticUpdate('draw', { count: drawCount });
        setOptimisticUpdate(optimistic);
      }
      
      await mockApiCall('drawCards', { count: drawCount });
      
      console.log(`${LOG_PREFIX} 摸牌成功`);
      return true;
    } catch (err) {
      console.error(`${LOG_PREFIX} 摸牌失败:`, err);
      if (optimistic) {
        optimistic.rollback();
      }
      return false;
    }
  }, [canDraw, drawCount, enableOptimistic, createOptimisticUpdate]);
  
  // === 工具方法 ===
  const isCardPlayable = useCallback((cardId: string): boolean => {
    return playableCardIds.has(cardId);
  }, [playableCardIds]);
  
  const getCardPlayInfo = useCallback((cardId: string): PlayableCard | undefined => {
    return playableCards.find(c => c.cardId === cardId);
  }, [playableCards]);
  
  const getComboOptionsForCard = useCallback((cardId: string): ComboStarter['combos'] | undefined => {
    const starter = comboStarters.find(s => s.cardId === cardId);
    return starter?.combos;
  }, [comboStarters]);
  
  const isComboStarter = useCallback((cardId: string): boolean => {
    return comboStarters.some(s => s.cardId === cardId);
  }, [comboStarters]);
  
  const getPenaltyOption = useCallback((type: string): PenaltyOption | undefined => {
    return penaltyOptions.find(o => o.type === type);
  }, [penaltyOptions]);
  
  // === 自动刷新 ===
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshTimerRef.current = setInterval(refresh, refreshInterval);
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [refreshInterval, refresh]);
  
  // === 初始加载 ===
  useEffect(() => {
    if (gameState && playerId) {
      refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playerId]); // 只在 gameState 或 playerId 变化时刷新
  
  // === 更新 actions ===
  useEffect(() => {
    if (parsedActions) {
      setActions(parsedActions);
      lastValidStateRef.current = parsedActions;
    }
  }, [parsedActions]);
  
  return {
    // 数据
    actions,
    loading,
    error,
    
    // 便捷访问
    state,
    countdown,
    playableCards,
    comboStarters,
    penaltyOptions,
    canDraw,
    drawCount,
    hasPendingPenalty,
    pendingDrawCount,
    
    // 方法
    refresh,
    playCard,
    playCombo,
    respondToPenalty,
    drawCards,
    
    // 工具
    isCardPlayable,
    getCardPlayInfo,
    getComboOptionsForCard,
    isComboStarter,
    getPenaltyOption,
    
    // 乐观更新
    hasOptimisticUpdate: !!optimisticUpdate,
    rollback,
    
    playableCardIds,
  };
}

export default useGameActions;

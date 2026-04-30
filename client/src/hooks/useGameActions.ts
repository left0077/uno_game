/**
 * useGameActions - 游戏动作 Hook
 * 
 * 职责：
 * 1. 封装游戏动作（出牌、摸牌、喊UNO等）
 * 2. 验证动作合法性
 * 3. 调用 GameService 执行动作
 * 
 * 修复：
 * - 使用 GameEngine 验证动作合法性
 * - 调用 GameService.executeAction 执行动作
 * - 不再引用不存在的 V2 方法
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { getGameEngine, getGameService } from '../core';
import type { Card, GameState } from '../../../shared/types';

export function useGameActions() {
  const store = useGameStore();
  const engine = getGameEngine();
  const gameService = getGameService();
  
  // 订阅 GameEngine 状态变化
  const [_gameState, setGameState] = useState<GameState | null>(engine.getContext().gameState);
  const [myHand, setMyHand] = useState<Card[]>(engine.getContext().myHand);
  const [availableActions, setAvailableActions] = useState<any[]>(engine.getContext().availableActions);
  
  useEffect(() => {
    const unsubscribe = engine.subscribe((ctx) => {
      setGameState(ctx.gameState);
      setMyHand(ctx.myHand);
      setAvailableActions(ctx.availableActions);
    });
    return unsubscribe;
  }, [engine]);

  /**
   * 出牌
   * @param cardId 卡牌ID
   * @param chosenColor 选中的颜色（用于万能牌）
   * @returns 是否成功
   */
  const playCard = useCallback((cardId: string, chosenColor?: string): boolean => {
    // 使用 Engine 验证动作合法性
    const action = engine.createPlayAction(cardId, chosenColor);
    
    if (!action) {
      console.warn('[useGameActions] Cannot play card:', cardId);
      return false;
    }

    // 更新 UI 状态
    store.setCardSelectionOpen(false);
    
    // 执行动作
    gameService.executeAction(action);
    return true;
  }, [engine, gameService, store]);

  /**
   * 连击出牌
   * @param cardIds 卡牌ID数组
   * @param comboType 连击类型
   * @param chosenColor 选中的颜色
   * @returns 是否成功
   */
  const playCombo = useCallback((
    cardIds: string[],
    comboType: 'pair' | 'three' | 'rainbow' | 'straight',
    chosenColor?: string
  ): boolean => {
    const action = engine.createComboAction(cardIds, comboType, chosenColor);
    
    if (!action) {
      console.warn('[useGameActions] Cannot play combo');
      return false;
    }

    gameService.executeAction(action);
    return true;
  }, [engine, gameService]);

  /**
   * 摸牌
   * @returns 是否成功
   */
  const drawCard = useCallback((): boolean => {
    const action = engine.createDrawAction();
    
    if (!action) {
      console.warn('[useGameActions] Cannot draw card');
      return false;
    }

    gameService.executeAction(action);
    return true;
  }, [engine, gameService]);

  /**
   * 喊 UNO
   * @returns 是否成功
   */
  const callUno = useCallback((): boolean => {
    gameService.callUno();
    return true;
  }, [gameService]);

  /**
   * 挑战玩家
   * @param targetId 目标玩家ID
   * @returns 是否成功
   */
  const challengePlayer = useCallback((targetId: string): boolean => {
    const action = engine.createChallengeAction(targetId);
    
    if (!action) {
      console.warn('[useGameActions] Cannot challenge');
      return false;
    }

    gameService.executeAction(action);
    return true;
  }, [engine, gameService]);

  /**
   * 设置跳牌
   * @param jump 是否跳牌
   */
  const setJump = useCallback((jump: boolean): void => {
    gameService.setJump(jump);
  }, [gameService]);

  /**
   * 投降
   */
  const surrender = useCallback((): void => {
    gameService.executeAction({ type: 'jump', payload: { surrender: true } });
  }, [gameService]);

  // 从服务端推送的可用动作中提取连打和惩罚信息
  const comboOptions = useMemo(() =>
    availableActions.filter(a => a.type === 'combo'),
    [availableActions]
  );
  const penaltyInfo = useMemo(() =>
    availableActions.find(a => a.type === 'penalty_info') || null,
    [availableActions]
  );

  return {
    // 动作方法
    playCard,
    playCombo,
    drawCard,
    callUno,
    challengePlayer,
    setJump,
    surrender,

    // 验证方法
    canPlay: engine.canPlayCard.bind(engine),
    canDraw: engine.canDraw.bind(engine),
    canCallUno: engine.canCallUno.bind(engine),
    canChallenge: engine.canChallenge.bind(engine),
    requiresColorSelection: engine.requiresColorSelection.bind(engine),

    // 发送表情
    sendEmoji: (emoji: string) => gameService.sendEmoji(emoji),

    // 服务端推送的选项
    comboOptions,
    penaltyInfo,

    // 状态
    isMyTurn: engine.isMyTurn.bind(engine),
    availableActions,
    myHand
  };
}

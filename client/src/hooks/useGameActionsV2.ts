/**
 * useGameActionsV2 - V2 游戏动作 Hook
 * 
 * 提供类型安全的 V2 游戏动作发送
 */

import { useCallback } from 'react';
import { useSocketV2 } from './useSocketV2';

interface UseGameActionsV2Props {
  roomCode: string;
}

export function useGameActionsV2({ roomCode }: UseGameActionsV2Props) {
  const { 
    playCardV2, 
    playComboV2, 
    drawCardV2, 
    callUnoV2, 
    challengeV2,
    isMyTurn,
    availableActions 
  } = useSocketV2();

  /**
   * 打出单张牌
   */
  const playCard = useCallback((cardId: string, chosenColor?: string) => {
    if (!isMyTurn) {
      console.warn('[V2] Not your turn');
      return false;
    }
    
    // 检查动作是否合法
    const canPlay = availableActions.some(
      a => a.type === 'play' && a.cardId === cardId
    );
    
    if (!canPlay) {
      console.warn('[V2] Cannot play this card');
      return false;
    }

    playCardV2(roomCode, cardId, chosenColor);
    return true;
  }, [roomCode, isMyTurn, availableActions, playCardV2]);

  /**
   * 连打出牌
   */
  const playCombo = useCallback((
    cardIds: string[], 
    comboType: 'pair' | 'three' | 'rainbow' | 'straight',
    chosenColor?: string
  ) => {
    if (!isMyTurn) {
      console.warn('[V2] Not your turn');
      return false;
    }

    playComboV2(roomCode, cardIds, comboType, chosenColor);
    return true;
  }, [roomCode, isMyTurn, playComboV2]);

  /**
   * 摸牌
   */
  const drawCard = useCallback(() => {
    if (!isMyTurn) {
      console.warn('[V2] Not your turn');
      return false;
    }

    const canDraw = availableActions.some(a => a.type === 'draw');
    if (!canDraw) {
      console.warn('[V2] Cannot draw now');
      return false;
    }

    drawCardV2(roomCode);
    return true;
  }, [roomCode, isMyTurn, availableActions, drawCardV2]);

  /**
   * 喊 UNO
   */
  const callUno = useCallback(() => {
    const canCallUno = availableActions.some(a => a.type === 'uno');
    if (!canCallUno) {
      console.warn('[V2] Cannot call UNO now');
      return false;
    }

    callUnoV2(roomCode);
    return true;
  }, [roomCode, availableActions, callUnoV2]);

  /**
   * 挑战其他玩家
   */
  const challenge = useCallback((targetId: string) => {
    challengeV2(roomCode, targetId);
    return true;
  }, [roomCode, challengeV2]);

  /**
   * 检查是否可以出某张牌
   */
  const canPlayCard = useCallback((cardId: string): boolean => {
    if (!isMyTurn) return false;
    return availableActions.some(a => a.type === 'play' && a.cardId === cardId);
  }, [isMyTurn, availableActions]);

  /**
   * 检查是否需要选颜色
   */
  const requiresColor = useCallback((cardId: string): boolean => {
    const action = availableActions.find(a => a.type === 'play' && a.cardId === cardId);
    return action?.requiresColor || false;
  }, [availableActions]);

  return {
    // 动作
    playCard,
    playCombo,
    drawCard,
    callUno,
    challenge,

    // 查询
    canPlayCard,
    requiresColor,
    
    // 状态
    isMyTurn,
    availableActions,
  };
}

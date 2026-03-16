import { useMemo, useCallback } from 'react';
import type { Room, GameState, Card } from '../../../shared/types';
import { GameModeRendererFactory, type GameModeRenderer } from '../modes/GameModeRenderer';

export interface UseGameModeReturn {
  // 渲染器
  renderer: GameModeRenderer;
  
  // 模式判断
  isOutMode: boolean;
  isStandardMode: boolean;
  
  // Out模式特有
  outPhase: number;
  outCountdown: number;
  maxHandSize: number;
  
  // 连打检测
  availableCombos: Array<{type: string; cardIds: string[]; name: string}>;
  detectCombos: (cards: Card[]) => Array<{type: string; cardIds: string[]; name: string}>;
  
  // 提示信息
  getActionHint: (props: {
    isMyTurn: boolean;
    selectedCards: string[];
  }) => string | null;
}

export function useGameMode(room: Room, gameState: GameState): UseGameModeReturn {
  const modeName = room.settings?.mode || 'standard';
  
  // 获取渲染器
  const renderer = useMemo(() => {
    return GameModeRendererFactory.create(modeName);
  }, [modeName]);
  
  // 模式判断
  const isOutMode = modeName === 'out';
  const isStandardMode = modeName === 'standard';
  
  // Out模式状态
  const outPhase = gameState.outState?.phase || 0;
  const outCountdown = useMemo(() => {
    if (!gameState.outState || gameState.outState.phase >= 3) return 0;
    return Math.max(0, gameState.outState.nextOutAt - Date.now());
  }, [gameState.outState]);
  const maxHandSize = gameState.outState?.maxCards || 20;
  
  // 连打检测（传入gameState以验证弃牌堆匹配）
  const detectCombos = useCallback((cards: Card[]) => {
    if (!renderer.detectCombos) return [];
    return renderer.detectCombos(cards, gameState);
  }, [renderer, gameState]);
  
  const availableCombos = useMemo(() => {
    const currentPlayer = gameState.players?.find(p => p.id === gameState.currentPlayerId);
    if (!currentPlayer || !isOutMode) return [];
    return detectCombos(currentPlayer.cards);
  }, [gameState, isOutMode, detectCombos]);
  
  // 获取提示
  const getActionHint = useCallback((props: { isMyTurn: boolean; selectedCards: string[] }) => {
    if (!renderer.getActionHint) return null;
    return renderer.getActionHint({
      gameState,
      isMyTurn: props.isMyTurn,
      selectedCards: props.selectedCards
    });
  }, [renderer, gameState]);
  
  return {
    renderer,
    isOutMode,
    isStandardMode,
    outPhase,
    outCountdown,
    maxHandSize,
    availableCombos,
    detectCombos,
    getActionHint
  };
}

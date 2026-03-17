import { useMemo, useCallback } from 'react';
import type { Room, GameState, Card } from '../../../shared/types';
import type { ComboStarter } from '../../types/actionApi';
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
  
  // 连打检测（从后端Action API获取）
  availableCombos: Array<{type: string; cardIds: string[]; name: string}>;
  
  // 提示信息
  getActionHint: (props: {
    isMyTurn: boolean;
    selectedCards: string[];
  }) => string | null;
}

export function useGameMode(
  room: Room, 
  gameState: GameState,
  comboStarters?: ComboStarter[]
): UseGameModeReturn {
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
  
  // 连打检测 - 直接使用后端Action API提供的数据
  const availableCombos = useMemo(() => {
    if (!comboStarters || comboStarters.length === 0) return [];
    
    // 将后端的ComboStarter转换为前端需要的格式
    return comboStarters.flatMap(starter => 
      starter.combos.map(combo => ({
        type: combo.type,
        // 从requiredCards中提取所有cardId（包括已在手牌的和缺失的）
        cardIds: [
          ...combo.requiredCards.map(c => c.cardId),
          ...combo.missingCards.map(c => c.cardId)
        ],
        name: combo.name
      }))
    );
  }, [comboStarters]);
  
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
    getActionHint
  };
}

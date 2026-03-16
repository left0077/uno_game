/**
 * useGameActions Hook 测试
 * 
 * 测试 Action API v2.0 Hook 的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameActions } from '../useGameActions';
import type { ExtendedGameState } from '../../types';
import { ACTION_API_VERSION } from '../../../../shared/actionApi';

// 模拟游戏状态
const createMockGameState = (version: '1.0' | '2.0' = '2.0'): ExtendedGameState => ({
  currentPlayerId: 'player-1',
  direction: 'clockwise',
  deck: [],
  discardPile: [],
  currentColor: 'red',
  turnTimer: 60,
  turnStartTime: Date.now(),
  players: [
    {
      id: 'player-1',
      nickname: 'Test Player',
      isHost: true,
      isAI: false,
      cards: [
        { id: 'card-1', type: 'number', color: 'red', value: 5 },
        { id: 'card-2', type: 'number', color: 'blue', value: 5 },
        { id: 'card-3', type: 'wild', color: 'wild', value: 'wild' },
      ],
      cardCount: 3,
      isConnected: true,
      isReady: true,
    }
  ],
  actionApiVersion: version,
  availableActions: version === '2.0' ? {
    'player-1': {
      version: ACTION_API_VERSION,
      timestamp: Date.now(),
      playerId: 'player-1',
      gameId: 'game-1',
      state: {
        type: 'normal',
        message: '你的回合',
      },
      actions: {
        play: {
          enabled: true,
          cards: [
            {
              cardId: 'card-1',
              card: { id: 'card-1', type: 'number', color: 'red', value: 5 },
              reasons: [{ type: 'color_match', description: '颜色匹配', priority: 100 }],
              effects: [{ type: 'change_color', description: '改变当前颜色' }],
              uiHints: { highlight: 'green', animation: 'pulse' },
            },
            {
              cardId: 'card-3',
              card: { id: 'card-3', type: 'wild', color: 'wild', value: 'wild' },
              reasons: [{ type: 'wild', description: '万能牌', priority: 90 }],
              effects: [{ type: 'change_color', description: '选择颜色' }],
              requiresInput: { color: true },
              uiHints: { highlight: 'green', animation: 'glow' },
            }
          ],
        },
        combo: {
          enabled: false,
          starters: [],
        },
        penaltyResponse: {
          enabled: false,
          options: [],
        },
        draw: {
          enabled: true,
          count: 1,
          reason: 'optional',
        },
        special: {
          callUno: { enabled: false },
          challenge: { enabled: false },
          jumpIn: { enabled: false },
        },
      },
      metadata: {
        cache: {
          ttl: 1000,
          etag: 'test-etag',
        },
      },
    }
  } : undefined,
});

describe('useGameActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('v2.0 API', () => {
    it('应该正确检测 v2 API 版本', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.isV2).toBe(true);
    });

    it('应该正确解析可出牌列表', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.playableCards).toHaveLength(2);
      expect(result.current.playableCards[0].cardId).toBe('card-1');
      expect(result.current.playableCards[1].cardId).toBe('card-3');
    });

    it('应该正确生成可出牌ID集合', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.playableCardIds.has('card-1')).toBe(true);
      expect(result.current.playableCardIds.has('card-2')).toBe(false);
      expect(result.current.playableCardIds.has('card-3')).toBe(true);
    });

    it('isCardPlayable 应该正确判断卡牌是否可出', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.isCardPlayable('card-1')).toBe(true);
      expect(result.current.isCardPlayable('card-2')).toBe(false);
      expect(result.current.isCardPlayable('card-3')).toBe(true);
    });

    it('getCardPlayInfo 应该返回卡牌详细信息', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      const cardInfo = result.current.getCardPlayInfo('card-3');
      expect(cardInfo).toBeDefined();
      expect(cardInfo?.requiresInput?.color).toBe(true);
    });

    it('应该正确检测 canDraw 状态', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.canDraw).toBe(true);
      expect(result.current.drawCount).toBe(1);
    });

    it('应该正确返回游戏状态信息', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.state).toBeDefined();
      expect(result.current.state?.type).toBe('normal');
      expect(result.current.state?.message).toBe('你的回合');
    });

    it('不应该有惩罚状态', () => {
      const gameState = createMockGameState('2.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.hasPendingPenalty).toBe(false);
      expect(result.current.pendingDrawCount).toBe(0);
    });
  });

  describe('v1.0 向后兼容', () => {
    it('应该正确检测 v1 API 版本', () => {
      const gameState = createMockGameState('1.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.isV2).toBe(false);
    });

    it('v1 模式应该返回空的可出牌列表', () => {
      const gameState = createMockGameState('1.0');
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      // v1 模式下，没有 availableActions，所以 playableCards 应该为空
      expect(result.current.playableCards).toHaveLength(0);
    });
  });

  describe('惩罚状态', () => {
    it('应该正确检测待惩罚状态', () => {
      const gameState = createMockGameState('2.0');
      gameState.pendingDraw = 4;
      gameState.pendingDrawType = 'draw4';
      
      if (gameState.availableActions?.['player-1']) {
        gameState.availableActions['player-1'].state = {
          type: 'pending_draw',
          message: '累积 +4',
          pendingDraw: {
            count: 4,
            type: 'draw4',
            canStack: true,
            canCombo: true,
            canReverse: true,
            canRainbow: false,
          }
        };
        gameState.availableActions['player-1'].actions.penaltyResponse = {
          enabled: true,
          options: [
            {
              type: 'stack',
              priority: 80,
              name: '跟+',
              description: '出+4牌跟加',
              detailedEffect: '将+4转移给下家',
              outcome: { type: 'transfer', value: 4, description: '转移惩罚' },
              ui: { icon: 'zap', color: 'orange' },
            },
            {
              type: 'accept',
              priority: 10,
              name: '接受惩罚',
              description: '摸4张牌',
              detailedEffect: '接受+4惩罚并摸牌',
              outcome: { type: 'accept', value: 4, description: '接受惩罚' },
              ui: { icon: 'hand', color: 'red' },
            }
          ]
        };
      }
      
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.hasPendingPenalty).toBe(true);
      expect(result.current.pendingDrawCount).toBe(4);
      expect(result.current.penaltyOptions).toHaveLength(2);
    });
  });

  describe('工具方法', () => {
    it('getPenaltyOption 应该返回对应的惩罚选项', () => {
      const gameState = createMockGameState('2.0');
      if (gameState.availableActions?.['player-1']) {
        gameState.availableActions['player-1'].actions.penaltyResponse = {
          enabled: true,
          options: [
            {
              type: 'accept',
              priority: 10,
              name: '接受惩罚',
              description: '摸牌',
              detailedEffect: '接受惩罚',
              outcome: { type: 'accept', value: 2, description: '接受' },
              ui: { icon: 'hand', color: 'red' },
            }
          ]
        };
      }
      
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      const option = result.current.getPenaltyOption('accept');
      expect(option).toBeDefined();
      expect(option?.name).toBe('接受惩罚');
    });

    it('isComboStarter 应该正确判断连打启动牌', () => {
      const gameState = createMockGameState('2.0');
      if (gameState.availableActions?.['player-1']) {
        gameState.availableActions['player-1'].actions.combo = {
          enabled: true,
          starters: [
            {
              cardId: 'card-1',
              card: { id: 'card-1', type: 'number', color: 'red', value: 5 },
              combos: [
                {
                  type: 'pair',
                  name: '对子',
                  requiredCards: [
                    { cardId: 'card-1', card: { id: 'card-1', type: 'number', color: 'red', value: 5 }, inHand: true },
                    { cardId: 'card-2', card: { id: 'card-2', type: 'number', color: 'blue', value: 5 }, inHand: true },
                  ],
                  missingCards: [],
                  effect: { description: '连续出两张' },
                  risk: { level: 'low', factors: [] },
                  recommended: true,
                  score: 80,
                }
              ]
            }
          ]
        };
      }
      
      const { result } = renderHook(() => useGameActions(gameState, 'player-1'));
      
      expect(result.current.isComboStarter('card-1')).toBe(true);
      expect(result.current.isComboStarter('card-3')).toBe(false);
    });
  });
});

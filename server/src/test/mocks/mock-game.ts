import type { Room, Player, GameState, Card } from '../../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 创建模拟房间
 */
export function createMockRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: uuidv4(),
    code: '1234',
    players: [],
    status: 'waiting',
    hostId: '',
    maxPlayers: 8,
    createdAt: Date.now(),
    settings: {
      allowStacking: true,
      allowMultipleCards: false,
      allowJumpIn: true,
      scoringMode: false,
      mode: 'standard'
    },
    ...overrides
  };
}

/**
 * 创建模拟玩家
 */
export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: uuidv4(),
    nickname: 'TestPlayer',
    isHost: false,
    isAI: false,
    cards: [],
    cardCount: 0,
    isConnected: true,
    isReady: false,
    hasCalledUno: false,
    eliminated: false,
    ...overrides
  };
}

/**
 * 创建模拟卡牌
 */
export function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: uuidv4(),
    type: 'number',
    color: 'red',
    value: 5,
    ...overrides
  };
}

/**
 * 预设玩家列表
 */
export const mockPlayers: Player[] = [
  createMockPlayer({ nickname: 'Player1', isHost: true }),
  createMockPlayer({ nickname: 'Player2' }),
  createMockPlayer({ nickname: 'Player3', isAI: true })
];

/**
 * 预设房间
 */
export const mockRoom: Room = createMockRoom({
  hostId: mockPlayers[0].id,
  players: mockPlayers
});

/**
 * 预设游戏状态
 */
export const mockGameState: Partial<GameState> = {
  currentPlayerId: mockPlayers[0].id,
  direction: 'clockwise',
  currentColor: 'red',
  turnTimer: 120,
  turnStartTime: Date.now(),
  players: mockPlayers,
  rankings: []
};

/**
 * Action API v2.0 测试数据生成器
 * 
 * 生成各种游戏状态、手牌组合和边界情况数据
 */

import type { Card, Player, GameState, Room } from '../../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

// ==================== 卡牌生成器 ====================

/**
 * 创建数字牌
 */
export function createNumberCard(value: number, color: Card['color'], overrides: Partial<Card> = {}): Card {
  return {
    id: uuidv4(),
    type: 'number',
    color,
    value,
    ...overrides
  };
}

/**
 * 创建功能牌
 */
export function createActionCard(
  type: 'skip' | 'reverse' | 'draw2',
  color: 'red' | 'yellow' | 'green' | 'blue',
  overrides: Partial<Card> = {}
): Card {
  return {
    id: uuidv4(),
    type,
    color,
    value: type === 'skip' ? '🚫' : type === 'reverse' ? '↺' : '+2',
    ...overrides
  };
}

/**
 * 创建万能牌
 */
export function createWildCard(type: 'wild' | 'draw4' = 'wild', overrides: Partial<Card> = {}): Card {
  return {
    id: uuidv4(),
    type,
    color: 'wild',
    value: type === 'wild' ? '🌈' : '+4',
    ...overrides
  };
}

/**
 * 创建Out模式特殊牌
 */
export function createOutSpecialCard(
  type: 'draw3' | 'draw5' | 'draw8',
  color: Card['color'],
  overrides: Partial<Card> = {}
): Card {
  const valueMap = { draw3: 3, draw5: 5, draw8: 8 };
  return {
    id: uuidv4(),
    type,
    color,
    value: valueMap[type],
    ...overrides
  };
}

// ==================== 手牌组合生成器 ====================

/**
 * 生成对子组合
 */
export function generatePair(value: number, color1: Card['color'], color2: Card['color']): Card[] {
  return [
    createNumberCard(value, color1),
    createNumberCard(value, color2)
  ];
}

/**
 * 生成三条组合
 */
export function generateThreeOfAKind(
  value: number,
  colors: Card['color'][] = ['red', 'yellow', 'blue']
): Card[] {
  return colors.map(color => createNumberCard(value, color));
}

/**
 * 生成彩虹组合（四种颜色的同数字）
 */
export function generateRainbow(value: number): Card[] {
  return ['red', 'yellow', 'green', 'blue'].map(color => 
    createNumberCard(value, color as Card['color'])
  );
}

/**
 * 生成顺子组合
 */
export function generateStraight(
  startValue: number,
  length: number,
  color: Card['color']
): Card[] {
  return Array.from({ length }, (_, i) => 
    createNumberCard(startValue + i, color)
  );
}

/**
 * 生成无法匹配的废牌（与给定颜色和数字都不同）
 */
export function generateUnplayableCards(
  count: number,
  excludeColor: Card['color'],
  excludeValue: number
): Card[] {
  const colors: Card['color'][] = ['red', 'yellow', 'green', 'blue'].filter(c => c !== excludeColor);
  return Array.from({ length: count }, (_, i) => {
    let value = (excludeValue + i + 1) % 10;
    if (value === excludeValue) value = (value + 1) % 10;
    return createNumberCard(value, colors[i % colors.length]);
  });
}

/**
 * 生成可匹配的牌（与给定颜色或数字匹配）
 */
export function generatePlayableCards(
  count: number,
  targetColor: Card['color'],
  targetValue: number
): Card[] {
  return Array.from({ length: count }, (_, i) => {
    if (i % 2 === 0) {
      return createNumberCard(targetValue, (i % 2 === 0 ? 'red' : 'yellow') as Card['color']);
    } else {
      return createNumberCard((targetValue + i) % 10, targetColor);
    }
  });
}

// ==================== 游戏状态生成器 ====================

/**
 * 创建基础游戏状态
 */
export function createBaseGameState(overrides: Partial<GameState> = {}): GameState {
  const players: Player[] = [
    createMockPlayer({ id: 'p1', nickname: 'Player1' }),
    createMockPlayer({ id: 'p2', nickname: 'Player2' }),
    createMockPlayer({ id: 'p3', nickname: 'Player3' }),
  ];

  return {
    currentPlayerId: 'p1',
    direction: 'clockwise',
    deck: [],
    discardPile: [createNumberCard(5, 'red')],
    currentColor: 'red',
    turnTimer: 120,
    turnStartTime: Date.now(),
    players,
    rankings: [],
    isRoundEnded: false,
    ...overrides
  };
}

/**
 * 创建带累积惩罚的游戏状态
 */
export function createStackingGameState(
  pendingDraw: number,
  pendingType: 'draw2' | 'draw4',
  overrides: Partial<GameState> = {}
): GameState {
  return createBaseGameState({
    pendingDraw,
    pendingDrawType: pendingType,
    discardPile: [createActionCard('draw2', 'red')],
    ...overrides
  });
}

/**
 * 创建Out模式游戏状态
 */
export function createOutModeGameState(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  return createBaseGameState({
    maxHandSize: 20,
    gameStartTime: now,
    humanPlayerCount: 3,
    outState: {
      phase: 0,
      maxCards: 20,
      nextOutAt: now + 3 * 60 * 1000
    },
    ...overrides
  });
}

/**
 * 创建濒临淘汰的游戏状态（手牌接近20张）
 */
export function createNearEliminationState(cardCount: number = 19): GameState {
  const state = createOutModeGameState();
  state.players[0].cards = Array.from({ length: cardCount }, (_, i) => 
    createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as Card['color'])
  );
  state.players[0].cardCount = cardCount;
  return state;
}

// ==================== 玩家生成器 ====================

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
 * 创建带特定手牌的玩家
 */
export function createPlayerWithCards(
  cards: Card[],
  overrides: Partial<Player> = {}
): Player {
  return createMockPlayer({
    cards: [...cards],
    cardCount: cards.length,
    ...overrides
  });
}

/**
 * 创建AI玩家
 */
export function createAIPlayer(
  difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  overrides: Partial<Player> = {}
): Player {
  return createMockPlayer({
    isAI: true,
    aiType: 'bot',
    aiDifficulty: difficulty,
    ...overrides
  });
}

// ==================== 房间生成器 ====================

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
      allowMultipleCards: true,
      allowJumpIn: true,
      scoringMode: false,
      mode: 'standard'
    },
    ...overrides
  };
}

// ==================== 场景数据生成器 ====================

/**
 * 场景矩阵数据类型
 */
export interface ScenarioMatrix {
  name: string;
  state: GameState;
  currentPlayerId: string;
  expectedActions: string[];
  description: string;
}

/**
 * 生成测试场景矩阵数据
 * 
 * 覆盖：正常、+2、+4、彩虹、反转、连打等场景
 * 状态：有可出牌、无可出牌、可连打、可跟+、可反转等
 */
export function generateScenarioMatrix(): ScenarioMatrix[] {
  const scenarios: ScenarioMatrix[] = [];

  // 场景1: 正常情况 - 有可出牌
  const normalPlayable = createBaseGameState();
  normalPlayable.players[0].cards = [
    createNumberCard(5, 'red'),  // 匹配颜色
    createNumberCard(3, 'blue'),
  ];
  scenarios.push({
    name: '正常-有可出牌',
    state: normalPlayable,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw'],
    description: '当前玩家有可出的牌，应该能出牌或摸牌'
  });

  // 场景2: 正常情况 - 无可出牌
  const normalUnplayable = createBaseGameState();
  normalUnplayable.players[0].cards = [
    createNumberCard(3, 'blue'),   // 不匹配红色
    createNumberCard(7, 'green'),  // 不匹配红色
  ];
  scenarios.push({
    name: '正常-无可出牌',
    state: normalUnplayable,
    currentPlayerId: 'p1',
    expectedActions: ['draw'],
    description: '当前玩家没有可出的牌，只能摸牌'
  });

  // 场景3: +2累积 - 可跟+2
  const draw2Stackable = createStackingGameState(2, 'draw2');
  draw2Stackable.players[0].cards = [
    createActionCard('draw2', 'red'),  // 可叠加
    createNumberCard(3, 'blue'),
  ];
  scenarios.push({
    name: '+2累积-可跟+2',
    state: draw2Stackable,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw'],
    description: '面临+2惩罚，手中有+2可以叠加'
  });

  // 场景4: +2累积 - 只能摸牌
  const draw2MustDraw = createStackingGameState(4, 'draw2');
  draw2MustDraw.players[0].cards = [
    createNumberCard(3, 'blue'),  // 无法叠加
    createNumberCard(7, 'green'),
  ];
  scenarios.push({
    name: '+2累积-只能摸牌',
    state: draw2MustDraw,
    currentPlayerId: 'p1',
    expectedActions: ['draw'],
    description: '面临+2惩罚，手中没有+2，只能摸牌接受惩罚'
  });

  // 场景5: +4累积 - 可跟+4
  const draw4Stackable = createStackingGameState(4, 'draw4');
  draw4Stackable.players[0].cards = [
    createWildCard('draw4'),  // 可叠加
    createNumberCard(3, 'blue'),
  ];
  scenarios.push({
    name: '+4累积-可跟+4',
    state: draw4Stackable,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw'],
    description: '面临+4惩罚，手中有+4可以叠加'
  });

  // 场景6: Out模式 - 可连打对子
  const outModePair = createOutModeGameState();
  outModePair.players[0].cards = [
    createNumberCard(5, 'red'),    // 匹配弃牌堆
    createNumberCard(5, 'blue'),   // 与第一张组成对子
    createNumberCard(3, 'yellow'),
  ];
  scenarios.push({
    name: 'Out模式-可连打对子',
    state: outModePair,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw', 'combo'],
    description: 'Out模式下，玩家有对子可以连打'
  });

  // 场景7: Out模式 - 可彩虹转移
  const outModeRainbow = createOutModeGameState();
  outModeRainbow.pendingDraw = 4;
  outModeRainbow.pendingDrawType = 'draw2';
  outModeRainbow.players[0].cards = [
    createNumberCard(3, 'red'),     // 匹配弃牌堆颜色
    createNumberCard(3, 'yellow'),  // 彩虹组合
    createNumberCard(3, 'green'),
    createNumberCard(3, 'blue'),
  ];
  scenarios.push({
    name: 'Out模式-可彩虹转移',
    state: outModeRainbow,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw', 'combo'],
    description: '面临惩罚且有彩虹组合，可以转移惩罚'
  });

  // 场景8: Out模式 - 可反转反击
  const outModeReverse = createOutModeGameState();
  outModeReverse.pendingDraw = 4;
  outModeReverse.pendingDrawType = 'draw2';
  outModeReverse.players[0].cards = [
    createActionCard('reverse', 'red'),  // 匹配颜色，可反击
    createNumberCard(3, 'blue'),
  ];
  scenarios.push({
    name: 'Out模式-可反转反击',
    state: outModeReverse,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw'],
    description: '面临惩罚且有反转牌，可以反击'
  });

  // 场景9: 只剩1张牌（UNO状态）
  const unoState = createBaseGameState();
  unoState.players[0].cards = [createNumberCard(5, 'red')];
  scenarios.push({
    name: 'UNO状态-剩1张牌',
    state: unoState,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw', 'uno'],
    description: '玩家只剩1张牌，可以喊UNO'
  });

  // 场景10: 手牌20张（Out模式上限）
  const maxHandState = createNearEliminationState(20);
  scenarios.push({
    name: 'Out模式-手牌20张',
    state: maxHandState,
    currentPlayerId: 'p1',
    expectedActions: ['play', 'draw'],
    description: 'Out模式下手牌达到上限，再摸牌将被淘汰'
  });

  return scenarios;
}

// ==================== 边界情况生成器 ====================

/**
 * 生成边界情况测试数据
 */
export function generateEdgeCases() {
  return {
    // 空牌堆
    emptyDeck: createBaseGameState({ deck: [] }),
    
    // 单玩家（测试用）
    singlePlayer: createBaseGameState({
      players: [createMockPlayer({ id: 'p1' })]
    }),
    
    // 最大玩家数（8人）
    maxPlayers: createBaseGameState({
      players: Array.from({ length: 8 }, (_, i) => 
        createMockPlayer({ id: `p${i+1}`, nickname: `Player${i+1}` })
      )
    }),
    
    // 所有玩家被淘汰只剩1人
    nearEndGame: createOutModeGameState({
      players: [
        createMockPlayer({ id: 'p1', cards: [createNumberCard(1, 'red')], cardCount: 1 }),
        createMockPlayer({ id: 'p2', eliminated: true, cards: [], cardCount: 0 }),
        createMockPlayer({ id: 'p3', eliminated: true, cards: [], cardCount: 0 }),
      ]
    }),
    
    // 超长游戏时间（测试超时结算）
    overtimeGame: createOutModeGameState({
      gameStartTime: Date.now() - 21 * 60 * 1000  // 21分钟前
    }),
    
    // 最大累积惩罚
    maxPendingDraw: createStackingGameState(20, 'draw2'),
    
    // 多种颜色弃牌堆
    wildDiscard: createBaseGameState({
      discardPile: [createWildCard('wild')],
      currentColor: 'blue'  // 万能牌指定的颜色
    })
  };
}

// ==================== 性能测试数据生成器 ====================

/**
 * 生成性能测试数据
 */
export function generatePerformanceTestData() {
  return {
    // 大量手牌
    largeHand: Array.from({ length: 100 }, (_, i) => 
      createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as Card['color'])
    ),
    
    // 大量连打组合
    manyCombos: Array.from({ length: 50 }, (_, i) => {
      const value = Math.floor(i / 4);
      const color = ['red', 'yellow', 'green', 'blue'][i % 4] as Card['color'];
      return createNumberCard(value, color);
    }),
    
    // 大弃牌堆
    largeDiscardPile: Array.from({ length: 200 }, (_, i) => 
      createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as Card['color'])
    ),
    
    // 多玩家游戏状态
    manyPlayers: Array.from({ length: 100 }, (_, i) => 
      createMockPlayer({ 
        id: `p${i}`, 
        cards: Array.from({ length: 7 }, (_, j) => createNumberCard(j, 'red'))
      })
    )
  };
}

// 导出所有生成器
export default {
  // 卡牌
  createNumberCard,
  createActionCard,
  createWildCard,
  createOutSpecialCard,
  
  // 手牌组合
  generatePair,
  generateThreeOfAKind,
  generateRainbow,
  generateStraight,
  generateUnplayableCards,
  generatePlayableCards,
  
  // 游戏状态
  createBaseGameState,
  createStackingGameState,
  createOutModeGameState,
  createNearEliminationState,
  
  // 玩家和房间
  createMockPlayer,
  createPlayerWithCards,
  createAIPlayer,
  createMockRoom,
  
  // 场景
  generateScenarioMatrix,
  generateEdgeCases,
  generatePerformanceTestData
};

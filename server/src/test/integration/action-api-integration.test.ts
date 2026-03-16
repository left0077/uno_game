/**
 * Action API v2.0 - 集成测试
 * 
 * 测试范围：
 * - 完整游戏流程
 * - +2累积链测试
 * - +4累积链测试
 * - 彩虹转移测试
 * - 反转反击测试
 * - 连打响应惩罚测试
 */

import { BaseGameMode } from '../../../src/game/modes/BaseGameMode.js';
import { OutMode } from '../../../src/game/modes/OutMode.js';
import { UnoGame } from '../../../src/game/UnoGame.js';
import { createMockRoom, createMockPlayer } from '../mocks/mock-game.js';
import { expect } from '../test-runner.js';
import type { Player, GameState } from '../../../src/shared/index.js';
import { 
  createNumberCard, 
  createActionCard, 
  createWildCard,
  generatePair,
  generateRainbow
} from '../utils/data-generator.js';

console.log('\n🔄 Action API 集成测试\n');

let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(name: string, fn: () => void) {
  currentSuite = name;
  console.log(`\n📦 ${name}`);
  fn();
  currentSuite = '';
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// 创建UnoGame实例的辅助函数
function createTestGame(mode: 'standard' | 'out', playerCount: number = 3) {
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => 
    createMockPlayer({ 
      id: `p${i+1}`, 
      nickname: `Player${i+1}`,
      isHost: i === 0
    })
  );
  
  const room = createMockRoom({
    hostId: players[0].id,
    players,
    settings: {
      allowStacking: true,
      allowMultipleCards: true,
      allowJumpIn: true,
      scoringMode: false,
      mode
    }
  });
  
  let lastState: GameState | null = null;
  
  const game = new UnoGame(room, (state) => {
    lastState = state;
  }, (winner) => {
    console.log(`  🏆 游戏结束，获胜者: ${winner.nickname}`);
  });
  
  return { game, room, players, getState: () => lastState || game.getGameState() };
}

// ==================== 测试套件 ====================

describe('完整游戏流程', () => {
  test('given: 3人标准模式游戏 when: 玩家轮流出牌 then: 游戏正常进行', () => {
    const { game, players, getState } = createTestGame('standard', 3);
    
    const state = getState();
    expect(state.players).toHaveLength(3);
    expect(state.players[0].cards.length).toBe(7);
    expect(state.discardPile.length).toBe(1);
  });

  test('given: 3人Out模式游戏 when: 初始化 then: Out模式状态正确', () => {
    const { game, getState } = createTestGame('out', 3);
    
    const state = getState();
    expect(state.maxHandSize).toBe(20);
    expect(state.outState).toBeTruthy();
    expect(state.outState?.phase).toBe(0);
    expect(state.humanPlayerCount).toBe(3);
  });

  test('given: 游戏进行中 when: 玩家出牌 then: 状态正确更新', () => {
    const { game, players, getState } = createTestGame('standard', 3);
    const state = getState();
    const player1 = state.players[0];
    
    // 给玩家一张可出的牌
    const playableCard = createNumberCard(5, state.currentColor as any);
    player1.cards = [playableCard, ...player1.cards.slice(1)];
    
    const initialCardCount = player1.cards.length;
    
    const success = game.handleAction({
      type: 'play',
      playerId: player1.id,
      cardIds: [playableCard.id],
      timestamp: Date.now()
    }, player1.id);
    
    expect(success).toBeTruthy();
    
    const newState = getState();
    const updatedPlayer = newState.players.find(p => p.id === player1.id)!;
    expect(updatedPlayer.cards.length).toBe(initialCardCount - 1);
  });

  test('given: 游戏进行中 when: 玩家摸牌 then: 手牌增加', () => {
    const { game, players, getState } = createTestGame('standard', 3);
    const state = getState();
    const player1 = state.players[0];
    
    const initialCardCount = player1.cards.length;
    const deckSize = state.deck.length;
    
    const success = game.handleAction({
      type: 'draw',
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(success).toBeTruthy();
    
    const newState = getState();
    const updatedPlayer = newState.players.find(p => p.id === player1.id)!;
    expect(updatedPlayer.cards.length).toBe(initialCardCount + 1);
    expect(newState.deck.length).toBe(deckSize - 1);
  });
});

describe('+2累积链测试', () => {
  test('given: +2累积链 when: 玩家连续叠加 then: 累积数正确', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // 第一轮：p1出+2
    state.players[0].cards = [createActionCard('draw2', 'red')];
    state.currentPlayerId = 'p1';
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p1',
      cardIds: [state.players[0].cards[0].id],
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.pendingDraw).toBe(2);
    
    // 第二轮：p2出+2叠加
    state.currentPlayerId = 'p2';
    state.players[1].cards = [createActionCard('draw2', 'red')];
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p2',
      cardIds: [state.players[1].cards[0].id],
      timestamp: Date.now()
    }, 'p2');
    
    expect(state.pendingDraw).toBe(4);
    
    // 第三轮：p3出+2叠加
    state.currentPlayerId = 'p3';
    state.players[2].cards = [createActionCard('draw2', 'red')];
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p3',
      cardIds: [state.players[2].cards[0].id],
      timestamp: Date.now()
    }, 'p3');
    
    expect(state.pendingDraw).toBe(6);
  });

  test('given: +2累积到6 when: 玩家无法叠加只能摸牌 then: 摸6张牌', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    
    // 设置累积惩罚
    state.pendingDraw = 6;
    state.pendingDrawType = 'draw2';
    state.currentPlayerId = 'p1';
    
    // p1没有+2，只能摸牌
    state.players[0].cards = [createNumberCard(5, 'red')];
    const initialCardCount = state.players[0].cards.length;
    
    mode.executeAction(state, {
      type: 'draw',
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.players[0].cards.length).toBe(initialCardCount + 6);
    expect(state.pendingDraw).toBe(0);
  });
});

describe('+4累积链测试', () => {
  test('given: +4累积链 when: 玩家连续叠加 then: 累积数正确', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // p1出+4
    state.players[0].cards = [createWildCard('draw4')];
    state.currentPlayerId = 'p1';
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p1',
      cardIds: [state.players[0].cards[0].id],
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.pendingDraw).toBe(4);
    
    // p2出+4叠加
    state.currentPlayerId = 'p2';
    state.players[1].cards = [createWildCard('draw4')];
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p2',
      cardIds: [state.players[1].cards[0].id],
      timestamp: Date.now()
    }, 'p2');
    
    expect(state.pendingDraw).toBe(8);
  });

  test('given: +4累积 to 12 when: 玩家摸牌 then: 摸12张牌', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [createMockPlayer({ id: 'p1' })]
    });
    const state = mode.initialize(room);
    
    // 添加足够的牌到牌堆
    state.deck = Array.from({ length: 50 }, (_, i) => createNumberCard(i % 10, 'red'));
    
    state.pendingDraw = 12;
    state.pendingDrawType = 'draw4';
    state.currentPlayerId = 'p1';
    
    const initialCardCount = state.players[0].cards.length;
    
    mode.executeAction(state, {
      type: 'draw',
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.players[0].cards.length).toBe(initialCardCount + 12);
  });
});

describe('彩虹转移测试', () => {
  test('given: +4累积惩罚 when: 玩家使用彩虹转移 then: 惩罚转移给目标', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // 设置场景
    state.pendingDraw = 4;
    state.pendingDrawType = 'draw2';
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    
    // p1有彩虹组合
    const rainbowCards = generateRainbow(3);
    state.players[0].cards = rainbowCards;
    state.players[0].cardCount = 4;
    
    const p2InitialCards = state.players[1].cards.length;
    
    // 执行彩虹转移，目标p2
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: 'p2',
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    // p2应该摸4+3=7张牌
    expect(state.players[1].cards.length).toBe(p2InitialCards + 7);
    expect(state.pendingDraw).toBe(0);
  });

  test('given: 无累积惩罚 when: 玩家使用彩虹 then: 目标只摸3张', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    
    state.pendingDraw = 0;
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    
    const rainbowCards = generateRainbow(5);
    state.players[0].cards = rainbowCards;
    state.players[0].cardCount = 4;
    
    const p2InitialCards = state.players[1].cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: 'p2',
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    // 无累积惩罚，只摸3张
    expect(state.players[1].cards.length).toBe(p2InitialCards + 3);
  });
});

describe('反转反击测试', () => {
  test('given: +6累积惩罚 when: 玩家使用反转反击 then: 上家受罚', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // 顺序：p1 -> p2 -> p3，当前p2的回合
    state.direction = 'clockwise';
    state.currentPlayerId = 'p2';
    state.pendingDraw = 6;
    state.pendingDrawType = 'draw2';
    
    // p2有反转牌
    const reverseCard = createActionCard('reverse', state.currentColor as any);
    state.players[1].cards = [reverseCard];
    state.players[1].cardCount = 1;
    
    const p1InitialCards = state.players[0].cards.length;
    
    // p2出反转反击
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p2',
      cardIds: [reverseCard.id],
      timestamp: Date.now()
    }, 'p2');
    
    // 上家p1应该摸6张
    expect(state.players[0].cards.length).toBe(p1InitialCards + 6);
    expect(state.pendingDraw).toBe(0);
    expect(state.direction).toBe('counterclockwise');
  });

  test('given: 逆时针方向 when: 玩家使用反转反击 then: 正确识别上家', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // 逆时针：p1 <- p2 <- p3，当前p2的回合
    state.direction = 'counterclockwise';
    state.currentPlayerId = 'p2';
    state.pendingDraw = 4;
    state.pendingDrawType = 'draw2';
    
    // p2有反转牌
    const reverseCard = createActionCard('reverse', state.currentColor as any);
    state.players[1].cards = [reverseCard];
    
    const p3InitialCards = state.players[2].cards.length;
    
    // p2出反转反击，上家是p3
    mode.executeAction(state, {
      type: 'play',
      playerId: 'p2',
      cardIds: [reverseCard.id],
      timestamp: Date.now()
    }, 'p2');
    
    // 上家p3应该摸4张
    expect(state.players[2].cards.length).toBe(p3InitialCards + 4);
  });
});

describe('连打响应惩罚测试', () => {
  test('given: 玩家手牌过多 when: 执行连打出牌后超过20张 then: 该玩家被淘汰', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    
    // p1已有19张牌，执行连打出对子后剩17张（正常）
    state.players[0].cards = [
      ...Array.from({ length: 17 }, (_, i) => createNumberCard(i % 10, 'red')),
      ...generatePair(5, 'red', 'blue')
    ];
    state.players[0].cardCount = 19;
    state.currentPlayerId = 'p1';
    
    const pairCards = state.players[0].cards.slice(-2);
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'pair',
      cardIds: pairCards.map(c => c.id),
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.players[0].eliminated).toBeFalsy();
    expect(state.players[0].cardCount).toBe(17);
  });

  test('given: 顺子连打 when: 执行后下家手牌增加 then: 可能触发淘汰', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    
    // p2已有19张牌
    state.players[1].cards = Array.from({ length: 19 }, (_, i) => createNumberCard(i % 10, 'red'));
    state.players[1].cardCount = 19;
    
    state.currentPlayerId = 'p1';
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    
    // p1出5张顺子，p2要摸3张，总计22张应该被淘汰
    state.players[0].cards = Array.from({ length: 5 }, (_, i) => createNumberCard(i + 1, 'red'));
    state.players[0].cardCount = 5;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'straight',
      cardIds: state.players[0].cards.map(c => c.id),
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    // p2应该被淘汰
    expect(state.players[1].eliminated).toBeTruthy();
  });

  test('given: 彩虹转移惩罚 when: 目标手牌超过20张 then: 目标被淘汰', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    
    // p2已有18张牌
    state.players[1].cards = Array.from({ length: 18 }, (_, i) => createNumberCard(i % 10, 'red'));
    state.players[1].cardCount = 18;
    
    state.pendingDraw = 4;
    state.currentPlayerId = 'p1';
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    
    // p1使用彩虹转移，p2要摸7张，总计25张应该被淘汰
    const rainbowCards = generateRainbow(3);
    state.players[0].cards = rainbowCards;
    state.players[0].cardCount = 4;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: 'p2',
      playerId: 'p1',
      timestamp: Date.now()
    }, 'p1');
    
    expect(state.players[1].eliminated).toBeTruthy();
  });
});

describe('复杂场景集成', () => {
  test('given: 多轮游戏 when: 各种动作交互 then: 游戏状态一致', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    
    // 模拟几轮游戏
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 3; i++) {
        const playerId = `p${i+1}`;
        state.currentPlayerId = playerId;
        
        // 模拟玩家摸牌
        mode.executeAction(state, {
          type: 'draw',
          playerId,
          timestamp: Date.now()
        }, playerId);
      }
    }
    
    // 检查游戏状态一致性
    expect(state.players.every(p => p.cards.length === p.cardCount)).toBeTruthy();
    expect(state.deck.length + state.discardPile.length + state.players.reduce((sum, p) => sum + p.cards.length, 0)).toBeGreaterThan(0);
  });

  test('given: 淘汰只剩1人 when: 检查胜利条件 then: 游戏结束', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1', eliminated: true }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3', eliminated: true })
      ]
    });
    const state = mode.initialize(room);
    
    const winner = mode.checkWinCondition(state);
    
    expect(winner).toBe('p2');
    expect(state.isRoundEnded).toBeTruthy();
  });
});

// ==================== 汇总 ====================

console.log('\n' + '='.repeat(50));
console.log(`📊 集成测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

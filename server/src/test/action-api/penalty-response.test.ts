/**
 * Action API v2.0 - 惩罚响应测试
 * 
 * 测试范围：
 * - +2累积链响应
 * - +4累积链响应
 * - 反转反击机制
 * - 彩虹转移惩罚
 * - 摸牌接受惩罚
 */

import { BaseGameMode } from '../../../src/game/modes/BaseGameMode.js';
import { OutMode } from '../../../src/game/modes/OutMode.js';
import { createMockRoom, createMockPlayer } from '../mocks/mock-game.js';
import { expect } from '../test-runner.js';
import type { GameState, GameAction } from '../../../src/shared/index.js';
import { 
  createNumberCard, 
  createActionCard, 
  createWildCard,
  createOutSpecialCard,
  createStackingGameState
} from '../utils/data-generator.js';

console.log('\n⚡ 惩罚响应 Action API 测试\n');

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

// ==================== 测试套件 ====================

describe('+2累积链响应', () => {
  test('given: 面临+2惩罚 when: 手中有+2 then: 可以叠加', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(2, 'draw2');
    const player = state.players[0];
    
    const draw2Card = createActionCard('draw2', 'red');
    player.cards = [draw2Card];
    
    const action: GameAction = {
      type: 'play',
      playerId: player.id,
      cardIds: [draw2Card.id],
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeTruthy();
  });

  test('given: +2叠加 when: 执行动作 then: pendingDraw增加2', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(4, 'draw2');
    const player = state.players[0];
    
    const draw2Card = createActionCard('draw2', 'red');
    player.cards = [draw2Card];
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw2Card.id],
      timestamp: Date.now()
    }, player.id);
    
    expect(state.pendingDraw).toBe(6);
    expect(state.pendingDrawType).toBe('draw2');
  });

  test('given: 多轮+2叠加 when: 检查累积 then: 正确累计', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(0, 'draw2');
    const player = state.players[0];
    
    // 第一轮+2
    const draw2Card1 = createActionCard('draw2', 'red');
    player.cards = [draw2Card1];
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw2Card1.id],
      timestamp: Date.now()
    }, player.id);
    expect(state.pendingDraw).toBe(2);
    
    // 第二轮+2（模拟下一玩家叠加）
    const draw2Card2 = createActionCard('draw2', 'blue');
    player.cards = [draw2Card2];
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw2Card2.id],
      timestamp: Date.now()
    }, player.id);
    expect(state.pendingDraw).toBe(4);
    
    // 第三轮+2
    const draw2Card3 = createActionCard('draw2', 'green');
    player.cards = [draw2Card3];
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw2Card3.id],
      timestamp: Date.now()
    }, player.id);
    expect(state.pendingDraw).toBe(6);
  });

  test('given: 面临+2惩罚 when: 手中没有+2 then: 无法出牌只能摸牌', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(4, 'draw2');
    const player = state.players[0];
    
    // 只有普通牌
    player.cards = [createNumberCard(5, 'red')];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    // 不应该有出牌选项
    const hasPlayAction = actions.some(a => a.type === 'play');
    expect(hasPlayAction).toBeFalsy();
    
    // 应该有摸牌选项
    const hasDrawAction = actions.some(a => a.type === 'draw');
    expect(hasDrawAction).toBeTruthy();
  });

  test('given: +2累积 when: 玩家摸牌接受惩罚 then: 摸取累积数量', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(6, 'draw2');
    const player = state.players[0];
    
    const initialCardCount = player.cards.length;
    
    mode.executeAction(state, {
      type: 'draw',
      playerId: player.id,
      timestamp: Date.now()
    }, player.id);
    
    expect(player.cards.length).toBe(initialCardCount + 6);
    expect(state.pendingDraw).toBe(0);
    expect(state.pendingDrawType).toBeUndefined();
  });
});

describe('+4累积链响应', () => {
  test('given: 面临+4惩罚 when: 手中有+4 then: 可以叠加', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(4, 'draw4');
    const player = state.players[0];
    
    const draw4Card = createWildCard('draw4');
    player.cards = [draw4Card];
    
    const action: GameAction = {
      type: 'play',
      playerId: player.id,
      cardIds: [draw4Card.id],
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeTruthy();
  });

  test('given: +4叠加 when: 执行动作 then: pendingDraw增加4', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(4, 'draw4');
    const player = state.players[0];
    
    const draw4Card = createWildCard('draw4');
    player.cards = [draw4Card];
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw4Card.id],
      timestamp: Date.now()
    }, player.id);
    
    expect(state.pendingDraw).toBe(8);
    expect(state.pendingDrawType).toBe('draw4');
  });

  test('given: 混合+2和+4 when: 在标准模式 then: 不能混合叠加', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(4, 'draw2');
    const player = state.players[0];
    
    // 面临+2惩罚，手中有+4
    const draw4Card = createWildCard('draw4');
    player.cards = [draw4Card];
    
    const action: GameAction = {
      type: 'play',
      playerId: player.id,
      cardIds: [draw4Card.id],
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    // 标准模式下+4不能叠加在+2上
    expect(result.valid).toBeFalsy();
  });
});

describe('反转反击', () => {
  test('given: Out模式有累积惩罚 when: 手中有反转牌 then: 可以反击', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer(), createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.pendingDraw = 4;
    state.pendingDrawType = 'draw2';
    state.direction = 'clockwise';
    
    const reverseCard = createActionCard('reverse', state.currentColor as any);
    player.cards = [reverseCard];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const reverseAction = actions.find(a => 
      a.type === 'play' && a.cardIds?.includes(reverseCard.id)
    );
    expect(reverseAction).toBeTruthy();
  });

  test('given: 执行反转反击 when: 检查效果 then: 上家受罚，方向反转', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    const player2 = state.players[1]; // p2出牌反击
    const player1 = state.players[0]; // p1是上家（攻击者）
    
    state.currentPlayerId = player2.id;
    state.pendingDraw = 6;
    state.pendingDrawType = 'draw2';
    state.direction = 'clockwise';
    
    const reverseCard = createActionCard('reverse', state.currentColor as any);
    player2.cards = [reverseCard];
    player2.cardCount = 1;
    
    const p1InitialCards = player1.cards.length;
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player2.id,
      cardIds: [reverseCard.id],
      timestamp: Date.now()
    }, player2.id);
    
    // 上家p1应该摸6张牌
    expect(player1.cards.length).toBe(p1InitialCards + 6);
    // 惩罚清零
    expect(state.pendingDraw).toBe(0);
    // 方向反转
    expect(state.direction).toBe('counterclockwise');
  });

  test('given: 2人游戏反转反击 when: 执行反击 then: 上家受罚，p2继续出牌', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player2 = state.players[1];
    const player1 = state.players[0];
    
    state.currentPlayerId = player2.id;
    state.pendingDraw = 4;
    state.direction = 'clockwise';
    
    const reverseCard = createActionCard('reverse', state.currentColor as any);
    player2.cards = [reverseCard];
    
    const p1InitialCards = player1.cards.length;
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player2.id,
      cardIds: [reverseCard.id],
      timestamp: Date.now()
    }, player2.id);
    
    // 上家p1摸牌
    expect(player1.cards.length).toBe(p1InitialCards + 4);
    // 2人游戏反转后当前玩家继续
    expect(state.currentPlayerId).toBe(player2.id);
  });
});

describe('彩虹转移惩罚', () => {
  test('given: Out模式有累积惩罚 when: 手中有彩虹组合 then: 可以转移惩罚', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.pendingDraw = 6;
    state.pendingDrawType = 'draw2';
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 给玩家彩虹组合
    player.cards = [
      createNumberCard(3, 'red'),
      createNumberCard(3, 'yellow'),
      createNumberCard(3, 'green'),
      createNumberCard(3, 'blue')
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const comboAction = actions.find(a => a.type === 'combo');
    expect(comboAction).toBeTruthy();
    expect(comboAction?.comboType).toBe('rainbow');
  });

  test('given: 执行彩虹转移 when: 选择目标 then: 目标承受惩罚+彩虹效果', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
        createMockPlayer({ id: 'p3' })
      ]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.pendingDraw = 4;
    state.pendingDrawType = 'draw2';
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const rainbowCards = [
      createNumberCard(3, 'red'),
      createNumberCard(3, 'yellow'),
      createNumberCard(3, 'green'),
      createNumberCard(3, 'blue')
    ];
    player1.cards = rainbowCards;
    player1.cardCount = 4;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: player2.id,
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    // 彩虹效果：3张 + 累积4张 = 7张
    expect(player2.cards.length).toBe(p2InitialCards + 7);
    expect(state.pendingDraw).toBe(0);
  });

  test('given: 没有累积惩罚 when: 执行彩虹 then: 目标只摸3张', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.pendingDraw = 0;
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const rainbowCards = [
      createNumberCard(3, 'red'),
      createNumberCard(3, 'yellow'),
      createNumberCard(3, 'green'),
      createNumberCard(3, 'blue')
    ];
    player1.cards = rainbowCards;
    player1.cardCount = 4;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: player2.id,
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    // 没有累积惩罚，只摸3张
    expect(player2.cards.length).toBe(p2InitialCards + 3);
  });
});

describe('Out模式特殊惩罚牌', () => {
  test('given: Out模式 when: 手中有+3牌 then: 可以正常出牌', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const draw3Card = createOutSpecialCard('draw3', 'red');
    player.cards = [draw3Card];
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const action: GameAction = {
      type: 'play',
      playerId: player.id,
      cardIds: [draw3Card.id],
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeTruthy();
  });

  test('given: +3牌 when: 执行出牌 then: 设置pendingDraw为3', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const draw3Card = createOutSpecialCard('draw3', 'red');
    player.cards = [draw3Card];
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw3Card.id],
      timestamp: Date.now()
    }, player.id);
    
    expect(state.pendingDraw).toBe(3);
    expect(state.pendingDrawType).toBe('draw3');
  });

  test('given: +5牌 when: 执行出牌 then: 设置pendingDraw为5', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const draw5Card = createOutSpecialCard('draw5', 'red');
    player.cards = [draw5Card];
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw5Card.id],
      timestamp: Date.now()
    }, player.id);
    
    expect(state.pendingDraw).toBe(5);
    expect(state.pendingDrawType).toBe('draw5');
  });

  test('given: +8牌 when: 执行出牌 then: 设置pendingDraw为8', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const draw8Card = createOutSpecialCard('draw8', 'wild');
    player.cards = [draw8Card];
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    mode.executeAction(state, {
      type: 'play',
      playerId: player.id,
      cardIds: [draw8Card.id],
      timestamp: Date.now()
    }, player.id);
    
    expect(state.pendingDraw).toBe(8);
    expect(state.pendingDrawType).toBe('draw8');
  });
});

describe('边界情况', () => {
  test('given: 最大累积惩罚 when: 玩家摸牌 then: 正确处理大量摸牌', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(20, 'draw2');
    const player = state.players[0];
    
    // 给牌堆添加足够的牌
    state.deck = Array.from({ length: 50 }, (_, i) => 
      createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as any)
    );
    
    const initialCardCount = player.cards.length;
    
    mode.executeAction(state, {
      type: 'draw',
      playerId: player.id,
      timestamp: Date.now()
    }, player.id);
    
    expect(player.cards.length).toBe(initialCardCount + 20);
    expect(state.pendingDraw).toBe(0);
  });

  test('given: 牌堆不足 when: 摸取大量惩罚牌 then: 重新洗牌后继续', () => {
    const mode = new BaseGameMode();
    const state = createStackingGameState(10, 'draw2');
    const player = state.players[0];
    
    // 牌堆只有5张牌
    state.deck = Array.from({ length: 5 }, (_, i) => 
      createNumberCard(i, 'red')
    );
    // 弃牌堆有牌可以重洗
    state.discardPile = [
      createNumberCard(9, 'blue'),
      ...Array.from({ length: 20 }, (_, i) => createNumberCard(i, 'green'))
    ];
    
    const initialCardCount = player.cards.length;
    
    mode.executeAction(state, {
      type: 'draw',
      playerId: player.id,
      timestamp: Date.now()
    }, player.id);
    
    // 应该摸够10张（5张直接摸 + 5张重洗后摸）
    expect(player.cards.length).toBe(initialCardCount + 10);
  });
});

// ==================== 汇总 ====================

console.log('\n' + '='.repeat(50));
console.log(`📊 惩罚响应测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

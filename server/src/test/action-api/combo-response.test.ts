/**
 * Action API v2.0 - 连打响应测试
 * 
 * 测试范围：
 * - 对子连打响应
 * - 三条连打响应
 * - 彩虹连打响应
 * - 顺子连打响应
 * - 连打效果验证
 */

import { OutMode } from '../../../src/game/modes/OutMode.js';
import { createMockRoom, createMockPlayer } from '../mocks/mock-game.js';
import { expect } from '../test-runner.js';
import type { GameState, GameAction } from '../../../src/shared/index.js';
import { 
  createNumberCard, 
  createActionCard,
  generatePair,
  generateThreeOfAKind,
  generateRainbow,
  generateStraight
} from '../utils/data-generator.js';

console.log('\n🎴 连打响应 Action API 测试\n');

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

describe('对子连打', () => {
  test('given: 手牌有可匹配的对子 when: 获取可用动作 then: 包含对子连打选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 弃牌堆是红色3
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 玩家有对子3（红色和蓝色）
    player.cards = [
      createNumberCard(3, 'red'),   // 匹配
      createNumberCard(3, 'blue'),  // 与第一张组成对子
      createNumberCard(7, 'green')
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const pairCombo = actions.find(a => a.type === 'combo' && a.comboType === 'pair');
    expect(pairCombo).toBeTruthy();
    expect(pairCombo?.cardIds?.length).toBe(2);
  });

  test('given: 执行对子连打 when: 检查效果 then: 手牌减少2张，无特殊效果', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const pairCards = generatePair(3, 'red', 'blue');
    player1.cards = [...pairCards, createNumberCard(7, 'green')];
    player1.cardCount = 3;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'pair',
      cardIds: pairCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(player1.cards).toHaveLength(1);
    expect(player1.cardCount).toBe(1);
    expect(state.currentPlayerId).toBe(player2.id);
    // 对子无额外效果
    expect(player2.cards.length).toBe(p2InitialCards);
  });

  test('given: 多个可匹配的对子 when: 获取可用动作 then: 返回所有对子选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 玩家有两个对子都可以匹配
    player.cards = [
      createNumberCard(3, 'red'),   // 对子1
      createNumberCard(3, 'blue'),
      createNumberCard(5, 'red'),   // 对子2（匹配颜色）
      createNumberCard(5, 'yellow')
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const pairCombos = actions.filter(a => a.type === 'combo' && a.comboType === 'pair');
    expect(pairCombos.length).toBeGreaterThanOrEqual(2);
  });
});

describe('三条连打', () => {
  test('given: 手牌有可匹配的三条 when: 获取可用动作 then: 包含三条连打选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(7, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const threeCards = generateThreeOfAKind(7, ['red', 'blue', 'green']);
    player.cards = [...threeCards, createNumberCard(5, 'yellow')];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const threeCombo = actions.find(a => a.type === 'combo' && a.comboType === 'three');
    expect(threeCombo).toBeTruthy();
    expect(threeCombo?.cardIds?.length).toBe(3);
  });

  test('given: 执行三条连打 when: 检查效果 then: 跳过下家', () => {
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
    const player3 = state.players[2];
    
    state.discardPile = [createNumberCard(7, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const threeCards = generateThreeOfAKind(7, ['red', 'blue', 'green']);
    player1.cards = threeCards;
    player1.cardCount = 3;
    
    const newState = mode.executeAction(state, {
      type: 'combo',
      comboType: 'three',
      cardIds: threeCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    // 三条效果：跳过p2，轮到p3
    expect(newState.skippedPlayerId).toBe(player2.id);
    expect(newState.currentPlayerId).toBe(player3.id);
  });

  test('given: 三条数字不匹配 when: 验证连打 then: 返回错误', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 三张不同数字的牌
    player.cards = [
      createNumberCard(3, 'red'),
      createNumberCard(4, 'blue'),
      createNumberCard(5, 'green')
    ];
    
    const action: GameAction = {
      type: 'combo',
      comboType: 'three',
      cardIds: player.cards.map(c => c.id),
      playerId: player.id,
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeFalsy();
  });
});

describe('彩虹连打', () => {
  test('given: 手牌有彩虹组合 when: 获取可用动作 then: 包含彩虹连打选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const rainbowCards = generateRainbow(3);
    player.cards = rainbowCards;
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const rainbowCombo = actions.find(a => a.type === 'combo' && a.comboType === 'rainbow');
    expect(rainbowCombo).toBeTruthy();
    expect(rainbowCombo?.cardIds?.length).toBe(4);
  });

  test('given: 手牌有4个彩虹 when: 获取可用动作 then: 返回所有彩虹选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 两个彩虹组合
    player.cards = [
      ...generateRainbow(3),
      ...generateRainbow(5)
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const rainbowCombos = actions.filter(a => a.type === 'combo' && a.comboType === 'rainbow');
    expect(rainbowCombos.length).toBeGreaterThanOrEqual(2);
  });

  test('given: 彩虹颜色不足4种 when: 验证连打 then: 返回错误', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 只有3种颜色的同数字
    player.cards = [
      createNumberCard(3, 'red'),
      createNumberCard(3, 'blue'),
      createNumberCard(3, 'green')
    ];
    
    const action: GameAction = {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: player.cards.map(c => c.id),
      playerId: player.id,
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeFalsy();
  });
});

describe('顺子连打', () => {
  test('given: 手牌有顺子 when: 获取可用动作 then: 包含顺子连打选项', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const straightCards = generateStraight(1, 3, 'red'); // 红1,2,3
    player.cards = [...straightCards, createNumberCard(7, 'blue')];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const straightCombo = actions.find(a => a.type === 'combo' && a.comboType === 'straight');
    expect(straightCombo).toBeTruthy();
  });

  test('given: 执行3张顺子连打 when: 检查效果 then: 下家摸1张', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const straightCards = generateStraight(1, 3, 'red'); // 红1,2,3
    player1.cards = straightCards;
    player1.cardCount = 3;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'straight',
      cardIds: straightCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    // 顺子效果：3张顺子=下家摸1张
    expect(player2.cards.length).toBe(p2InitialCards + 1);
  });

  test('given: 执行4张顺子连打 when: 检查效果 then: 下家摸2张', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const straightCards = generateStraight(1, 4, 'red'); // 红1,2,3,4
    player1.cards = straightCards;
    player1.cardCount = 4;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'straight',
      cardIds: straightCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    // 顺子效果：4张顺子=下家摸2张
    expect(player2.cards.length).toBe(p2InitialCards + 2);
  });

  test('given: 顺子不连续 when: 验证连打 then: 返回错误', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 不连续的牌（1,2,4）
    player.cards = [
      createNumberCard(1, 'red'),
      createNumberCard(2, 'red'),
      createNumberCard(4, 'red')
    ];
    
    const action: GameAction = {
      type: 'combo',
      comboType: 'straight',
      cardIds: player.cards.map(c => c.id),
      playerId: player.id,
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeFalsy();
  });

  test('given: 顺子不同色 when: 验证连打 then: 返回错误', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(1, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 不同颜色的连续数字
    player.cards = [
      createNumberCard(1, 'red'),
      createNumberCard(2, 'red'),
      createNumberCard(3, 'blue') // 不同色
    ];
    
    const action: GameAction = {
      type: 'combo',
      comboType: 'straight',
      cardIds: player.cards.map(c => c.id),
      playerId: player.id,
      timestamp: Date.now()
    };
    
    const result = mode.validateAction(state, action, player.id);
    expect(result.valid).toBeFalsy();
  });
});

describe('连打组合优先级', () => {
  test('given: 手牌有多种连打 when: 获取可用动作 then: 返回所有可用组合', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 给玩家多种连打组合
    player.cards = [
      // 对子3
      createNumberCard(3, 'red'),
      createNumberCard(3, 'blue'),
      // 三条7（同时也有对子7）
      createNumberCard(7, 'red'),
      createNumberCard(7, 'blue'),
      createNumberCard(7, 'green'),
      // 顺子1-2-3
      createNumberCard(1, 'red'),
      createNumberCard(2, 'red')
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    const comboActions = actions.filter(a => a.type === 'combo');
    
    expect(comboActions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('连打出牌后游戏状态', () => {
  test('given: 执行连打出牌 when: 检查弃牌堆 then: 连打牌按顺序加入弃牌堆', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const pairCards = generatePair(3, 'red', 'blue');
    player1.cards = pairCards;
    player1.cardCount = 2;
    
    const initialDiscardCount = state.discardPile.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'pair',
      cardIds: pairCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(state.discardPile.length).toBe(initialDiscardCount + 2);
    // 最后一张牌决定当前颜色
    expect(state.currentColor).toBe('blue');
  });

  test('given: 连打后只剩1张牌 when: 检查游戏状态 then: 可以喊UNO', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    // 3张牌，连打对子后剩1张
    const pairCards = generatePair(3, 'red', 'blue');
    player1.cards = [...pairCards, createNumberCard(7, 'red')];
    player1.cardCount = 3;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'pair',
      cardIds: pairCards.map(c => c.id),
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(player1.cards).toHaveLength(1);
    expect(player1.cardCount).toBe(1);
    
    // 检查是否可以喊UNO
    const unoResult = mode.validateAction(state, {
      type: 'uno',
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(unoResult.valid).toBeTruthy();
  });
});

describe('连打边界情况', () => {
  test('given: 顺子长度超过5 when: 检测可用连打 then: 正确识别长顺子', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(0, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 长顺子：0,1,2,3,4,5,6,7
    player.cards = generateStraight(0, 8, 'red');
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const straightCombos = actions.filter(a => a.type === 'combo' && a.comboType === 'straight');
    expect(straightCombos.length).toBeGreaterThanOrEqual(1);
  });

  test('given: 多张相同数字和颜色 when: 检测对子 then: 正确处理重复牌', () => {
    const mode = new OutMode();
    const room = createMockRoom({ players: [createMockPlayer()] });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    state.discardPile = [createNumberCard(5, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    // 两张红5（理论上不应出现，但测试边界情况）
    player.cards = [
      createNumberCard(5, 'red'),
      createNumberCard(5, 'red'),
      createNumberCard(5, 'blue')
    ];
    
    const actions = mode.getAvailableActions(state, player.id);
    
    const pairCombos = actions.filter(a => a.type === 'combo' && a.comboType === 'pair');
    // 应该能组成对子
    expect(pairCombos.length).toBeGreaterThanOrEqual(1);
  });

  test('given: 彩虹后还有其他牌 when: 执行彩虹 then: 正确处理剩余手牌', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer(), createMockPlayer()]
    });
    const state = mode.initialize(room);
    const player1 = state.players[0];
    const player2 = state.players[1];
    
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player1.id;
    
    const rainbowCards = generateRainbow(3);
    player1.cards = [...rainbowCards, createNumberCard(1, 'red'), createNumberCard(9, 'blue')];
    player1.cardCount = 6;
    
    const p2InitialCards = player2.cards.length;
    
    mode.executeAction(state, {
      type: 'combo',
      comboType: 'rainbow',
      cardIds: rainbowCards.map(c => c.id),
      targetId: player2.id,
      playerId: player1.id,
      timestamp: Date.now()
    }, player1.id);
    
    expect(player1.cards).toHaveLength(2);
    expect(player1.cardCount).toBe(2);
    expect(player2.cards.length).toBe(p2InitialCards + 3);
  });
});

// ==================== 汇总 ====================

console.log('\n' + '='.repeat(50));
console.log(`📊 连打响应测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

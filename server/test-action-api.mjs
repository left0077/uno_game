/**
 * Action API v2.0 单元测试
 * 
 * 测试场景：
 * 1. 正常回合的动作
 * 2. 被+2时的动作
 * 3. 被+4时的动作
 * 4. 连打响应惩罚（Out模式）
 * 5. 彩虹转移（Out模式）
 */

import { BaseGameMode } from './dist/game/modes/BaseGameMode.js';
import { OutMode } from './dist/game/modes/OutMode.js';
import { ACTION_API_VERSION } from './dist/shared/actionApi.js';

// 简单的测试框架
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n========== Action API v2.0 测试 ==========\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log('\n========== 测试结果 ==========');
    console.log(`总计: ${this.tests.length}`);
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log('=============================\n');
    
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }
}

const runner = new TestRunner();

// 辅助函数：创建测试用的游戏状态
function createTestGameState(options = {}) {
  const player1 = {
    id: 'player1',
    nickname: 'Player 1',
    cards: options.player1Cards || [],
    cardCount: (options.player1Cards || []).length,
    eliminated: false,
    isConnected: true,
    isAI: false,
    isHost: true
  };

  const player2 = {
    id: 'player2',
    nickname: 'Player 2',
    cards: options.player2Cards || [],
    cardCount: (options.player2Cards || []).length,
    eliminated: false,
    isConnected: true,
    isAI: false,
    isHost: false
  };

  const topCard = options.topCard || {
    id: 'top1',
    type: 'number',
    color: 'red',
    value: 5
  };

  return {
    currentPlayerId: options.currentPlayerId || 'player1',
    direction: 'clockwise',
    deck: [],
    discardPile: [topCard],
    currentColor: options.currentColor || 'red',
    turnTimer: 120,
    turnStartTime: Date.now(),
    players: [player1, player2],
    rankings: [],
    isRoundEnded: false,
    pendingDraw: options.pendingDraw || 0,
    pendingDrawType: options.pendingDrawType,
    gameStartTime: Date.now()
  };
}

// 辅助函数：创建测试用的卡牌
function createCard(id, type, color, value) {
  return { id, type, color, value };
}

// ==================== 测试用例 ====================

// 测试1: 版本号检查
runner.test('ACTION_API_VERSION 应该是 2.0', () => {
  runner.assertEquals(ACTION_API_VERSION, '2.0', '版本号不匹配');
});

// 测试2: BaseGameMode - 正常回合
runner.test('BaseGameMode - 正常回合应该返回正确的 AvailableActions', () => {
  const mode = new BaseGameMode();
  const cards = [
    createCard('c1', 'number', 'red', 5),
    createCard('c2', 'number', 'blue', 7),
    createCard('c3', 'skip', 'red', 'skip'),
    createCard('c4', 'wild', 'wild', 'wild')
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    topCard: createCard('top1', 'number', 'red', 3),
    currentColor: 'red'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证基本结构
  runner.assert(actions.version === '2.0', '版本号应该是 2.0');
  runner.assert(actions.playerId === 'player1', 'playerId 应该匹配');
  runner.assert(actions.timestamp > 0, 'timestamp 应该大于 0');
  runner.assert(actions.state.type === 'normal', '状态应该是 normal');

  // 验证可出牌
  runner.assert(actions.actions.play.enabled, '应该有可出的牌');
  runner.assert(actions.actions.play.cards.length > 0, '可出牌列表不应为空');

  // 红色5可以出（颜色匹配）
  const redFive = actions.actions.play.cards.find(c => c.cardId === 'c1');
  runner.assert(redFive !== undefined, '红色5应该可以出');
  runner.assert(redFive.reasons.some(r => r.type === 'color_match'), '红色5应该有 color_match 原因');

  // 红色skip可以出（颜色匹配）
  const redSkip = actions.actions.play.cards.find(c => c.cardId === 'c3');
  runner.assert(redSkip !== undefined, '红色skip应该可以出');

  // 万能牌可以出
  const wildCard = actions.actions.play.cards.find(c => c.cardId === 'c4');
  runner.assert(wildCard !== undefined, '万能牌应该可以出');
  runner.assert(wildCard.reasons.some(r => r.type === 'wild'), '万能牌应该有 wild 原因');

  // 蓝色7不应该可以出（颜色和数字都不匹配）
  const blueSeven = actions.actions.play.cards.find(c => c.cardId === 'c2');
  runner.assert(blueSeven === undefined, '蓝色7不应该可以出');

  // 验证可以摸牌
  runner.assert(actions.actions.draw.enabled, '应该可以摸牌');
  runner.assert(actions.actions.draw.count === 1, '应该摸1张牌');
  runner.assert(actions.actions.draw.reason === 'optional', '摸牌原因应该是 optional');

  // 验证没有惩罚响应选项
  runner.assert(!actions.actions.penaltyResponse.enabled, '正常回合不应该有惩罚响应选项');

  console.log(`   [日志] 可出牌数量: ${actions.actions.play.cards.length}`);
});

// 测试3: BaseGameMode - 被+2时的动作
runner.test('BaseGameMode - 被+2时应该返回正确的惩罚响应', () => {
  const mode = new BaseGameMode();
  const cards = [
    createCard('c1', 'draw2', 'red', 2),
    createCard('c2', 'number', 'blue', 7),
    createCard('c3', 'skip', 'green', 'skip')
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    topCard: createCard('top1', 'draw2', 'red', 2),
    currentColor: 'red',
    pendingDraw: 4,
    pendingDrawType: 'draw2'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证状态
  runner.assert(actions.state.type === 'pending_draw', '状态应该是 pending_draw');
  runner.assert(actions.state.pendingDraw?.count === 4, '待摸牌数应该是 4');
  runner.assert(actions.state.pendingDraw?.type === 'draw2', '惩罚类型应该是 draw2');

  // 验证可以跟+的牌
  runner.assert(actions.actions.play.enabled, '应该有可跟+的牌');
  const draw2Card = actions.actions.play.cards.find(c => c.card.type === 'draw2');
  runner.assert(draw2Card !== undefined, '应该可以跟+2');
  runner.assert(draw2Card.reasons.some(r => r.type === 'stack'), '跟+应该有 stack 原因');

  // 验证摸牌选项
  runner.assert(actions.actions.draw.enabled, '应该可以摸牌');
  runner.assert(actions.actions.draw.count === 4, '应该摸4张牌（接受惩罚）');
  runner.assert(actions.actions.draw.reason === 'penalty', '摸牌原因应该是 penalty');

  console.log(`   [日志] 可跟+牌数量: ${actions.actions.play.cards.length}, 惩罚数量: ${actions.actions.draw.count}`);
});

// 测试4: BaseGameMode - 被+4时的动作
runner.test('BaseGameMode - 被+4时应该返回正确的惩罚响应', () => {
  const mode = new BaseGameMode();
  const cards = [
    createCard('c1', 'draw4', 'wild', 4),
    createCard('c2', 'number', 'blue', 7)
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    topCard: createCard('top1', 'draw4', 'wild', 4),
    currentColor: 'blue',
    pendingDraw: 8,
    pendingDrawType: 'draw4'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证状态
  runner.assert(actions.state.type === 'pending_draw', '状态应该是 pending_draw');
  runner.assert(actions.state.pendingDraw?.count === 8, '待摸牌数应该是 8');
  runner.assert(actions.state.pendingDraw?.type === 'draw4', '惩罚类型应该是 draw4');

  // 验证可以跟+4
  const draw4Card = actions.actions.play.cards.find(c => c.card.type === 'draw4');
  runner.assert(draw4Card !== undefined, '应该可以跟+4');

  // 验证摸牌选项
  runner.assert(actions.actions.draw.count === 8, '应该摸8张牌');

  console.log(`   [日志] 惩罚累积: +${actions.actions.draw.count}`);
});

// 测试5: OutMode - 连打响应惩罚
runner.test('OutMode - 应该支持连打响应惩罚', () => {
  const mode = new OutMode();
  const cards = [
    createCard('c1', 'number', 'red', 5),
    createCard('c2', 'number', 'blue', 5),  // 对子
    createCard('c3', 'number', 'green', 5),
    createCard('c4', 'number', 'yellow', 5),
    createCard('c5', 'reverse', 'red', 'reverse')
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    topCard: createCard('top1', 'draw2', 'red', 2),
    currentColor: 'red',
    pendingDraw: 4,
    pendingDrawType: 'draw2'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证状态
  runner.assert(actions.state.type === 'pending_draw', '状态应该是 pending_draw');
  runner.assert(actions.state.pendingDraw?.canCombo === true, 'Out模式应该支持连打响应');
  runner.assert(actions.state.pendingDraw?.canReverse === true, 'Out模式应该支持反转');

  // 验证连打启动牌
  runner.assert(actions.actions.combo.enabled, '应该有连打启动牌');
  runner.assert(actions.actions.combo.starters.length > 0, '连打启动牌列表不应为空');

  // 红色5是连打启动牌
  const redFiveStarter = actions.actions.combo.starters.find(s => s.cardId === 'c1');
  runner.assert(redFiveStarter !== undefined, '红色5应该是连打启动牌');
  runner.assert(redFiveStarter.combos.length > 0, '应该有可用的连打组合');

  // 验证有对子组合
  const pairCombo = redFiveStarter.combos.find(c => c.type === 'pair');
  runner.assert(pairCombo !== undefined, '应该有对子组合');
  runner.assert(pairCombo.requiredCards.length === 2, '对子需要2张牌');

  // 验证反转牌可以出
  const reverseCard = actions.actions.play.cards.find(c => c.card.type === 'reverse');
  runner.assert(reverseCard !== undefined, '应该有反转牌选项');
  runner.assert(reverseCard.effects.some(e => e.type === 'reverse'), '反转牌应该有 reverse 效果');

  console.log(`   [日志] 连打启动牌: ${actions.actions.combo.starters.length}个, 组合类型: ${redFiveStarter.combos.map(c => c.type).join(',')}`);
});

// 测试6: OutMode - 彩虹转移
runner.test('OutMode - 应该支持彩虹转移', () => {
  const mode = new OutMode();
  const cards = [
    createCard('c1', 'number', 'red', 7),
    createCard('c2', 'number', 'blue', 7),
    createCard('c3', 'number', 'green', 7),
    createCard('c4', 'number', 'yellow', 7),  // 四色7，形成彩虹
    createCard('c5', 'draw2', 'red', 2)
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    player2Cards: [createCard('p2c1', 'number', 'red', 3)],
    topCard: createCard('top1', 'draw2', 'red', 2),
    currentColor: 'red',
    pendingDraw: 2,
    pendingDrawType: 'draw2'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证彩虹转移选项
  runner.assert(actions.actions.penaltyResponse.enabled, '应该有惩罚响应选项');
  
  const rainbowOption = actions.actions.penaltyResponse.options.find(o => o.type === 'rainbow');
  runner.assert(rainbowOption !== undefined, '应该有彩虹转移选项');
  runner.assert(rainbowOption.name === '彩虹转移', '选项名称应该是 彩虹转移');
  runner.assert(rainbowOption.requiresCards?.length === 4, '彩虹需要4张牌');
  runner.assert(rainbowOption.outcome.type === 'transfer', '结果类型应该是 transfer');

  // 验证有目标候选
  runner.assert(rainbowOption.requiresTarget !== undefined, '应该有目标选择');
  runner.assert(rainbowOption.requiresTarget.candidates.length > 0, '应该有目标候选');

  console.log(`   [日志] 彩虹转移: 需要${rainbowOption.requiresCards.length}张牌, 目标候选: ${rainbowOption.requiresTarget.candidates.length}人`);
});

// 测试7: OutMode - 正常回合连打检测
runner.test('OutMode - 正常回合应该检测所有连打组合', () => {
  const mode = new OutMode();
  const cards = [
    createCard('c1', 'number', 'red', 5),
    createCard('c2', 'number', 'blue', 5),  // 对子
    createCard('c3', 'number', 'green', 5),
    createCard('c4', 'number', 'yellow', 5), // 彩虹
    createCard('c5', 'number', 'red', 6),
    createCard('c6', 'number', 'red', 7)    // 顺子 5-6-7
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    topCard: createCard('top1', 'number', 'red', 3),
    currentColor: 'red'
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证连打启用
  runner.assert(actions.actions.combo.enabled, '应该启用连打');
  runner.assert(actions.actions.combo.starters.length > 0, '应该有连打启动牌');

  // 验证有对子组合
  const redFiveStarter = actions.actions.combo.starters.find(s => s.cardId === 'c1');
  runner.assert(redFiveStarter !== undefined, '红色5应该是启动牌');
  
  const pairCombo = redFiveStarter.combos.find(c => c.type === 'pair');
  runner.assert(pairCombo !== undefined, '应该有对子');

  const threeCombo = redFiveStarter.combos.find(c => c.type === 'three');
  runner.assert(threeCombo !== undefined, '应该有三条');

  const rainbowCombo = redFiveStarter.combos.find(c => c.type === 'rainbow');
  runner.assert(rainbowCombo !== undefined, '应该有彩虹');

  // 验证有顺子
  const redFiveStraightStarter = actions.actions.combo.starters.find(s => s.cardId === 'c1');
  const straightCombo = redFiveStraightStarter?.combos.find(c => c.type === 'straight');
  // 顺子也在红色5的启动牌中
  runner.assert(straightCombo !== undefined || actions.actions.combo.starters.some(s => 
    s.combos.some(c => c.type === 'straight')
  ), '应该有顺子');

  console.log(`   [日志] 连打启动牌: ${actions.actions.combo.starters.length}个, 组合: 对子${pairCombo ? '✓' : '✗'} 三条${threeCombo ? '✓' : '✗'} 彩虹${rainbowCombo ? '✓' : '✗'}`);
});

// 测试8: BaseGameMode - 非当前玩家返回空动作
runner.test('BaseGameMode - 非当前玩家应该返回空动作', () => {
  const mode = new BaseGameMode();
  const cards = [
    createCard('c1', 'number', 'red', 5)
  ];
  
  const state = createTestGameState({
    player1Cards: cards,
    currentPlayerId: 'player2' // 当前是player2的回合
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  runner.assert(actions.actions.play.enabled === false, '非当前玩家不应该有可出的牌');
  runner.assert(actions.actions.play.cards.length === 0, '可出牌列表应该为空');
  runner.assert(actions.actions.draw.enabled === false, '非当前玩家不应该可以摸牌');
  runner.assert(actions.state.message.includes('等待'), '状态消息应该包含等待');
});

// 测试9: BaseGameMode - 淘汰玩家返回空动作
runner.test('BaseGameMode - 淘汰玩家应该返回空动作', () => {
  const mode = new BaseGameMode();
  const cards = [createCard('c1', 'number', 'red', 5)];
  
  const state = createTestGameState({
    player1Cards: cards
  });
  state.players[0].eliminated = true;

  const actions = mode.getAvailableActionsV2(state, 'player1');

  runner.assert(actions.state.type === 'eliminated', '状态应该是 eliminated');
  runner.assert(actions.actions.play.enabled === false, '淘汰玩家不应该有可出的牌');
});

// 测试10: 验证数据结构完整性
runner.test('AvailableActions 数据结构应该完整', () => {
  const mode = new BaseGameMode();
  const state = createTestGameState({
    player1Cards: [createCard('c1', 'number', 'red', 5)]
  });

  const actions = mode.getAvailableActionsV2(state, 'player1');

  // 验证顶层字段
  runner.assert(typeof actions.version === 'string', 'version 应该是字符串');
  runner.assert(typeof actions.timestamp === 'number', 'timestamp 应该是数字');
  runner.assert(typeof actions.playerId === 'string', 'playerId 应该是字符串');
  runner.assert(typeof actions.gameId === 'string', 'gameId 应该是字符串');

  // 验证 state 字段
  runner.assert(typeof actions.state === 'object', 'state 应该是对象');
  runner.assert(typeof actions.state.type === 'string', 'state.type 应该是字符串');
  runner.assert(typeof actions.state.message === 'string', 'state.message 应该是字符串');

  // 验证 actions 字段
  runner.assert(typeof actions.actions === 'object', 'actions 应该是对象');
  runner.assert(typeof actions.actions.play === 'object', 'actions.play 应该是对象');
  runner.assert(typeof actions.actions.combo === 'object', 'actions.combo 应该是对象');
  runner.assert(typeof actions.actions.penaltyResponse === 'object', 'actions.penaltyResponse 应该是对象');
  runner.assert(typeof actions.actions.draw === 'object', 'actions.draw 应该是对象');
  runner.assert(typeof actions.actions.special === 'object', 'actions.special 应该是对象');

  // 验证 metadata 字段
  runner.assert(typeof actions.metadata === 'object', 'metadata 应该是对象');
  runner.assert(typeof actions.metadata.cache === 'object', 'metadata.cache 应该是对象');
  runner.assert(typeof actions.metadata.debug === 'object', 'metadata.debug 应该是对象');
});

// 运行测试
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});

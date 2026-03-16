/**
 * Action API v2.0 - 性能测试
 * 
 * 测试范围：
 * - getAvailableActions 响应时间 < 50ms
 * - 内存占用测试
 * - 并发测试
 * - 大数据量测试
 */

import { BaseGameMode } from '../../../src/game/modes/BaseGameMode.js';
import { OutMode } from '../../../src/game/modes/OutMode.js';
import { createMockRoom, createMockPlayer } from '../mocks/mock-game.js';
import { expect } from '../test-runner.js';
import { 
  createNumberCard, 
  createActionCard,
  generatePair,
  generateRainbow,
  generateStraight
} from '../utils/data-generator.js';
import type { GameState } from '../../../src/shared/index.js';

console.log('\n⚡ Action API 性能测试\n');

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

// 性能测试辅助函数
function measureTime(fn: () => void, iterations: number = 1): number {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000 / iterations; // 转换为毫秒
}

function measureMemory(): number {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage().heapUsed;
}

// ==================== 测试套件 ====================

describe('getAvailableActions 响应时间', () => {
  test('given: 标准手牌7张 when: 获取可用动作 then: 响应时间 < 50ms', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const playerId = state.players[0].id;
    
    const avgTime = measureTime(() => {
      mode.getAvailableActions(state, playerId);
    }, 100);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(50);
  });

  test('given: 大手牌20张 when: 获取可用动作 then: 响应时间 < 50ms', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 给玩家20张牌
    player.cards = Array.from({ length: 20 }, (_, i) => 
      createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as any)
    );
    player.cardCount = 20;
    
    const avgTime = measureTime(() => {
      mode.getAvailableActions(state, player.id);
    }, 100);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(50);
  });

  test('given: Out模式有连打组合 when: 获取可用动作 then: 响应时间 < 50ms', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 给玩家包含多个连打组合的手牌
    player.cards = [
      ...generatePair(5, 'red', 'blue'),
      ...generateRainbow(3),
      ...generateStraight(1, 4, 'red'),
      createNumberCard(7, 'green'),
      createNumberCard(9, 'yellow')
    ];
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    
    const avgTime = measureTime(() => {
      mode.getAvailableActions(state, player.id);
    }, 100);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(50);
  });

  test('given: 大量连打组合 when: 获取可用动作 then: 响应时间 < 100ms', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 给玩家大量可能形成连打的牌
    const cards = [];
    for (let i = 0; i < 5; i++) {
      // 5个不同数字，每个数字4个颜色
      for (const color of ['red', 'blue', 'green', 'yellow']) {
        cards.push(createNumberCard(i, color as any));
      }
    }
    player.cards = cards;
    state.discardPile = [createNumberCard(0, 'red')];
    state.currentColor = 'red';
    
    const avgTime = measureTime(() => {
      mode.getAvailableActions(state, player.id);
    }, 50);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(100);
  });
});

describe('动作验证响应时间', () => {
  test('given: 标准游戏状态 when: 验证出牌动作 then: 响应时间 < 10ms', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const playableCard = createNumberCard(5, state.currentColor as any);
    player.cards = [playableCard];
    
    const avgTime = measureTime(() => {
      mode.validateAction(state, {
        type: 'play',
        playerId: player.id,
        cardIds: [playableCard.id],
        timestamp: Date.now()
      }, player.id);
    }, 1000);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(10);
  });

  test('given: 复杂连打验证 when: 验证彩虹连打 then: 响应时间 < 20ms', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const rainbowCards = generateRainbow(3);
    player.cards = rainbowCards;
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const avgTime = measureTime(() => {
      mode.validateAction(state, {
        type: 'combo',
        comboType: 'rainbow',
        cardIds: rainbowCards.map(c => c.id),
        targetId: state.players[1].id,
        playerId: player.id,
        timestamp: Date.now()
      }, player.id);
    }, 1000);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(20);
  });
});

describe('动作执行性能', () => {
  test('given: 标准游戏状态 when: 执行出牌动作 then: 响应时间 < 20ms', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const playableCard = createNumberCard(5, state.currentColor as any);
    player.cards = [playableCard, createNumberCard(3, 'blue')];
    
    const avgTime = measureTime(() => {
      // 每次执行前重置手牌
      player.cards = [playableCard, createNumberCard(3, 'blue')];
      player.cardCount = 2;
      
      mode.executeAction(state, {
        type: 'play',
        playerId: player.id,
        cardIds: [playableCard.id],
        timestamp: Date.now()
      }, player.id);
    }, 100);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(20);
  });

  test('given: 执行连打动作 when: 检查性能 then: 响应时间 < 30ms', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    const rainbowCards = generateRainbow(3);
    player.cards = rainbowCards;
    player.cardCount = 4;
    state.discardPile = [createNumberCard(3, 'red')];
    state.currentColor = 'red';
    state.currentPlayerId = player.id;
    
    const avgTime = measureTime(() => {
      // 重置手牌
      player.cards = [...rainbowCards];
      player.cardCount = 4;
      
      mode.executeAction(state, {
        type: 'combo',
        comboType: 'rainbow',
        cardIds: rainbowCards.map(c => c.id),
        targetId: state.players[1].id,
        playerId: player.id,
        timestamp: Date.now()
      }, player.id);
    }, 100);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(30);
  });
});

describe('内存占用测试', () => {
  test('given: 创建游戏状态 when: 检查内存 then: 内存占用合理', () => {
    const initialMemory = measureMemory();
    
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: Array.from({ length: 8 }, (_, i) => createMockPlayer({ id: `p${i}` }))
    });
    
    const state = mode.initialize(room);
    
    const afterMemory = measureMemory();
    const memoryIncrease = (afterMemory - initialMemory) / 1024 / 1024; // MB
    
    console.log(`    💾 内存占用增加: ${memoryIncrease.toFixed(2)} MB`);
    // 8人游戏，预期内存占用应该小于10MB
    expect(memoryIncrease).toBeLessThan(10);
  });

  test('given: 大量游戏操作 when: 检查内存泄漏 then: 无显著内存增长', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 初始内存
    const initialMemory = measureMemory();
    
    // 执行大量操作
    for (let i = 0; i < 100; i++) {
      player.cards = [createNumberCard(i % 10, 'red'), createActionCard('skip', 'red')];
      mode.getAvailableActions(state, player.id);
      mode.validateAction(state, {
        type: 'play',
        playerId: player.id,
        cardIds: [player.cards[0].id],
        timestamp: Date.now()
      }, player.id);
    }
    
    const afterMemory = measureMemory();
    const memoryIncrease = (afterMemory - initialMemory) / 1024; // KB
    
    console.log(`    💾 内存占用增加: ${memoryIncrease.toFixed(2)} KB`);
    // 100次操作后内存增长应该小于100KB（无显著泄漏）
    expect(memoryIncrease).toBeLessThan(100);
  });
});

describe('并发测试', () => {
  test('given: 多个玩家同时请求 when: 获取可用动作 then: 无冲突', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: Array.from({ length: 8 }, (_, i) => createMockPlayer({ id: `p${i}` }))
    });
    const state = mode.initialize(room);
    
    // 给所有玩家手牌
    state.players.forEach(p => {
      p.cards = Array.from({ length: 7 }, (_, i) => createNumberCard(i, 'red'));
    });
    
    const startTime = process.hrtime.bigint();
    
    // 模拟所有玩家同时获取可用动作
    const results = state.players.map(p => 
      mode.getAvailableActions(state, p.id)
    );
    
    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1_000_000; // ms
    
    console.log(`    ⏱️  总响应时间: ${totalTime.toFixed(3)}ms`);
    console.log(`    👥 处理玩家数: ${results.length}`);
    
    // 所有玩家都应该返回结果
    expect(results.every(r => Array.isArray(r))).toBeTruthy();
    // 总响应时间应该小于200ms
    expect(totalTime).toBeLessThan(200);
  });
});

describe('大数据量测试', () => {
  test('given: 超大弃牌堆 when: 重新洗牌 then: 响应时间 < 100ms', () => {
    const mode = new BaseGameMode();
    const room = createMockRoom({
      players: [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' })
      ]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 创建超大弃牌堆
    state.deck = []; // 清空牌堆
    state.discardPile = Array.from({ length: 200 }, (_, i) => 
      createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as any)
    );
    
    const avgTime = measureTime(() => {
      // 执行摸牌会触发重洗
      mode.executeAction(state, {
        type: 'draw',
        playerId: player.id,
        timestamp: Date.now()
      }, player.id);
      
      // 重置状态
      state.deck = [];
      state.discardPile = Array.from({ length: 200 }, (_, i) => 
        createNumberCard(i % 10, ['red', 'yellow', 'green', 'blue'][i % 4] as any)
      );
    }, 10);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(100);
  });

  test('given: 大量连打组合检测 when: 分析100张牌 then: 响应时间 < 200ms', () => {
    const mode = new OutMode();
    const room = createMockRoom({
      players: [createMockPlayer({ id: 'p1' })]
    });
    const state = mode.initialize(room);
    const player = state.players[0];
    
    // 创建100张牌的复杂手牌
    player.cards = Array.from({ length: 100 }, (_, i) => {
      const value = Math.floor(i / 4) % 10;
      const color = ['red', 'yellow', 'green', 'blue'][i % 4] as any;
      return createNumberCard(value, color);
    });
    state.discardPile = [createNumberCard(0, 'red')];
    state.currentColor = 'red';
    
    const avgTime = measureTime(() => {
      (mode as any).detectAvailableCombos(player.cards, state.currentColor, state.discardPile[0]);
    }, 10);
    
    console.log(`    ⏱️  平均响应时间: ${avgTime.toFixed(3)}ms`);
    console.log(`    🃏 手牌数: ${player.cards.length}`);
    expect(avgTime).toBeLessThan(200);
  });
});

describe('性能基准', () => {
  test('性能基准汇总', () => {
    console.log('\n    📊 性能基准数据:');
    console.log('    ──────────────────────────────────');
    console.log('    getAvailableActions (标准): < 50ms');
    console.log('    getAvailableActions (连打): < 50ms');
    console.log('    validateAction (标准): < 10ms');
    console.log('    validateAction (连打): < 20ms');
    console.log('    executeAction (标准): < 20ms');
    console.log('    executeAction (连打): < 30ms');
    console.log('    内存占用 (8人游戏): < 10MB');
    console.log('    并发处理 (8人): < 200ms');
    console.log('    大弃牌堆洗牌: < 100ms');
    console.log('    大数据量分析: < 200ms');
    console.log('    ──────────────────────────────────\n');
    
    expect(true).toBeTruthy();
  });
});

// ==================== 汇总 ====================

console.log('\n' + '='.repeat(50));
console.log(`📊 性能测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

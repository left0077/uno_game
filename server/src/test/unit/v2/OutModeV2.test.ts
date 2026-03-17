/**
 * OutModeV2 单元测试
 * 测试连打出牌和淘汰逻辑
 */

import { OutModeV2 } from '../../../game/v2/OutModeV2.js';
import { PlayerManager } from '../../../game/v2/PlayerManager.js';
import { GameStateV2 } from '../../../game/v2/types.js';
import { Player, Card } from '../../../shared/index.js';
import { expect, test, describe } from '../../test-runner.js';

// 辅助函数：创建测试玩家
function createMockPlayer(id: string, nickname: string): Player {
  return {
    id,
    nickname,
    cards: [],
    cardCount: 0,
    isAI: false,
    isHost: false,
    isOnline: true,
    hasCalledUno: false,
    ready: true,
    seat: 0,
    eliminated: false
  };
}

// 辅助函数：创建牌
function createMockCard(id: string, color: string, value: number, type: string = 'number'): Card {
  return {
    id,
    color: color as any,
    value,
    type: type as any,
    points: value
  };
}

// 辅助函数：创建初始状态
function createOutGameState(playerIds: string[]): GameStateV2 {
  const players = new Map<string, Player>();
  playerIds.forEach((id, index) => {
    const player = createMockPlayer(id, `Player${index + 1}`);
    player.seat = index;
    players.set(id, player);
  });

  return {
    players,
    tablePlayerIds: [...playerIds],
    finishedPlayerIds: new Array(playerIds.length).fill(null),
    currentPlayerIndex: 0,
    direction: 1,
    phase: 'playing',
    deck: [],
    discardPile: [],
    currentColor: 'red',
    turnStartTime: Date.now()
  };
}

console.log('🧪 OutModeV2 测试\n');

// 初始化测试
describe('初始化', () => {
  test('应该正确初始化Out模式状态', () => {
    const state = createOutGameState(['A', 'B', 'C', 'D']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    expect(state.outState).toBeTruthy();
    expect(state.outState!.phase).toBe(0);
    expect(state.outState!.maxCards).toBe(12);
    expect(state.outState!.nextOutAt).toBe(10);
  });
});

// 连打验证测试
describe('连打验证 - 对子', () => {
  test('同色对子应该通过', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    // 给A玩家两张红色牌
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 5),
      createMockCard('c2', 'red', 7)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2'],
      comboType: 'pair',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeTruthy();
  });

  test('同值对子应该通过', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 5),
      createMockCard('c2', 'blue', 5)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2'],
      comboType: 'pair',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeTruthy();
  });

  test('不同色不同值应该失败', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 5),
      createMockCard('c2', 'blue', 7)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2'],
      comboType: 'pair',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeFalsy();
  });

  test('包含万能牌应该失败', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 5),
      createMockCard('c2', 'wild', 0, 'wild')
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2'],
      comboType: 'pair',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeFalsy();
  });
});

describe('连打验证 - 三连', () => {
  test('三张同色应该通过', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 1),
      createMockCard('c2', 'red', 5),
      createMockCard('c3', 'red', 9)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3'],
      comboType: 'three',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeTruthy();
  });

  test('不同色应该失败', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 1),
      createMockCard('c2', 'red', 5),
      createMockCard('c3', 'blue', 9)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3'],
      comboType: 'three',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeFalsy();
  });
});

describe('连打验证 - 彩虹', () => {
  test('四色各一张应该通过', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 1),
      createMockCard('c2', 'yellow', 5),
      createMockCard('c3', 'green', 3),
      createMockCard('c4', 'blue', 7)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3', 'c4'],
      comboType: 'rainbow',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeTruthy();
  });

  test('缺少颜色应该失败', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 1),
      createMockCard('c2', 'yellow', 5),
      createMockCard('c3', 'green', 3),
      createMockCard('c4', 'green', 7) // 重复绿色
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3', 'c4'],
      comboType: 'rainbow',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeFalsy();
  });
});

describe('连打验证 - 顺子', () => {
  test('同色连续数字应该通过', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 3),
      createMockCard('c2', 'red', 4),
      createMockCard('c3', 'red', 5)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3'],
      comboType: 'straight',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeTruthy();
  });

  test('不连续应该失败', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    const player = state.players.get('A')!;
    player.cards = [
      createMockCard('c1', 'red', 3),
      createMockCard('c2', 'red', 5),
      createMockCard('c3', 'red', 7)
    ];
    
    const result = mode['validateCombo']({
      type: 'combo',
      playerId: 'A',
      cardIds: ['c1', 'c2', 'c3'],
      comboType: 'straight',
      timestamp: Date.now()
    });
    
    expect(result.valid).toBeFalsy();
  });
});

// 手牌上限测试
describe('手牌上限与淘汰', () => {
  test('超上限应该被淘汰', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    // 给A玩家13张牌（上限12）
    const player = state.players.get('A')!;
    for (let i = 0; i < 13; i++) {
      player.cards.push(createMockCard(`c${i}`, 'red', i));
    }
    player.cardCount = 13;
    
    // 检查手牌上限
    mode['checkHandLimit']('A');
    
    expect(state.players.get('A')?.eliminated).toBeTruthy();
  });

  test('阶段推进应该正确更新上限', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    // 初始阶段0
    expect(state.outState!.maxCards).toBe(12);
    
    // 模拟玩家手牌达到阈值10
    const player = state.players.get('A')!;
    player.cards = [];
    for (let i = 0; i < 10; i++) {
      player.cards.push(createMockCard(`c${i}`, 'red', i));
    }
    
    // 检查阶段推进
    mode['checkPhaseProgression']();
    
    // 应该进入阶段1
    expect(state.outState!.phase).toBe(1);
    expect(state.outState!.maxCards).toBe(10);
  });
});

// 连打惩罚测试
describe('连打惩罚', () => {
  test('对子惩罚应该是Draw3', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    mode['applyComboPenalty']('pair');
    
    expect(state.pendingDraw).toBe(3);
    expect(state.pendingDrawType).toBe('draw3');
  });

  test('三连惩罚应该是Draw5', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    mode['applyComboPenalty']('three');
    
    expect(state.pendingDraw).toBe(5);
    expect(state.pendingDrawType).toBe('draw5');
  });

  test('彩虹惩罚应该是Draw5', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    mode['applyComboPenalty']('rainbow');
    
    expect(state.pendingDraw).toBe(5);
    expect(state.pendingDrawType).toBe('draw5');
  });

  test('顺子惩罚应该是Draw8', () => {
    const state = createOutGameState(['A', 'B']);
    const mode = new OutModeV2();
    mode.initialize(state);
    
    mode['applyComboPenalty']('straight');
    
    expect(state.pendingDraw).toBe(8);
    expect(state.pendingDrawType).toBe('draw8');
  });
});

console.log('\n✨ OutModeV2 测试完成\n');

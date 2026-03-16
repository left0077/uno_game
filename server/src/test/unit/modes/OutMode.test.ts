// OutMode 单元测试
import { OutMode } from '../../../game/modes/OutMode.js';
import { createMockRoom, createMockPlayer, createMockCard } from '../../mocks/mock-game.js';
import { expect } from '../../test-runner.js';

console.log('🧪 OutMode 测试\n');

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function test(name: string, fn: () => void) {
  return runTest(name, fn);
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

const mode = new OutMode();

// 测试1: 基本属性
test('应该有正确的名称', () => {
  expect(mode.name).toBe('out');
  expect(mode.description).toBeTruthy();
});

// 测试2: 手牌上限
test('应该设置20张手牌上限', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  
  expect(state.maxHandSize).toBe(20);
  expect(state.outState).toBeTruthy();
  expect(state.outState?.phase).toBe(0);
});

// 测试3: 连打检测 - 对子
test('应该检测对子组合', () => {
  const cards = [
    createMockCard({ type: 'number', value: 5, color: 'red' }),
    createMockCard({ type: 'number', value: 5, color: 'yellow' })
  ];
  
  const combos = (mode as any).detectAvailableCombos(cards);
  
  expect(combos.some((c: any) => c.type === 'pair')).toBeTruthy();
});

// 测试4: 连打检测 - 三条
test('应该检测三条组合', () => {
  const cards = [
    createMockCard({ type: 'number', value: 7, color: 'red' }),
    createMockCard({ type: 'number', value: 7, color: 'yellow' }),
    createMockCard({ type: 'number', value: 7, color: 'blue' })
  ];
  
  const combos = (mode as any).detectAvailableCombos(cards);
  
  expect(combos.some((c: any) => c.type === 'three')).toBeTruthy();
});

// 测试5: 连打检测 - 彩虹
test('应该检测彩虹组合', () => {
  const cards = [
    createMockCard({ type: 'number', value: 3, color: 'red' }),
    createMockCard({ type: 'number', value: 3, color: 'yellow' }),
    createMockCard({ type: 'number', value: 3, color: 'green' }),
    createMockCard({ type: 'number', value: 3, color: 'blue' })
  ];
  
  const combos = (mode as any).detectAvailableCombos(cards);
  
  expect(combos.some((c: any) => c.type === 'rainbow')).toBeTruthy();
});

// 测试6: 连打检测 - 顺子
test('应该检测顺子组合', () => {
  const cards = [
    createMockCard({ type: 'number', value: 1, color: 'red' }),
    createMockCard({ type: 'number', value: 2, color: 'red' }),
    createMockCard({ type: 'number', value: 3, color: 'red' })
  ];
  
  const combos = (mode as any).detectAvailableCombos(cards);
  
  expect(combos.some((c: any) => c.type === 'straight')).toBeTruthy();
});

// 测试7: 淘汰机制
test('应该淘汰手牌超过20张的玩家', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const player = state.players[0];
  
  // 给玩家22张牌（出1张后仍有21张，超过20张上限）
  player.cards = Array(22).fill(null).map((_, i) => 
    createMockCard({ id: `card-${i}`, value: i % 10, color: 'red' })
  );
  player.cardCount = 22;
  
  // 设置弃牌堆顶部牌，确保可以出牌
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'red' })];
  state.currentColor = 'red';
  state.currentCard = state.discardPile[0];
  
  // 执行出牌动作触发淘汰检查
  state.currentPlayerId = player.id;
  mode.executeAction(state, {
    type: 'play',
    playerId: player.id,
    cardIds: [player.cards[0].id],
    timestamp: Date.now()
  }, player.id);
  
  // 出牌后手牌为21张，应被淘汰
  expect(player.eliminated).toBeTruthy();
});

// 测试8: 胜利条件 - 淘汰后只剩1人
test('只剩1人存活时应判定获胜', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  // 淘汰第一个玩家
  state.players[0].eliminated = true;
  
  const winner = mode.checkWinCondition(state);
  expect(winner).toBe(state.players[1].id);
});

// 测试9: 排名制 - 玩家出完手牌后游戏不立即结束
test('玩家出完手牌后游戏应继续（排名制）', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  // 玩家1出完手牌
  state.players[0].cards = [];
  state.players[0].cardCount = 0;
  
  const winner = mode.checkWinCondition(state);
  
  // 游戏不应结束，返回null
  expect(winner).toBe(null);
  // 但该玩家应被记录到rankings
  expect(state.rankings?.includes(state.players[0].id)).toBeTruthy();
});

// 测试10: 排名制 - 多人出完手牌按顺序排名
test('多人出完手牌应按先后顺序排名', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  const player1 = state.players[0];
  const player2 = state.players[1];
  const player3 = state.players[2];
  
  // 玩家1先出完
  player1.cards = [];
  player1.cardCount = 0;
  mode.checkWinCondition(state);
  
  // 玩家2后出完
  player2.cards = [];
  player2.cardCount = 0;
  mode.checkWinCondition(state);
  
  // 检查排名顺序
  expect(state.rankings?.length).toBe(2);
  expect(state.rankings?.[0]).toBe(player1.id);
  expect(state.rankings?.[1]).toBe(player2.id);
  
  // 游戏继续，玩家3还在
  const winner = mode.checkWinCondition(state);
  expect(winner).toBe(null);
});

// 测试11: 超时结算 - 超过20分钟手牌最少者获胜
test('超时结算应返回手牌最少者', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  // 设置游戏开始时间为21分钟前
  state.gameStartTime = Date.now() - 21 * 60 * 1000;
  
  // 设置不同手牌数
  state.players[0].cards = Array(5).fill(null).map((_, i) => createMockCard({ id: `p1-${i}` }));
  state.players[0].cardCount = 5;
  state.players[1].cards = Array(3).fill(null).map((_, i) => createMockCard({ id: `p2-${i}` }));
  state.players[1].cardCount = 3; // 最少
  state.players[2].cards = Array(7).fill(null).map((_, i) => createMockCard({ id: `p3-${i}` }));
  state.players[2].cardCount = 7;
  
  const winner = mode.checkWinCondition(state);
  
  // 手牌最少的玩家2获胜
  expect(winner).toBe(state.players[1].id);
});

// 测试12: 超时结算 - 未超时不触发
test('未超时不应触发超时结算', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  // 设置游戏开始时间为10分钟前（未超时）
  state.gameStartTime = Date.now() - 10 * 60 * 1000;
  
  const winner = mode.checkWinCondition(state);
  
  // 游戏继续
  expect(winner).toBe(null);
});

// 测试13: 防止重复触发游戏结束
test('checkWinCondition不应重复触发游戏结束', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  // 淘汰第一个玩家
  state.players[0].eliminated = true;
  
  // 第一次调用 - 应该返回获胜者
  const winner1 = mode.checkWinCondition(state);
  expect(winner1).toBe(state.players[1].id);
  expect(state.isRoundEnded).toBe(true);
  
  // 第二次调用 - 由于isRoundEnded已设置，应该仍然返回获胜者但游戏已结束
  const winner2 = mode.checkWinCondition(state);
  expect(winner2).toBe(state.players[1].id);
});

// 测试14: 对子验证 - 第一张牌必须与弃牌堆匹配
test('对子第一张牌必须与弃牌堆匹配', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const player = state.players[0];
  
  // 设置弃牌堆顶部为蓝色牌
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'blue' })];
  state.currentColor = 'blue';
  state.currentCard = state.discardPile[0];
  
  // 玩家有两张8（蓝色和红色）
  const blue8 = createMockCard({ id: 'blue8', type: 'number', value: 8, color: 'blue' });
  const red8 = createMockCard({ id: 'red8', type: 'number', value: 8, color: 'red' });
  player.cards = [blue8, red8];
  player.cardCount = 2;
  
  // 验证对子：蓝色8匹配弃牌堆（颜色相同），应该合法
  const result1 = mode.validateAction(state, {
    type: 'combo',
    comboType: 'pair',
    cardIds: ['blue8', 'red8'],
    playerId: player.id,
    timestamp: Date.now()
  }, player.id);
  
  expect(result1.valid).toBeTruthy();
  
  // 改变弃牌堆为红色5
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'red' })];
  state.currentColor = 'red';
  state.currentCard = state.discardPile[0];
  
  // 红色8匹配弃牌堆（颜色相同），应该合法
  const result2 = mode.validateAction(state, {
    type: 'combo',
    comboType: 'pair',
    cardIds: ['red8', 'blue8'],  // 红色8第一张
    playerId: player.id,
    timestamp: Date.now()
  }, player.id);
  
  expect(result2.valid).toBeTruthy();
  
  // 改变弃牌堆为绿色5
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'green' })];
  state.currentColor = 'green';
  state.currentCard = state.discardPile[0];
  
  // 两张8都不匹配绿色，应该不合法
  const result3 = mode.validateAction(state, {
    type: 'combo',
    comboType: 'pair',
    cardIds: ['blue8', 'red8'],
    playerId: player.id,
    timestamp: Date.now()
  }, player.id);
  
  expect(result3.valid).toBeFalsy();
});

// 测试15: 对子验证 - 数字匹配也算合法
test('对子第一张牌数字匹配也算合法', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const player = state.players[0];
  
  // 设置弃牌堆顶部为黄色8
  state.discardPile = [createMockCard({ type: 'number', value: 8, color: 'yellow' })];
  state.currentColor = 'yellow';
  state.currentCard = state.discardPile[0];
  
  // 玩家有两张8（蓝色和红色），数字与弃牌堆匹配
  const blue8 = createMockCard({ id: 'blue8', type: 'number', value: 8, color: 'blue' });
  const red8 = createMockCard({ id: 'red8', type: 'number', value: 8, color: 'red' });
  player.cards = [blue8, red8];
  player.cardCount = 2;
  
  // 验证对子：虽然颜色不同，但数字8匹配，应该合法
  const result = mode.validateAction(state, {
    type: 'combo',
    comboType: 'pair',
    cardIds: ['blue8', 'red8'],
    playerId: player.id,
    timestamp: Date.now()
  }, player.id);
  
  expect(result.valid).toBeTruthy();
});

// 汇总
console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);

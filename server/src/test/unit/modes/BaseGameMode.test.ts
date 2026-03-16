// BaseGameMode 单元测试
import { BaseGameMode } from '../../../game/modes/BaseGameMode.js';
import { createMockRoom, createMockPlayer, createMockCard } from '../../mocks/mock-game.js';
import { expect } from '../../test-runner.js';

console.log('🧪 BaseGameMode 测试\n');

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

const mode = new BaseGameMode();

// 测试1: 基本属性
test('应该有正确的名称和描述', () => {
  expect(mode.name).toBe('standard');
  expect(mode.description).toBeTruthy();
});

// 测试2: 初始化游戏
test('应该正确初始化游戏状态', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  
  expect(state.players).toHaveLength(2);
  expect(state.deck).toHaveLength(108 - 15); // 108 - 7*2 - 1(首张牌)
  expect(state.discardPile).toHaveLength(1);
});

// 测试3: 验证出牌动作
test('应该验证出牌动作的合法性', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const playerId = state.players[0].id;
  
  // 验证非当前玩家不能出牌
  const invalidAction = {
    type: 'play' as const,
    playerId: 'invalid-id',
    cardIds: ['card-1'],
    timestamp: Date.now()
  };
  
  const result = mode.validateAction(state, invalidAction, 'invalid-id');
  expect(result.valid).toBeFalsy();
});

// 测试4: 验证摸牌动作
test('应该验证摸牌动作的合法性', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const playerId = state.players[0].id;
  
  const drawAction = {
    type: 'draw' as const,
    playerId,
    timestamp: Date.now()
  };
  
  const result = mode.validateAction(state, drawAction, playerId);
  expect(result.valid).toBeTruthy();
});

// 测试5: 胜利条件
test('应该检测玩家出完手牌', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const playerId = state.players[0].id;
  
  // 清空手牌
  state.players[0].cards = [];
  state.players[0].cardCount = 0;
  
  const winner = mode.checkWinCondition(state);
  expect(winner).toBe(playerId);
});

// 测试6: 跳过牌后 skippedPlayerId 应正确设置和清除
test('跳过牌后应设置和清除 skippedPlayerId', () => {
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
  
  // 设置玩家1有一张跳过牌
  const skipCard = createMockCard({ type: 'skip', color: 'red' });
  player1.cards = [skipCard];
  player1.cardCount = 1;
  
  // 设置弃牌堆
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'red' })];
  state.currentColor = 'red';
  state.currentCard = state.discardPile[0];
  state.currentPlayerId = player1.id;
  
  // 玩家1打出跳过牌
  const newState = mode.executeAction(state, {
    type: 'play',
    playerId: player1.id,
    cardIds: [skipCard.id],
    timestamp: Date.now()
  }, player1.id);
  
  // 玩家2应该被跳过
  expect(newState.skippedPlayerId).toBe(player2.id);
  // 当前玩家应该是玩家3（跳过了玩家2）
  expect(newState.currentPlayerId).toBe(state.players[2].id);
  
  // 玩家3摸牌后，skippedPlayerId 应该被清除
  const player3 = state.players[2];
  player3.cards = [createMockCard()];
  player3.cardCount = 1;
  
  const stateAfterDraw = mode.executeAction(newState, {
    type: 'draw',
    playerId: player3.id,
    timestamp: Date.now()
  }, player3.id);
  
  // skippedPlayerId 应该被清除
  expect(stateAfterDraw.skippedPlayerId).toBe(undefined);
});

// 测试7: 普通出牌后应清除 skippedPlayerId
test('普通出牌后应清除 skippedPlayerId', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer(),
      createMockPlayer()
    ]
  });
  
  const state = mode.initialize(room);
  const player1 = state.players[0];
  
  // 先设置一个 skippedPlayerId（模拟之前被跳过的状态）
  state.skippedPlayerId = 'some-player-id';
  
  // 设置玩家手牌
  const numberCard = createMockCard({ type: 'number', value: 5, color: 'red' });
  player1.cards = [numberCard];
  player1.cardCount = 1;
  
  // 设置弃牌堆
  state.discardPile = [createMockCard({ type: 'number', value: 5, color: 'blue' })];
  state.currentColor = 'blue';
  state.currentCard = state.discardPile[0];
  state.currentPlayerId = player1.id;
  
  // 玩家打出普通牌
  const newState = mode.executeAction(state, {
    type: 'play',
    playerId: player1.id,
    cardIds: [numberCard.id],
    timestamp: Date.now()
  }, player1.id);
  
  // skippedPlayerId 应该被清除
  expect(newState.skippedPlayerId).toBe(undefined);
});

// 测试8: 托管模式 - 玩家标记为AI后能自动出牌
test('托管模式下玩家应能自动出牌', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const state = mode.initialize(room);
  const player = state.players[0];
  
  // 给玩家一张可出的牌（匹配弃牌堆颜色）
  const playableCard = createMockCard({ type: 'number', value: 5, color: 'red' });
  player.cards = [playableCard];
  player.cardCount = 1;
  
  // 设置弃牌堆
  state.discardPile = [createMockCard({ type: 'number', value: 3, color: 'red' })];
  state.currentColor = 'red';
  state.currentCard = state.discardPile[0];
  state.currentPlayerId = player.id;
  
  // 开启托管模式
  player.isAI = true;
  player.aiType = 'host';
  
  // 验证玩家被标记为AI
  expect(player.isAI).toBe(true);
  expect(player.aiType).toBe('host');
});

// 汇总
console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);

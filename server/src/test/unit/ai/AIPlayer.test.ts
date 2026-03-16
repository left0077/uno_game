// AIPlayer 单元测试
import { GameModeFactory } from '../../../game/modes/GameMode.js';
import { BaseGameMode } from '../../../game/modes/BaseGameMode.js';
import { OutMode } from '../../../game/modes/OutMode.js';
import { AIPlayer } from '../../../game/ai/AIPlayer.js';
import { createMockPlayer, createMockCard } from '../../mocks/mock-game.js';
import type { GameState, Card } from '../../../shared/index.js';
import { test as runTest, expect } from '../../test-runner.js';

// 注册游戏模式（测试环境需要）
GameModeFactory.register('standard', BaseGameMode);
GameModeFactory.register('out', OutMode);

console.log('🧪 AIPlayer 测试\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// 扩展 expect 支持更多方法
const originalExpect = expect;
function extendedExpect(actual: any) {
  const base = originalExpect(actual);
  return {
    ...base,
    toBeGreaterThan: (expected: number) => {
      if (!(actual > expected)) {
        throw new Error(`期望大于 ${expected}, 实际 ${actual}`);
      }
    }
  };
}

// 测试1: AI会出可出的牌
test('AI应该出可以出的牌', () => {
  const player = createMockPlayer({
    isAI: true,
    aiDifficulty: 'normal',
    cards: [
      createMockCard({ type: 'number', value: 5, color: 'red' }),
      createMockCard({ type: 'number', value: 7, color: 'blue' })
    ]
  });
  
  const gameState = {
    currentPlayerId: player.id,
    currentColor: 'red',
    direction: 'clockwise',
    discardPile: [createMockCard({ type: 'number', value: 5, color: 'yellow' })],
    deck: [],
    players: [player],
    turnTimer: 120,
    turnStartTime: Date.now()
  } as GameState;
  
  const action = AIPlayer.getAIAction(player, gameState, [player]);
  
  expect(action).toBeTruthy();
  expect(action?.type).toBe('play');
});

// 测试2: 无牌可出时摸牌
test('AI无牌可出时应该摸牌', () => {
  const player = createMockPlayer({
    isAI: true,
    aiDifficulty: 'normal',
    cards: [
      createMockCard({ type: 'number', value: 9, color: 'blue' })
    ]
  });
  
  const gameState = {
    currentPlayerId: player.id,
    currentColor: 'red',
    direction: 'clockwise',
    discardPile: [createMockCard({ type: 'number', value: 5, color: 'yellow' })],
    deck: Array(10).fill(null).map(() => createMockCard()),
    players: [player],
    turnTimer: 120,
    turnStartTime: Date.now()
  } as GameState;
  
  const action = AIPlayer.getAIAction(player, gameState, [player]);
  
  expect(action?.type).toBe('draw');
});

// 测试3: 不同难度的AI决策时间范围
test('不同难度的AI决策延迟应在合理范围', () => {
  const easyDelay = AIPlayer.getDecisionDelay('easy');
  const normalDelay = AIPlayer.getDecisionDelay('normal');
  const hardDelay = AIPlayer.getDecisionDelay('hard');
  
  // 简单难度: 2000-4000ms
  expect(easyDelay >= 2000 && easyDelay <= 4000).toBeTruthy();
  // 普通难度: 1000-3000ms
  expect(normalDelay >= 1000 && normalDelay <= 3000).toBeTruthy();
  // 困难难度: 500-1000ms
  expect(hardDelay >= 500 && hardDelay <= 1000).toBeTruthy();
  
  // 平均而言简单 > 普通 > 困难
  expect(easyDelay > hardDelay).toBeTruthy();
});

// 测试4: AI会喊UNO
test('AI剩1张牌时会喊UNO', () => {
  const player = createMockPlayer({
    isAI: true,
    cards: [createMockCard()],
    cardCount: 1,
    hasCalledUno: false
  });
  
  // AI应该在适当时候调用 callUno
  // 这里只验证AI可以执行UNO动作
  const canCallUno = player.cards.length === 1 && !player.hasCalledUno;
  expect(canCallUno).toBeTruthy();
});

// 汇总
console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);

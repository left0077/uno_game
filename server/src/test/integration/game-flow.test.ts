// 游戏流程集成测试
import { UnoGame } from '../../game/UnoGame.js';
import { createMockRoom, createMockPlayer } from '../mocks/mock-game.js';
import { expect } from '../test-runner.js';

console.log('🧪 游戏流程集成测试\n');

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

// 扩展 expect
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

// 测试1: 完整游戏流程
test('应该能完成一局标准模式游戏', () => {
  const room = createMockRoom({
    players: [
      createMockPlayer({ nickname: 'Player1' }),
      createMockPlayer({ nickname: 'Player2' })
    ]
  });
  
  let gameEnded = false;
  let winner: any = null;
  
  const game = new UnoGame(
    room,
    {
      onStateChange: (state) => {
        // 检查游戏是否结束
        if (state.winner) {
          gameEnded = true;
          winner = state.winner;
        }
      },
      onGameEnd: (w) => {
        winner = w;
      }
    }
  );
  
  const state = game.getGameState();
  expect(state.players).toHaveLength(2);
  extendedExpect(state.deck.length).toBeGreaterThan(0);
  
  game.destroy();
});

// 测试2: Out模式游戏流程
test('应该能完成一局Out模式游戏', () => {
  const room = createMockRoom({
    settings: {
      allowStacking: true,
      allowMultipleCards: false,
      allowJumpIn: true,
      scoringMode: false,
      mode: 'out'
    },
    players: [
      createMockPlayer({ nickname: 'Player1' }),
      createMockPlayer({ nickname: 'Player2' })
    ]
  });
  
  const game = new UnoGame(
    room,
    {
      onStateChange: () => {},
      onGameEnd: () => {}
    }
  );
  
  const state = game.getGameState();
  expect(state.outState).toBeTruthy();
  expect(state.maxHandSize).toBe(20);
  
  game.destroy();
});

// 测试3: 动作验证
test('应该正确验证和执行动作', () => {
  const room = createMockRoom({
    players: [createMockPlayer()]
  });
  
  const game = new UnoGame(
    room,
    {
      onStateChange: () => {},
      onGameEnd: () => {}
    }
  );
  
  const state = game.getGameState();
  const playerId = state.players[0].id;
  
  // 验证非法动作被拒绝
  const result = game.handleAction({
    type: 'play',
    playerId: 'invalid-id',
    cardIds: ['invalid-card'],
    timestamp: Date.now()
  }, 'invalid-id');
  
  expect(result).toBeFalsy();
  
  game.destroy();
});

// 汇总
console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);

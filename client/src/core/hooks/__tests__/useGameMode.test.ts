/**
 * useGameMode Hook 单元测试
 * 测试游戏模式相关的逻辑
 */

import { OutModeRenderer, StandardModeRenderer, GameModeRendererFactory } from '../../modes/GameModeRenderer';
import type { Room, GameState, Card, Player } from '../../../../shared/types';

// 简单的测试框架
let testCount = 0;
let passCount = 0;
let failCount = 0;

function describe(name: string, fn: () => void) {
  console.log(`\n📦 ${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failCount++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`期望: ${expected}, 实际: ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`期望为真值，实际: ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`期望为假值，实际: ${actual}`);
      }
    },
    toContainEqual: (expected: any) => {
      const found = actual.some((item: any) => 
        JSON.stringify(item) === JSON.stringify(expected)
      );
      if (!found) {
        throw new Error(`期望数组包含: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) {
        throw new Error(`期望长度为: ${expected}, 实际: ${actual.length}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (!(actual > expected)) {
        throw new Error(`期望: ${actual} > ${expected}`);
      }
    },
    toContain: (expected: string) => {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`期望字符串包含: "${expected}", 实际: "${actual}"`);
      }
    }
  };
}

// 辅助函数：创建卡牌
function createCard(id: string, color: string, value: number): Card {
  return {
    id,
    type: 'number',
    color: color as 'red' | 'yellow' | 'green' | 'blue' | 'wild',
    value
  };
}

// 辅助函数：创建房间
function createRoom(mode: 'standard' | 'out' = 'standard'): Room {
  return {
    id: 'room1',
    code: 'TEST01',
    players: [],
    status: 'waiting',
    hostId: 'player1',
    maxPlayers: 8,
    createdAt: Date.now(),
    settings: {
      allowStacking: true,
      allowMultipleCards: true,
      allowJumpIn: true,
      scoringMode: false,
      mode
    }
  };
}

// 辅助函数：创建玩家
function createPlayer(id: string, cards: Card[] = []): Player {
  return {
    id,
    nickname: `Player ${id}`,
    isHost: false,
    isAI: false,
    cards,
    cardCount: cards.length,
    isConnected: true,
    isReady: true
  };
}

// 辅助函数：创建游戏状态
function createGameState(currentPlayerId: string = 'player1', players: Player[] = []): GameState {
  return {
    currentPlayerId,
    direction: 'clockwise',
    deck: [],
    discardPile: [],
    currentColor: 'red',
    turnTimer: 30,
    turnStartTime: Date.now(),
    players
  };
}

// 模拟 useGameMode 的核心逻辑（不依赖 React）
function mockUseGameMode(room: Room, gameState: GameState) {
  const modeName = room.settings?.mode || 'standard';
  const renderer = GameModeRendererFactory.create(modeName);
  const isOutMode = modeName === 'out';
  const isStandardMode = modeName === 'standard';
  
  const outPhase = gameState.outState?.phase || 0;
  const outCountdown = (!gameState.outState || gameState.outState.phase >= 3) 
    ? 0 
    : Math.max(0, gameState.outState.nextOutAt - Date.now());
  const maxHandSize = gameState.outState?.maxCards || 20;
  
  const detectCombos = (cards: Card[]) => {
    if (!renderer.detectCombos) return [];
    return renderer.detectCombos(cards);
  };
  
  const currentPlayer = gameState.players?.find(p => p.id === gameState.currentPlayerId);
  const availableCombos = (!currentPlayer || !isOutMode) 
    ? [] 
    : detectCombos(currentPlayer.cards);
  
  const getActionHint = (props: { isMyTurn: boolean; selectedCards: string[] }) => {
    if (!renderer.getActionHint) return null;
    return renderer.getActionHint({
      gameState,
      isMyTurn: props.isMyTurn,
      selectedCards: props.selectedCards
    });
  };
  
  return {
    renderer,
    isOutMode,
    isStandardMode,
    outPhase,
    outCountdown,
    maxHandSize,
    availableCombos,
    detectCombos,
    getActionHint
  };
}

// ==================== 测试开始 ====================

describe('useGameMode - 标准模式', () => {
  test('标准模式返回正确配置', () => {
    const room = createRoom('standard');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    expect(result.isOutMode).toBe(false);
    expect(result.isStandardMode).toBe(true);
    expect(result.renderer.name).toBe('standard');
  });

  test('标准模式 availableCombos 为空数组', () => {
    const room = createRoom('standard');
    const player = createPlayer('player1', [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5)
    ]);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    expect(result.availableCombos).toHaveLength(0);
  });

  test('标准模式没有 detectCombos 函数', () => {
    const room = createRoom('standard');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    // detectCombos 应该返回空数组（因为标准模式没有 detectCombos）
    const cards = [createCard('card1', 'red', 5), createCard('card2', 'yellow', 5)];
    const combos = result.detectCombos(cards);
    expect(combos).toHaveLength(0);
  });

  test('标准模式 getActionHint 返回 null', () => {
    const room = createRoom('standard');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    const hint = result.getActionHint({ isMyTurn: true, selectedCards: [] });
    expect(hint).toBeFalsy();
  });
});

describe('useGameMode - Out模式', () => {
  test('Out模式返回正确配置', () => {
    const room = createRoom('out');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    expect(result.isOutMode).toBe(true);
    expect(result.isStandardMode).toBe(false);
    expect(result.renderer.name).toBe('out');
  });

  test('Out模式有 detectCombos 函数', () => {
    const room = createRoom('out');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    expect(result.renderer.detectCombos).toBeTruthy();
  });

  test('检测对子组合', () => {
    const room = createRoom('out');
    const cards = [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5)
    ];
    const player = createPlayer('player1', cards);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    const combos = result.detectCombos(cards);
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
  });

  test('检测彩虹组合', () => {
    const room = createRoom('out');
    const cards = [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5),
      createCard('card3', 'green', 5),
      createCard('card4', 'blue', 5)
    ];
    const player = createPlayer('player1', cards);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    const combos = result.detectCombos(cards);
    expect(combos.some(c => c.type === 'rainbow')).toBeTruthy();
  });

  test('检测顺子组合', () => {
    const room = createRoom('out');
    const cards = [
      createCard('card1', 'red', 3),
      createCard('card2', 'red', 4),
      createCard('card3', 'red', 5)
    ];
    const player = createPlayer('player1', cards);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    const combos = result.detectCombos(cards);
    expect(combos.some(c => c.type === 'straight')).toBeTruthy();
  });

  test('Out模式可用组合不为空', () => {
    const room = createRoom('out');
    const cards = [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5)
    ];
    const player = createPlayer('player1', cards);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    expect(result.availableCombos.length).toBeGreaterThan(0);
    expect(result.availableCombos.some(c => c.type === 'pair')).toBeTruthy();
  });

  test('Out模式 phase 0 时正确返回', () => {
    const room = createRoom('out');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    expect(result.outPhase).toBe(0);
    expect(result.outCountdown).toBe(0);
    expect(result.maxHandSize).toBe(20);
  });

  test('Out模式有 outState 时返回正确值', () => {
    const room = createRoom('out');
    const gameState: GameState = {
      ...createGameState(),
      outState: {
        phase: 2,
        maxCards: 10,
        nextOutAt: Date.now() + 5000
      }
    };
    const result = mockUseGameMode(room, gameState);
    
    expect(result.outPhase).toBe(2);
    expect(result.maxHandSize).toBe(10);
  });

  test('getActionHint 在有累积惩罚时返回提示', () => {
    const room = createRoom('out');
    const gameState: GameState = {
      ...createGameState(),
      pendingDraw: 4
    };
    const result = mockUseGameMode(room, gameState);
    
    const hint = result.getActionHint({ isMyTurn: true, selectedCards: [] });
    expect(hint).toBeTruthy();
    expect(hint).toContain('4');
  });

  test('getActionHint 在选中多张牌时返回提示', () => {
    const room = createRoom('out');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    const hint = result.getActionHint({ isMyTurn: true, selectedCards: ['card1', 'card2'] });
    expect(hint).toBeTruthy();
    expect(hint).toContain('连打');
  });

  test('getActionHint 在非自己回合返回 null', () => {
    const room = createRoom('out');
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    const hint = result.getActionHint({ isMyTurn: false, selectedCards: [] });
    expect(hint).toBeFalsy();
  });
});

describe('useGameMode - 边界情况', () => {
  test('settings 为空时默认使用标准模式', () => {
    const room = createRoom('standard');
    room.settings = undefined as any;
    const gameState = createGameState();
    const result = mockUseGameMode(room, gameState);
    
    // 由于 mode 无法获取，renderer 会被创建为 'standard'（工厂默认）
    expect(result.renderer.name).toBe('standard');
  });

  test('players 为空时 availableCombos 为空', () => {
    const room = createRoom('out');
    const gameState = createGameState('player1', []);
    const result = mockUseGameMode(room, gameState);
    
    expect(result.availableCombos).toHaveLength(0);
  });

  test('当前玩家不在 players 中时 availableCombos 为空', () => {
    const room = createRoom('out');
    const player = createPlayer('player2', [createCard('card1', 'red', 5)]);
    const gameState = createGameState('player1', [player]);
    const result = mockUseGameMode(room, gameState);
    
    expect(result.availableCombos).toHaveLength(0);
  });
});

// 测试总结
console.log('\n' + '='.repeat(50));
console.log(`📊 测试总结: ${passCount}/${testCount} 通过`);
if (failCount > 0) {
  console.log(`❌ 失败: ${failCount}`);
  process.exit(1);
} else {
  console.log('✨ 所有测试通过！');
  process.exit(0);
}

/**
 * GameModeRenderer 单元测试
 * 测试 OutModeRenderer 的连打检测功能
 */

import { OutModeRenderer, StandardModeRenderer, GameModeRendererFactory } from '../GameModeRenderer';
import type { Card } from '../../../../shared/types';

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

// 辅助函数：创建游戏状态
function createGameState(topCardColor: string, topCardValue: number) {
  return {
    discardPile: [{
      id: 'top',
      type: 'number',
      color: topCardColor,
      value: topCardValue
    }],
    currentColor: topCardColor
  };
}

// ==================== 测试开始 ====================

describe('StandardModeRenderer', () => {
  test('标准模式渲染器创建成功', () => {
    const renderer = new StandardModeRenderer();
    expect(renderer.name).toBe('standard');
    expect(renderer.description).toBe('经典UNO规则');
  });

  test('标准模式没有detectCombos方法', () => {
    const renderer = new StandardModeRenderer();
    expect(renderer.detectCombos).toBeFalsy();
  });
});

describe('OutModeRenderer', () => {
  test('Out模式渲染器创建成功', () => {
    const renderer = new OutModeRenderer();
    expect(renderer.name).toBe('out');
    expect(renderer.description).toBe('大逃杀模式');
  });

  test('Out模式有detectCombos方法', () => {
    const renderer = new OutModeRenderer();
    expect(renderer.detectCombos).toBeTruthy();
  });

  test('detectCombos检测对子（两张相同数字）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5)
    ];
    const combos = renderer.detectCombos!(cards);
    
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
    expect(combos.some(c => c.name === '对子5')).toBeTruthy();
  });

  test('detectCombos检测三条（三张相同数字）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 7),
      createCard('card2', 'yellow', 7),
      createCard('card3', 'blue', 7)
    ];
    const combos = renderer.detectCombos!(cards);
    
    expect(combos.some(c => c.type === 'three')).toBeTruthy();
    expect(combos.some(c => c.name === '三条7')).toBeTruthy();
  });

  test('detectCombos检测四条并包含彩虹（四张相同数字且四色齐全）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 3),
      createCard('card2', 'yellow', 3),
      createCard('card3', 'green', 3),
      createCard('card4', 'blue', 3)
    ];
    const combos = renderer.detectCombos!(cards);
    
    // 应该有彩虹
    expect(combos.some(c => c.type === 'rainbow')).toBeTruthy();
    expect(combos.some(c => c.name === '彩虹3')).toBeTruthy();
    // 也应该有对子和三条
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
    expect(combos.some(c => c.type === 'three')).toBeTruthy();
  });

  test('detectCombos检测彩虹（四色相同数字）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 9),
      createCard('card2', 'yellow', 9),
      createCard('card3', 'green', 9),
      createCard('card4', 'blue', 9)
    ];
    const combos = renderer.detectCombos!(cards);
    
    const rainbowCombo = combos.find(c => c.type === 'rainbow');
    expect(rainbowCombo).toBeTruthy();
    expect(rainbowCombo!.cardIds).toHaveLength(4);
  });

  test('detectCombos检测顺子（同色连续三张）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 3),
      createCard('card2', 'red', 4),
      createCard('card3', 'red', 5)
    ];
    const combos = renderer.detectCombos!(cards);
    
    expect(combos.some(c => c.type === 'straight')).toBeTruthy();
    expect(combos.some(c => c.name === 'red3-5')).toBeTruthy();
  });

  test('detectCombos检测长顺子（同色连续四张）', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'blue', 1),
      createCard('card2', 'blue', 2),
      createCard('card3', 'blue', 3),
      createCard('card4', 'blue', 4)
    ];
    const combos = renderer.detectCombos!(cards);
    
    // 应该有多个顺子组合
    expect(combos.filter(c => c.type === 'straight').length).toBeGreaterThan(0);
    expect(combos.some(c => c.name === 'blue1-3')).toBeTruthy();
    expect(combos.some(c => c.name === 'blue2-4')).toBeTruthy();
    expect(combos.some(c => c.name === 'blue1-4')).toBeTruthy();
  });

  test('detectCombos忽略非数字牌', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 5),
      createCard('card2', 'yellow', 5),
      { id: 'wild1', type: 'wild', color: 'wild', value: 'wild' },
      { id: 'skip1', type: 'skip', color: 'red', value: 'skip' }
    ];
    const combos = renderer.detectCombos!(cards);
    
    // 仍然应该检测到对子
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
  });

  test('detectCombos返回正确的卡牌ID', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('red5', 'red', 5),
      createCard('yellow5', 'yellow', 5)
    ];
    const combos = renderer.detectCombos!(cards);
    
    const pairCombo = combos.find(c => c.type === 'pair');
    expect(pairCombo).toBeTruthy();
    expect(pairCombo!.cardIds).toContainEqual('red5');
    expect(pairCombo!.cardIds).toContainEqual('yellow5');
  });

  test('空卡牌返回空数组', () => {
    const renderer = new OutModeRenderer();
    const combos = renderer.detectCombos!([]);
    expect(combos).toHaveLength(0);
  });

  test('无组合卡牌返回空数组', () => {
    const renderer = new OutModeRenderer();
    const cards: Card[] = [
      createCard('card1', 'red', 1),
      createCard('card2', 'blue', 5),
      createCard('card3', 'green', 9)
    ];
    const combos = renderer.detectCombos!(cards);
    expect(combos).toHaveLength(0);
  });

  // ==================== 弃牌堆匹配测试 ====================
  
  test('对子第一张牌颜色匹配弃牌堆时可出', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是蓝色牌
    const gameState = createGameState('blue', 3);
    
    // 玩家有两张8（蓝色和红色）
    const cards: Card[] = [
      createCard('blue8', 'blue', 8),
      createCard('red8', 'red', 8)
    ];
    
    // 蓝色8匹配弃牌堆颜色，应该可以组成对子
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
  });

  test('对子第一张牌数字匹配弃牌堆时可出', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是黄色8
    const gameState = createGameState('yellow', 8);
    
    // 玩家有两张5（蓝色和红色），数字不匹配
    const cards: Card[] = [
      createCard('blue5', 'blue', 5),
      createCard('red5', 'red', 5)
    ];
    
    // 数字5不匹配弃牌堆的8，应该不能组成对子
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'pair')).toBeFalsy();
  });

  test('对子第一张牌不匹配弃牌堆时不可出', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是绿色3
    const gameState = createGameState('green', 3);
    
    // 玩家有两张8（蓝色和红色），都不匹配绿色3
    const cards: Card[] = [
      createCard('blue8', 'blue', 8),
      createCard('red8', 'red', 8)
    ];
    
    // 没有牌匹配弃牌堆，应该不能组成对子
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'pair')).toBeFalsy();
  });

  test('三张牌中第一张匹配时可组成三条', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是红色
    const gameState = createGameState('red', 1);
    
    // 玩家有三张7（红色、黄色、蓝色）
    const cards: Card[] = [
      createCard('red7', 'red', 7),
      createCard('yellow7', 'yellow', 7),
      createCard('blue7', 'blue', 7)
    ];
    
    // 红色7匹配弃牌堆颜色，应该可以组成三条
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'three')).toBeTruthy();
  });

  test('顺子第一张牌匹配弃牌堆时可出', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是红色
    const gameState = createGameState('red', 9);
    
    // 玩家有红色3、4、5
    const cards: Card[] = [
      createCard('red3', 'red', 3),
      createCard('red4', 'red', 4),
      createCard('red5', 'red', 5)
    ];
    
    // 红色3匹配弃牌堆颜色，应该可以组成顺子
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'straight')).toBeTruthy();
  });

  test('顺子第一张牌不匹配时不可出', () => {
    const renderer = new OutModeRenderer();
    // 弃牌堆顶部是蓝色
    const gameState = createGameState('blue', 9);
    
    // 玩家有红色3、4、5
    const cards: Card[] = [
      createCard('red3', 'red', 3),
      createCard('red4', 'red', 4),
      createCard('red5', 'red', 5)
    ];
    
    // 红色不匹配蓝色，应该不能组成顺子
    const combos = renderer.detectCombos!(cards, gameState as any);
    expect(combos.some(c => c.type === 'straight')).toBeFalsy();
  });

  test('无gameState时默认允许所有组合', () => {
    const renderer = new OutModeRenderer();
    // 不提供gameState
    const cards: Card[] = [
      createCard('blue8', 'blue', 8),
      createCard('red8', 'red', 8)
    ];
    
    // 默认应该检测到对子
    const combos = renderer.detectCombos!(cards);
    expect(combos.some(c => c.type === 'pair')).toBeTruthy();
  });
});

describe('GameModeRendererFactory', () => {
  test('工厂可以创建标准模式渲染器', () => {
    const renderer = GameModeRendererFactory.create('standard');
    expect(renderer.name).toBe('standard');
  });

  test('工厂可以创建Out模式渲染器', () => {
    const renderer = GameModeRendererFactory.create('out');
    expect(renderer.name).toBe('out');
  });

  test('工厂对未知模式返回标准模式渲染器', () => {
    const renderer = GameModeRendererFactory.create('unknown');
    expect(renderer.name).toBe('standard');
  });

  test('isRegistered方法工作正常', () => {
    expect(GameModeRendererFactory.isRegistered('standard')).toBeTruthy();
    expect(GameModeRendererFactory.isRegistered('out')).toBeTruthy();
    expect(GameModeRendererFactory.isRegistered('unknown')).toBeFalsy();
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

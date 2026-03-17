/**
 * calculateResult 单元测试
 * 测试排名计算逻辑
 */

import { calculateResult, GameStateV2 } from '../../../game/core/types.js';
import { Player } from '../../../shared/index.js';
import { expect, test, describe } from '../../test-runner.js';

// 辅助函数：创建测试玩家
function createMockPlayer(id: string, nickname: string, eliminated: boolean = false): Player {
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
    eliminated
  };
}

// 辅助函数：创建完成状态（finishedPlayerIds已填满）
function createFinishedState(finishedIds: (string | null)[], eliminatedIds: string[] = []): GameStateV2 {
  const players = new Map<string, Player>();
  
  finishedIds.forEach((id, index) => {
    if (id !== null) {
      const isEliminated = eliminatedIds.includes(id);
      players.set(id, createMockPlayer(id, `Player${index + 1}`, isEliminated));
    }
  });

  return {
    players,
    tablePlayerIds: [],
    finishedPlayerIds: finishedIds,
    currentPlayerIndex: 0,
    direction: 1,
    phase: 'finished',
    deck: [],
    discardPile: [],
    currentColor: 'red',
    turnStartTime: Date.now()
  };
}

console.log('🧪 calculateResult 测试\n');

// 标准模式排名
describe('标准模式排名', () => {
  test('finishedPlayerIds 顺序就是排名顺序', () => {
    // 4人游戏：A第1名，C第2名，B第3名，D第4名
    const state = createFinishedState(
      ['A', 'C', 'B', 'D'],
      []
    );
    
    const result = calculateResult(state);
    
    expect(result.rankings.length).toBe(4);
    expect(result.rankings[0].playerId).toBe('A');
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[0].status).toBe('winner');
    
    expect(result.rankings[1].playerId).toBe('C');
    expect(result.rankings[1].rank).toBe(2);
    
    expect(result.rankings[3].playerId).toBe('D');
    expect(result.rankings[3].rank).toBe(4);
  });

  test('应该正确标记winner（第1名）', () => {
    const state = createFinishedState(['Winner', 'Second', 'Third']);
    
    const result = calculateResult(state);
    
    expect(result.winnerId).toBe('Winner');
    expect(result.rankings[0].status).toBe('winner');
  });
});

// Out模式排名（混合出完+淘汰）
describe('Out模式排名', () => {
  test('应该正确区分出完牌和被淘汰状态', () => {
    // A出完(第1), C出完(第2), D存活(第3), B淘汰(第4)
    const state = createFinishedState(
      ['A', 'C', 'D', 'B'],
      ['B'] // B被淘汰
    );
    
    const result = calculateResult(state);
    
    expect(result.rankings[0].playerId).toBe('A');
    expect(result.rankings[0].status).toBe('winner');
    
    expect(result.rankings[1].playerId).toBe('C');
    expect(result.rankings[1].status).toBe('finished');
    
    expect(result.rankings[2].playerId).toBe('D');
    expect(result.rankings[2].status).toBe('finished');
    
    expect(result.rankings[3].playerId).toBe('B');
    expect(result.rankings[3].status).toBe('eliminated');
  });

  test('只有淘汰没有出完的情况', () => {
    // C存活(冠军), B淘汰(倒数第二), A淘汰(最后一名)
    const state = createFinishedState(
      ['C', 'B', 'A'],
      ['A', 'B']
    );
    
    const result = calculateResult(state);
    
    expect(result.rankings[0].playerId).toBe('C');
    expect(result.rankings[0].status).toBe('winner');
    
    expect(result.rankings[1].playerId).toBe('B');
    expect(result.rankings[1].status).toBe('eliminated');
    
    expect(result.rankings[2].playerId).toBe('A');
    expect(result.rankings[2].status).toBe('eliminated');
  });

  test('多个被淘汰的情况', () => {
    // A出完(第1), D存活(第2), C淘汰(第3), B淘汰(第4), E淘汰(第5)
    const state = createFinishedState(
      ['A', 'D', 'C', 'B', 'E'],
      ['B', 'C', 'E']
    );
    
    const result = calculateResult(state);
    
    expect(result.rankings[0].status).toBe('winner');      // A
    expect(result.rankings[1].status).toBe('finished');    // D
    expect(result.rankings[2].status).toBe('eliminated');  // C
    expect(result.rankings[3].status).toBe('eliminated');  // B
    expect(result.rankings[4].status).toBe('eliminated');  // E
  });
});

// 边界情况
describe('边界情况', () => {
  test('空排名应该返回空数组', () => {
    const state = createFinishedState([]);
    
    const result = calculateResult(state);
    
    expect(result.rankings.length).toBe(0);
    expect(result.winnerId).toBeUndefined();
  });

  test('只有1人完成', () => {
    const state = createFinishedState(['Solo']);
    
    const result = calculateResult(state);
    
    expect(result.rankings.length).toBe(1);
    expect(result.rankings[0].playerId).toBe('Solo');
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[0].status).toBe('winner');
  });

  test('包含null的情况应该过滤掉', () => {
    // 4人游戏中途，只有2人完成
    const state = createFinishedState(
      ['A', 'B', null, null],
      []
    );
    
    const result = calculateResult(state);
    
    expect(result.rankings.length).toBe(2);
    expect(result.rankings[0].playerId).toBe('A');
    expect(result.rankings[1].playerId).toBe('B');
  });

  test('应该包含正确的元数据', () => {
    const state = createFinishedState(['A', 'B']);
    
    const result = calculateResult(state);
    
    expect(result.endedAt > 0).toBeTruthy();
    expect(result.duration >= 0).toBeTruthy();
  });
});

// 复杂场景
describe('复杂场景', () => {
  test('6人混合场景', () => {
    // 6人游戏：
    // - A先出完(第1)
    // - B被淘汰(第6/最后)
    // - C出完(第2)
    // - D被淘汰(第5)
    // - E存活(第3)
    // - F被淘汰(第4)
    const state = createFinishedState(
      ['A', 'C', 'E', 'F', 'D', 'B'],
      ['B', 'D', 'F']
    );
    
    const result = calculateResult(state);
    
    // 验证排名顺序
    expect(result.rankings[0].playerId).toBe('A');
    expect(result.rankings[1].playerId).toBe('C');
    expect(result.rankings[2].playerId).toBe('E');
    expect(result.rankings[3].playerId).toBe('F');
    expect(result.rankings[4].playerId).toBe('D');
    expect(result.rankings[5].playerId).toBe('B');
    
    // 验证排名数字
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[1].rank).toBe(2);
    expect(result.rankings[2].rank).toBe(3);
    expect(result.rankings[3].rank).toBe(4);
    expect(result.rankings[4].rank).toBe(5);
    expect(result.rankings[5].rank).toBe(6);
  });
});

console.log('\n✨ calculateResult 测试完成\n');

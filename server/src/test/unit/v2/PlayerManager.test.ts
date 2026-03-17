/**
 * PlayerManager V2 单元测试
 * 测试预分配位置排名系统的核心逻辑
 */

import { PlayerManager } from '../../../game/v2/PlayerManager.js';
import { GameStateV2 } from '../../../game/v2/types.js';
import { Player } from '../../../shared/index.js';
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

// 辅助函数：创建初始状态
function createMockState(playerIds: string[]): GameStateV2 {
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

console.log('🧪 PlayerManager V2 测试\n');

// 基础功能
describe('基础功能', () => {
  test('应该正确初始化', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    expect(pm.getOnTableCount()).toBe(4);
    expect(pm.getFinishedCount()).toBe(0);
    expect(pm.getCurrentPlayerId()).toBe('A');
  });

  test('应该能获取当前玩家', () => {
    const state = createMockState(['A', 'B', 'C']);
    const pm = new PlayerManager(state);
    
    const current = pm.getCurrentPlayer();
    expect(current?.id).toBe('A');
    expect(current?.nickname).toBe('Player1');
  });
});

// 出完牌流程
describe('出完牌流程', () => {
  test('第1个出完应该排在位置0（第1名）', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A');
    
    expect(state.finishedPlayerIds[0]).toBe('A');
    expect(pm.getOnTableCount()).toBe(3);
  });

  test('第2个出完应该排在位置1（第2名）', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A');
    pm.playerFinished('C');
    
    expect(state.finishedPlayerIds[0]).toBe('A');
    expect(state.finishedPlayerIds[1]).toBe('C');
  });

  test('出完牌的玩家应该标记为非淘汰', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A');
    
    expect(pm.isEliminated('A')).toBeFalsy();
    expect(pm.getStatus('A')).toBe('finished');
  });

  test('不能重复标记同一玩家为完成', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A');
    pm.playerFinished('A'); // 重复调用
    
    // 应该只有一个A
    expect(state.finishedPlayerIds.filter(id => id === 'A').length).toBe(1);
  });
});

// 淘汰流程
describe('淘汰流程', () => {
  test('第1个淘汰应该排在最后位置（最后一名）', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerEliminated('B');
    
    expect(state.finishedPlayerIds[3]).toBe('B'); // 4人游戏，最后位置是3
  });

  test('第2个淘汰应该排在倒数第二位置', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerEliminated('B'); // 第1个淘汰 → 位置3
    pm.playerEliminated('D'); // 第2个淘汰 → 位置2
    
    expect(state.finishedPlayerIds[3]).toBe('B');
    expect(state.finishedPlayerIds[2]).toBe('D');
  });

  test('被淘汰的玩家应该标记为eliminated', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    pm.playerEliminated('B');
    
    expect(pm.isEliminated('B')).toBeTruthy();
    const player = state.players.get('B');
    expect(player?.eliminated).toBeTruthy();
  });
});

// 混合场景
describe('混合场景 - 出完牌 + 淘汰', () => {
  test('场景：A出完 → B淘汰 → C出完 → D存活', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    const pm = new PlayerManager(state);
    
    // A出完 → 位置0
    pm.playerFinished('A');
    expect(state.finishedPlayerIds[0]).toBe('A');
    
    // B淘汰 → 位置3
    pm.playerEliminated('B');
    expect(state.finishedPlayerIds[3]).toBe('B');
    
    // C出完 → 位置1
    pm.playerFinished('C');
    expect(state.finishedPlayerIds[1]).toBe('C');
    
    // D存活 → 填入位置2
    pm.finalizeSurvivor();
    expect(state.finishedPlayerIds[2]).toBe('D');
    
    // 最终排名：[A(1), C(2), D(3), B(4)]
    expect(state.finishedPlayerIds).toEqual(['A', 'C', 'D', 'B']);
  });

  test('场景：只有淘汰，没有出完', () => {
    const state = createMockState(['A', 'B', 'C']);
    const pm = new PlayerManager(state);
    
    pm.playerEliminated('A'); // 位置2
    pm.playerEliminated('B'); // 位置1
    // C存活
    
    pm.finalizeSurvivor();
    expect(state.finishedPlayerIds[0]).toBe('C');
    
    // 最终排名：[C(冠军), B(2), A(3)]
    expect(state.finishedPlayerIds).toEqual(['C', 'B', 'A']);
  });

  test('场景：全部出完牌，无人淘汰', () => {
    const state = createMockState(['A', 'B', 'C']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('B'); // 位置0
    pm.playerFinished('C'); // 位置1
    pm.playerFinished('A'); // 位置2
    
    expect(state.finishedPlayerIds).toEqual(['B', 'C', 'A']);
  });
});

// 回合流转
describe('回合流转', () => {
  test('移除当前玩家前的玩家应该调整索引', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    state.currentPlayerIndex = 2; // 当前是C
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A'); // 移除A（索引0）
    
    expect(state.currentPlayerIndex).toBe(1); // C的索引变为1
  });

  test('移除当前玩家应该保持索引（下一位接替）', () => {
    const state = createMockState(['A', 'B', 'C', 'D']);
    state.currentPlayerIndex = 1; // 当前是B
    const pm = new PlayerManager(state);
    
    pm.playerFinished('B'); // 移除当前玩家B
    
    expect(state.currentPlayerIndex).toBe(1); // 索引不变，C成为当前
    expect(pm.getCurrentPlayerId()).toBe('C');
  });

  test('nextTurn应该正确流转到下一玩家', () => {
    const state = createMockState(['A', 'B', 'C']);
    const pm = new PlayerManager(state);
    
    expect(pm.getCurrentPlayerId()).toBe('A');
    
    pm.nextTurn();
    expect(pm.getCurrentPlayerId()).toBe('B');
    
    pm.nextTurn();
    expect(pm.getCurrentPlayerId()).toBe('C');
    
    pm.nextTurn();
    expect(pm.getCurrentPlayerId()).toBe('A'); // 循环
  });

  test('反转方向后应该反向流转', () => {
    const state = createMockState(['A', 'B', 'C']);
    state.currentPlayerIndex = 1; // 当前是B
    const pm = new PlayerManager(state);
    
    pm.reverseDirection();
    pm.nextTurn();
    
    expect(pm.getCurrentPlayerId()).toBe('A'); // 反向到A
  });
});

// 游戏结束检测
describe('游戏结束检测', () => {
  test('只剩1人时应该结束游戏，winner是第1名', () => {
    const state = createMockState(['A', 'B']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A'); // A第1个出完，是winner
    
    expect(state.phase).toBe('finished');
    expect(state.winnerId).toBe('A'); // 第1名是winner，不是最后存活的B
  });

  test('最后1人出完应该结束游戏', () => {
    const state = createMockState(['A', 'B']);
    const pm = new PlayerManager(state);
    
    pm.playerFinished('A');
    pm.playerFinished('B');
    
    expect(state.phase).toBe('finished');
  });
});

// 边界情况
describe('边界情况', () => {
  test('牌桌上没有该玩家时应该静默处理', () => {
    const state = createMockState(['A', 'B']);
    const pm = new PlayerManager(state);
    
    // 尝试移除不存在的玩家
    pm.playerFinished('C');
    
    // 应该没有变化
    expect(state.finishedPlayerIds[0]).toBeNull();
    expect(pm.getOnTableCount()).toBe(2);
  });
});

console.log('\n✨ PlayerManager V2 测试完成\n');

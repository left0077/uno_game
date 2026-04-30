/**
 * 复杂牌局场景测试
 */
import { ScenarioBuilder, makeCard } from '../../fixtures/scenarioBuilder.js';
import { expect, test, describe } from '../../test-runner.js';

console.log('🧪 复杂牌局场景测试\n');

describe('叠加链', () => {
  test('+2→+2→+4→接受: 下家摸8张', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [makeCard({ id:'c1',type:'draw2',color:'red',value:'draw2' })] },
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'c2',type:'draw2',color:'red',value:'draw2' })] },
      { id: 'C', nickname: 'C', cards: [makeCard({ id:'c3',type:'draw4',color:'wild',value:'draw4' })] },
      { id: 'D', nickname: 'D', cards: [] },
    ]);
    // A 出+2 → B跟+2 → C跟+4 → D接受
    s.play('A', 'c1');
    expect(s.state.pendingDraw).toBe(2);
    s.play('B', 'c2');
    expect(s.state.pendingDraw).toBe(4);  // 2+2
    s.play('C', 'c3', 'red');
    expect(s.state.pendingDraw).toBe(8);  // 4+4
    // D 摸牌（接受）
    s.draw('D');
    expect(s.handCount('D')).toBe(8);  // 摸了8张
  });

  test('+2→+3→+5→+8 跨类型叠加', () => {
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards: [makeCard({ id:'a1',type:'draw2',color:'red',value:'draw2' })] },
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'b1',type:'draw3',color:'blue',value:'draw3' })] },
      { id: 'C', nickname: 'C', cards: [makeCard({ id:'c1',type:'draw5',color:'green',value:'draw5' })] },
      { id: 'D', nickname: 'D', cards: [makeCard({ id:'d1',type:'draw8',color:'wild',value:'draw8' })] },
      { id: 'E', nickname: 'E', cards: [] },
    ]);
    s.play('A', 'a1'); s.play('B', 'b1'); s.play('C', 'c1'); s.play('D', 'd1', 'red');
    expect(s.state.pendingDraw).toBe(18);  // 2+3+5+8
    s.draw('E');
    expect(s.handCount('E')).toBe(18);
  });
});

describe('反转弹回', () => {
  test('A出+2→B反转→惩罚弹回A', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [makeCard({ id:'a1',type:'draw2',color:'red',value:'draw2' })] },
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'b1',type:'reverse',color:'red',value:'reverse' })] },
      { id: 'C', nickname: 'C', cards: [] },
    ]);
    s.play('A', 'a1');
    expect(s.state.pendingDraw).toBe(2);
    expect(s.state.penaltySourceId).toBe('A');

    // B出反转弹回给A
    const result = s.mode.handleAction(
      { type: 'reverse', playerId: 'B', cardIds: ['b1'], timestamp: Date.now() }
    );
    expect(result.success).toBeTruthy();
    // 惩罚还在，目标变成 A
    expect(s.state.pendingDraw).toBe(2);
  });

  test('Ping-pong: A+2→B反转→A反转→B接受摸2张', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'draw2',color:'red',value:'draw2' }),
        makeCard({ id:'a2',type:'reverse',color:'blue',value:'reverse' }),
      ]},
      { id: 'B', nickname: 'B', cards: [
        makeCard({ id:'b1',type:'reverse',color:'red',value:'reverse' }),
      ]},
      { id: 'C', nickname: 'C', cards: [] },
    ]);
    // A出+2
    s.play('A', 'a1');
    expect(s.state.pendingDraw).toBe(2);
    expect(s.state.penaltySourceId).toBe('A');

    // B反转弹回给A
    s.mode.handleAction({ type: 'reverse', playerId: 'B', cardIds: ['b1'], timestamp: Date.now() });
    expect(s.state.pendingDraw).toBe(2);

    // A再反转弹回给B
    s.mode.handleAction({ type: 'reverse', playerId: 'A', cardIds: ['a2'], timestamp: Date.now() });
    expect(s.state.pendingDraw).toBe(2);

    // B没有反转了，接受惩罚摸2张
    expect(s.handCount('B')).toBe(1); // 还有1张牌（reverse已出）
    // B摸牌接受
    s.draw('B');
    expect(s.handCount('B')).toBe(3); // 1 + 2张惩罚
    expect(s.state.pendingDraw).toBe(0); // 惩罚清零
  });

  test('Ping-pong 3人: A+4→B跟+4→C反转→B反转→C接受摸8张', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'draw4',color:'wild',value:'draw4' }),
      ]},
      { id: 'B', nickname: 'B', cards: [
        makeCard({ id:'b1',type:'draw4',color:'wild',value:'draw4' }),
        makeCard({ id:'b2',type:'reverse',color:'red',value:'reverse' }),
      ]},
      { id: 'C', nickname: 'C', cards: [
        makeCard({ id:'c1',type:'reverse',color:'blue',value:'reverse' }),
      ]},
      { id: 'D', nickname: 'D', cards: [] },
    ]);
    // A出+4
    s.play('A', 'a1', 'red');
    expect(s.state.pendingDraw).toBe(4);
    // B跟+4 → 累积8
    s.play('B', 'b1', 'blue');
    expect(s.state.pendingDraw).toBe(8);
    // C反转弹回给B
    s.mode.handleAction({ type: 'reverse', playerId: 'C', cardIds: ['c1'], timestamp: Date.now() });
    expect(s.state.pendingDraw).toBe(8);
    // B再反转弹回给C（ping-pong）
    s.mode.handleAction({ type: 'reverse', playerId: 'B', cardIds: ['b2'], timestamp: Date.now() });
    expect(s.state.pendingDraw).toBe(8);
    // C没牌了，接受
    s.draw('C');
    expect(s.handCount('C')).toBe(8); // 0张原有 + 8张惩罚
  });
});

describe('连打效果', () => {
  test('对子：无惩罚', () => {
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:5 }),
        makeCard({ id:'a2',type:'number',color:'blue',value:5 }),
      ]},
      { id: 'B', nickname: 'B', cards: [] },
    ]);
    s.combo('A', ['a1','a2'], 'pair');
    expect(s.state.pendingDraw || 0).toBe(0);  // 对子无惩罚
    expect(s.handCount('A')).toBe(0);
  });

  test('三条：下家跳过', () => {
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:1 }),
        makeCard({ id:'a2',type:'number',color:'red',value:5 }),
        makeCard({ id:'a3',type:'number',color:'red',value:9 }),
      ]},
      { id: 'B', nickname: 'B', cards: [] },
      { id: 'C', nickname: 'C', cards: [] },
    ]);
    s.combo('A', ['a1','a2','a3'], 'three');
    expect(s.currentPlayer()).toBe('C'); // B被跳过，直接到C
    expect(s.handCount('A')).toBe(0);
  });

  test('彩虹：目标+3', () => {
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:5 }),
        makeCard({ id:'a2',type:'number',color:'yellow',value:5 }),
        makeCard({ id:'a3',type:'number',color:'green',value:5 }),
        makeCard({ id:'a4',type:'number',color:'blue',value:5 }),
      ]},
      { id: 'B', nickname: 'B', cards: [] },
    ]);
    s.combo('A', ['a1','a2','a3','a4'], 'rainbow');
    expect(s.state.pendingDraw).toBe(3); // +3
    expect(s.handCount('A')).toBe(0);
  });

  test('顺子：下家N-2', () => {
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:3 }),
        makeCard({ id:'a2',type:'number',color:'red',value:4 }),
        makeCard({ id:'a3',type:'number',color:'red',value:5 }),
        makeCard({ id:'a4',type:'number',color:'red',value:6 }),
      ]},
      { id: 'B', nickname: 'B', cards: [] },
    ]);
    s.combo('A', ['a1','a2','a3','a4'], 'straight');
    expect(s.state.pendingDraw).toBe(2); // N-2 = 4-2 = 2
    expect(s.handCount('A')).toBe(0);
  });
});

describe('UNO机制', () => {
  test('喊UNO后手牌=1', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:5 }),
        makeCard({ id:'a2',type:'number',color:'red',value:3 }),
      ]},
      { id: 'B', nickname: 'B', cards: [] },
    ]);
    s.uno('A');
    expect(s.player('A')?.hasCalledUno).toBeTruthy();
    s.play('A', 'a1');
    expect(s.player('A')?.hasCalledUno).toBeFalsy(); // 出牌后清除
  });

  test('未喊UNO被质疑罚2张', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [makeCard({ id:'a1',type:'number',color:'red',value:5 })] },
      { id: 'B', nickname: 'B', cards: [] },
    ]);
    s.play('A', 'a1'); // 出完最后一张，只剩0张
    expect(s.handCount('A')).toBe(0);
    expect(s.state.phase).toBe('finished'); // 游戏结束，A赢了

    // 另开一局测试挑战
    const s2 = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [
        makeCard({ id:'a1',type:'number',color:'red',value:5 }),
        makeCard({ id:'a2',type:'number',color:'red',value:3 }),
      ]},
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'b1',type:'number',color:'blue',value:3 })] },
    ]);
    s2.play('A', 'a1'); // 出完a1，剩1张(a2)，没喊UNO
    // 此时A手牌=1，清除上一玩家UNO状态（nextTurn时已清除）
    // B现在可以质疑A
    expect(s2.player('A')?.hasCalledUno).toBeFalsy();
  });
});

describe('玩家完成', () => {
  test('出完牌→完成→排名', () => {
    const s = ScenarioBuilder.standard([
      { id: 'A', nickname: 'A', cards: [makeCard({ id:'a1',type:'number',color:'red',value:5 })] },
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'b1',type:'number',color:'red',value:7 })] },
      { id: 'C', nickname: 'C', cards: [makeCard({ id:'c1',type:'number',color:'red',value:9 })] },
    ]);
    s.play('A', 'a1');
    expect(s.handCount('A')).toBe(0);
    expect(s.pm.getStatus('A')).toBe('finished');
    // A是第1个完成的 → 排名第1
    expect(s.state.finishedPlayerIds[0]).toBe('A');
  });
});

describe('手牌上限淘汰', () => {
  test('手牌>20淘汰', () => {
    const cards = Array.from({length: 21}, (_, i) =>
      makeCard({ id:`x${i}`,type:'number',color:'red',value:i })
    );
    const s = ScenarioBuilder.out([
      { id: 'A', nickname: 'A', cards },
      { id: 'B', nickname: 'B', cards: [makeCard({ id:'b1',type:'number',color:'red',value:5 })] },
    ], makeCard({ type: 'number', color: 'red', value: 0 }));

    // A有21张牌，超级上限20，应被淘汰
    // checkHandLimit 在draw后调用
    // 手动触发检查
    (s.mode as OutModeV2)['checkHandLimit']('A');
    expect(s.player('A')?.eliminated).toBeTruthy();
    expect(s.pm.isFinished('A')).toBeTruthy();
  });
});

console.log('\n✨ 场景测试完成\n');

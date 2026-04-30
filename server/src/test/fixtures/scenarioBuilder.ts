/**
 * 场景测试构造器
 * 快速构造任意牌局，执行动作序列，验证状态
 */
import { GameStateV2, GameActionV2 } from '../../game/core/types.js';
import { PlayerManager } from '../../game/core/PlayerManager.js';
import { OutModeV2 } from '../../game/core/OutModeV2.js';
import { BaseGameModeV2 } from '../../game/core/BaseGameModeV2.js';
import { StandardModeV2 } from '../../game/core/StandardModeV2.js';
import { GameInitializer } from '../../game/core/GameInitializer.js';
import { Player, Card } from '../../shared/index.js';

let _cardId = 0;
function cid() { return `c${++_cardId}`; }

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: cid(),
    type: 'number',
    color: 'red',
    value: 0,
    ...overrides
  } as Card;
}

export interface ScenarioPlayer {
  id: string;
  nickname: string;
  cards: Card[];
}

export class ScenarioBuilder {
  state!: GameStateV2;
  mode!: BaseGameModeV2;
  pm!: PlayerManager;

  /** 用指定牌局创建标准模式 */
  static standard(players: ScenarioPlayer[], topCard?: Card): ScenarioBuilder {
    const b = new ScenarioBuilder();
    b.mode = new StandardModeV2();
    b.state = b._makeState(players, topCard);
    b.mode.initialize(b.state);
    b.pm = b.mode.getPlayerManager();
    return b;
  }

  /** 用指定牌局创建 Out 模式 */
  static out(players: ScenarioPlayer[], topCard?: Card): ScenarioBuilder {
    const b = new ScenarioBuilder();
    b.mode = new OutModeV2();
    b.state = b._makeState(players, topCard);
    b.mode.initialize(b.state);
    b.pm = b.mode.getPlayerManager();
    return b;
  }

  private _makeState(players: ScenarioPlayer[], topCard?: Card): GameStateV2 {
    const playerMap = new Map<string, Player>();
    const ids: string[] = [];
    for (const p of players) {
      playerMap.set(p.id, {
        id: p.id, nickname: p.nickname, cards: p.cards, cardCount: p.cards.length,
        isAI: false, isHost: false, isOnline: true, hasCalledUno: false,
        eliminated: false, isConnected: true,
      } as Player);
      ids.push(p.id);
    }
    const tc = topCard || makeCard({ type: 'number', color: 'red', value: 5 });
    return {
      players: playerMap,
      tablePlayerIds: [...ids],
      finishedPlayerIds: new Array(ids.length).fill(null),
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'playing',
      deck: [],
      discardPile: [tc],
      currentColor: tc.color,
      turnStartTime: Date.now(),
      gameStartTime: Date.now(),
    };
  }

  /** 执行玩家的出牌动作 */
  play(playerId: string, cardId: string, color?: string): this {
    const result = this.mode.handleAction({
      type: 'play', playerId, cardIds: [cardId],
      chosenColor: color as any, timestamp: Date.now()
    });
    if (!result.success) throw new Error(`Play failed: ${result.error?.message}`);
    return this;
  }

  /** 执行连打 */
  combo(playerId: string, cardIds: string[], type: 'pair'|'three'|'rainbow'|'straight'): this {
    const result = this.mode.handleAction({
      type: 'combo', playerId, cardIds, comboType: type, timestamp: Date.now()
    });
    if (!result.success) throw new Error(`Combo failed: ${result.error?.message}`);
    return this;
  }

  /** 摸牌 */
  draw(playerId: string): this {
    const result = this.mode.handleAction({
      type: 'draw', playerId, timestamp: Date.now()
    });
    if (!result.success) throw new Error(`Draw failed: ${result.error?.message}`);
    return this;
  }

  /** 喊 UNO */
  uno(playerId: string): this {
    const result = this.mode.handleAction({
      type: 'uno', playerId, timestamp: Date.now()
    });
    if (!result.success) throw new Error(`UNO failed: ${result.error?.message}`);
    return this;
  }

  /** 挑战 */
  challenge(playerId: string, targetId: string): this {
    const result = this.mode.handleAction({
      type: 'challenge', playerId, targetId, timestamp: Date.now()
    });
    if (!result.success) throw new Error(`Challenge failed: ${result.error?.message}`);
    return this;
  }

  /** 设置累积惩罚 */
  setPending(amount: number, type?: string): this {
    this.state.pendingDraw = amount;
    this.state.pendingDrawType = type as any;
    return this;
  }

  /** 获取玩家 */
  player(id: string): Player | undefined {
    return this.state.players.get(id);
  }

  /** 手牌数 */
  handCount(id: string): number {
    return this.player(id)?.cards.length || 0;
  }

  /** 当前玩家 */
  currentPlayer(): string | undefined {
    return this.pm.getCurrentPlayerId();
  }
}

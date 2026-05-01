/**
 * GameEngine - 游戏业务逻辑引擎
 * 
 * 职责：
 * 1. 管理游戏状态
 * 2. 验证游戏动作合法性
 * 3. 提供游戏业务方法
 * 4. 不直接操作 Socket，通过回调通知外部
 */

import type { Room, GameState, Player, Card } from '../../../../shared/types';

export interface GameContext {
  room: Room | null;
  gameState: GameState | null;
  myHand: Card[];
  myPlayerId: string;
  availableActions: AvailableAction[];
}

export interface AvailableAction {
  type: 'play' | 'reverse' | 'draw' | 'uno' | 'challenge' | 'skip';
  cardId?: string;
  requiresColor?: boolean;
}

export interface GameAction {
  type: 'play' | 'combo' | 'draw' | 'uno' | 'challenge' | 'jumpIn';
  payload: any;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export class GameEngine {
  private context: GameContext = {
    room: null,
    gameState: null,
    myHand: [],
    myPlayerId: '',
    availableActions: []
  };

  private listeners: Set<(ctx: GameContext) => void> = new Set();

  // ========== 状态更新 ==========

  setRoom(room: Room | null): void {
    this.context.room = room;
    this.notify();
  }

  setGameState(state: GameState | null): void {
    this.context.gameState = state;
    this.notify();
  }

  setMyHand(cards: Card[]): void {
    this.context.myHand = cards;
    this.notify();
  }

  setMyPlayerId(id: string): void {
    this.context.myPlayerId = id;
    this.notify();
  }

  setAvailableActions(actions: AvailableAction[]): void {
    this.context.availableActions = actions;
    this.notify();
  }

  // ========== 查询方法 ==========

  getContext(): GameContext {
    return { ...this.context };
  }

  getPhase(): GamePhase {
    if (!this.context.room) return 'waiting';
    if (this.context.gameState?.phase === 'finished') return 'finished';
    if (this.context.gameState) return 'playing';
    return 'waiting';
  }

  isMyTurn(): boolean {
    if (!this.context.gameState) return false;
    return this.context.gameState.currentPlayerId === this.context.myPlayerId;
  }

  isHost(): boolean {
    if (!this.context.room) return false;
    return this.context.room.hostId === this.context.myPlayerId;
  }

  canStartGame(): boolean {
    if (!this.isHost()) return false;
    if (!this.context.room) return false;
    if (this.context.room.status !== 'waiting') return false;
    return this.context.room.players.length >= 2;
  }

  getPlayerCount(): number {
    return this.context.room?.players.length || 0;
  }

  getCurrentPlayer(): Player | undefined {
    if (!this.context.room) return undefined;
    return this.context.room.players.find(p => p.id === this.context.myPlayerId);
  }

  // ========== 动作验证 ==========

  canPlayCard(cardId: string): boolean {
    if (!this.isMyTurn()) return false;
    return this.context.availableActions.some(
      a => (a.type === 'play' || a.type === 'reverse') && a.cardId === cardId
    );
  }

  canDraw(): boolean {
    if (!this.isMyTurn()) return false;
    return this.context.availableActions.some(a => a.type === 'draw');
  }

  canCallUno(): boolean {
    return this.context.availableActions.some(a => a.type === 'uno');
  }

  canChallenge(): boolean {
    return this.context.availableActions.some(a => a.type === 'challenge');
  }

  requiresColorSelection(cardId: string): boolean {
    const action = this.context.availableActions.find(
      a => (a.type === 'play' || a.type === 'reverse') && a.cardId === cardId
    );
    return action?.requiresColor || false;
  }

  // ========== 业务方法 ==========

  createPlayAction(cardId: string, chosenColor?: string): GameAction | null {
    if (!this.canPlayCard(cardId)) {
      console.warn('[GameEngine] Cannot play card:', cardId);
      return null;
    }

    return {
      type: 'play',
      payload: { cardId, chosenColor }
    };
  }

  createComboAction(
    cardIds: string[],
    comboType: 'pair' | 'three' | 'rainbow' | 'straight',
    chosenColor?: string
  ): GameAction | null {
    if (!this.isMyTurn()) {
      console.warn('[GameEngine] Not your turn');
      return null;
    }

    // 验证所有牌都在手牌中
    const allInHand = cardIds.every(id => 
      this.context.myHand.some(card => card.id === id)
    );
    if (!allInHand) {
      console.warn('[GameEngine] Some cards not in hand');
      return null;
    }

    return {
      type: 'combo',
      payload: { cardIds, comboType, chosenColor }
    };
  }

  createDrawAction(): GameAction | null {
    if (!this.canDraw()) {
      console.warn('[GameEngine] Cannot draw');
      return null;
    }

    return {
      type: 'draw',
      payload: {}
    };
  }

  createUnoAction(): GameAction | null {
    if (!this.canCallUno()) {
      console.warn('[GameEngine] Cannot call UNO');
      return null;
    }

    return {
      type: 'uno',
      payload: {}
    };
  }

  createChallengeAction(targetId: string): GameAction | null {
    if (!this.canChallenge()) {
      console.warn('[GameEngine] Cannot challenge');
      return null;
    }

    return {
      type: 'challenge',
      payload: { targetId }
    };
  }

  // ========== 订阅模式 ==========

  subscribe(listener: (ctx: GameContext) => void): () => void {
    this.listeners.add(listener);
    // 立即通知一次当前状态
    listener(this.getContext());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const context = this.getContext();
    this.listeners.forEach(listener => {
      try {
        listener(context);
      } catch (err) {
        console.error('[GameEngine] Error in listener:', err);
      }
    });
  }

  // ========== 工具方法 ==========

  reset(): void {
    this.context = {
      room: null,
      gameState: null,
      myHand: [],
      myPlayerId: this.context.myPlayerId,
      availableActions: []
    };
    this.notify();
  }
}

// 单例实例
let globalEngine: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!globalEngine) {
    globalEngine = new GameEngine();
  }
  return globalEngine;
}

export function resetGameEngine(): void {
  globalEngine?.reset();
  globalEngine = null;
}

/**
 * GameService - 游戏业务服务
 * 
 * 职责：
 * 1. 处理游戏相关的 Socket 操作
 * 2. 将 Socket 事件转换为业务逻辑
 * 3. 与 GameEngine 配合管理状态
 */

import { SocketClient, getSocketClient } from '../socket/SocketClient';
import { GameEngine, getGameEngine, GameAction } from './GameEngine';
import type { GameState, Card } from '../../../../shared/types';

interface GameError {
  code: string;
  message: string;
}

export interface GameCallbacks {
  onGameStarted?: (data: { roomCode: string; mode: string; players: any[] }) => void;
  onGameState?: (state: GameState) => void;
  onMyHand?: (cards: Card[]) => void;
  onAvailableActions?: (actions: any[]) => void;
  onTurnStarted?: (data: { playerId: string; deadline: number }) => void;
  onGameError?: (error: GameError) => void;
  onGameEnded?: (result: any) => void;
  onCardDrawn?: (data: { card: Card; playerId: string }) => void;
  onCardPlayed?: (data: any) => void;
  onUnoCalled?: (data: { playerId: string }) => void;
  onChallengeResult?: (result: any) => void;
  onPlayerSkipped?: (data: { playerId: string; reason: string }) => void;
  onPenaltyApplied?: (data: any) => void;
}

export class GameService {
  private unsubscribeFns: (() => void)[] = [];

  constructor(
    private socket: SocketClient = getSocketClient(),
    private engine: GameEngine = getGameEngine()
  ) {}

  // 初始化监听
  init(callbacks: GameCallbacks = {}): void {
    this.cleanup();

    // 监听游戏开始
    this.unsubscribeFns.push(
      this.socket.on('game:started', (data) => {
        console.log('[GameService] Game started');
        callbacks.onGameStarted?.(data);
      })
    );

    // 监听游戏状态更新
    this.unsubscribeFns.push(
      this.socket.on('game:state', (state) => {
        console.log('[GameService] Game state updated');
        this.engine.setGameState(state);
        callbacks.onGameState?.(state);
      })
    );

    // 监听回合数据（手牌 + 可用动作合并推送）
    this.unsubscribeFns.push(
      this.socket.on('player:turn', (data) => {
        if (data.cards) {
          this.engine.setMyHand(data.cards);
          callbacks.onMyHand?.(data.cards);
        }
        if (data.actions) {
          this.engine.setAvailableActions(data.actions);
          callbacks.onAvailableActions?.(data.actions);
        }
      })
    );

    // 监听回合开始
    this.unsubscribeFns.push(
      this.socket.on('game:turn', (data) => {
        callbacks.onTurnStarted?.(data);
      })
    );

    // 监听游戏错误
    this.unsubscribeFns.push(
      this.socket.on('game:error', (error) => {
        console.error('[GameService] Game error:', error);
        callbacks.onGameError?.(error);
      })
    );

    // 监听游戏结束
    this.unsubscribeFns.push(
      this.socket.on('game:ended', (result) => {
        callbacks.onGameEnded?.(result);
      })
    );

    // 监听抽牌
    this.unsubscribeFns.push(
      this.socket.on('game:drawn', (data) => {
        callbacks.onCardDrawn?.(data);
      })
    );

    // 监听出牌
    this.unsubscribeFns.push(
      this.socket.on('game:played', (data) => {
        callbacks.onCardPlayed?.(data);
      })
    );

    // 监听 UNO 喊叫
    this.unsubscribeFns.push(
      this.socket.on('game:unoCalled', (data) => {
        callbacks.onUnoCalled?.(data);
      })
    );

    // 监听挑战结果
    this.unsubscribeFns.push(
      this.socket.on('game:challengeResult', (result) => {
        callbacks.onChallengeResult?.(result);
      })
    );

    // 监听玩家跳过
    this.unsubscribeFns.push(
      this.socket.on('game:playerSkipped', (data) => {
        callbacks.onPlayerSkipped?.(data);
      })
    );

    // 监听惩罚
    this.unsubscribeFns.push(
      this.socket.on('game:penalty', (data) => {
        callbacks.onPenaltyApplied?.(data);
      })
    );

    // 监听托管状态
    this.unsubscribeFns.push(
      this.socket.on('game:hostage', () => {
        // 托管状态处理
      })
    );
  }

  // 清理监听
  cleanup(): void {
    this.unsubscribeFns.forEach(fn => fn());
    this.unsubscribeFns = [];
  }

  // ========== 游戏操作 ==========

  executeAction(action: GameAction): void {
    switch (action.type) {
      case 'play':
        this.playCard(action.payload);
        break;
      case 'combo':
        this.playCombo(action.payload);
        break;
      case 'draw':
        this.drawCard();
        break;
      case 'uno':
        this.callUno();
        break;
      case 'challenge':
        this.challengePlayer(action.payload.targetId);
        break;
      default:
        console.warn('[GameService] Unknown action:', action);
    }
  }

  playCard(payload: { cardId: string; chosenColor?: string }): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:play', { ...payload, roomCode });
  }

  playCombo(payload: { cardIds: string[]; comboType: string; chosenColor?: string }): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:combo', { ...payload, roomCode });
  }

  drawCard(): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:draw', { roomCode });
  }

  callUno(): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:uno', { roomCode });
  }

  challengePlayer(targetId: string): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:challenge', { targetId, roomCode });
  }

  setJump(jump: boolean): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:jump', { jump, roomCode });
  }

  // 超时处理
  handleTimeout(): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) {
      console.warn('[GameService] No room code available');
      return;
    }
    this.socket.emit('game:timeout', { roomCode });
  }

  private getRoomCode(): string | null {
    const room = this.engine.getContext().room;
    return room?.code || null;
  }
}

// 单例实例
let globalService: GameService | null = null;

export function getGameService(): GameService {
  if (!globalService) {
    globalService = new GameService();
  }
  return globalService;
}

export function resetGameService(): void {
  globalService?.cleanup();
  globalService = null;
}

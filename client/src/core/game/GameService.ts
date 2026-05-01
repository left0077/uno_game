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

export interface GameCallbacks {
  onGameStarted?: (data: { roomCode: string; mode: string; players: any[] }) => void;
  onGameState?: (state: GameState) => void;
  onMyHand?: (cards: Card[]) => void;
  onAvailableActions?: (actions: any[]) => void;
  onGameEnded?: (result: any) => void;
  onChatMessage?: (msg: { type: string; content: string; playerId: string; playerName: string; timestamp: number }) => void;
  onGameEvent?: (data: any) => void;
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

    // 监听游戏结束
    this.unsubscribeFns.push(
      this.socket.on('game:ended', (result) => {
        callbacks.onGameEnded?.(result);
      })
    );

    // 监听游戏事件（UNO/质疑/淘汰等一次性反馈）
    this.unsubscribeFns.push(
      this.socket.on('game:event', (data) => callbacks.onGameEvent?.(data))
    );

    // 监听聊天/表情消息
    this.unsubscribeFns.push(
      this.socket.on('chat:message', (msg) => {
        callbacks.onChatMessage?.(msg);
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
      case 'jumpIn':
        this.jumpIn(action.payload.cardId);
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

  jumpIn(cardId: string): void {
    const roomCode = this.getRoomCode();
    if (!roomCode) return;
    this.socket.emit('game:play', { roomCode, cardId });
  }

  sendEmoji(emoji: string): void {
    const roomCode = this.getRoomCode();
    console.log('[GameService] sendEmoji:', emoji, 'room:', roomCode);
    if (!roomCode) return;
    this.socket.emit('chat:send', { roomCode, type: 'emoji', content: emoji });
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

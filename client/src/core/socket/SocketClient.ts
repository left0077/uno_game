/**
 * SocketClient - Socket.IO 连接管理
 * 
 * 职责：
 * 1. 管理 Socket 连接生命周期
 * 2. 提供原始事件收发能力
 * 3. 不负责业务逻辑，只负责连接
 */

import { io, Socket } from 'socket.io-client';
import type { Room, GameState, Player } from '../../../../shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// 事件类型定义
export interface SocketEvents {
  'connect': void;
  'disconnect': void;
  'connect_error': Error;

  'room:created': Room;
  'room:joined': { success: boolean; room: Room; userId: string };
  'room:updated': Room;

  'game:started': { roomCode: string; mode: string; players: Player[] };
  'game:state': GameState;
  'game:ended': { winnerId?: string; rankings?: any[] };
  'game:event': { type: string; [key: string]: any };

  'player:turn': { playerId: string; cards: any[]; cardCount: number; actions: any[] };

  'chat:message': any;
  'error': { code: string; message: string };
}

export type EventName = keyof SocketEvents;
export type EventHandler<T extends EventName> = (data: SocketEvents[T]) => void;

export class SocketClient {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private isConnected = false;

  constructor(private url: string = SOCKET_URL) {}

  // 连接服务器
  connect(userId?: string, nickname?: string): void {
    if (!this.socket) {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[SocketClient] Connected');
        this.isConnected = true;

        const deviceId = localStorage.getItem('uno-device-id') || `guest_${Date.now()}`;
        const savedName = localStorage.getItem('uno-nickname') || '玩家';
        this.socket?.emit('auth', {
          userId: userId || deviceId,
          nickname: nickname || savedName
        });

        this.emitInternal('connect', undefined);
      });

      this.socket.on('disconnect', () => {
        console.log('[SocketClient] Disconnected');
        this.isConnected = false;
        this.emitInternal('disconnect', undefined);
      });

      this.socket.on('connect_error', (err) => {
        console.error('[SocketClient] Error:', err);
        this.emitInternal('connect_error', err);
      });

      this.bindEvents();
    }

    // 已经连接：直接触发 connect 事件让上层初始化
    if (this.socket?.connected) {
      this.isConnected = true;
      this.emitInternal('connect', undefined);
    }
  }

  // 断开连接
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers.clear();
  }

  // 发送事件
  emit<T = any>(event: string, data: T): void {
    this.socket?.emit(event, data);
  }

  // 监听事件
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // 返回取消监听函数
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  // 一次性监听
  once<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const unsubscribe = this.on(event, ((data: any) => {
      handler(data);
      unsubscribe();
    }) as EventHandler<T>);
  }

  // 获取连接状态
  getConnected(): boolean {
    return this.isConnected;
  }

  // 获取 socket ID
  getId(): string | undefined {
    return this.socket?.id;
  }

  // 内部：触发本地事件
  private emitInternal(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[SocketClient] Error in handler for ${event}:`, err);
        }
      });
    }
  }

  // 内部：绑定服务器事件
  private bindEvents(): void {
    if (!this.socket) return;

    // 房间事件
    this.socket.on('room:created', (data) => this.emitInternal('room:created', data));
    this.socket.on('room:joined', (data) => this.emitInternal('room:joined', data));
    this.socket.on('room:updated', (data) => this.emitInternal('room:updated', data));
    this.socket.on('room:playerJoined', (data) => this.emitInternal('room:playerJoined', data));
    this.socket.on('room:playerLeft', (data) => this.emitInternal('room:playerLeft', data));

    // 游戏事件
    this.socket.on('game:started', (data) => this.emitInternal('game:started', data));
    this.socket.on('game:state', (data) => this.emitInternal('game:state', data));
    this.socket.on('game:ended', (data) => this.emitInternal('game:ended', data));
    
    // 游戏事件（非状态同步，用于UI反馈）
    this.socket.on('game:event', (data) => this.emitInternal('game:event', data));

    // 玩家个人事件
    this.socket.on('player:turn', (data) => this.emitInternal('player:turn', data));
    this.socket.on('player:hand', (data) => this.emitInternal('player:hand', data));
    this.socket.on('player:actions', (data) => this.emitInternal('player:actions', data));

    // V2 游戏事件
    this.socket.on('v2:gameState', (data) => this.emitInternal('v2:gameState', data));
    this.socket.on('v2:playerHand', (data) => this.emitInternal('v2:playerHand', data));
    this.socket.on('v2:availableActions', (data) => this.emitInternal('v2:availableActions', data));
    this.socket.on('v2:actionFailed', (data) => this.emitInternal('v2:actionFailed', data));

    // 聊天事件
    this.socket.on('chat:message', (data) => this.emitInternal('chat:message', data));

    // 错误事件
    this.socket.on('error', (data) => this.emitInternal('error', data));
  }
}

// 单例实例
let globalClient: SocketClient | null = null;

export function getSocketClient(): SocketClient {
  if (!globalClient) {
    globalClient = new SocketClient();
  }
  return globalClient;
}

export function resetSocketClient(): void {
  globalClient?.disconnect();
  globalClient = null;
}

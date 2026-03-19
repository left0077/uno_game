/**
 * RoomService - 房间业务服务
 * 
 * 职责：
 * 1. 处理房间相关的 Socket 操作
 * 2. 将 Socket 事件转换为业务逻辑
 * 3. 与 GameEngine 配合管理状态
 */

import { SocketClient, getSocketClient } from '../socket/SocketClient';
import { GameEngine, getGameEngine } from './GameEngine';
import type { Room, RoomSettings } from '../../../../shared/types';

export interface RoomCallbacks {
  onRoomCreated?: (room: Room) => void;
  onRoomJoined?: (room: Room) => void;
  onRoomUpdated?: (room: Room) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export class RoomService {
  private unsubscribeFns: (() => void)[] = [];

  constructor(
    private socket: SocketClient = getSocketClient(),
    private engine: GameEngine = getGameEngine()
  ) {}

  // 初始化监听
  init(callbacks: RoomCallbacks = {}): void {
    this.cleanup();

    // 监听房间创建
    this.unsubscribeFns.push(
      this.socket.on('room:created', (room) => {
        console.log('[RoomService] Room created:', room.code);
        this.engine.setRoom(room);
        // 创建者就是房主
        if (room.hostId) {
          this.engine.setMyPlayerId(room.hostId);
        }
        callbacks.onRoomCreated?.(room);
      })
    );

    // 监听加入房间
    this.unsubscribeFns.push(
      this.socket.on('room:joined', (data) => {
        if (data.success) {
          console.log('[RoomService] Room joined:', data.room.code);
          this.engine.setRoom(data.room);
          // 设置当前用户ID（用于判断房主身份）
          if (data.userId) {
            this.engine.setMyPlayerId(data.userId);
          }
          callbacks.onRoomJoined?.(data.room);
        }
      })
    );

    // 监听房间更新
    this.unsubscribeFns.push(
      this.socket.on('room:updated', (room) => {
        this.engine.setRoom(room);
        callbacks.onRoomUpdated?.(room);
      })
    );

    // 监听玩家加入
    this.unsubscribeFns.push(
      this.socket.on('room:playerJoined', (player) => {
        console.log('[RoomService] Player joined:', player.nickname);
      })
    );

    // 监听玩家离开
    this.unsubscribeFns.push(
      this.socket.on('room:playerLeft', (data) => {
        console.log('[RoomService] Player left:', data.playerId);
      })
    );

    // 监听错误
    this.unsubscribeFns.push(
      this.socket.on('error', (error) => {
        console.error('[RoomService] Error:', error);
        callbacks.onError?.(error);
      })
    );
  }

  // 清理监听
  cleanup(): void {
    this.unsubscribeFns.forEach(fn => fn());
    this.unsubscribeFns = [];
  }

  // ========== 房间操作 ==========

  createRoom(nickname: string): void {
    this.socket.emit('room:create', { nickname });
  }

  joinRoom(roomCode: string, nickname: string): void {
    this.socket.emit('room:join', { roomCode, nickname });
  }

  leaveRoom(): void {
    this.socket.emit('room:leave', {});
    this.engine.reset();
  }

  reconnect(roomCode: string, userId: string): void {
    this.socket.emit('room:join', { roomCode, userId });
  }

  addAI(roomCode: string, difficulty: 'easy' | 'normal' | 'hard', type: 'bot' | 'host' = 'bot'): void {
    this.socket.emit('ai:add', { roomCode, difficulty, type });
  }

  removeAI(roomCode: string, aiId: string): void {
    this.socket.emit('ai:remove', { roomCode, aiId });
  }

  updateSettings(roomCode: string, settings: Partial<RoomSettings>): void {
    this.socket.emit('room:settings', { roomCode, settings });
  }

  startGame(roomCode: string, mode: 'standard' | 'out' = 'out'): void {
    this.socket.emit('room:start', { roomCode, mode });
  }
}

// 单例实例
let globalService: RoomService | null = null;

export function getRoomService(): RoomService {
  if (!globalService) {
    globalService = new RoomService();
  }
  return globalService;
}

export function resetRoomService(): void {
  globalService?.cleanup();
  globalService = null;
}

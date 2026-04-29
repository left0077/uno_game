/**
 * useSocket - Socket 连接管理 Hook（精简版）
 * 
 * 职责：
 * 1. 管理 Socket 连接
 * 2. 提供连接状态
 * 3. 暴露核心服务方法
 * 
 * 注意：
 * - 不管理业务状态（Room/Game）
 * - 使用单例模式避免重复连接
 * - 业务逻辑在 RoomService 和 GameService 中处理
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getSocketClient,
  getGameEngine,
  getRoomService,
  getGameService
} from '../core';
import type { GameCallbacks, RoomCallbacks } from '../core';

export interface UseSocketOptions {
  serverUrl: string;
  userId: string;
  nickname: string;
  roomCallbacks?: RoomCallbacks;
  gameCallbacks?: GameCallbacks;
}

export function useSocket(options: UseSocketOptions) {
  const { serverUrl, userId, nickname, roomCallbacks, gameCallbacks } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socket = getSocketClient();
  const engine = getGameEngine();
  const roomService = getRoomService();
  const gameService = getGameService();
  
  // 保存 callbacks 引用以避免重复订阅
  const callbacksRef = useRef({ roomCallbacks, gameCallbacks });
  useEffect(() => {
    callbacksRef.current = { roomCallbacks, gameCallbacks };
  }, [roomCallbacks, gameCallbacks]);

  // 初始化连接
  useEffect(() => {
    if (!serverUrl) return;

    // 连接 Socket - SocketClient.connect(userId, nickname)
    socket.connect(userId, nickname);

    // 监听连接状态
    const unsubConnect = socket.on('connect', () => {
      console.log('[useSocket] Connected');
      setIsConnected(true);
      setError(null);
      
      // 发送身份验证
      socket.emit('auth:register', { userId, nickname });
    });

    const unsubDisconnect = socket.on('disconnect', (reason) => {
      console.log('[useSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    const unsubError = socket.on('connect_error', (err) => {
      console.error('[useSocket] Connection error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
    };
  }, [serverUrl, userId, nickname, socket]);

  // 初始化服务监听
  useEffect(() => {
    if (!isConnected) return;

    roomService.init(roomCallbacks || {});
    gameService.init(gameCallbacks || {});

    return () => {
      roomService.cleanup();
      gameService.cleanup();
    };
  }, [isConnected, roomService, gameService, roomCallbacks, gameCallbacks]);

  // 更新用户信息
  const updateUser = useCallback((newNickname: string) => {
    socket.emit('player:update', { nickname: newNickname });
  }, [socket]);

  // 发送聊天消息
  const sendChatMessage = useCallback((message: string) => {
    socket.emit('chat:send', { message });
  }, [socket]);

  return {
    // 状态
    isConnected,
    error,
    
    // Socket 实例（供需要直接使用的地方）
    socket,
    
    // 核心引擎（状态查询）
    engine,
    
    // 服务（业务操作）
    roomService,
    gameService,
    
    // 便捷方法
    updateUser,
    sendChatMessage,
    
    // 关闭连接
    disconnect: useCallback(() => {
      socket.disconnect();
    }, [socket])
  };
}

export type UseSocketReturn = ReturnType<typeof useSocket>;

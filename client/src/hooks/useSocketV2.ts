/**
 * useSocketV2 - V2 架构 Socket 连接 Hook
 * 
 * 功能：
 * 1. 连接 SocketHandlerV2
 * 2. 提供 V2 专用事件监听
 * 3. 自动重连
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface V2GameState {
  version: 'v2';
  phase: 'playing' | 'finished';
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  direction: 1 | -1;
  deckCount: number;
  discardPile: any[];
  topCard: any | null;
  currentColor: string;
  pendingDraw: number;
  pendingDrawType?: string;
  skippedPlayerId?: string;
  players: V2PlayerInfo[];
  rankings: any[] | null;
  outState?: {
    phase: number;
    maxCards: number;
    nextOutAt: number;
  };
  turnStartTime: number;
  lastAction?: any;
}

interface V2PlayerInfo {
  id: string;
  nickname: string;
  cardCount: number;
  status: 'ontable' | 'finished';
  eliminated: boolean;
  hasCalledUno: boolean;
  isAI: boolean;
}

interface AvailableAction {
  type: 'play' | 'draw' | 'uno' | 'challenge' | 'skip';
  cardId?: string;
  requiresColor?: boolean;
}

export function useSocketV2() {
  const socketRef = useRef<Socket | null>(null);
  
  // 从 localStorage 获取用户信息
  const getUserInfo = () => {
    const deviceId = localStorage.getItem('uno-device-id') || `guest_${Date.now()}`;
    const savedName = localStorage.getItem('uno-nickname');
    return {
      userId: deviceId,
      nickname: savedName || '玩家'
    };
  };
  
  const { userId, nickname } = getUserInfo();
  
  // 状态
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<V2GameState | null>(null);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 初始化连接
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('[V2] Socket connected');
      setIsConnected(true);
      setError(null);
      
      // 认证
      const userInfo = getUserInfo();
      socket.emit('auth', { userId: userInfo.userId, nickname: userInfo.nickname });
    });

    socket.on('disconnect', () => {
      console.log('[V2] Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[V2] Socket error:', err);
      setError('连接失败');
    });

    // V2 游戏事件
    socket.on('v2:gameState', (state: V2GameState) => {
      console.log('[V2] Game state updated:', state);
      setGameState(state);
    });

    socket.on('v2:playerHand', (data: { playerId: string; cards: any[] }) => {
      if (data.playerId === userId) {
        setMyHand(data.cards);
      }
    });

    socket.on('v2:availableActions', (data: { playerId: string; actions: AvailableAction[] }) => {
      if (data.playerId === userId) {
        setAvailableActions(data.actions);
      }
    });

    socket.on('v2:actionFailed', (data: { action: any; reason: string }) => {
      console.warn('[V2] Action failed:', data);
      setError(`动作失败: ${data.reason}`);
    });

    socket.on('v2:gameEnded', (data: { winnerId: string; rankings: any[] }) => {
      console.log('[V2] Game ended:', data);
      // 可以在这里触发游戏结束弹窗
    });

    // 错误事件
    socket.on('error', (data: { code: string; message: string }) => {
      console.error('[V2] Server error:', data);
      setError(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, nickname]);

  // ========== 房间操作 ==========

  const createRoom = useCallback((nickname: string) => {
    socketRef.current?.emit('CREATE_ROOM', { nickname, userId });
  }, [userId]);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    socketRef.current?.emit('JOIN_ROOM', { roomCode, nickname, userId });
  }, [userId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('LEAVE_ROOM');
  }, []);

  // ========== 游戏操作 ==========

  const startGameV2 = useCallback((roomCode: string, mode: 'standard' | 'out' = 'out') => {
    socketRef.current?.emit('v2:gameStart', { roomCode, mode });
  }, []);

  const sendActionV2 = useCallback((roomCode: string, action: any) => {
    socketRef.current?.emit('v2:action', { roomCode, action });
  }, []);

  // 快捷动作
  const playCardV2 = useCallback((roomCode: string, cardId: string, chosenColor?: string) => {
    socketRef.current?.emit('v2:playCard', { roomCode, cardId, chosenColor });
  }, []);

  const playComboV2 = useCallback((roomCode: string, cardIds: string[], comboType: string, chosenColor?: string) => {
    socketRef.current?.emit('v2:playCombo', { roomCode, cardIds, comboType, chosenColor });
  }, []);

  const drawCardV2 = useCallback((roomCode: string) => {
    socketRef.current?.emit('v2:draw', { roomCode });
  }, []);

  const callUnoV2 = useCallback((roomCode: string) => {
    socketRef.current?.emit('v2:callUno', { roomCode });
  }, []);

  const challengeV2 = useCallback((roomCode: string, targetId: string) => {
    socketRef.current?.emit('v2:challenge', { roomCode, targetId });
  }, []);

  // 查询
  const refreshStateV2 = useCallback((roomCode: string) => {
    socketRef.current?.emit('v2:getState', { roomCode });
  }, []);

  const refreshActionsV2 = useCallback((roomCode: string) => {
    socketRef.current?.emit('v2:getAvailableActions', { roomCode });
  }, []);

  return {
    // 连接状态
    socket: socketRef.current,
    isConnected,
    error,
    clearError: () => setError(null),

    // 游戏状态
    gameState,
    myHand,
    availableActions,
    isMyTurn: gameState?.currentPlayerId === userId,
    myPlayerId: userId,

    // 房间操作
    createRoom,
    joinRoom,
    leaveRoom,

    // 游戏操作
    startGameV2,
    sendActionV2,
    playCardV2,
    playComboV2,
    drawCardV2,
    callUnoV2,
    challengeV2,

    // 查询
    refreshStateV2,
    refreshActionsV2,
  };
}

export type { V2GameState, V2PlayerInfo, AvailableAction };

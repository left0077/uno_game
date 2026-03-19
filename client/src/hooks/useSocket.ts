/**
 * useSocket - Socket 连接 Hook
 * 
 * 功能：
 * 1. 连接 Socket 服务器
 * 2. 管理连接状态
 * 3. 提供房间和游戏操作方法
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, GameState, Player } from '../../../shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface V2GameState {
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

export interface V2PlayerInfo {
  id: string;
  nickname: string;
  cardCount: number;
  status: 'ontable' | 'finished';
  eliminated: boolean;
  hasCalledUno: boolean;
  isAI: boolean;
}

export interface AvailableAction {
  type: 'play' | 'draw' | 'uno' | 'challenge' | 'skip';
  cardId?: string;
  requiresColor?: boolean;
}

export interface AvailableActionsV2 {
  canPlay: boolean;
  playableCards: string[];
  canDraw: boolean;
  drawReason?: string;
  canCallUno: boolean;
  mustCallUno: boolean;
  canChallenge: boolean;
  challengeTargets?: string[];
  canJumpIn: boolean;
  jumpInCards?: string[];
}

export function useSocket(
  serverUrl: string = SOCKET_URL,
  userId?: string,
  nickname?: string,
  onRoomCreated?: (room: Room) => void,
  onRoomJoined?: (room: Room) => void,
  onRoomUpdated?: (room: Room) => void,
  onPlayerJoined?: (player: Player) => void,
  onPlayerLeft?: (playerId: string) => void,
  onGameStarted?: (gameState: GameState) => void,
  onGameState?: (gameState: GameState) => void,
  onGameEnded?: (data: { winner: Player; rankings?: any[] }) => void,
  onReceiveMessage?: (msg: any) => void,
  onError?: (error: { code: string; message: string }) => void,
  onAvailableActions?: (actions: AvailableActionsV2) => void
) {
  const socketRef = useRef<Socket | null>(null);
  
  // 状态
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<V2GameState | null>(null);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 使用 ref 存储事件处理器，避免依赖项变化导致重新连接
  const handlersRef = useRef({
    onRoomCreated, onRoomJoined, onRoomUpdated, onPlayerJoined, onPlayerLeft,
    onGameStarted, onGameState, onGameEnded, onReceiveMessage, onError, onAvailableActions
  });
  handlersRef.current = {
    onRoomCreated, onRoomJoined, onRoomUpdated, onPlayerJoined, onPlayerLeft,
    onGameStarted, onGameState, onGameEnded, onReceiveMessage, onError, onAvailableActions
  };

  // 初始化连接
  useEffect(() => {
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      setError(null);
      
      // 认证
      const deviceId = localStorage.getItem('uno-device-id') || `guest_${Date.now()}`;
      const savedName = localStorage.getItem('uno-nickname') || '玩家';
      socket.emit('auth', { userId: userId || deviceId, nickname: nickname || savedName });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error:', err);
      setError('连接失败');
      onError?.({ code: 'CONNECT_ERROR', message: '连接服务器失败' });
    });

    // 房间事件
    socket.on('room:created', (room: Room) => {
      console.log('[Socket] Room created:', room.code);
      handlersRef.current.onRoomCreated?.(room);
    });

    socket.on('room:joined', (data: { success: boolean; room: Room; userId: string }) => {
      console.log('[Socket] Room joined:', data.room?.code);
      if (data.success) {
        handlersRef.current.onRoomJoined?.(data.room);
      }
    });

    socket.on('room:updated', (room: Room) => {
      handlersRef.current.onRoomUpdated?.(room);
    });

    socket.on('player:joined', (player: Player) => {
      handlersRef.current.onPlayerJoined?.(player);
    });

    socket.on('player:left', (data: { playerId: string }) => {
      handlersRef.current.onPlayerLeft?.(data.playerId);
    });

    // 游戏事件
    socket.on('game:started', (gameState: GameState) => {
      console.log('[Socket] Game started');
      handlersRef.current.onGameStarted?.(gameState);
    });

    socket.on('game:state', (gameState: GameState) => {
      handlersRef.current.onGameState?.(gameState);
    });

    socket.on('game:ended', (data: { winner: Player; rankings?: any[] }) => {
      handlersRef.current.onGameEnded?.(data);
    });

    // V2 游戏事件
    socket.on('v2:gameState', (state: V2GameState) => {
      setGameState(state);
    });

    socket.on('v2:playerHand', (data: { playerId: string; cards: any[] }) => {
      const currentUserId = userId || localStorage.getItem('uno-device-id');
      if (data.playerId === currentUserId) {
        setMyHand(data.cards);
      }
    });

    socket.on('v2:availableActions', (data: { playerId: string; actions: AvailableAction[] }) => {
      const currentUserId = userId || localStorage.getItem('uno-device-id');
      if (data.playerId === currentUserId) {
        setAvailableActions(data.actions);
      }
    });

    socket.on('v2:actionFailed', (data: { action: any; reason: string }) => {
      console.warn('[Socket] Action failed:', data);
      onError?.({ code: 'ACTION_FAILED', message: data.reason });
    });

    socket.on('v2:gameEnded', (data: { winnerId: string; rankings: any[] }) => {
      console.log('[Socket] Game ended:', data);
    });

    // 聊天事件
    socket.on('chat:message', (msg: any) => {
      handlersRef.current.onReceiveMessage?.(msg);
    });

    // 错误事件
    socket.on('error', (data: { code: string; message: string }) => {
      console.error('[Socket] Server error:', data);
      handlersRef.current.onError?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl, userId, nickname]);

  // ========== 房间操作 ==========

  const createRoom = useCallback((nickname: string) => {
    socketRef.current?.emit('room:create', { nickname, userId });
  }, [userId]);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    console.log('[Socket] Emitting room:join', { roomCode, nickname, userId });
    socketRef.current?.emit('room:join', { roomCode, nickname, userId });
  }, [userId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
  }, []);

  const reconnect = useCallback((roomCode: string, userId: string) => {
    socketRef.current?.emit('room:join', { roomCode, userId });
  }, []);

  const addAI = useCallback((roomCode: string, difficulty: string, type: string) => {
    socketRef.current?.emit('ai:add', { roomCode, difficulty, type });
  }, []);

  const removeAI = useCallback((roomCode: string, aiId: string) => {
    socketRef.current?.emit('ai:remove', { roomCode, aiId });
  }, []);

  const updateSettings = useCallback((roomCode: string, settings: any) => {
    socketRef.current?.emit('room:settings', { roomCode, settings });
  }, []);

  // ========== 游戏操作 ==========

  const startGame = useCallback((roomCode: string, mode: 'standard' | 'out' = 'out') => {
    socketRef.current?.emit('room:start', { roomCode, mode });
  }, []);

  const playCard = useCallback((roomCode: string, cardId: string, chosenColor?: string) => {
    socketRef.current?.emit('game:play', { roomCode, cardId, chosenColor });
  }, []);

  const playCombo = useCallback((roomCode: string, cardIds: string[], comboType: string, chosenColor?: string) => {
    socketRef.current?.emit('game:combo', { roomCode, cardIds, comboType, chosenColor });
  }, []);

  const drawCard = useCallback((roomCode: string) => {
    socketRef.current?.emit('game:draw', { roomCode });
  }, []);

  const callUno = useCallback((roomCode: string) => {
    socketRef.current?.emit('game:uno', { roomCode });
  }, []);

  const challengeUno = useCallback((roomCode: string, targetId: string) => {
    socketRef.current?.emit('game:challenge', { roomCode, targetId });
  }, []);

  const jumpIn = useCallback((roomCode: string, cardId: string) => {
    socketRef.current?.emit('game:jump', { roomCode, cardId });
  }, []);

  const sendMessage = useCallback((roomCode: string, type: string, content: string) => {
    socketRef.current?.emit('chat:send', { roomCode, type, content });
  }, []);

  const toggleHosting = useCallback((roomCode: string, enabled: boolean) => {
    socketRef.current?.emit('player:host', { roomCode, enabled });
  }, []);

  const getAvailableActions = useCallback((roomCode: string) => {
    socketRef.current?.emit('player:actions', { roomCode });
  }, []);

  return {
    // 连接状态
    socket: socketRef.current,
    isConnected,
    error,
    clearError: () => setError(null),

    // 游戏状态 (V2)
    gameState,
    myHand,
    availableActions,
    isMyTurn: gameState?.currentPlayerId === (userId || localStorage.getItem('uno-device-id')),
    myPlayerId: userId || localStorage.getItem('uno-device-id'),

    // 房间操作
    createRoom,
    joinRoom,
    leaveRoom,
    reconnect,
    addAI,
    removeAI,
    updateSettings,

    // 游戏操作
    startGame,
    playCard,
    playCombo,
    drawCard,
    callUno,
    challengeUno,
    jumpIn,
    sendMessage,
    toggleHosting,
    getAvailableActions,
  };
}

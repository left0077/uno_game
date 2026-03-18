import { useState, useCallback, useEffect, useRef } from 'react';

import { Home } from './pages/Home';
import { Room } from './pages/Room';
import Game from './pages/Game';
import { SettingsModal } from './components/SettingsModal';
import { useSocket, AvailableActionsV2 } from './hooks/useSocket';
import { useGameStore } from './hooks/useGameStore';
import type { Room as RoomType, GameState, Player, RoomSettings, ChatMessage } from '../../shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

type Page = 'home' | 'room' | 'game';

function App() {
  const store = useGameStore();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // V2 API: 存储从 socket 接收的可用动作
  const [availableActionsV2, setAvailableActionsV2] = useState<AvailableActionsV2 | null>(null);
  // 检查 URL 参数（优先处理分享链接）
  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoomCode = urlParams.get('room');
  
  // 根据保存的状态或URL参数初始化页面
  const [page, setPage] = useState<Page>(() => {
    // 如果有分享链接的房间号，显示主页等待加入
    if (inviteRoomCode) {
      localStorage.setItem('uno-invite-room', inviteRoomCode);
      return 'home';
    }
    // 否则检查保存的状态
    const savedRoom = localStorage.getItem('uno-current-room');
    if (savedRoom) return 'room';
    return 'home';
  });
  
  // 页面加载时清除过期的房间状态（如果房间已结束）
  useEffect(() => {
    const savedRoom = localStorage.getItem('uno-current-room');
    if (savedRoom) {
      const room = JSON.parse(savedRoom) as RoomType;
      if (room.status === 'finished') {
        // 如果游戏已结束，清除保存的状态
        localStorage.removeItem('uno-current-room');
        setPage('home');
      }
    }
  }, []);
  
  // 清除 URL 参数（处理完后）
  useEffect(() => {
    if (inviteRoomCode) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const handleRoomCreated = useCallback((room: RoomType) => {
    console.log('[App] Room created:', room?.code);
    if (!room) {
      console.error('[App] Room is null/undefined');
      return;
    }
    // 先保存 nickname
    localStorage.setItem('uno-nickname', store.nickname);
    // 设置 room（store.setCurrentRoom 内部会保存到 localStorage）
    store.setCurrentRoom(room);
    // 强制跳转到 room 页面
    setPage('room');
  }, [store, store.nickname]);

  const handleRoomJoined = useCallback((room: RoomType) => {
    console.log('[App] Room joined:', room?.code);
    if (!room) {
      console.error('[App] Room is null/undefined');
      return;
    }
    store.setCurrentRoom(room);
    setPage('room');
  }, [store]);

  const handleRoomUpdated = useCallback((room: RoomType) => {
    store.setCurrentRoom(room);
  }, [store]);

  const handleGameStarted = useCallback((gameState: GameState) => {
    store.setGameState(gameState);
    // 更新房间状态为 playing
    if (store.currentRoom) {
      const updatedRoom = { ...store.currentRoom, status: 'playing' as const };
      store.setCurrentRoom(updatedRoom);
      localStorage.setItem('uno-current-room', JSON.stringify(updatedRoom));
    }
    setPage('game');
  }, [store]);

  const handleGameState = useCallback((gameState: GameState) => {
    store.setGameState(gameState);
  }, [store]);

  const handleGameEnded = useCallback((data: { winner: Player; rankings?: { rank: number; playerId: string; nickname: string }[] }) => {
    // 显示完整的排名
    let message = '🎉 游戏结束！\n\n';
    if (data.rankings && data.rankings.length > 0) {
      message += '🏆 最终排名：\n';
      data.rankings.forEach((r) => {
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '  ';
        message += `${medal} 第${r.rank}名：${r.nickname}\n`;
      });
    } else {
      message += `🏆 获胜者：${data.winner.nickname}`;
    }
    
    setTimeout(() => {
      alert(message);
    }, 500);
    
    store.setGameState(null);
    if (store.currentRoom) {
      store.setCurrentRoom({
        ...store.currentRoom,
        status: 'finished'
      });
    }
    setPage('room');
  }, [store]);

  const handleError = useCallback((error: { code: string; message: string }) => {
    store.setError(error.message);
    console.error('Socket error:', error);
  }, [store]);

  const handleReceiveMessage = useCallback((msg: { type: string; content: string; playerId: string; playerName: string; timestamp: number }) => {
    // 添加消息到聊天列表
    setChatMessages(prev => [...prev, msg]);
    // 限制消息数量
    setChatMessages(prev => prev.slice(-20));
  }, []);

  const handleAvailableActions = useCallback((actions: AvailableActionsV2) => {
    // 保存 V2 API 可用动作
    setAvailableActionsV2(actions);
  }, []);

  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const socket = useSocket(
    store.serverUrl,
    store.userId,
    store.nickname,
    handleRoomCreated,
    handleRoomJoined,
    handleRoomUpdated,
    undefined,
    undefined,
    handleGameStarted,
    handleGameState,
    handleGameEnded,
    undefined,
    undefined,
    undefined
  );
  
  // 断线重连处理
  const hasReconnectedRef = useRef(false);
  
  useEffect(() => {
    // 如果 socket 连接成功，且之前有房间状态，尝试重连
    if (socket.isConnected && store.currentRoom && !isReconnecting && !hasReconnectedRef.current) {
      if (page === 'room' || page === 'game' || page === 'gamev2') {
        // 页面刷新后总是尝试重连（不管 localStorage 中的 isConnected 状态）
        setIsReconnecting(true);
        hasReconnectedRef.current = true;
        socket.reconnect(store.currentRoom.code, store.userId);
      }
    }
  }, [socket.isConnected, store.currentRoom, page, socket, isReconnecting, store.userId]);
  
  // 处理重连成功
  useEffect(() => {
    const handleReconnected = (data: { success: boolean; room: RoomType; gameState?: GameState }) => {
      if (data.success) {
        setIsReconnecting(false);
        
        store.setCurrentRoom(data.room);
        if (data.gameState) {
          store.setGameState(data.gameState);
          setPage('game');
        } else {
          setPage('room');
        }
      }
    };
    
    // 处理重连失败 - 静默处理，不显示错误（这是正常流程）
    const handleReconnectFailed = () => {
      setIsReconnecting(false);
      // 清除保存的房间状态，让用户重新加入
      store.setCurrentRoom(null);
      store.setGameState(null);
      setPage('home');
    };
    
    socket.socket?.on('player:reconnected', handleReconnected);
    socket.socket?.on('player:reconnectFailed', handleReconnectFailed);
    return () => {
      socket.socket?.off('player:reconnected', handleReconnected);
      socket.socket?.off('player:reconnectFailed', handleReconnectFailed);
    };
  }, [socket.socket, store]);
  
  // 处理聊天消息
  useEffect(() => {
    const handleReceiveMessage = (msg: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-9), msg]); // 保留最近10条
      // 3秒后自动移除
      setTimeout(() => {
        setChatMessages(prev => prev.filter(m => m.timestamp !== msg.timestamp));
      }, 5000);
    };
    
    socket.socket?.on('chat:receive', handleReceiveMessage);
    return () => {
      socket.socket?.off('chat:receive', handleReceiveMessage);
    };
  }, [socket.socket]);

  const handleCreateRoom = useCallback(() => {
    socket.createRoom(store.nickname);
  }, [socket, store.nickname]);

  const handleJoinRoom = useCallback((roomCode: string) => {
    socket.joinRoom(roomCode, store.nickname);
  }, [socket, store.nickname]);

  const handleLeaveRoom = useCallback(() => {
    socket.leaveRoom();
    store.reset();
    setPage('home');
  }, [socket, store]);

  const handleAddAI = useCallback((difficulty: 'easy' | 'normal' | 'hard') => {
    if (store.currentRoom) {
      socket.addAI(store.currentRoom.code, difficulty, 'bot');
    }
  }, [socket, store.currentRoom]);

  const handleRemoveAI = useCallback((aiId: string) => {
    if (store.currentRoom) {
      socket.removeAI(store.currentRoom.code, aiId);
    }
  }, [socket, store.currentRoom]);

  const handleKickPlayer = useCallback((playerId: string) => {
    // 踢人功能需要通过其他方式实现，目前后端支持
    console.log('Kick player:', playerId);
  }, []);

  const handleStartGame = useCallback(() => {
    if (store.currentRoom) {
      // 使用 V2 Socket API 开始游戏
      socket.socket?.emit('v2:gameStart', { 
        roomCode: store.currentRoom.code, 
        mode: 'out' 
      });
    }
  }, [socket, store.currentRoom]);

  const handleUpdateSettings = useCallback((settings: Partial<RoomSettings>) => {
    if (store.currentRoom) {
      socket.updateSettings(store.currentRoom.code, settings);
    }
  }, [socket, store.currentRoom]);

  const handleChallengeUno = useCallback((targetId: string) => {
    if (store.currentRoom) {
      socket.challengeUno(store.currentRoom.code, targetId);
    }
  }, [socket, store.currentRoom]);

  const handleJumpIn = useCallback((cardId: string) => {
    if (store.currentRoom) {
      socket.jumpIn(store.currentRoom.code, cardId);
    }
  }, [socket, store.currentRoom]);

  const handleSendEmoji = useCallback((emoji: string) => {
    if (store.currentRoom) {
      socket.sendMessage(store.currentRoom.code, 'emoji', emoji);
    }
  }, [socket, store.currentRoom]);

  const handleToggleHost = useCallback((enabled: boolean) => {
    if (store.currentRoom) {
      socket.toggleHost(store.currentRoom.code, enabled);
    }
  }, [socket, store.currentRoom]);

  // 使用固定的 userId 作为玩家ID
  const currentPlayerId = store.userId;
  
  // 断线提示组件
  const ConnectionStatus = () => {
    if (!socket.isConnected && (page === 'room' || page === 'game')) {
      return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          {isReconnecting ? '正在重新连接...' : '连接已断开，正在尝试重连...'}
          {!isReconnecting && (
            <button 
              onClick={() => {
                if (store.currentRoom) {
                  setIsReconnecting(true);
                  socket.reconnect(store.currentRoom.code, store.userId);
                }
              }}
              className="ml-2 underline hover:text-yellow-700"
            >
              立即重连
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  // 渲染当前页面
  switch (page) {
    case 'home':
      return (
        <>
          <ConnectionStatus />
          <Home
            nickname={store.nickname}
            setNickname={store.setNickname}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            error={store.error}
            isConnected={socket.isConnected}
            serverUrl={store.serverUrl}
            onOpenSettings={() => store.setShowSettings(true)}
          />
          <SettingsModal
            isOpen={store.showSettings}
            onClose={() => store.setShowSettings(false)}
            serverUrl={store.serverUrl}
            onSave={store.setServerUrl}
            onReset={store.resetToDefaultServer}
          />
        </>
      );

    case 'room': {
      const savedRoom = localStorage.getItem('uno-current-room');
      const room = store.currentRoom || (savedRoom ? JSON.parse(savedRoom) : null);
      
      if (!room) {
        setPage('home');
        return null;
      }
      
      if (!store.currentRoom && savedRoom) {
        store.setCurrentRoom(JSON.parse(savedRoom));
      }
      
      return (
        <>
          <ConnectionStatus />
          <Room
            room={room}
            currentPlayerId={currentPlayerId}
            onLeaveRoom={handleLeaveRoom}
            onAddAI={handleAddAI}
            onRemoveAI={handleRemoveAI}
            onKickPlayer={handleKickPlayer}
            onStartGame={handleStartGame}
            onUpdateSettings={handleUpdateSettings}
            error={store.error}
          />
        </>
      );
    }

    case 'game':
      return (
        <>
          <ConnectionStatus />
          <Game />
        </>
      );

    default:
      return null;
  }
}

export default App;

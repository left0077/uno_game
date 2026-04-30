/**
 * App - 应用主组件
 * 
 * 架构：
 * - 使用新的分层架构 hooks
 * - App 只负责页面路由
 * - 业务逻辑在 hooks 和 core 层处理
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { GamePage } from './pages/GamePage';
import { useSocket, useRoomActions, useGameActions } from './hooks';
import { useGameStore } from './store/gameStore';
import type { Room, GameState } from '../../shared/types';

type Page = 'home' | 'room' | 'game';

function App() {
  const store = useGameStore();
  const [page, setPage] = useState<Page>('home');
  const [gameStarted, setGameStarted] = useState(false);
  
  // 页面过渡动画状态
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visiblePage, setVisiblePage] = useState<Page>('home');

  // 从 localStorage 读取服务器地址，并检测 URL 房间码参数
  useEffect(() => {
    const savedUrl = localStorage.getItem('uno-server-url');
    if (savedUrl) {
      useGameStore.getState?.().setServerUrl(savedUrl);
    }
    
    // 检测 URL 中的房间码参数
    const params = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = params.get('room');
    if (roomCodeFromUrl) {
      store.setInputRoomCode(roomCodeFromUrl.toUpperCase());
      // 保存标记，等 socket 连接后自动加入
      sessionStorage.setItem('uno-auto-join-room', roomCodeFromUrl.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 页面切换处理器 - 带过渡动画
  const handlePageChange = useCallback((newPage: Page) => {
    if (newPage === visiblePage) return;
    
    setIsTransitioning(true);
    
    // 先淡出当前页面
    setTimeout(() => {
      setVisiblePage(newPage);
      setPage(newPage);
      
      // 淡入新页面
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    }, 200);
  }, [visiblePage]);

  // 页面切换处理器
  const handleRoomCreated = useCallback((room: Room) => {
    store.setRoom(room);
    handlePageChange('room');
  }, [store, handlePageChange]);

  const handleRoomJoined = useCallback((room: Room) => {
    store.setRoom(room);
    handlePageChange('room');
  }, [store, handlePageChange]);

  const handleGameStarted = useCallback(() => {
    setGameStarted(true);
    handlePageChange('game');
  }, [handlePageChange]);

  const handleLeaveRoom = useCallback(() => {
    handlePageChange('home');
    setGameStarted(false);
    store.resetRoomState();
  }, [store, handlePageChange]);

  const handleGameEnded = useCallback((result: { winnerId?: string; rankings?: any[] }) => {
    setGameStarted(false);
    store.setGameResult(result);
    handlePageChange('room');
  }, [handlePageChange, store]);

  const handleGameState = useCallback((state: GameState) => {
    store.setGameState(state);
  }, [store]);

  const handleRoomUpdated = useCallback((room: Room) => {
    store.setRoom(room);
  }, [store]);

  const handleError = useCallback((error: { code: string; message: string }) => {
    store.setError(error.message);
  }, [store]);

  const handleChatMessage = useCallback((msg: any) => {
    if (msg.type === 'emoji') {
      store.addEmojiMessage(msg);
    }
  }, [store]);

  // Socket 回调配置
  const roomCallbacks = useMemo(() => ({
    onRoomCreated: handleRoomCreated,
    onRoomJoined: handleRoomJoined,
    onRoomUpdated: handleRoomUpdated,
    onError: handleError
  }), [handleRoomCreated, handleRoomJoined, handleRoomUpdated, handleError]);

  const gameCallbacks = useMemo(() => ({
    onGameStarted: handleGameStarted,
    onGameEnded: handleGameEnded,
    onGameState: handleGameState,
    onGameError: handleError,
    onChatMessage: handleChatMessage,
    onGameEvent: (data: any) => {
      if (data.type === 'uno_called') store.setError('UNO!');
      if (data.type === 'challenge_success') store.setError(`质疑成功! ${data.targetName || ''}罚2张`);
    },
  }), [handleGameStarted, handleGameEnded, handleGameState, handleError, handleChatMessage]);

  // 使用 Socket hook
  const socket = useSocket({
    serverUrl: store.serverUrl,
    userId: store.userId,
    nickname: store.nickname,
    roomCallbacks,
    gameCallbacks
  });

  // 自动加入房间（从 URL 参数）
  useEffect(() => {
    const autoJoinRoom = sessionStorage.getItem('uno-auto-join-room');
    if (autoJoinRoom && socket.isConnected && page === 'home' && store.nickname) {
      sessionStorage.removeItem('uno-auto-join-room');
      roomActions.joinRoom(autoJoinRoom, store.nickname);
    }
  }, [socket.isConnected, page, store.nickname]);

  // 房间和游戏动作
  const roomActions = useRoomActions();
  const gameActions = useGameActions();

  // E2E 测试辅助：暴露 store 方法到 window
  useEffect(() => {
    (window as any).__E2E__ = {
      setNickname: store.setNickname,
      getState: () => useGameStore.getState(),
    };
  }, [store]);

  // 渲染页面 - 带过渡动画
  return (
    <div className="min-h-screen bg-casino relative overflow-hidden">
      {/* 赌桌灯光效果 */}
      <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent" />
      
      {/* 页面内容 - 带过渡动画 */}
      <div 
        className={`transition-all duration-200 ease-out ${
          isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {visiblePage === 'home' && (
          <HomePage
            nickname={store.nickname}
            setNickname={store.setNickname}
            roomCode={store.inputRoomCode}
            setRoomCode={store.setInputRoomCode}
            serverUrl={store.serverUrl}
            setServerUrl={store.setServerUrl}
            error={store.error}
            clearError={() => store.setError('')}
            onCreateRoom={roomActions.createRoom}
            onJoinRoom={roomActions.joinRoom}
            isConnecting={!socket.isConnected}
          />
        )}

        {visiblePage === 'room' && store.room && (
          <RoomPage
            room={store.room}
            userId={store.userId}
            isHost={roomActions.isHost()}
            playerCount={roomActions.getPlayerCount()}
            canStartGame={roomActions.canStartGame()}
            onStartGame={roomActions.startGame}
            onAddAI={roomActions.addAI}
            onRemoveAI={roomActions.removeAI}
            onLeaveRoom={roomActions.leaveRoom}
            onBack={handleLeaveRoom}
            onUpdateSettings={roomActions.updateSettings}
          />
        )}

        {visiblePage === 'game' && gameStarted && (
          <GamePage
            gameActions={gameActions}
            emojiMessages={store.emojiMessages}
            onDismissEmoji={() => store.clearEmojiMessages()}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </div>
    </div>
  );
}

export default App;

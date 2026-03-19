/**
 * App - 应用主组件
 * 
 * 架构：
 * - 使用新的分层架构 hooks
 * - App 只负责页面路由
 * - 业务逻辑在 hooks 和 core 层处理
 */

import { useState, useCallback, useMemo } from 'react';
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

  // 页面切换处理器
  const handleRoomCreated = useCallback((room: Room) => {
    store.setRoom(room);
    setPage('room');
  }, [store]);

  const handleRoomJoined = useCallback((room: Room) => {
    store.setRoom(room);
    setPage('room');
  }, [store]);

  const handleGameStarted = useCallback(() => {
    setGameStarted(true);
    setPage('game');
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setPage('home');
    setGameStarted(false);
    store.resetRoomState();
  }, [store]);

  const handleGameEnded = useCallback(() => {
    setGameStarted(false);
    setPage('room');
  }, []);

  const handleError = useCallback((error: { code: string; message: string }) => {
    store.setError(error.message);
  }, [store]);

  // Socket 回调配置
  const roomCallbacks = useMemo(() => ({
    onRoomCreated: handleRoomCreated,
    onRoomJoined: handleRoomJoined,
    onError: handleError
  }), [handleRoomCreated, handleRoomJoined, handleError]);

  const gameCallbacks = useMemo(() => ({
    onGameStarted: handleGameStarted,
    onGameEnded: handleGameEnded,
    onGameError: handleError
  }), [handleGameStarted, handleGameEnded, handleError]);

  // 使用 Socket hook
  const socket = useSocket({
    serverUrl: store.serverUrl,
    userId: store.userId,
    nickname: store.nickname,
    roomCallbacks,
    gameCallbacks
  });

  // 房间和游戏动作
  const roomActions = useRoomActions();
  const gameActions = useGameActions();

  // 渲染页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {page === 'home' && (
        <HomePage
          nickname={store.nickname}
          setNickname={store.setNickname}
          roomCode={store.inputRoomCode}
          setRoomCode={store.setInputRoomCode}
          error={store.error}
          clearError={() => store.setError('')}
          onCreateRoom={roomActions.createRoom}
          onJoinRoom={roomActions.joinRoom}
          isConnecting={!socket.isConnected}
        />
      )}

      {page === 'room' && store.room && (
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
        />
      )}

      {page === 'game' && gameStarted && (
        <GamePage
          gameActions={gameActions}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;

/**
 * HomePage - 首页
 * 
 * 职责：
 * - 展示游戏标题和介绍
 * - 创建房间/加入房间输入
 * - 连接状态显示
 */

import { useState } from 'react';

interface HomePageProps {
  nickname: string;
  setNickname: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  error: string;
  clearError: () => void;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (roomCode: string, nickname: string) => void;
  isConnecting: boolean;
}

export function HomePage({
  nickname,
  setNickname,
  roomCode,
  setRoomCode,
  error,
  clearError,
  onCreateRoom,
  onJoinRoom,
  isConnecting
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleCreateRoom = () => {
    clearError();
    onCreateRoom(nickname);
  };

  const handleJoinRoom = () => {
    clearError();
    onJoinRoom(roomCode, nickname);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* 游戏标题 */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">
          🎴 UNO
        </h1>
        <p className="text-white/70 text-lg">
          多人在线纸牌游戏
        </p>
      </div>

      {/* 连接状态 */}
      {isConnecting && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg">
          正在连接服务器...
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* 主卡片 */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
        {/* 昵称输入 */}
        <div className="mb-6">
          <label className="block text-white/80 text-sm mb-2">你的昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称..."
            maxLength={12}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50"
          />
        </div>

        {/* 标签页切换 */}
        <div className="flex mb-6 bg-black/20 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            创建房间
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'join'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            加入房间
          </button>
        </div>

        {/* 创建房间 */}
        {activeTab === 'create' && (
          <button
            onClick={handleCreateRoom}
            disabled={isConnecting}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建新房间
          </button>
        )}

        {/* 加入房间 */}
        {activeTab === 'join' && (
          <div className="space-y-4">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="输入房间码 (如: ABC123)"
              maxLength={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 uppercase"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isConnecting}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              加入房间
            </button>
          </div>
        )}
      </div>

      {/* 游戏说明 */}
      <div className="mt-8 text-white/50 text-sm text-center">
        <p>支持 2-4 人同时游戏</p>
        <p className="mt-1">包含 AI 玩家、联机对战等多种玩法</p>
      </div>
    </div>
  );
}

/**
 * RoomPage - 房间页面
 * 
 * 职责：
 * - 显示房间信息和玩家列表
 * - 房间设置调整
 * - 开始游戏按钮
 */

import { useState } from 'react';
import type { Room, Player } from '../../../shared/types';

interface RoomPageProps {
  room: Room;
  userId: string;
  isHost: boolean;
  playerCount: number;
  canStartGame: boolean;
  onStartGame: (mode: 'standard' | 'out') => void;
  onAddAI: (difficulty: 'easy' | 'normal' | 'hard', type: 'bot' | 'host') => void;
  onRemoveAI: (aiId: string) => void;
  onLeaveRoom: () => void;
  onBack: () => void;
}

export function RoomPage({
  room,
  userId,
  isHost,
  playerCount,
  canStartGame,
  onStartGame,
  onAddAI,
  onRemoveAI,
  onLeaveRoom,
  onBack
}: RoomPageProps) {
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  const handleAddAI = () => {
    onAddAI(aiDifficulty, 'bot');
    setShowAISettings(false);
  };

  const handleStartGame = () => {
    onStartGame('out');
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <div className="min-h-screen p-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
        >
          ← 返回
        </button>
        <div className="text-white font-medium">
          房间: <span className="text-yellow-400 font-mono">{room.code}</span>
        </div>
        <button
          onClick={onLeaveRoom}
          className="px-4 py-2 bg-red-500/50 text-white rounded-lg hover:bg-red-500/70 transition-all"
        >
          离开
        </button>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：玩家列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                玩家列表 ({playerCount}/{room.maxPlayers || 8})
              </h2>
              {isHost && (
                <button
                  onClick={() => setShowAISettings(!showAISettings)}
                  className="px-3 py-1 bg-blue-500/50 text-white text-sm rounded-lg hover:bg-blue-500/70"
                >
                  + 添加 AI
                </button>
              )}
            </div>

            {/* AI 设置面板 */}
            {showAISettings && isHost && (
              <div className="mb-4 p-4 bg-black/20 rounded-xl">
                <div className="flex gap-2 mb-3">
                  {(['easy', 'normal', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setAiDifficulty(diff)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        aiDifficulty === diff
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {diff === 'easy' ? '简单' : diff === 'normal' ? '普通' : '困难'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddAI}
                  disabled={playerCount >= 4}
                  className="w-full py-2 bg-green-500/70 text-white rounded-lg hover:bg-green-500/90 disabled:opacity-50"
                >
                  确认添加
                </button>
              </div>
            )}

            {/* 玩家列表 */}
            <div className="space-y-3">
              {room.players.map((player, index) => (
                <PlayerItem
                  key={player.id}
                  player={player}
                  index={index}
                  isHost={player.id === room.hostId}
                  isMe={player.id === userId}
                  canRemove={isHost && player.isAI}
                  onRemove={() => onRemoveAI(player.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：房间信息和操作 */}
        <div className="space-y-4">
          {/* 房间码 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-white/70 text-sm mb-2">房间码</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-black/20 rounded-xl text-2xl font-mono font-bold text-yellow-400 tracking-wider">
                {room.code}
              </div>
              <button
                onClick={handleCopyRoomCode}
                className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                title="复制房间码"
              >
                📋
              </button>
            </div>
            <p className="text-white/50 text-sm mt-2">
              分享给好友让他们加入游戏
            </p>
          </div>

          {/* 游戏设置 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">游戏设置</h3>
            <div className="space-y-3 text-white/70 text-sm">
              <div className="flex justify-between">
                <span>最大玩家数</span>
                <span className="text-white">4</span>
              </div>
              <div className="flex justify-between">
                <span>初始手牌数</span>
                <span className="text-white">{room.settings?.initialCards || 7}</span>
              </div>
              <div className="flex justify-between">
                <span>允许联击</span>
                <span className="text-white">是</span>
              </div>
            </div>
          </div>

          {/* 开始游戏按钮 */}
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canStartGame ? '开始游戏' : '需要至少2名玩家'}
            </button>
          )}

          {!isHost && (
            <div className="text-center py-4 text-white/50">
              等待房主开始游戏...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 玩家项组件
interface PlayerItemProps {
  player: Player;
  index: number;
  isHost: boolean;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

function PlayerItem({ player, index, isHost, isMe, canRemove, onRemove }: PlayerItemProps) {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
  const avatarColor = colors[index % colors.length];

  return (
    <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
      {/* 头像 */}
      <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold`}>
        {player.nickname.charAt(0).toUpperCase()}
      </div>

      {/* 信息 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">
            {player.nickname}
            {isMe && <span className="ml-2 text-xs text-blue-400">(你)</span>}
          </span>
          {player.isAI && (
            <span className="px-2 py-0.5 bg-purple-500/50 text-white text-xs rounded">
              AI
            </span>
          )}
        </div>
        {isHost && (
          <span className="text-yellow-400 text-xs">房主</span>
        )}
      </div>

      {/* 移除按钮 */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="px-2 py-1 bg-red-500/50 text-white text-xs rounded hover:bg-red-500/70"
        >
          移除
        </button>
      )}
    </div>
  );
}

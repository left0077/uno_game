/**
 * RoomPage - 房间页面
 * 
 * 柔和赌场风格版本
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
  onUpdateSettings: (settings: { mode: 'standard' | 'out' }) => void;
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
  onBack,
  onUpdateSettings
}: RoomPageProps) {
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // 从房间设置获取当前游戏模式
  const gameMode = room.settings?.mode || 'standard';

  const handleAddAI = () => {
    onAddAI(aiDifficulty, 'bot');
    setShowAISettings(false);
  };

  const handleStartGame = () => {
    onStartGame(gameMode);
  };

  const handleModeChange = (mode: 'standard' | 'out') => {
    if (!isHost) return;
    onUpdateSettings({ mode });
  };

  const handleCopyRoomLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const roomUrl = `${baseUrl}?room=${room.code}`;
    navigator.clipboard.writeText(roomUrl);
  };

  return (
    <div className="min-h-screen p-4 relative z-10">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 casino-card text-gold hover:text-gold-light transition-all flex items-center gap-2"
        >
          <span>←</span>
          <span>返回</span>
        </button>
        <div className="px-6 py-2 casino-card flex items-center gap-3">
          <span className="text-cream-muted">房间:</span>
          <span className="text-gold-light font-mono font-bold tracking-wider">{room.code}</span>
          <button
            onClick={handleCopyRoomLink}
            className="text-gold/60 hover:text-gold transition-all"
            title="复制房间链接"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </button>
        </div>
        <button
          onClick={onLeaveRoom}
          className="px-4 py-2 btn-soft-red rounded-lg"
        >
          离开
        </button>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：玩家列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="casino-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gold-light flex items-center gap-3">
                <span>玩家列表</span>
                <span className="text-cream-muted text-base font-normal">
                  ({playerCount}/{room.maxPlayers || 8})
                </span>
              </h2>
              {isHost && (
                <button
                  onClick={() => setShowAISettings(!showAISettings)}
                  className="px-4 py-2 btn-soft-blue rounded-lg text-sm"
                >
                  <span className="flex items-center gap-1">
                    <span>+</span>
                    <span>添加 AI</span>
                  </span>
                </button>
              )}
            </div>

            {/* AI 设置面板 */}
            {showAISettings && isHost && (
              <div className="mb-4 p-4 bg-felt-dark/60 border border-gold/20 rounded-xl">
                <div className="flex gap-2 mb-3">
                  {(['easy', 'normal', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setAiDifficulty(diff)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        aiDifficulty === diff
                          ? 'bg-gold/20 text-gold-light border border-gold/40'
                          : 'bg-felt-light/30 text-cream-muted'
                      }`}
                    >
                      {diff === 'easy' ? '简单' : diff === 'normal' ? '普通' : '困难'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddAI}
                  disabled={playerCount >= 8}
                  className="w-full py-3 btn-soft-green rounded-xl disabled:opacity-50"
                >
                  确认添加
                </button>
              </div>
            )}

            {/* 玩家列表 - 固定显示8个位置 */}
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => {
                const player = room.players[index];
                return player ? (
                  <PlayerItem
                    key={player.id}
                    player={player}
                    index={index}
                    isHost={player.id === room.hostId}
                    isMe={player.id === userId}
                    canRemove={isHost && player.isAI}
                    onRemove={() => onRemoveAI(player.id)}
                  />
                ) : (
                  <EmptyPlayerSlot key={`empty-${index}`} index={index} />
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧：房间信息和操作 */}
        <div className="space-y-4">
          {/* 游戏设置 */}
          <div className="casino-card p-6">
            <h3 className="text-gold font-bold mb-4">游戏设置</h3>
            
            {/* 游戏模式选择 - 仅房主可编辑 */}
            <div className="mb-4">
              <label className="text-cream-muted text-sm block mb-2">游戏模式</label>
              <div className="flex gap-2 p-1 bg-felt-dark/50 rounded-xl border border-gold/10 relative">
                {/* 滑动背景 */}
                <div 
                  className="absolute top-1 bottom-1 bg-gold/20 rounded-lg border border-gold/30
                    transition-all duration-300 ease-out"
                  style={{
                    left: gameMode === 'standard' ? '4px' : '50%',
                    width: 'calc(50% - 4px)',
                  }}
                />
                <button
                  onClick={() => handleModeChange('standard')}
                  disabled={!isHost}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors duration-200 relative z-10
                    ${gameMode === 'standard' ? 'text-gold-light' : 'text-cream-muted'}
                    ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  标准模式
                </button>
                <button
                  onClick={() => handleModeChange('out')}
                  disabled={!isHost}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors duration-200 relative z-10
                    ${gameMode === 'out' ? 'text-gold-light' : 'text-cream-muted'}
                    ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  Out模式
                </button>
              </div>
              <p className="text-cream-muted/50 text-xs mt-2">
                {gameMode === 'standard' 
                  ? '经典UNO规则，先出完手牌者获胜'
                  : '大逃杀变体，手牌上限20张，超出即淘汰'}
              </p>
            </div>

            <div className="space-y-3 text-cream-muted text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gold/10">
                <span>最大玩家数</span>
                <span className="text-gold font-bold">{room.maxPlayers || 8}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gold/10">
                <span>初始手牌数</span>
                <span className="text-gold font-bold">{room.settings?.initialCards || 7}</span>
              </div>
              {gameMode === 'out' && (
                <div className="flex justify-between items-center py-2 border-b border-gold/10">
                  <span>手牌上限</span>
                  <span className="text-gold font-bold">20张（超出淘汰）</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span>允许联击</span>
                <span className="text-gold font-bold">{gameMode === 'out' ? '是' : '否'}</span>
              </div>
            </div>
          </div>

          {/* 开始游戏按钮 */}
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className={`w-full py-4 rounded-xl text-lg font-medium transition-all disabled:cursor-not-allowed
                ${canStartGame 
                  ? 'btn-soft' 
                  : 'bg-felt-dark/60 text-cream-muted border border-gold/20'}`}
            >
              {canStartGame ? (
                <span className="flex items-center justify-center gap-2">
                  <span>▶</span>
                  开始游戏
                </span>
              ) : (
                '需要至少2名玩家'
              )}
            </button>
          )}

          {!isHost && (
            <div className="text-center py-4 text-cream-muted casino-card">
              <span className="animate-pulse">●</span>
              <span className="ml-2">等待房主开始游戏...</span>
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
  // 柔和配色
  const avatarColors = [
    'bg-emerald-700',
    'bg-teal-700', 
    'bg-cyan-700',
    'bg-slate-700'
  ];
  const avatarColor = avatarColors[index % avatarColors.length];

  return (
    <div className="flex items-center gap-3 p-3 bg-felt-dark/60 border border-gold/10 rounded-xl">
      {/* 头像 */}
      <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center 
        text-cream font-bold text-lg border-2 border-gold/30`}>
        {player.nickname.charAt(0).toUpperCase()}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-cream font-medium truncate">
            {player.nickname}
          </span>
          {isMe && (
            <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded border border-gold/30">
              你
            </span>
          )}
          {player.isAI && (
            <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-xs rounded border border-blue-500/30">
              AI
            </span>
          )}
        </div>
        {isHost && (
          <span className="text-gold/70 text-xs">房主</span>
        )}
      </div>

      {/* 移除按钮 */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="px-3 py-1.5 btn-soft-red rounded-lg text-xs"
        >
          移除
        </button>
      )}
    </div>
  );
}

// 空位组件
interface EmptyPlayerSlotProps {
  index: number;
}

function EmptyPlayerSlot({ index }: EmptyPlayerSlotProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-felt-dark/30 border border-gold/5 border-dashed rounded-xl">
      {/* 空头像占位 */}
      <div className="w-12 h-12 rounded-full flex items-center justify-center 
        text-cream-muted/30 font-bold text-lg border-2 border-gold/10">
        {index + 1}
      </div>

      {/* 空位提示 */}
      <div className="flex-1 min-w-0">
        <span className="text-cream-muted/40 text-sm">等待加入...</span>
      </div>
    </div>
  );
}

/**
 * GamePage - 游戏页面
 * 
 * 职责：
 * - 游戏主界面
 * - 整合游戏各个子组件
 * - 管理游戏流程
 */

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getGameEngine } from '../core';
import type { Card } from '../../../shared/types';

interface GamePageProps {
  gameActions: {
    playCard: (cardId: string, chosenColor?: string) => boolean;
    playCombo: (cardIds: string[], comboType: 'pair' | 'three' | 'rainbow' | 'straight', chosenColor?: string) => boolean;
    drawCard: () => boolean;
    callUno: () => boolean;
    setJump: (jump: boolean) => void;
    canPlay: (cardId: string) => boolean;
    canDraw: () => boolean;
    canCallUno: () => boolean;
    requiresColorSelection: (cardId: string) => boolean;
    isMyTurn: () => boolean;
    myHand: Card[];
  };
  onLeaveRoom: () => void;
}

export function GamePage({ gameActions, onLeaveRoom }: GamePageProps) {
  const store = useGameStore();
  const engine = getGameEngine();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  const gameState = store.gameState;
  const room = store.room;
  const isMyTurn = gameActions.isMyTurn();

  // 处理出牌
  const handlePlayCard = useCallback((cardId: string) => {
    if (!gameActions.canPlay(cardId)) {
      return;
    }

    // 检查是否需要选颜色
    if (gameActions.requiresColorSelection(cardId)) {
      setPendingCardId(cardId);
      setShowColorPicker(true);
      return;
    }

    gameActions.playCard(cardId);
  }, [gameActions]);

  // 处理颜色选择
  const handleColorSelect = useCallback((color: string) => {
    if (pendingCardId) {
      gameActions.playCard(pendingCardId, color);
      setPendingCardId(null);
    }
    setShowColorPicker(false);
  }, [pendingCardId, gameActions]);

  // 处理摸牌
  const handleDrawCard = useCallback(() => {
    if (gameActions.canDraw()) {
      gameActions.drawCard();
    }
  }, [gameActions]);

  // 处理喊 UNO
  const handleCallUno = useCallback(() => {
    gameActions.callUno();
  }, [gameActions]);

  // 获取当前玩家
  const currentPlayer = room?.players.find(p => p.id === gameState?.currentPlayerId);

  if (!gameState || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* 顶部信息栏 */}
      <GameHeader
        roomCode={room.code}
        direction={gameState.direction}
        currentPlayer={currentPlayer}
        onLeaveRoom={onLeaveRoom}
      />

      {/* 游戏区域 */}
      <div className="max-w-6xl mx-auto mt-6">
        {/* 其他玩家 */}
        <OtherPlayers
          players={room.players}
          currentPlayerId={gameState.currentPlayerId}
          cardCounts={gameState.playerHandCounts}
        />

        {/* 牌堆区域 */}
        <div className="flex justify-center items-center gap-8 my-8">
          {/* 弃牌堆 */}
          <DiscardPile topCard={gameState.topCard} />

          {/* 抽牌堆 */}
          <DrawPile onDraw={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} />
        </div>

        {/* 当前颜色指示 */}
        <div className="flex justify-center mb-6">
          <ColorIndicator color={gameState.currentColor} />
        </div>

        {/* 我的手牌 */}
        <MyHand
          cards={gameActions.myHand}
          isMyTurn={isMyTurn}
          onPlayCard={handlePlayCard}
          canPlay={gameActions.canPlay}
        />

        {/* 操作按钮 */}
        <GameControls
          isMyTurn={isMyTurn}
          canDraw={gameActions.canDraw()}
          canCallUno={gameActions.canCallUno()}
          onDrawCard={handleDrawCard}
          onCallUno={handleCallUno}
        />
      </div>

      {/* 颜色选择弹窗 */}
      {showColorPicker && (
        <ColorPickerModal onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />
      )}
    </div>
  );
}

// ========== 子组件 ==========

function GameHeader({
  roomCode,
  direction,
  currentPlayer,
  onLeaveRoom
}: {
  roomCode: string;
  direction: number;
  currentPlayer?: { nickname: string };
  onLeaveRoom: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-2xl p-4">
      <div className="flex items-center gap-4">
        <div className="text-white">
          <span className="text-white/60">房间: </span>
          <span className="font-mono font-bold text-yellow-400">{roomCode}</span>
        </div>
        <div className="text-white/60">
          方向: {direction === 1 ? '→' : '←'}
        </div>
      </div>

      <div className="text-white">
        当前回合: <span className="font-bold">{currentPlayer?.nickname || '...'}</span>
      </div>

      <button
        onClick={onLeaveRoom}
        className="px-4 py-2 bg-red-500/50 text-white rounded-lg hover:bg-red-500/70"
      >
        离开游戏
      </button>
    </div>
  );
}

function OtherPlayers({
  players,
  currentPlayerId,
  cardCounts
}: {
  players: { id: string; nickname: string }[];
  currentPlayerId: string;
  cardCounts: Record<string, number>;
}) {
  return (
    <div className="flex justify-center gap-4">
      {players.map((player) => (
        <div
          key={player.id}
          className={`p-3 rounded-xl ${
            player.id === currentPlayerId
              ? 'bg-yellow-500/30 border border-yellow-500/50'
              : 'bg-white/10'
          }`}
        >
          <div className="text-white text-sm font-medium">{player.nickname}</div>
          <div className="text-white/60 text-xs">{cardCounts[player.id] || 0} 张</div>
        </div>
      ))}
    </div>
  );
}

function DiscardPile({ topCard }: { topCard?: Card }) {
  if (!topCard) {
    return (
      <div className="w-24 h-36 bg-black/30 rounded-xl border-2 border-white/20 flex items-center justify-center">
        <span className="text-white/40 text-2xl">🃏</span>
      </div>
    );
  }

  return (
    <div className={`w-24 h-36 rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold ${
      topCard.color === 'red' ? 'bg-red-500' :
      topCard.color === 'blue' ? 'bg-blue-500' :
      topCard.color === 'green' ? 'bg-green-500' :
      topCard.color === 'yellow' ? 'bg-yellow-500' :
      'bg-gray-800'
    }`}>
      {topCard.type === 'wild' ? '🌈' :
       topCard.type === 'wild4' ? '🌈4' :
       topCard.type === 'skip' ? '⏭️' :
       topCard.type === 'reverse' ? '🔄' :
       topCard.type === 'draw2' ? '+2' :
       topCard.value}
    </div>
  );
}

function DrawPile({ onDraw, disabled }: { onDraw: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onDraw}
      disabled={disabled}
      className="relative w-24 h-36 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
    >
      <span className="text-white text-2xl font-bold">UNO</span>
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
    </button>
  );
}

function ColorIndicator({ color }: { color: string }) {
  const colorClass = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    wild: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500'
  }[color] || 'bg-gray-500';

  return (
    <div className="flex items-center gap-2 text-white">
      <span className="text-white/60">当前颜色:</span>
      <div className={`w-6 h-6 rounded-full ${colorClass}`} />
    </div>
  );
}

function MyHand({
  cards,
  isMyTurn,
  onPlayCard,
  canPlay
}: {
  cards: Card[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
  canPlay: (cardId: string) => boolean;
}) {
  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {cards.map((card) => {
        const playable = isMyTurn && canPlay(card.id);
        return (
          <button
            key={card.id}
            onClick={() => onPlayCard(card.id)}
            disabled={!playable}
            className={`w-20 h-28 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
              card.color === 'red' ? 'bg-red-500 text-white' :
              card.color === 'blue' ? 'bg-blue-500 text-white' :
              card.color === 'green' ? 'bg-green-500 text-white' :
              card.color === 'yellow' ? 'bg-yellow-500 text-black' :
              'bg-gray-800 text-white'
            } ${
              playable
                ? 'hover:scale-110 hover:-translate-y-2 cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {card.type === 'wild' ? '🌈' :
             card.type === 'wild4' ? '🌈4' :
             card.type === 'skip' ? '⏭️' :
             card.type === 'reverse' ? '🔄' :
             card.type === 'draw2' ? '+2' :
             card.value}
          </button>
        );
      })}
    </div>
  );
}

function GameControls({
  isMyTurn,
  canDraw,
  canCallUno,
  onDrawCard,
  onCallUno
}: {
  isMyTurn: boolean;
  canDraw: boolean;
  canCallUno: boolean;
  onDrawCard: () => void;
  onCallUno: () => void;
}) {
  return (
    <div className="flex justify-center gap-4 mt-6">
      <button
        onClick={onDrawCard}
        disabled={!isMyTurn || !canDraw}
        className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-400"
      >
        摸牌
      </button>
      <button
        onClick={onCallUno}
        disabled={!canCallUno}
        className="px-6 py-3 bg-yellow-500 text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400"
      >
        UNO!
      </button>
    </div>
  );
}

function ColorPickerModal({
  onSelect,
  onCancel
}: {
  onSelect: (color: string) => void;
  onCancel: () => void;
}) {
  const colors = [
    { key: 'red', label: '红色', class: 'bg-red-500' },
    { key: 'blue', label: '蓝色', class: 'bg-blue-500' },
    { key: 'green', label: '绿色', class: 'bg-green-500' },
    { key: 'yellow', label: '黄色', class: 'bg-yellow-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
        <h3 className="text-white text-xl font-bold mb-4 text-center">选择颜色</h3>
        <div className="grid grid-cols-2 gap-4">
          {colors.map((c) => (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className={`w-24 h-24 ${c.class} rounded-xl flex items-center justify-center text-white font-bold hover:scale-105 transition-transform`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30"
        >
          取消
        </button>
      </div>
    </div>
  );
}

/**
 * GamePage - 游戏页面
 * 
 * 柔和赌场风格版本
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
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="casino-card px-8 py-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gold text-lg">发牌中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative z-10">
      {/* 顶部信息栏 */}
      <GameHeader
        roomCode={room.code}
        direction={gameState.direction}
        currentPlayer={currentPlayer}
        onLeaveRoom={onLeaveRoom}
      />

      {/* 游戏区域 - 柔和赌桌 */}
      <div className="max-w-6xl mx-auto mt-6 table-area p-6">
        {/* 其他玩家 */}
        <OtherPlayers
          players={room.players}
          currentPlayerId={gameState.currentPlayerId}
          cardCounts={gameState.playerHandCounts || {}}
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
    <div className="flex items-center justify-between casino-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-felt-dark/60 border border-gold/20 rounded-xl">
          <span className="text-cream-muted text-sm">房间:</span>
          <span className="font-mono font-bold text-gold-light tracking-wider">{roomCode}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-felt-dark/60 border border-gold/20 rounded-xl">
          <span className="text-cream-muted text-sm">方向:</span>
          <span className="text-gold font-bold">{direction === 1 ? '→' : '←'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-2 bg-gold/10 border border-gold/30 rounded-xl">
        <span className="text-cream-muted text-sm">当前回合:</span>
        <span className="font-bold text-gold-light">{currentPlayer?.nickname || '...'}</span>
      </div>

      <button
        onClick={onLeaveRoom}
        className="px-4 py-2 btn-soft-red rounded-lg"
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
    <div className="flex justify-center gap-3 flex-wrap">
      {players.map((player) => (
        <div
          key={player.id}
          className={`px-4 py-2 rounded-xl border transition-all ${
            player.id === currentPlayerId
              ? 'bg-gold/15 border-gold/50 shadow-lg'
              : 'bg-felt-dark/60 border-gold/10'
          }`}
        >
          <div className={`text-sm font-medium ${
            player.id === currentPlayerId ? 'text-gold-light' : 'text-cream'
          }`}>
            {player.nickname}
          </div>
          <div className="text-cream-muted/60 text-xs text-center mt-0.5">{cardCounts[player.id] || 0} 张</div>
        </div>
      ))}
    </div>
  );
}

function DiscardPile({ topCard }: { topCard?: Card }) {
  if (!topCard) {
    return (
      <div className="w-24 h-36 bg-felt-dark/80 rounded-xl border-2 border-gold/20 flex items-center justify-center shadow-lg">
        <span className="text-gold/40 text-2xl">🃏</span>
      </div>
    );
  }

  const cardStyles: Record<string, string> = {
    red: 'bg-uno-red border-red-300',
    blue: 'bg-uno-blue border-blue-300',
    green: 'bg-uno-green border-green-300',
    yellow: 'bg-uno-yellow border-yellow-300',
    wild: 'bg-slate-700 border-slate-500'
  };

  const cardContent = {
    wild: '🌈',
    wild4: '🌈+4',
    skip: '⏭️',
    reverse: '🔄',
    draw2: '+2',
    draw3: '+3',
    draw4: '+4',
    draw5: '+5',
    draw8: '+8'
  }[topCard.type] || topCard.value;

  return (
    <div className={`w-24 h-36 rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold 
      ${cardStyles[topCard.color] || cardStyles.wild} text-white border-2`}>
      {cardContent}
    </div>
  );
}

function DrawPile({ onDraw, disabled }: { onDraw: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onDraw}
      disabled={disabled}
      className={`relative w-24 h-36 rounded-xl shadow-lg flex items-center justify-center
        bg-gradient-to-br from-blue-800 via-indigo-800 to-slate-800
        border-2 border-gold/40
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
        transition-all duration-300`}
    >
      <span className="text-gold text-2xl font-bold tracking-wider">UNO</span>
      {/* 柔和光点 */}
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gold/50 rounded-full" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-gold/50 rounded-full" />
      {/* 可抽牌提示 */}
      {!disabled && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full animate-pulse border-2 border-gold/50" />
      )}
    </button>
  );
}

function ColorIndicator({ color }: { color: string }) {
  const colorConfig: Record<string, { bg: string; label: string; border: string }> = {
    red: { bg: 'bg-uno-red', label: '红色', border: 'border-red-300' },
    blue: { bg: 'bg-uno-blue', label: '蓝色', border: 'border-blue-300' },
    green: { bg: 'bg-uno-green', label: '绿色', border: 'border-green-300' },
    yellow: { bg: 'bg-uno-yellow', label: '黄色', border: 'border-yellow-300' },
    wild: { bg: 'bg-slate-600', label: '万能', border: 'border-slate-400' }
  };

  const config = colorConfig[color] || colorConfig.wild;

  return (
    <div className="flex items-center gap-3 px-6 py-3 casino-card">
      <span className="text-cream-muted">当前颜色:</span>
      <div className={`w-7 h-7 rounded-full ${config.bg} border-2 ${config.border} shadow-md`} />
      <span className="text-gold font-medium">{config.label}</span>
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
  const cardStyles: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-uno-red', text: 'text-white', border: 'border-red-300' },
    blue: { bg: 'bg-uno-blue', text: 'text-white', border: 'border-blue-300' },
    green: { bg: 'bg-uno-green', text: 'text-white', border: 'border-green-300' },
    yellow: { bg: 'bg-uno-yellow', text: 'text-slate-800', border: 'border-yellow-300' },
    wild: { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-500' }
  };

  const cardContent = (card: Card) => ({
    wild: '🌈',
    wild4: '🌈+4',
    skip: '⏭️',
    reverse: '🔄',
    draw2: '+2',
    draw3: '+3',
    draw4: '+4',
    draw5: '+5',
    draw8: '+8'
  }[card.type] || card.value);

  return (
    <div className="flex justify-center gap-2 flex-wrap py-4">
      {cards.map((card) => {
        const playable = isMyTurn && canPlay(card.id);
        const style = cardStyles[card.color] || cardStyles.wild;

        return (
          <button
            key={card.id}
            onClick={() => onPlayCard(card.id)}
            disabled={!playable}
            className={`w-20 h-28 rounded-xl flex items-center justify-center text-lg font-bold 
              ${style.bg} ${style.text} border-2 ${style.border}
              transition-all duration-200 shadow-md
              ${playable
                ? 'hover:scale-110 hover:-translate-y-3 cursor-pointer hover:shadow-xl'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {cardContent(card)}
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
        className="px-8 py-3 btn-soft-blue text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        摸牌
      </button>
      <button
        onClick={onCallUno}
        disabled={!canCallUno}
        className={`px-8 py-3 text-lg rounded-xl font-medium transition-all
          ${canCallUno
            ? 'btn-soft-red animate-pulse'
            : 'bg-felt-dark/60 text-cream-muted border border-gold/20 cursor-not-allowed'
        }`}
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
    { key: 'red', label: '红色', bg: 'bg-uno-red', border: 'border-red-300' },
    { key: 'blue', label: '蓝色', bg: 'bg-uno-blue', border: 'border-blue-300' },
    { key: 'green', label: '绿色', bg: 'bg-uno-green', border: 'border-green-300' },
    { key: 'yellow', label: '黄色', bg: 'bg-uno-yellow', border: 'border-yellow-300', text: 'text-slate-800' }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="casino-card p-8 max-w-sm w-full mx-4">
        <h3 className="text-gold-light text-2xl font-bold mb-6 text-center">选择颜色</h3>
        <div className="grid grid-cols-2 gap-4">
          {colors.map((c) => (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className={`w-full aspect-square ${c.bg} ${c.text || 'text-white'}
                rounded-xl flex items-center justify-center font-bold text-lg
                hover:scale-105 transition-transform shadow-lg border-2 ${c.border}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-6 py-3 bg-felt-dark/60 border border-gold/20 text-gold rounded-xl 
            hover:border-gold/40 transition-all font-medium"
        >
          取消
        </button>
      </div>
    </div>
  );
}

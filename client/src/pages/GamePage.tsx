/**
 * GamePage - 游戏页面
 * 
 * 柔和赌场风格版本
 */

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from '../components/Card';
import { PhaseTimer } from '../components/game/PhaseTimer';
import { EmojiOverlay } from '../components/EmojiOverlay';
import type { Card as CardType } from '../../../shared/types';
import { GAME_CONFIG } from '../config';

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
    myHand: CardType[];
  };
  emojiMessages?: Array<{ playerId: string; emoji: string; target?: string; timestamp: number }>;
  onDismissEmoji?: () => void;
  onLeaveRoom: () => void;
}

export function GamePage({ gameActions, onLeaveRoom, emojiMessages, onDismissEmoji }: GamePageProps) {
  const store = useGameStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  const gameState = store.gameState;
  const room = store.room;
  const isMyTurn = gameActions.isMyTurn();
  const canPlay = gameActions.canPlay;
  const hasPlayableCards = gameActions.myHand.some(c => canPlay(c.id));
  const pendingDraw = gameState?.pendingDraw || 0;
  const comboOptions = gameActions.comboOptions || [];
  const penaltyInfo = gameActions.penaltyInfo;

  const handlePlayCombo = useCallback((cardIds: string[], comboType: string) => {
    gameActions.playCombo(cardIds, comboType as any);
  }, [gameActions]);

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
    <div className="min-h-screen p-2 sm:p-4 pb-24 sm:pb-4 relative z-10">
      {/* 顶部信息栏 */}
      <GameHeader
        roomCode={room.code}
        direction={typeof gameState.direction === 'string' ? (gameState.direction === 'clockwise' ? 1 : -1) : gameState.direction}
        currentPlayer={currentPlayer}
        isMyTurn={isMyTurn}
        turnTimer={gameState.turnTimer}
        turnStartTime={gameState.turnStartTime}
        onLeaveRoom={onLeaveRoom}
        phaseInfo={gameState.outState && gameState.gameStartTime ? {
          gameStartTime: gameState.gameStartTime,
          phaseTimes: (gameState as any).phaseTimes || [180, 360, 540],
          currentPhase: gameState.outState.phase,
          maxCards: gameState.outState.maxCards,
        } : undefined}
      />

      {/* 游戏区域 - 柔和赌桌 */}
      <div className="max-w-6xl mx-auto mt-6 table-area p-6">
        {/* 其他玩家 */}
        <OtherPlayers
          players={gameState.players || room.players}
          currentPlayerId={gameState.currentPlayerId}
        />

        {/* 牌堆区域 */}
        <div className="flex justify-center items-center gap-8 my-8">
          {/* 弃牌堆 */}
          <DiscardPile topCard={gameState.topCard} />

          {/* 抽牌堆 */}
          <DrawPile onDraw={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} />
        </div>

        {/* 当前颜色指示 + 操作提示 */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <ColorIndicator color={gameState.currentColor} />
          <TurnHint
            isMyTurn={isMyTurn}
            hasPlayableCards={hasPlayableCards}
            pendingDraw={pendingDraw}
          />
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

      {/* 表情覆盖层 */}
      <EmojiOverlay
        messages={emojiMessages || []}
        onDismiss={onDismissEmoji || (() => {})}
      />
    </div>
  );
}

// ========== 子组件 ==========

function GameHeader({
  roomCode,
  direction,
  currentPlayer,
  isMyTurn,
  turnTimer,
  turnStartTime,
  onLeaveRoom,
  phaseInfo,
}: {
  roomCode: string;
  direction: number;
  currentPlayer?: { nickname: string };
  isMyTurn: boolean;
  turnTimer?: number;
  turnStartTime?: number;
  onLeaveRoom: () => void;
  phaseInfo?: {
    gameStartTime: number;
    phaseTimes: number[];
    currentPhase: number;
    maxCards: number;
  };
}) {
  const [remainingTime, setRemainingTime] = useState(turnTimer || GAME_CONFIG.turnTimer);

  useEffect(() => {
    const timerDuration = turnTimer || GAME_CONFIG.turnTimer;
    const startTime = turnStartTime || Date.now();

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timerDuration - elapsed);
      setRemainingTime(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [turnTimer, turnStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="casino-card p-3 sm:p-4 space-y-2">
      {/* 阶段计时器（Out 模式） */}
      {phaseInfo && (
        <div className="flex justify-center">
          <PhaseTimer {...phaseInfo} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
      {/* 第一行：房间号和方向 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-felt-dark/60 border border-gold/20 rounded-lg sm:rounded-xl">
          <span className="text-cream-muted text-xs sm:text-sm">房间:</span>
          <span className="font-mono font-bold text-gold-light tracking-wider text-sm sm:text-base">{roomCode}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-felt-dark/60 border border-gold/20 rounded-lg sm:rounded-xl">
          <span className="text-cream-muted text-xs sm:text-sm">方向:</span>
          <span className="text-gold font-bold text-sm sm:text-base">{direction === 1 ? '→' : '←'}</span>
        </div>
      </div>

      {/* 中间：倒计时和当前回合 */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 order-first sm:order-none">
        {/* 倒计时显示 */}
        <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border ${
          isMyTurn ? 'bg-gold/20 border-gold/50 animate-pulse' : 'bg-felt-dark/60 border-gold/20'
        }`}>
          <span className="text-cream-muted text-xs sm:text-sm">剩余:</span>
          <span 
            data-testid="turn-timer"
            className={`font-mono font-bold text-sm sm:text-lg ${
              remainingTime <= 10 ? 'text-red-400' : 'text-gold-light'
            }`}
          >
            {formatTime(remainingTime)}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-1.5 sm:py-2 bg-gold/10 border border-gold/30 rounded-lg sm:rounded-xl">
          <span className="text-cream-muted text-xs sm:text-sm">当前:</span>
          <span className="font-bold text-gold-light text-sm sm:text-base truncate max-w-[80px] sm:max-w-[120px]">{currentPlayer?.nickname || '...'}</span>
        </div>
      </div>

      {/* 离开按钮 */}
      <button
        onClick={onLeaveRoom}
        className="px-3 sm:px-4 py-1.5 sm:py-2 btn-soft-red rounded-lg text-sm sm:text-base self-end sm:self-auto"
      >
        离开
      </button>
      </div>
    </div>
  );
}

function OtherPlayers({
  players,
  currentPlayerId
}: {
  players: { id: string; nickname: string; cardCount?: number; isAI?: boolean }[];
  currentPlayerId: string;
}) {
  return (
    <div className="flex justify-center gap-1.5 sm:gap-3 flex-wrap px-1">
      {players.map((player) => (
        <div
          key={player.id}
          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-all ${
            player.id === currentPlayerId
              ? 'bg-gold/20 border-gold/50 shadow-lg shadow-gold/10 scale-105'
              : 'bg-felt-dark/60 border-gold/10'
          }`}
        >
          <div className="flex items-center gap-1">
            {player.id === currentPlayerId && (
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            )}
            <span className={`text-xs sm:text-sm font-medium truncate max-w-[50px] sm:max-w-[80px] ${
              player.id === currentPlayerId ? 'text-gold-light' : 'text-cream'
            }`}>
              {player.nickname}
            </span>
            {player.isAI && (
              <span className="text-[10px] text-blue-300/70" title="AI">AI</span>
            )}
          </div>
          <div className="text-cream-muted/60 text-[10px] sm:text-xs text-center mt-0.5">{player.cardCount ?? 0} 张</div>
        </div>
      ))}
    </div>
  );
}

function DiscardPile({ topCard }: { topCard?: CardType }) {
  if (!topCard) {
    return (
      <div className="w-20 h-28 bg-felt-dark/80 rounded-xl border-2 border-gold/20 flex items-center justify-center shadow-lg">
        <span className="text-gold/40 text-2xl">🃏</span>
      </div>
    );
  }

  return (
    <Card
      card={topCard}
      size="md"
      disabled
    />
  );
}

function DrawPile({ onDraw, disabled }: { onDraw: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onDraw}
      disabled={disabled}
      className={`relative w-16 h-24 sm:w-24 sm:h-36 rounded-xl shadow-lg flex items-center justify-center
        bg-gradient-to-br from-blue-800 via-indigo-800 to-slate-800
        border-2 border-gold/40
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
        transition-all duration-300 active:scale-95 sm:active:scale-100`}
    >
      <span className="text-gold text-lg sm:text-2xl font-bold tracking-wider">UNO</span>
      {/* 柔和光点 */}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gold/50 rounded-full" />
      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gold/50 rounded-full" />
      {/* 可抽牌提示 */}
      {!disabled && (
        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-600 rounded-full animate-pulse border-2 border-gold/50" />
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
    wild: { bg: 'bg-uno-wild', label: '万能', border: 'border-slate-600' }
  };

  const config = colorConfig[color] || colorConfig.wild;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 casino-card">
      <span className="text-cream-muted text-xs sm:text-sm">当前颜色:</span>
      <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full ${config.bg} border-2 ${config.border} shadow-md`} />
      <span className="text-gold font-medium text-xs sm:text-sm">{config.label}</span>
    </div>
  );
}

function MyHand({
  cards,
  isMyTurn,
  onPlayCard,
  canPlay
}: {
  cards: CardType[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
  canPlay: (cardId: string) => boolean;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="flex justify-center items-end gap-0.5 sm:gap-1 py-3 sm:py-4 overflow-x-auto px-2">
      {cards.map((card, idx) => {
        const playable = isMyTurn && canPlay(card.id);

        return (
          <div
            key={card.id}
            className="flex-shrink-0 -mx-1 sm:-mx-0.5 first:ml-0 last:mr-0"
            style={{ zIndex: playable ? 10 + idx : idx }}
          >
            <Card
              card={card}
              size={cards.length > 10 ? 'sm' : 'md'}
              isPlayable={playable}
              disabled={!playable}
              onClick={() => onPlayCard(card.id)}
            />
          </div>
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
    <div className="fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto sm:left-auto sm:right-auto
      flex justify-center gap-4 sm:gap-4 mt-4 sm:mt-6 p-3 sm:p-0
      bg-gradient-to-t from-felt/95 via-felt/80 to-transparent sm:bg-none z-20">
      <button
        onClick={onDrawCard}
        disabled={!isMyTurn || !canDraw}
        className="px-8 sm:px-8 py-3 sm:py-3 btn-soft-blue text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] sm:min-w-[100px] active:scale-95 transition-all rounded-xl font-medium"
      >
        摸牌
      </button>
      <button
        onClick={onCallUno}
        disabled={!canCallUno}
        className={`px-8 sm:px-8 py-3 sm:py-3 text-base sm:text-lg rounded-xl font-bold transition-all min-w-[100px] sm:min-w-[100px] active:scale-95
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
    { key: 'red', label: '红色', bg: 'bg-uno-red', border: 'border-red-300', emoji: '🔴' },
    { key: 'blue', label: '蓝色', bg: 'bg-uno-blue', border: 'border-blue-300', emoji: '🔵' },
    { key: 'green', label: '绿色', bg: 'bg-uno-green', border: 'border-green-300', emoji: '🟢' },
    { key: 'yellow', label: '黄色', bg: 'bg-uno-yellow', border: 'border-yellow-300', text: 'text-slate-800', emoji: '🟡' }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="casino-card p-6 sm:p-8 max-w-xs sm:max-w-sm w-full mx-auto">
        <h3 className="text-gold-light text-xl sm:text-2xl font-bold mb-6 text-center">选择颜色</h3>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {colors.map((c) => (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className={`w-full aspect-square ${c.bg} ${c.text || 'text-white'}
                rounded-2xl flex flex-col items-center justify-center font-bold text-lg sm:text-xl gap-2
                active:scale-95 transition-all shadow-xl border-2 ${c.border}
                min-h-[80px] sm:min-h-[100px]`}
            >
              <span className="text-2xl sm:text-3xl">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-5 sm:mt-6 py-3 sm:py-3.5 bg-felt-dark/60 border border-gold/20 text-gold rounded-xl
            hover:border-gold/40 transition-all font-medium text-base sm:text-lg"
        >
          取消
        </button>
      </div>
    </div>
  );
}

function TurnHint({ isMyTurn, hasPlayableCards, pendingDraw }: {
  isMyTurn: boolean;
  hasPlayableCards: boolean;
  pendingDraw: number;
}) {
  if (!isMyTurn) return (
    <div className="text-cream-muted/50 text-xs sm:text-sm">等待其他玩家操作...</div>
  );
  if (pendingDraw > 0) return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-red-900/30 border border-red-500/40 rounded-full">
      <span className="text-red-300 text-xs sm:text-sm font-bold animate-pulse">惩罚 +{pendingDraw}张</span>
      <span className="text-cream-muted/70 text-xs">{hasPlayableCards ? '跟牌回避 或 摸牌接受' : '点击牌堆摸牌'}</span>
    </div>
  );
  if (!hasPlayableCards) return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-900/20 border border-amber-500/30 rounded-full">
      <span className="text-amber-300 text-xs sm:text-sm">无牌可出</span>
      <span className="text-cream-muted/70 text-xs">点击牌堆摸牌</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-full">
      <span className="text-emerald-300 text-xs sm:text-sm font-medium">你的回合</span>
      <span className="text-cream-muted/50 text-xs">点击卡牌出牌 或 摸牌</span>
    </div>
  );
}

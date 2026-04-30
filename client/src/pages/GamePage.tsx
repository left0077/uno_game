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

interface EmojiMsg { playerId: string; emoji: any; target?: string; timestamp: number }

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
    comboOptions: Array<{ type: string; comboType: string; cardIds: string[]; label: string }>;
    penaltyInfo: { pendingDraw: number; penaltySourceId: string } | null;
    sendEmoji: (emoji: string) => void;
  };
  emojiMessages?: Array<{ playerId: string; emoji: string; target?: string; timestamp: number }>;
  onDismissEmoji?: () => void;
  onLeaveRoom: () => void;
}

export function GamePage({ gameActions, onLeaveRoom, emojiMessages, onDismissEmoji }: GamePageProps) {
  const store = useGameStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]); // 按点击顺序排列，最后一张决定跟牌

  const gameState = store.gameState;
  const room = store.room;
  const isMyTurn = gameActions.isMyTurn();
  const canPlay = gameActions.canPlay;
  const hasPlayableCards = gameActions.myHand.some(c => canPlay(c.id));
  const pendingDraw = gameState?.pendingDraw || 0;
  const comboOptions = gameActions.comboOptions || [];
  const penaltyInfo = gameActions.penaltyInfo;

  // 选中的可单出牌
  const selectedPlayable = selectedCards.filter(id => canPlay(id));

  // 连打候选：只有选中一张可单出牌后，才显示与其相关的连打牌
  const comboCards = new Set<string>();
  if (selectedPlayable.length === 1 && comboOptions.length > 0) {
    const seed = selectedPlayable[0];
    for (const c of comboOptions) {
      if (c.cardIds.includes(seed)) {
        for (const id of c.cardIds) {
          if (!canPlay(id)) comboCards.add(id);
        }
      }
    }
  }

  // 当前选中的牌是否构成了有效连打
  const activeCombo = comboOptions.find(c =>
    c.cardIds.length === selectedCards.length &&
    c.cardIds.every((id: string) => selectedCards.includes(id))
  );

  const handlePlayCombo = useCallback((cardIds: string[], comboType: string) => {
    gameActions.playCombo(cardIds, comboType as any);
    setSelectedCards([]);
  }, [gameActions]);

  // 点击牌：选中/取消
  const handleCardClick = useCallback((cardId: string) => {
    if (!isMyTurn) return;

    const isSelectable = canPlay(cardId) || comboCards.has(cardId);
    if (!isSelectable) return;

    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
      if (pendingDraw > 0) return [cardId];
      return [...prev, cardId];
    });
  }, [isMyTurn, canPlay, pendingDraw, comboCards]);

  // 确认出牌
  const handleConfirmPlay = useCallback(() => {
    if (selectedCards.length === 0) return;

    if (activeCombo) {
      // 连打
      handlePlayCombo(activeCombo.cardIds, activeCombo.comboType);
    } else if (selectedCards.length === 1) {
      // 单张出牌
      const cardId = selectedCards[0];
      if (gameActions.requiresColorSelection(cardId)) {
        setPendingCardId(cardId);
        setShowColorPicker(true);
        return;
      }
      gameActions.playCard(cardId);
      setSelectedCards([]);
    }
  }, [selectedCards, activeCombo, gameActions, handlePlayCombo]);

  // 处理颜色选择
  const handleColorSelect = useCallback((color: string) => {
    if (pendingCardId) {
      gameActions.playCard(pendingCardId, color);
      setPendingCardId(null);
      setSelectedCards([]);
    }
    setShowColorPicker(false);
  }, [pendingCardId, gameActions]);

  // 处理摸牌
  const handleDrawCard = useCallback(() => {
    if (gameActions.canDraw()) {
      gameActions.drawCard();
      setSelectedCards([]);
    }
  }, [gameActions]);

  // 处理喊 UNO（手牌 ≤ 2 时可喊）
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

  const lastPlay = (gameState as any).lastPlay;
  const canUno = gameActions.myHand.length <= 2;

  return (
    <div className="min-h-screen bg-casino flex flex-col relative z-10">
      {/* ====== 顶部栏 ====== */}
      <div className="flex items-center justify-between px-3 py-2 casino-card mx-2 mt-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-cream-muted text-xs">房间</span>
          <span className="font-mono font-bold text-gold-light text-sm">{room.code}</span>
          <span className="text-gold text-xs">{typeof gameState.direction === 'string' ? (gameState.direction === 'clockwise' ? '→' : '←') : gameState.direction === 1 ? '→' : '←'}</span>
          <ConnectionStatus />
        </div>
        <div className="flex items-center gap-3">
          {gameState.outState && gameState.gameStartTime && (
            <PhaseTimer gameStartTime={gameState.gameStartTime} phaseTimes={(gameState as any).phaseTimes || [180, 360, 540]} currentPhase={gameState.outState.phase} maxCards={gameState.outState.maxCards} turnTimer={gameState.turnTimer} turnStartTime={gameState.turnStartTime} isMyTurn={isMyTurn} />
          )}
          <button onClick={onLeaveRoom} className="btn-soft-red px-3 py-1 text-xs rounded-lg">离开</button>
        </div>
      </div>

      {/* ====== 玩家头像行 ====== */}
      <OtherPlayers players={gameState.players || room.players} currentPlayerId={gameState.currentPlayerId} />

      {/* ====== 主游戏区 ====== */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 gap-3 max-w-lg mx-auto w-full">

        {/* 牌堆 */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <DiscardPile topCard={gameState.topCard} />
          <DrawPile onDraw={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} />
        </div>

        {/* 上家出牌提示 */}
        {lastPlay?.cards?.length > 0 && (
          <div className="text-cream-muted/60 text-xs text-center animate-fade-in">
            {(() => {
              const p = (gameState.players || room?.players || []).find((x: any) => x.id === lastPlay.playerId);
              return `${p?.nickname || '?'} 出了 ${lastPlay.type === 'combo' ? `${lastPlay.cardCount}张` : ''}`;
            })()}
          </div>
        )}

        {/* 状态提示 */}
        <StatusHint isMyTurn={isMyTurn} pendingDraw={pendingDraw} hasPlayable={hasPlayableCards} />

        {/* 手牌 */}
        <MyHand
          cards={gameActions.myHand}
          isMyTurn={isMyTurn}
          selectedCards={selectedCards}
          comboCards={comboCards}
          onCardClick={handleCardClick}
          canPlay={gameActions.canPlay}
        />

        {/* 选中操作 */}
        {selectedCards.length > 0 && isMyTurn && (selectedCards.length === 1 || activeCombo) && (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCards([])} className="text-cream-muted text-xs">取消</button>
            <button onClick={handleConfirmPlay}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all">
              {activeCombo ? `${activeCombo.label} 连打` : '出牌'}
            </button>
          </div>
        )}
        {selectedCards.length > 1 && !activeCombo && isMyTurn && (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCards([])} className="text-cream-muted text-xs">取消</button>
            <span className="text-amber-300 text-xs">{selectedCards.length}张未形成连打</span>
          </div>
        )}

        {/* 操作栏 */}
        <div className="flex items-center justify-center gap-3 pb-2">
          <EmojiBar onSend={gameActions.sendEmoji} />
          <button onClick={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()}
            className="px-5 py-2 btn-soft-blue text-sm rounded-xl disabled:opacity-40">
            摸牌
          </button>
          <button onClick={handleCallUno} disabled={!canUno}
            className={`px-5 py-2 text-sm rounded-xl font-bold transition-all ${
              canUno ? 'btn-soft-red animate-pulse' : 'bg-felt-dark/60 text-cream-muted/40 cursor-not-allowed'
            }`}>
            UNO!
          </button>
        </div>
      </div>

      {/* 弹窗 */}
      {showColorPicker && <ColorPickerModal onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />}
      <EmojiOverlay messages={emojiMessages || []} players={gameState?.players || room?.players || []} onDismiss={onDismissEmoji || (() => {})} />
    </div>
  );
}

// ========== 以下为旧子组件（已弃用，待清理） ==========

function _GameHeader({
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
      {/* 第一行：房间号 + 方向 + 连接状态 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-felt-dark/60 border border-gold/20 rounded-lg sm:rounded-xl">
          <span className="text-cream-muted text-xs sm:text-sm">房间:</span>
          <span className="font-mono font-bold text-gold-light tracking-wider text-sm sm:text-base">{roomCode}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-felt-dark/60 border border-gold/20 rounded-lg sm:rounded-xl">
          <span className="text-cream-muted text-xs sm:text-sm">方向:</span>
          <span className="text-gold font-bold text-sm sm:text-base">{direction === 1 ? '→' : '←'}</span>
        </div>
        <ConnectionStatus />
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
  players: { id: string; nickname: string; cardCount?: number; isAI?: boolean; status?: string; eliminated?: boolean }[];
  currentPlayerId: string;
}) {
  return (
    <div className="flex justify-center gap-1.5 sm:gap-3 flex-wrap px-1">
      {players.map((player, idx) => {
        const isCurrent = player.id === currentPlayerId;
        const isFinished = player.status === 'finished';
        const isEliminated = player.eliminated;

        return (
          <div
            key={player.id}
            className={`relative px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-all ${
              isCurrent
                ? 'bg-gold/20 border-gold/50 shadow-lg shadow-gold/10 scale-105'
                : isFinished
                ? 'bg-emerald-900/30 border-emerald-500/40'
                : isEliminated
                ? 'bg-red-900/20 border-red-500/30 opacity-60'
                : 'bg-felt-dark/60 border-gold/10'
            }`}
          >
            {/* 排名角标 */}
            {isFinished && (
              <span className="absolute -top-2 -right-2 text-lg">
                {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
              </span>
            )}
            {isEliminated && (
              <span className="absolute -top-2 -right-2 text-xs bg-red-600 text-white px-1 rounded">OUT</span>
            )}

            <div className="flex items-center gap-1">
              {isCurrent && (
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              )}
              <span className={`text-xs sm:text-sm font-medium truncate max-w-[50px] sm:max-w-[80px] ${
                isCurrent ? 'text-gold-light' : isFinished ? 'text-emerald-300' : 'text-cream'
              }`}>
                {player.nickname}
              </span>
              {player.isAI && (
                <span className="text-[10px] text-blue-300/70">AI</span>
              )}
            </div>
            <div className="text-cream-muted/60 text-[10px] sm:text-xs text-center mt-0.5">
              {isFinished ? '🏆 完成!' : isEliminated ? '💀 淘汰' : `${player.cardCount ?? 0} 张`}
            </div>
          </div>
        );
      })}
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
  selectedCards,
  comboCards,
  onCardClick,
  canPlay
}: {
  cards: CardType[];
  isMyTurn: boolean;
  selectedCards: string[];
  comboCards: Set<string>;
  onCardClick: (cardId: string) => void;
  canPlay: (cardId: string) => boolean;
}) {
  if (cards.length === 0) return null;

  // 按颜色分组，组内按数字排序
  const colorOrder = ['red', 'yellow', 'green', 'blue', 'wild'];
  const sorted = [...cards].sort((a, b) => {
    const ci = colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
    if (ci !== 0) return ci;
    const va = typeof a.value === 'number' ? a.value : 99;
    const vb = typeof b.value === 'number' ? b.value : 99;
    return va - vb;
  });

  return (
    <div className="flex justify-center items-end gap-0.5 sm:gap-1 py-3 sm:py-4 overflow-x-auto px-2">
      {sorted.map((card, idx) => {
        const playable = isMyTurn && canPlay(card.id);
        const isCombo = comboCards.has(card.id);
        const isSelectable = playable || isCombo;
        const isSelected = selectedCards.includes(card.id);
        const selIndex = selectedCards.indexOf(card.id);
        const isLastSelected = isSelected && selIndex === selectedCards.length - 1;

        return (
          <div
            key={card.id}
            className="relative flex-shrink-0 -mx-1 sm:-mx-0.5 first:ml-0 last:mr-0"
            style={{ zIndex: isSelectable ? 10 + idx : idx }}
          >
            {/* 选中序号 + 尾牌标识 */}
            {isSelected && selectedCards.length > 1 && (
              <div className={`absolute -top-2 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${isLastSelected ? 'bg-gold text-black' : 'bg-white/20 text-white'}`}>
                {isLastSelected ? '→尾' : selIndex + 1}
              </div>
            )}
            <Card
              card={card}
              size={cards.length > 10 ? 'sm' : 'md'}
              isPlayable={playable && !isCombo}
              isComboPart={isCombo && !playable}
              isSelected={isSelected}
              disabled={!isSelectable}
              onClick={() => isSelectable && onCardClick(card.id)}
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

function LastPlayDisplay({ lastPlay, players }: { lastPlay: any; players: any[] }) {
  if (!lastPlay || !lastPlay.cards?.length) return null;
  const player = players.find((p: any) => p.id === lastPlay.playerId);
  const colorEmoji: Record<string, string> = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵', wild: '⚫' };
  const label = (c: any) => `${colorEmoji[c?.color] || ''}${c?.type === 'number' ? c.value : (c?.type || '?')}`;

  const cards = lastPlay.cards;
  const rest = cards.slice(0, -1).map(label).join(' ');
  const last = label(cards[cards.length - 1]);

  return (
    <div className="flex justify-center mb-4">
      <div className="text-xs text-cream-muted/80 text-center">
        <div>
          {player?.nickname || '?'} 出了:
          {lastPlay.type === 'combo' && <span className="text-purple-300 ml-1">(连打{cards.length}张)</span>}
        </div>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          {rest && <span className="opacity-50">{rest}</span>}
          <span className="text-gold-light font-bold border border-gold/30 rounded px-1">→ {last}</span>
        </div>
      </div>
    </div>
  );
}

function TurnTimer({ turnTimer, turnStartTime, isMyTurn }: { turnTimer?: number; turnStartTime?: number; isMyTurn: boolean }) {
  const [remaining, setRemaining] = useState(turnTimer || 120);
  useEffect(() => {
    if (!turnStartTime) return;
    const dur = turnTimer || 120;
    const tick = () => setRemaining(Math.max(0, dur - Math.floor((Date.now() - turnStartTime) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [turnTimer, turnStartTime]);
  return (
    <span className={`text-xs font-mono ${isMyTurn ? 'text-gold-light font-bold' : 'text-cream-muted'}`}>
      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
    </span>
  );
}

function StatusHint({ isMyTurn, pendingDraw, hasPlayable, error }: { isMyTurn: boolean; pendingDraw: number; hasPlayable: boolean; error?: string }) {
  if (error) return <div className="text-red-300 text-xs animate-pulse bg-red-900/30 px-3 py-1 rounded-full">{error}</div>;
  if (!isMyTurn) return <div className="text-cream-muted/50 text-xs">等待其他玩家...</div>;
  if (pendingDraw > 0) return <div className="text-red-300 text-xs font-bold animate-pulse">惩罚 +{pendingDraw} 张！跟牌或摸牌</div>;
  if (!hasPlayable) return <div className="text-amber-300 text-xs">无牌可出 · 点击牌堆摸牌</div>;
  return <div className="text-emerald-300 text-xs">你的回合 · 点击选牌</div>;
}

function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const go = () => setOnline(navigator.onLine);
    window.addEventListener('online', go);
    window.addEventListener('offline', go);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
  }, []);
  return (
    <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs ${
      online ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300 animate-pulse'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {online ? '在线' : '离线'}
    </div>
  );
}

const EMOJI_LIST = ['🤡','💀','🐉','👁️','🫠','🤌','🗿','🍵','🥱','🙏','🫡','🤯','🪿','🎭','🦧','😭'];

function EmojiBar({ onSend }: { onSend: (emoji: string) => void }) {
  return (
    <div className="flex justify-center gap-2 mt-2 flex-wrap">
      {EMOJI_LIST.map(e => (
        <button key={e} onClick={() => onSend(e)}
          className="text-xl hover:scale-125 active:scale-90 transition-transform p-1"
        >{e}</button>
      ))}
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

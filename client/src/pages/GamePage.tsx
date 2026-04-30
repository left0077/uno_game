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
  const myUnoCalled = room?.players.find(p => p.id === store.userId)?.hasCalledUno;

  return (
    <div className="min-h-screen bg-casino flex flex-col relative z-10">
      {/* ====== 顶部栏 ====== */}
      <div className="grid grid-cols-3 items-center px-3 py-2 casino-card mx-2 mt-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-cream-muted text-xs">房间</span>
          <span className="font-mono font-bold text-gold-light text-sm">{room.code}</span>
          <ConnectionStatus />
        </div>
        <div className="flex justify-center items-center gap-2">
          <span className="text-gold font-bold text-lg">{typeof gameState.direction === 'string' ? (gameState.direction === 'clockwise' ? '→' : '←') : gameState.direction === 1 ? '→' : '←'}</span>
          {gameState.outState && gameState.gameStartTime && (
            <PhaseTimer gameStartTime={gameState.gameStartTime} phaseTimes={(gameState as any).phaseTimes || [180, 360, 540]} currentPhase={gameState.outState.phase} maxCards={gameState.outState.maxCards} turnTimer={gameState.turnTimer} turnStartTime={gameState.turnStartTime} isMyTurn={isMyTurn} />
          )}
        </div>
        <div className="flex justify-end">
          <button onClick={onLeaveRoom} className="btn-soft-red px-3 py-1 text-xs rounded-lg">离开</button>
        </div>
      </div>

      {/* ====== 玩家头像行 ====== */}
      <OtherPlayers players={gameState.players || room.players} currentPlayerId={gameState.currentPlayerId} penaltyStats={(gameState as any).penaltyStats || {}} />

      {/* ====== 主游戏区 ====== */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 gap-3 max-w-lg mx-auto w-full">

        {/* 牌堆 + 颜色 */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <DiscardPile topCard={gameState.topCard} />
          {pendingDraw > 0 && (
            <div className="text-red-400 font-bold text-lg animate-pulse">+{pendingDraw}</div>
          )}
          <DrawPile onDraw={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} />
        </div>
        <ColorDot color={gameState.currentColor} />

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

        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-felt-dark/95 via-felt-dark/80 to-transparent px-4 py-3 pb-6">
          <div className="flex justify-center mb-2">
            <EmojiBar onSend={gameActions.sendEmoji} />
          </div>
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            {selectedCards.length > 0 && isMyTurn && (selectedCards.length === 1 || activeCombo) && (
              <>
                <button onClick={() => setSelectedCards([])} className="flex-1 py-3 bg-felt-dark/60 border border-gold/20 text-cream-muted rounded-xl text-sm">取消</button>
                <button onClick={handleConfirmPlay} className="flex-[2] py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg active:scale-95 text-base">{activeCombo ? `${activeCombo.label} 连打` : '出牌'}</button>
              </>
            )}
            {selectedCards.length > 1 && !activeCombo && isMyTurn && (
              <button onClick={() => setSelectedCards([])} className="w-full py-3 bg-amber-900/40 border border-amber-500/30 text-amber-300 rounded-xl text-sm">{selectedCards.length}张未形成连打 · 点击取消</button>
            )}
            {!(selectedCards.length > 0 && isMyTurn) && (
              <>
                <button onClick={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} className="flex-1 py-3 btn-soft-blue text-sm rounded-xl disabled:opacity-40 font-medium">摸牌</button>
                <button onClick={handleCallUno} disabled={!canUno || !!myUnoCalled} className={`flex-1 py-3 text-sm rounded-xl font-bold transition-all ${myUnoCalled ? 'bg-emerald-700 text-white border border-emerald-400' : canUno ? 'btn-soft-red animate-pulse' : 'bg-felt-dark/60 text-cream-muted/40 cursor-not-allowed'}`}>{myUnoCalled ? 'UNO ✓' : 'UNO!'}</button>
              </>
            )}
          </div>
        </div>

      {/* 弹窗 */}
      {showColorPicker && <ColorPickerModal onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />}
      <EmojiOverlay messages={emojiMessages || []} players={gameState?.players || room?.players || []} onDismiss={onDismissEmoji || (() => {})} />
    </div>
  );
}

// ========== 旧子组件已删除 ==========

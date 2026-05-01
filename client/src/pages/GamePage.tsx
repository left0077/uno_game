/**
 * GamePage - 游戏页面
 * 
 * 柔和赌场风格版本
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from '../components/Card';
import { PhaseTimer } from '../components/game/PhaseTimer';
import { EmojiOverlay } from '../components/EmojiOverlay';
import type { Card as CardType } from '../../../shared/types';

interface GamePageProps {
  gameActions: {
    playCard: (cardId: string, chosenColor?: string) => boolean;
    playCombo: (cardIds: string[], comboType: 'pair' | 'three' | 'rainbow' | 'straight', chosenColor?: string) => boolean;
    drawCard: () => boolean;
    callUno: () => boolean;
    canPlay: (cardId: string) => boolean;
    canDraw: () => boolean;
    canCallUno: () => boolean;
    requiresColorSelection: (cardId: string) => boolean;
    isMyTurn: () => boolean;
    myHand: CardType[];
    comboOptions: Array<{ type: string; comboType: string; cardIds: string[]; label: string }>;
    penaltyInfo: { pendingDraw: number; penaltySourceId: string } | null;
    sendEmoji: (emoji: string) => void;
    challengePlayer: (targetId: string) => boolean;
  };
  emojiMessages?: Array<{ playerId: string; emoji: string; target?: string; timestamp: number }>;
  onDismissEmoji?: () => void;
  onLeaveRoom: () => void;
}

export function GamePage({ gameActions, onLeaveRoom, emojiMessages, onDismissEmoji }: GamePageProps) {
  const store = useGameStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]); // 按点击顺序排列，最后一张决定跟牌

  const gameState = store.gameState;
  const room = store.room;
  const isMyTurn = gameActions.isMyTurn();
  const canPlay = gameActions.canPlay;
  const pendingDraw = gameState?.pendingDraw || 0;
  const comboOptions = gameActions.comboOptions || [];

  const onChallenge = (id: string) => gameActions.challengePlayer(id);

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

  const canUno = gameActions.myHand.length <= 2;
  const myUnoCalled = room?.players.find(p => p.id === store.userId)?.hasCalledUno;
  const [unoClicked, setUnoClicked] = useState(false);
  const handleClickUno = () => { setUnoClicked(true); gameActions.callUno(); setTimeout(() => setUnoClicked(false), 1000); };

  const isOut = !!gameState.outState;
  const allPlayers = gameState?.players || room?.players || [];
  const myId = store.userId;

  // 门字形：我居中在下，其他玩家顺时针环绕（左 | 上 | 右）
  const meIdx = allPlayers.findIndex(p => p.id === myId);
  // 从"我"的位置开始重排，让顺时针顺序在视觉上正确
  const rotated = meIdx >= 0 ? [...allPlayers.slice(meIdx), ...allPlayers.slice(0, meIdx)] : allPlayers;
  const rotatedOthers = rotated.filter(p => p.id !== myId);
  let topRow: typeof allPlayers = [], leftCol: typeof allPlayers = [], rightCol: typeof allPlayers = [];
  {
    const n = rotatedOthers.length;
    if (n <= 3) { topRow = rotatedOthers; }
    else if (n <= 5) {
      leftCol = rotatedOthers.slice(0, 1); topRow = rotatedOthers.slice(1, n - 1); rightCol = rotatedOthers.slice(n - 1);
    } else {
      const side = Math.ceil(n / 4);
      leftCol = rotatedOthers.slice(0, side); topRow = rotatedOthers.slice(side, n - side); rightCol = rotatedOthers.slice(n - side);
    }
  }

  const pp = (gameState as any).playerLastPlays || {};
  const pe = getLatestEmojis(emojiMessages || []);
  const ps = (gameState as any).penaltyStats || {};

  return (
    <div className="h-dvh bg-casino flex flex-col relative z-10 overflow-hidden">
      {/* ====== 顶栏 ====== */}
      <div className="flex items-center justify-between px-2 py-1 casino-card mx-1 mt-1 flex-shrink-0 h-[36px]">
        <div className="w-[60px] flex items-center"><NetworkDot /></div>
        <div className="flex items-center gap-2">
          <span className="text-gold font-bold text-base">{gameState.direction === 'counterclockwise' || gameState.direction === -1 ? '←' : '→'}</span>
          {isOut && gameState.gameStartTime ? (
            <PhaseTimer gameStartTime={gameState.gameStartTime} phaseTimes={(gameState as any).phaseTimes || [180, 360, 540]} currentPhase={gameState.outState.phase} maxCards={gameState.outState.maxCards} turnTimer={gameState.turnTimer} turnStartTime={gameState.turnStartTime} isMyTurn={isMyTurn} />
          ) : (
            <span className="text-cream-muted/60 text-xs">{isMyTurn ? '你的回合' : '等待中'}</span>
          )}
        </div>
        <div className="w-[60px] flex justify-end">
          <button onClick={() => setShowRules(true)} className="w-7 h-7 text-xs rounded-full bg-felt-dark/60 border border-gold/30 text-gold-light flex items-center justify-center">?</button>
        </div>
      </div>

      {/* ====== 上排对手 ====== */}
      <PlayerRow players={topRow} currentPlayerId={gameState.currentPlayerId} penaltyStats={ps} playerLastPlays={pp} playerEmojis={pe} onChallenge={onChallenge} />

      {/* ====== 中央：左 | 弃牌+日志 | 右 ====== */}
      <div className="flex-1 flex gap-1 px-1 min-h-0 py-0.5">
        <PlayerCol players={leftCol} currentPlayerId={gameState.currentPlayerId} penaltyStats={ps} playerLastPlays={pp} playerEmojis={pe} onChallenge={onChallenge} />

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex-1 flex gap-1 min-h-0">
            {/* 弃牌堆 */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                <DiscardPile topCard={gameState.topCard} />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                  <ColorDot color={gameState.currentColor} />
                  {pendingDraw > 0 && (
                    <div className="text-red-400 font-bold text-[10px] bg-felt-dark/80 px-1 rounded-full animate-pulse whitespace-nowrap">+{pendingDraw}</div>
                  )}
                </div>
              </div>
            </div>
            {/* 日志：和弃牌等高 */}
            <div className="flex-1 min-w-0">
              <TurnLog entries={(gameState as any).turnLog || []} emojiMessages={emojiMessages || []} players={allPlayers} />
            </div>
          </div>

          {/* 我：居中在下 */}
          <div className="flex justify-center flex-shrink-0">
            <PlayerBlock
              player={allPlayers.find(p => p.id === myId)!}
              isCurrent={gameState.currentPlayerId === myId}
              penalty={ps[myId] || 0}
              lastPlay={pp[myId]}
              emoji={pe[myId]}
            />
          </div>
        </div>

        <PlayerCol players={rightCol} currentPlayerId={gameState.currentPlayerId} penaltyStats={ps} playerLastPlays={pp} playerEmojis={pe} onChallenge={onChallenge} />
      </div>

      {/* ====== 操作按钮 ====== */}
      <div className="flex-shrink-0 px-2 pb-1">
        <div className="flex gap-2 max-w-xs mx-auto">
          {selectedCards.length > 0 && isMyTurn && (selectedCards.length === 1 || activeCombo) ? (
            <>
              <button onClick={() => setSelectedCards([])} className="flex-1 h-10 bg-felt-dark/60 border border-gold/20 text-cream-muted rounded-xl text-sm">取消</button>
              <button onClick={handleConfirmPlay} className="flex-[2] h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg active:scale-95 text-sm">{activeCombo ? activeCombo.label : '出牌'}</button>
            </>
          ) : selectedCards.length > 1 && !activeCombo && isMyTurn ? (
            <button onClick={() => setSelectedCards([])} className="flex-1 h-10 bg-amber-900/40 border border-amber-500/30 text-amber-300 rounded-xl text-sm">{selectedCards.length}张未成连打·取消</button>
          ) : (
            <>
              <button onClick={handleDrawCard} disabled={!isMyTurn || !gameActions.canDraw()} className="flex-1 h-10 btn-soft-blue text-sm rounded-xl disabled:opacity-40 font-medium">摸牌</button>
              <button onClick={handleClickUno} disabled={!canUno || !!myUnoCalled || unoClicked} className={`flex-1 h-10 text-sm rounded-xl font-bold transition-all ${
                myUnoCalled ? 'bg-emerald-700 text-white border border-emerald-400' :
                unoClicked ? 'bg-yellow-500 text-black scale-95' :
                canUno ? 'btn-soft-red animate-pulse' : 'bg-felt-dark/60 text-cream-muted/40 cursor-not-allowed'
              }`}>{myUnoCalled ? 'UNO ✓' : unoClicked ? '已喊!' : 'UNO!'}</button>
            </>
          )}
        </div>
      </div>

      {/* ====== 手牌 ====== */}
      <div className="flex-shrink-0 pb-1">
        <MyHand
          cards={gameActions.myHand}
          isMyTurn={isMyTurn}
          selectedCards={selectedCards}
          comboCards={comboCards}
          onCardClick={handleCardClick}
          canPlay={gameActions.canPlay}
        />
      </div>

      {/* ====== 表情栏 ====== */}
      <EmojiBar onSend={gameActions.sendEmoji} />

      {/* 弹窗 */}
      {showColorPicker && <ColorPickerModal onSelect={handleColorSelect} onCancel={() => setShowColorPicker(false)} />}
      {showRules && <RulesModal mode={isOut ? 'out' : 'standard'} onClose={() => setShowRules(false)} />}
      <EmojiOverlay messages={emojiMessages || []} players={allPlayers} onDismiss={onDismissEmoji || (() => {})} />
    </div>
  );
}

function getLatestEmojis(msgs: Array<{ playerId: string; emoji: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of msgs) map[m.playerId] = m.emoji;
  return map;
}

// ========== 子组件 ==========

function TurnLog({ entries, emojiMessages, players }: {
  entries: Array<{ playerId: string; nickname: string; type: string; label: string; cards: any[]; effect: string; timestamp: number }>;
  emojiMessages: Array<{ playerId: string; emoji: string; timestamp: number }>;
  players: any[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timeline = [
    ...entries.map(e => ({ ...e, kind: 'action' as const })),
    ...emojiMessages.map(m => {
      const p = players.find((x: any) => x.id === m.playerId);
      return { playerId: m.playerId, nickname: p?.nickname || '?', kind: 'emoji' as const, emoji: m.emoji, timestamp: m.timestamp, label: '', cards: [], effect: '', type: '' };
    }),
  ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [timeline.length]);

  if (!timeline.length) return <div className="h-full flex items-center justify-center text-cream-muted/20 text-[10px]">回合记录</div>;
  return (
    <div ref={ref} className="h-full overflow-y-auto scrollbar-thin text-[10px] leading-relaxed">
      {timeline.slice(-30).map((e, i) => (
        <div key={i} className="px-1 py-0.5 border-b border-gold/5 last:border-0">
          {e.kind === 'emoji' ? (
            <span><span className="text-cream-muted/40">{e.nickname}</span> <span className="text-sm">{e.emoji}</span></span>
          ) : (
            <span>
              <span className="text-cream-muted/40">{e.nickname}</span>
              {e.cards?.length > 0 && e.cards.slice(0, 3).map((c: any, j: number) => (
                <span key={j} className={c?.color==='red'?'text-red-400':c?.color==='yellow'?'text-yellow-300':c?.color==='green'?'text-green-400':c?.color==='blue'?'text-blue-400':''}> {c?.type==='skip'?'🚫':c?.type==='reverse'?'🔄':c?.type?.startsWith('draw')?`+${c.type.replace('draw','')}`:c?.type==='wild'?'🌈':c?.value??'?'}</span>
              ))}
              {e.label && <span className="text-purple-300/70"> {e.label}</span>}
              {e.effect && <span className="text-cream-muted/50"> {e.effect}</span>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function NetworkDot() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const go = () => setOn(navigator.onLine);
    window.addEventListener('online', go); window.addEventListener('offline', go);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
  }, []);
  return <span className={`w-2 h-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} title={on ? '在线' : '离线'} />;
}

function actionEmoji(lastPlay: any): string {
  if (!lastPlay) return '';
  if (lastPlay.type === 'combo') return lastPlay.label?.includes('炸弹') ? '💣' : lastPlay.label?.includes('核弹') ? '☢️' : lastPlay.label?.includes('彩虹') ? '🌈' : lastPlay.label?.includes('顺子') ? '📐' : '🔥';
  if (lastPlay.type === 'draw') return '📥';
  if (lastPlay.type === 'uno') return '🚨';
  if (lastPlay.type === 'challenge') return '🔍';
  const c = lastPlay.cards?.[0];
  if (!c) return '';
  if (c.type === 'skip') return '🚫';
  if (c.type === 'reverse') return '🔄';
  if (c.type?.startsWith('draw')) return '😈';
  if (c.type === 'wild') return '🌈';
  return '';
}

function PlayerBlock({ player, isCurrent, penalty, lastPlay, emoji }: {
  player: { id: string; nickname: string; cardCount?: number; isAI?: boolean; status?: string; eliminated?: boolean; hasCalledUno?: boolean };
  isCurrent: boolean; penalty: number; lastPlay: any; emoji: string;
}) {
  if (!player) return null;
  const isFinished = player.status === 'finished';
  const act = actionEmoji(lastPlay);
  return (
    <div className={`w-[55px] text-center px-0.5 py-0.5 rounded border ${
      isCurrent ? 'bg-gold/20 border-gold/50' :
      isFinished ? 'bg-emerald-900/30 border-emerald-500/40' :
      player.eliminated ? 'bg-red-900/20 border-red-500/30 opacity-50' :
      'bg-felt-dark/40 border-gold/5'
    }`}>
      <div className="flex items-center justify-center gap-0.5">
        {isCurrent && <span className="w-1 h-1 bg-gold rounded-full flex-shrink-0" />}
        <span className={`text-[10px] font-medium truncate ${isCurrent ? 'text-gold-light' : 'text-cream-muted/80'}`}>{player.nickname}</span>
      </div>
      <div className="text-[9px] text-cream-muted/50 leading-tight flex items-center justify-center gap-0.5 flex-wrap">
        {isFinished ? '🏆' : player.eliminated ? '💀' : <>{player.cardCount ?? 0}张</>}
        {player.hasCalledUno && <span className="text-red-400 font-bold">UNO</span>}
        {penalty > 0 && <span className="text-red-400/70">😭{penalty}</span>}
        {act && <span>{act}</span>}
        {emoji && <span className="text-[11px] leading-none">{emoji}</span>}
      </div>
    </div>
  );
}

function PlayerRow({ players, currentPlayerId, penaltyStats, playerLastPlays, playerEmojis, onChallenge }: any) {
  if (!players.length) return null;
  return (
    <div className="flex justify-center gap-0.5 px-1 flex-shrink-0">
      {players.map((p: any) => (
        <div key={p.id} onClick={p.cardCount === 1 && !p.hasCalledUno && p.id !== currentPlayerId ? () => onChallenge(p.id) : undefined}
          className={p.cardCount === 1 && !p.hasCalledUno && p.id !== currentPlayerId ? 'cursor-pointer rounded border border-yellow-400/60' : ''}>
          <PlayerBlock player={p} isCurrent={p.id === currentPlayerId} penalty={penaltyStats[p.id] || 0} lastPlay={playerLastPlays[p.id]} emoji={playerEmojis[p.id]} />
        </div>
      ))}
    </div>
  );
}

function PlayerCol({ players, currentPlayerId, penaltyStats, playerLastPlays, playerEmojis, onChallenge }: any) {
  if (!players.length) return <div className="flex-shrink-0 w-[55px]" />;
  return (
    <div className="flex flex-col justify-center gap-0.5 flex-shrink-0 w-[55px]">
      {players.map((p: any) => (
        <div key={p.id} onClick={p.cardCount === 1 && !p.hasCalledUno && p.id !== currentPlayerId ? () => onChallenge(p.id) : undefined}
          className={p.cardCount === 1 && !p.hasCalledUno && p.id !== currentPlayerId ? 'cursor-pointer rounded border border-yellow-400/60' : ''}>
          <PlayerBlock player={p} isCurrent={p.id === currentPlayerId} penalty={penaltyStats[p.id] || 0} lastPlay={playerLastPlays[p.id]} emoji={playerEmojis[p.id]} />
        </div>
      ))}
    </div>
  );
}

function DiscardPile({ topCard }: { topCard?: CardType }) {
  return (
    <div className="w-[72px] h-[100px] flex items-center justify-center">
      {topCard ? (
        <Card card={topCard} size="md" disabled />
      ) : (
        <div className="w-full h-full bg-felt-dark/80 rounded-xl border-2 border-gold/20 flex items-center justify-center">
          <span className="text-gold/40 text-xl">🃏</span>
        </div>
      )}
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
    <div className="flex justify-center items-end gap-0.5 px-2 overflow-x-auto">
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

function RulesModal({ mode, onClose }: { mode: 'standard' | 'out'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="casino-card p-5 max-w-md w-full text-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gold-light text-lg font-bold">{mode === 'out' ? 'Out 大逃杀' : '经典 UNO'} 规则</h2>
          <button onClick={onClose} className="text-cream-muted/50 hover:text-cream">✕</button>
        </div>

        <div className="space-y-3 text-cream-muted/80 leading-relaxed">
          {/* 基础规则 */}
          <Section title="🎴 基础出牌">
            匹配 <b className="text-gold-light/80">颜色</b> 或 <b className="text-gold-light/80">数字</b> 相同的牌。
            <span className="text-purple-300">万能牌</span> (+4/+8/wild) 随时可出，出后选色。
          </Section>

          <Section title="😈 惩罚叠加">
            被 +2/+3/+4/+5/+8 后，可跟任意类型 + 牌累加传给下家，或出反转弹回给上家。
            不跟则摸相应张数。
          </Section>

          <Section title="🚨 UNO & 质疑">
            手牌 ≤2 张时可随时喊 UNO。剩 1 张没喊 UNO 的玩家可被他人<b className="text-yellow-300">质疑</b>（罚 2 张）。
          </Section>

          {mode === 'out' && (
            <>
              <Section title="📐 连打系统">
                <b>对子</b>：2 张同数字（无惩罚）<br/>
                <b>三条</b>：3 张同数字（无惩罚）<br/>
                <b>💣 炸弹</b>：4 张同数字 → 下家跳过+摸2<br/>
                <b>☢️ 核弹</b>：5 张同数字 → 全员摸3<br/>
                <b>🌈 彩虹</b>：4 色同数字 → 目标摸3<br/>
                <b>📐 顺子</b>：3+ 张同色连续 → 下家摸(N-2)张<br/>
                <span className="text-amber-300">惩罚期间连打=护盾：惩罚继续传下家</span>
              </Section>

              <Section title="⏱️ 阶段机制">
                <b>手牌上限 20</b>，超出即淘汰。<br/>
                Phase 1 (3分钟) 注入 +3 牌<br/>
                Phase 2 (6分钟) 注入 +5 牌<br/>
                Phase 3 (9分钟) 注入 +8 万能牌<br/>
                20 分钟全局超时，存活者胜。
              </Section>
            </>
          )}

          <Section title="⏭️ 功能牌">
            <b>🚫 跳过</b>：跳过下家回合<br/>
            <b>🔄 反转</b>：反转出牌方向<br/>
            <b>🎨 变色</b>：自选颜色<br/>
            <b>⏩ 抢出</b>：手牌与顶牌完全相同可抢出
          </Section>
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 bg-felt-dark/60 border border-gold/20 text-gold rounded-lg hover:border-gold/40 transition-all text-sm">
          知道了
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-gold-light/90 font-medium mb-0.5">{title}</div>
      <div className="text-cream-muted/70">{children}</div>
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

function ColorDot({ color }: { color: string }) {
  const map: Record<string, string> = { red: 'bg-uno-red', yellow: 'bg-uno-yellow', green: 'bg-uno-green', blue: 'bg-uno-blue' };
  return <div className="flex justify-center"><div className={`w-4 h-4 rounded-full ${map[color] || 'bg-slate-600'} border border-white/20 shadow-sm`} /></div>;
}

const EMOJI_LIST = ['😂','🤣','💀','🤡','😭','😈','👁️','🫠','🤌','🗿','🍵','🥱','🙏','🫡','🤯','🪿','🎭','🦧','🐉','💩','👻','🤖','👾','🎲'];

function EmojiBar({ onSend }: { onSend: (emoji: string) => void }) {
  return (
    <div className="flex-shrink-0 overflow-x-auto scrollbar-thin border-t border-gold/5 bg-felt-dark/60">
      <div className="flex gap-1 px-2 py-1 min-w-max justify-center">
        {EMOJI_LIST.map(e => (
          <button key={e} onClick={() => onSend(e)}
            className="text-lg hover:scale-125 active:scale-90 transition-transform flex-shrink-0 p-0.5"
          >{e}</button>
        ))}
      </div>
    </div>
  );
}


import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ArrowRight, Volume2, VolumeX, LogOut, Trophy, Ban } from 'lucide-react';
import { Card, ColorPicker } from '../components/Card';
import { OutStatus, ComboSelector, TargetSelector } from '../components/game';
import { useGameMode } from '../core/hooks/useGameMode';
import type { Room, GameState, Card as CardType, Player, ChatMessage } from '../../../shared/types';

interface GameProps {
  room: Room;
  gameState: GameState;
  currentPlayerId: string;
  onPlayCard: (cardId: string, chosenColor?: string) => void;
  onPlayCombo?: (comboType: 'pair' | 'three' | 'rainbow' | 'straight', cardIds: string[], targetId?: string) => void;
  onDrawCard: () => void;
  onCallUno: () => void;
  onChallengeUno?: (targetId: string) => void;
  onJumpIn?: (cardId: string) => void;
  onLeaveGame: () => void;
  onSendEmoji?: (emoji: string) => void;
  onToggleHost?: (enabled: boolean) => void;
  chatMessages?: ChatMessage[];
}

export function Game({ 
  room, 
  gameState, 
  currentPlayerId, 
  onPlayCard, 
  onPlayCombo,
  onDrawCard, 
  onCallUno,
  onChallengeUno,
  onJumpIn,
  onLeaveGame,
  onSendEmoji,
  onToggleHost,
  chatMessages = []
}: GameProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // 默认使用智能排序
  const [skipNotification, setSkipNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const lastSkippedIdRef = useRef<string | null>(null); // 防止重复显示跳过提示
  
  // 使用useGameMode Hook获取游戏模式相关状态和逻辑
  const { isOutMode, availableCombos, outCountdown } = useGameMode(room, gameState);
  
  // 回合倒计时（动态计算）
  const [turnCountdown, setTurnCountdown] = useState<number>(gameState.turnTimer);
  
  // 连打相关状态
  const [selectedComboCards, setSelectedComboCards] = useState<string[]>([]);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [pendingComboType, setPendingComboType] = useState<'pair' | 'three' | 'rainbow' | 'straight' | null>(null);
  
  const currentPlayer = gameState.players?.find(p => p.id === currentPlayerId) || room.players.find(p => p.id === currentPlayerId);
  const isMyTurn = gameState.currentPlayerId === currentPlayerId;
  
  // 托管状态
  const [isHosting, setIsHosting] = useState(currentPlayer?.isAI || false);
  
  // 同步托管状态（当gameState更新时）
  useEffect(() => {
    setIsHosting(currentPlayer?.isAI || false);
  }, [currentPlayer?.isAI]);
  
  // 更新回合倒计时
  useEffect(() => {
    const updateTurnCountdown = () => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const remaining = Math.max(0, gameState.turnTimer - elapsed);
      setTurnCountdown(remaining);
    };
    
    updateTurnCountdown();
    const timer = setInterval(updateTurnCountdown, 1000);
    return () => clearInterval(timer);
  }, [gameState.turnStartTime, gameState.turnTimer]);
  
  // Out倒计时现在由useGameMode Hook提供
  
  // 当回合切换或游戏状态重置时，清除选择状态
  useEffect(() => {
    // 回合切换到其他玩家时，清除自己的选择
    if (!isMyTurn) {
      setSelectedCard(null);
      setSelectedComboCards([]);
    }
    // 游戏重新开始时，重置所有状态
    if (gameState.isRoundEnded) {
      setSelectedCard(null);
      setSelectedComboCards([]);
      setPendingCard(null);
      setShowColorPicker(false);
    }
  }, [isMyTurn, gameState.isRoundEnded]);
  
  // 获取其他玩家（按顺序）- 优先从 gameState 获取
  const allPlayers = gameState.players || room.players;
  const otherPlayers = useMemo(() => {
    const currentIndex = allPlayers.findIndex(p => p.id === currentPlayerId);
    const ordered = [];
    for (let i = 1; i < allPlayers.length; i++) {
      const idx = (currentIndex + i) % allPlayers.length;
      ordered.push(allPlayers[idx]);
    }
    return ordered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.players, room.players, currentPlayerId]);

  // 获取顶部卡牌
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  // 计算可出牌
  const playableCards = useMemo(() => {
    // 必须是自己回合且玩家存在
    if (!isMyTurn || !currentPlayer) return new Set<string>();
    
    // 如果被跳过，不能出牌
    if (gameState.skippedPlayerId === currentPlayerId) return new Set<string>();
    
    // 记录日志帮助调试 - 始终输出到帮助排查
    console.log('[playableCards] 计算可出牌:', {
      currentPlayerId,
      isMyTurn,
      cardCount: currentPlayer.cards.length,
      currentColor: gameState.currentColor,
      topCard: topCard ? { type: topCard.type, color: topCard.color, value: topCard.value, valueType: typeof topCard.value } : null,
      skippedPlayerId: gameState.skippedPlayerId,
      pendingDraw: gameState.pendingDraw,
      myCards: currentPlayer.cards.map(c => ({ id: c.id, type: c.type, color: c.color, value: c.value, valueType: typeof c.value }))
    });
    
    const result = new Set<string>();
    
    for (const card of currentPlayer.cards) {
      let canPlay = false;
      let reason = '';
      
      // 连打规则：如果有待摸牌惩罚，只能出相同类型的+2或+4
      if (gameState.pendingDraw && gameState.pendingDraw > 0) {
        if (gameState.pendingDrawType === 'draw2' && card.type === 'draw2') {
          canPlay = true;
          reason = 'draw2 stack';
        } else if (gameState.pendingDrawType === 'draw4' && card.type === 'draw4') {
          canPlay = true;
          reason = 'draw4 stack';
        }
      } else {
        // 正常出牌规则
        if (card.type === 'wild' || card.type === 'draw4') {
          canPlay = true;
          reason = 'wild card';
        } else if (card.color === gameState.currentColor) {
          canPlay = true;
          reason = `color match (${card.color} === ${gameState.currentColor})`;
        } else if (topCard && card.value === topCard.value) {
          canPlay = true;
          reason = `value match (${card.value} === ${topCard.value})`;
        }
      }
      
      if (canPlay) {
        result.add(card.id);
        console.log(`[playableCards] 可出: ${card.color} ${card.type} ${card.value} - ${reason}`);
      }
    }
    
    return result;
  }, [currentPlayer, currentPlayer?.cards.length, gameState.currentColor, gameState.pendingDraw, gameState.pendingDrawType, topCard, isMyTurn, gameState.skippedPlayerId, currentPlayerId]);

  // 计算可抢牌出的牌（不是自己的回合，且手中有与顶牌完全相同的牌）
  const jumpInCards = useMemo(() => {
    if (!currentPlayer || isMyTurn || !room.settings.allowJumpIn || !topCard) return new Set<string>();
    
    return new Set(
      currentPlayer.cards.filter(card => {
        // 万能牌不能抢
        if (card.type === 'wild' || card.type === 'draw4') return false;
        // 必须和顶牌完全相同（颜色、类型、数值都相同）
        return card.color === topCard.color && 
               card.type === topCard.type && 
               card.value === topCard.value;
      }).map(c => c.id)
    );
  }, [currentPlayer, isMyTurn, room.settings.allowJumpIn, topCard]);
  
  // 计算是否应该显示"无牌可出"提示
  const shouldShowNoCardHint = useMemo(() => {
    const shouldShow = isMyTurn && 
      currentPlayer && 
      currentPlayer.cards.length > 0 && 
      playableCards.size === 0 && 
      !gameState.pendingDraw && 
      gameState.skippedPlayerId !== currentPlayerId;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[shouldShowNoCardHint]', {
        shouldShow,
        isMyTurn,
        hasCurrentPlayer: !!currentPlayer,
        cardCount: currentPlayer?.cards.length,
        playableCardsSize: playableCards.size,
        pendingDraw: gameState.pendingDraw,
        skippedPlayerId: gameState.skippedPlayerId,
        currentPlayerId
      });
    }
    
    return shouldShow;
  }, [isMyTurn, currentPlayer, playableCards.size, gameState.pendingDraw, gameState.skippedPlayerId, currentPlayerId]);

  // 智能排序手牌（可出牌在前）
  const sortedHand = useMemo(() => {
    if (!currentPlayer) return [];
    
    const hand = [...currentPlayer.cards];
    const colorOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
    
    return hand.sort((a, b) => {
      // 可出牌在前
      const aPlayable = playableCards.has(a.id) ? 0 : 1;
      const bPlayable = playableCards.has(b.id) ? 0 : 1;
      if (aPlayable !== bPlayable) return aPlayable - bPlayable;
      
      // 按颜色分组
      return colorOrder[a.color]! - colorOrder[b.color]!;
    });
  }, [currentPlayer, playableCards]);

  // 连打组合现在由useGameMode Hook提供
  
  // 根据当前选中的牌，找出可以组成的连打
  const matchedCombo = useMemo(() => {
    if (selectedComboCards.length < 2) return null;
    
    // 查找完全匹配的组合（牌数相同且所有牌都在选中列表中）
    return availableCombos.find(c => 
      c.cardIds.length === selectedComboCards.length &&
      c.cardIds.every(id => selectedComboCards.includes(id))
    );
  }, [availableCombos, selectedComboCards]);
  
  // 计算可以继续选择的牌（用于连打提示）
  const suggestedComboCards = useMemo(() => {
    if (selectedComboCards.length === 0) return new Set<string>();
    if (matchedCombo) return new Set<string>(); // 已完成匹配，不需要提示
    
    const suggestions = new Set<string>();
    
    // 查找包含已选牌的部分匹配组合
    for (const combo of availableCombos) {
      const hasSelectedCard = combo.cardIds.some(id => selectedComboCards.includes(id));
      if (hasSelectedCard) {
        // 如果组合中还有其他未选中的牌，提示它们
        for (const id of combo.cardIds) {
          if (!selectedComboCards.includes(id)) {
            suggestions.add(id);
          }
        }
      }
    }
    
    return suggestions;
  }, [availableCombos, selectedComboCards, matchedCombo]);

  // 检查是否需要喊UNO（出牌后只剩1张牌时立即显示）
  useEffect(() => {
    // 只要手牌为1张且还没喊UNO，就显示按钮（不管是不是当前回合）
    if (currentPlayer && currentPlayer.cardCount === 1 && !currentPlayer.hasCalledUno) {

    } else {

    }
  }, [currentPlayer?.cardCount, currentPlayer?.hasCalledUno]);

  // 检测被跳过提示 - 轮到自己出牌时自动消除
  useEffect(() => {
    // 被跳过时显示提示
    if (gameState.skippedPlayerId === currentPlayerId && lastSkippedIdRef.current !== gameState.skippedPlayerId) {
      lastSkippedIdRef.current = gameState.skippedPlayerId;
      setSkipNotification({ show: true, message: '🚫 你被跳过了！' });
    }
    
    // 当 skippedPlayerId 被清除时（undefined），也清除提示
    if (!gameState.skippedPlayerId && skipNotification.show) {
      setSkipNotification({ show: false, message: '' });
      lastSkippedIdRef.current = null;
    }
    
    // 轮到自己出牌时自动消除提示
    if (isMyTurn && skipNotification.show) {
      setSkipNotification({ show: false, message: '' });
      lastSkippedIdRef.current = null;
    }
  }, [gameState.skippedPlayerId, currentPlayerId, isMyTurn, skipNotification.show]);

  // 处理卡牌点击（选中/取消选中）
  const handleCardClick = (card: CardType) => {
    // 抢牌出逻辑：不是自己的回合，但有可抢的牌
    if (!isMyTurn && jumpInCards.has(card.id) && onJumpIn) {
      onJumpIn(card.id);
      setSelectedCard(null);
      setSelectedComboCards([]);
      return;
    }
    
    // 只能选可出的牌
    if (!isMyTurn || !playableCards.has(card.id)) return;
    
    // Out模式：支持多选（连打），但只能选数字牌
    if (isOutMode && card.type === 'number') {
      setSelectedComboCards(prev => {
        if (prev.includes(card.id)) {
          // 取消选中
          const newSelection = prev.filter(id => id !== card.id);
          // 同步更新selectedCard
          setSelectedCard(newSelection.length > 0 ? newSelection[newSelection.length - 1] : null);
          return newSelection;
        }
        // 添加到选中
        const newSelection = [...prev, card.id];
        setSelectedCard(card.id);
        return newSelection;
      });
      return;
    }
    
    // 非数字牌或标准模式：单选，清空连打选择
    if (selectedCard === card.id) {
      setSelectedCard(null);
      setSelectedComboCards([]);
    } else {
      setSelectedCard(card.id);
      setSelectedComboCards([]);
    }
  };
  
  // 执行出牌（点击出牌按钮）
  const handlePlayButton = () => {
    console.log('[handlePlayButton] 点击出牌按钮:', {
      selectedCard,
      selectedComboCards,
      isOutMode,
      matchedCombo: matchedCombo?.type,
      playableCards: Array.from(playableCards),
      hasPlayable: selectedCard ? playableCards.has(selectedCard) : false
    });
    
    // 处理连打出牌（Out模式）- 优先检查是否组成了有效连打
    if (isOutMode && matchedCombo) {
      console.log('[handlePlayButton] 执行连打:', matchedCombo.type);
      executeCombo(matchedCombo.type as 'pair' | 'three' | 'rainbow' | 'straight');
      return;
    }
    
    // 如果选了多张牌但没有组成连打，显示提示
    if (isOutMode && selectedComboCards.length >= 2) {
      console.log('[handlePlayButton] 未组成有效连打');
      // 不执行任何操作，UI会显示"无法组成连打"提示
      return;
    }
    
    // 处理单张出牌
    const cardId = selectedCard;
    if (!cardId) {
      console.log('[handlePlayButton] 未选择卡牌');
      return;
    }
    
    if (!playableCards.has(cardId)) {
      console.log('[handlePlayButton] 卡牌不可出:', cardId);
      return;
    }
    
    const card = currentPlayer?.cards.find(c => c.id === cardId);
    if (!card) {
      console.log('[handlePlayButton] 找不到卡牌:', cardId);
      return;
    }
    
    console.log('[handlePlayButton] 出牌:', { id: card.id, color: card.color, type: card.type, value: card.value });
    
    // 万能牌需要选颜色
    if (card.type === 'wild' || card.type === 'draw4') {
      setPendingCard(cardId);
      setShowColorPicker(true);
      return;
    }
    
    // 普通牌直接出
    onPlayCard(cardId);
    setSelectedCard(null);
    setSelectedComboCards([]);
  };
  
  // 执行连打
  const executeCombo = (comboType: 'pair' | 'three' | 'rainbow' | 'straight') => {
    if (!onPlayCombo || !matchedCombo) return;
    
    // 彩虹需要选择目标
    if (comboType === 'rainbow') {
      setPendingComboType('rainbow');
      setShowTargetSelector(true);
      return;
    }
    
    onPlayCombo(comboType, matchedCombo.cardIds);
    setSelectedComboCards([]);
    setSelectedCard(null);
  };
  
  // 选择彩虹目标
  const handleTargetSelect = (targetId: string) => {
    if (pendingComboType === 'rainbow' && onPlayCombo && matchedCombo) {
      onPlayCombo('rainbow', matchedCombo.cardIds, targetId);
      setSelectedComboCards([]);
      setSelectedCard(null);
      setPendingComboType(null);
      setShowTargetSelector(false);
    }
  };

  // 处理颜色选择
  const handleColorSelect = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    if (pendingCard) {
      onPlayCard(pendingCard, color);
      setPendingCard(null);
      setShowColorPicker(false);
      setSelectedCard(null);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取当前玩家信息
  const activePlayer = (gameState.players || room.players).find((p: Player) => p.id === gameState.currentPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">房间 {room.code}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm">{room.players.length}人</span>
          </div>
          
          {/* 排名显示 */}
          {gameState.rankings && gameState.rankings.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <div className="flex items-center gap-1">
                {gameState.rankings.map((playerId, index) => {
                  const rankedPlayer = room.players.find(p => p.id === playerId);
                  return (
                    <span key={playerId} className={`text-xs font-medium ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-slate-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-slate-400'
                    }`}>
                      #{index + 1} {rankedPlayer?.nickname || '未知'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* 倒计时 */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${
            turnCountdown <= 10 
              ? 'bg-red-500/20 text-red-400 animate-pulse' 
              : turnCountdown <= 30 
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-slate-800 text-slate-300'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(turnCountdown)}
          </div>
          
          {/* Out模式状态栏 */}
          {isOutMode && gameState.outState && (
            <OutStatus
              phase={gameState.outState.phase}
              countdown={outCountdown}
              maxCards={gameState.outState.maxCards}
            />
          )}

          {/* 方向指示 - 更明显的版本 */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            gameState.direction === 'clockwise' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
          }`}>
            <motion.div
              animate={{ rotate: gameState.direction === 'clockwise' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
            <span className="text-sm">
              {gameState.direction === 'clockwise' ? '顺时针 ↻' : '逆时针 ↺'}
            </span>
          </div>

          {/* 音量控制 */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* 托管按钮（移到顶部栏） */}
          <button 
            onClick={() => {
              const newState = !isHosting;
              setIsHosting(newState);
              onToggleHost?.(newState);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isHosting
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title={isHosting ? '关闭托管模式' : '开启托管模式'}
          >
            {isHosting ? '🤖' : '托管'}
          </button>

          {/* 离开按钮 */}
          <button 
            onClick={onLeaveGame}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 其他玩家区域 - 支持横向滚动 */}
      <div className="flex justify-start items-center gap-3 py-4 px-4 overflow-x-auto scrollbar-hide">
        {otherPlayers.map((player) => {
          const canChallenge = player.cardCount === 1 && !player.hasCalledUno && !player.eliminated;
          const isFinished = player.cardCount === 0 && !player.eliminated; // 已出完牌
          const isEliminated = player.eliminated; // 被淘汰
          // 获取该玩家最新的表情消息
          const playerEmoji = chatMessages
            .filter(msg => msg.playerId === player.id)
            .slice(-1)[0];
          return (
            <motion.div 
              key={player.id}
              onClick={() => canChallenge && onChallengeUno?.(player.id)}
              className="relative flex flex-col items-center"
            >
              {/* 表情显示 - 在头像右侧 */}
              <AnimatePresence>
                {playerEmoji && (
                  <motion.div
                    key={playerEmoji.timestamp}
                    initial={{ opacity: 0, x: -10, scale: 0.5 }}
                    animate={{ opacity: 1, x: 0, scale: 1.2 }}
                    exit={{ opacity: 0, x: 10, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-14 top-1/2 -translate-y-1/2 z-30"
                  >
                    <span className="text-3xl drop-shadow-lg filter">{playerEmoji.content}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div 
                className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all flex-shrink-0 ${
                  isEliminated
                    ? 'bg-gray-800/50 border-gray-600 opacity-60'
                    : isFinished
                      ? 'bg-yellow-600/20 border-yellow-500 shadow-lg shadow-yellow-500/20'
                      : player.id === gameState.currentPlayerId
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 animate-pulse'
                        : 'bg-slate-800/50 border-slate-700/50'
                } ${canChallenge ? 'border-red-500 ring-2 ring-red-500/50 cursor-pointer hover:bg-red-900/20' : ''}`}
                title={canChallenge ? '点击质疑！' : isFinished ? '已获胜！' : isEliminated ? '已淘汰' : ''}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  isEliminated
                    ? 'bg-gray-700 text-gray-500'
                    : isFinished
                      ? 'bg-yellow-500/30 text-yellow-400'
                      : player.isAI
                        ? 'bg-purple-600/30 text-purple-400'
                        : 'bg-slate-700'
                }`}>
                  {isEliminated ? '💀' : isFinished ? '👑' : player.isAI ? '🤖' : player.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium truncate max-w-[70px] sm:max-w-[80px] ${isEliminated ? 'text-gray-500' : ''}`}>{player.nickname}</div>
                  <div className={`text-xs ${canChallenge ? 'text-red-400 font-bold animate-pulse' : isFinished ? 'text-yellow-400 font-bold' : isEliminated ? 'text-gray-500' : 'text-slate-400'}`}>
                    {isEliminated ? '💀 淘汰' : isFinished ? '✨ 获胜' : `${player.cardCount}张${player.cardCount === 1 && player.hasCalledUno ? ' ✓UNO' : ''}`}
                  </div>
                </div>
                {player.id === gameState.currentPlayerId && !isFinished && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">
                    ▶
                  </div>
                )}
                {/* 质疑提示 */}
                {canChallenge && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg animate-bounce">
                    质疑!
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* 游戏区域 */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="flex items-center gap-12">
          {/* 牌堆 - 可点击摸牌 */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onDrawCard}
              disabled={!isMyTurn}
              className={`relative transition-all ${
                isMyTurn ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-70'
              }`}
            >
              <div className="w-28 h-40 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 shadow-lg flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded border-2 border-slate-600/50 flex items-center justify-center">
                  <span className="text-2xl">🎴</span>
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400">
                {gameState.deck.length}张
              </div>
            </button>
            {isMyTurn && (
              <span className={`text-lg font-bold animate-pulse px-3 py-1 rounded-full ${
                gameState.pendingDraw && gameState.pendingDraw > 0
                  ? 'text-red-400 bg-red-900/30'
                  : 'text-blue-400 bg-blue-900/30'
              }`}>
                👆 点击摸 {gameState.pendingDraw && gameState.pendingDraw > 0 ? gameState.pendingDraw : ''} 牌
              </span>
            )}
          </div>

          {/* 当前颜色指示 */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">当前颜色:</span>
              <div className={`w-8 h-8 rounded-full border-2 border-white/20 ${
                gameState.currentColor === 'red' ? 'bg-red-500' :
                gameState.currentColor === 'yellow' ? 'bg-yellow-400' :
                gameState.currentColor === 'green' ? 'bg-green-500' :
                gameState.currentColor === 'blue' ? 'bg-blue-500' :
                'bg-slate-600'
              }`} />
            </div>
            
            {/* 连打惩罚提示 */}
            {gameState.pendingDraw && gameState.pendingDraw > 0 && (
              <div className={`px-4 py-2 rounded-lg font-bold animate-pulse ${
                gameState.pendingDrawType === 'draw2' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
              }`}>
                ⚠️ 累积 +{gameState.pendingDraw} 张
                {isMyTurn && (
                  <span className="ml-2 text-xs">
                    ({gameState.pendingDrawType === 'draw2' ? '+2' : '+4'} 可叠加)
                  </span>
                )}
              </div>
            )}
            
            {/* 弃牌堆 */}
            <div className="relative">
              {topCard && <Card card={topCard} size="lg" />}
            </div>

            {/* 当前玩家提示 */}
            <div className="text-center">
              <span className="text-sm text-slate-400">
                {activePlayer?.id === currentPlayerId ? '你的回合' : `${activePlayer?.nickname}的回合`}
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* 手牌区域 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50">
        {/* Out警告 - 手牌接近上限时显示 */}
        {gameState.outState && gameState.outState.phase > 0 && currentPlayer && !currentPlayer.eliminated && currentPlayer.cards.length >= gameState.outState.maxCards && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-600/50 animate-pulse z-30">
            ⚠️ 手牌{currentPlayer.cards.length}张！上限{gameState.outState.maxCards}张，再摸牌将被淘汰！
          </div>
        )}
        
        {/* 当前玩家表情显示 - 在手牌中央上方 */}
        {(() => {
          const myEmoji = chatMessages
            .filter(msg => msg.playerId === currentPlayerId)
            .slice(-1)[0];
          return (
            <AnimatePresence>
              {myEmoji && (
                <motion.div
                  key={myEmoji.timestamp}
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1.5 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-30"
                >
                  <span className="text-4xl drop-shadow-lg filter">{myEmoji.content}</span>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })()}
        
        {/* 工具栏 - Emoji 区域 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
          {/* 更多 Emoji - 横向滚动 */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
            {['😎', '🔥', '🤡', '👻', '💩', '🤮', '🙄', '🤔', '😭', '😡', '😂', '🎲', '🐸', '🍌', '⚡', '💀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendEmoji?.(emoji)}
                className="text-xl p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* 手牌数量 */}
          <div className="text-sm text-slate-400 flex-shrink-0 ml-2">
            {currentPlayer?.cardCount || 0}张
            {playableCards.size > 0 && (
              <span className="ml-1 text-green-400">({playableCards.size}可出)</span>
            )}
            {isOutMode && selectedComboCards.length > 0 && (
              <span className="ml-1 text-blue-400">(已选{selectedComboCards.length}张)</span>
            )}
          </div>
          
          {/* 连打区域（Out模式） */}
          {isOutMode && isMyTurn && (
            <div className="ml-4">
              <ComboSelector
                combos={availableCombos}
                selectedCards={selectedComboCards}
                matchedCombo={matchedCombo}
                onExecuteCombo={() => matchedCombo && executeCombo(matchedCombo.type as 'pair' | 'three' | 'rainbow' | 'straight')}
                onCancel={() => {
                  setSelectedComboCards([]);
                  setSelectedCard(null);
                }}
              />
            </div>
          )}
        </div>

        {/* 聊天消息已改为在玩家头像附近显示 */}

        {/* 被跳过提示 - 移到顶部中央 */}
        <AnimatePresence>
          {skipNotification.show && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-lg shadow-lg shadow-red-500/20">
                <Ban className="w-6 h-6 text-red-400" />
                <span className="text-xl font-bold text-red-400">{skipNotification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 无牌可出提示 - 使用useMemo确保正确更新 */}
        {shouldShowNoCardHint && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[280px] z-30">
            <div className="inline-block px-4 py-2 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg animate-pulse">
              <span className="text-lg font-bold text-yellow-400">👆 无牌可出，点击牌堆摸牌</span>
            </div>
          </div>
        )}

        {/* 手牌 */}
        <div className="flex items-end justify-center gap-2 py-4 px-4 overflow-x-auto">
          {sortedHand.map((card) => {
            const isPlayable = playableCards.has(card.id);
            const canJumpIn = jumpInCards.has(card.id);
            const isSelected = selectedCard === card.id;
            // Out模式连打选择
            const isComboSelected = isOutMode && selectedComboCards.includes(card.id);
            // 连打提示：已选一些牌，这张牌可以与之组成连打
            const isComboHint = isOutMode && 
              selectedComboCards.length > 0 && 
              suggestedComboCards.has(card.id) &&
              !isComboSelected;
            
            return (
              <div
                onClick={() => handleCardClick(card)}
                className={`
                  relative flex-shrink-0 transition-all duration-200
                  ${isSelected || isComboSelected ? 'z-10 -translate-y-3' : isComboHint ? 'z-5 -translate-y-1' : 'z-0'}
                  ${!isPlayable && !canJumpIn ? 'opacity-50 brightness-75' : 'cursor-pointer'}
                `}
              >
                {/* 选择标记 */}
                {(isSelected || isComboSelected) && (
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 border-2 border-white flex items-center justify-center z-20">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
                {/* 连打提示标记 */}
                {isComboHint && (
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-purple-500/70 rounded-full shadow-lg border border-white/50 flex items-center justify-center z-15">
                    <span className="text-white text-[10px]">+</span>
                  </div>
                )}
                {/* 连打提示发光效果 */}
                {isComboHint && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-purple-500/50 ring-offset-2 ring-offset-slate-900 animate-pulse pointer-events-none" />
                )}
                <Card
                  card={card}
                  size="md"
                  isSelected={isSelected || isComboSelected}
                  isPlayable={(isPlayable && isMyTurn) || canJumpIn}
                  disabled={!isPlayable && !canJumpIn}
                />
                {/* 可出牌标记（自己回合） */}
                {isPlayable && isMyTurn && !isOutMode && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full animate-pulse shadow-lg border-2 border-white ${
                    gameState.pendingDraw && (card.type === 'draw2' || card.type === 'draw4') ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'
                  }`} />
                )}
                {/* 抢牌出标记（非自己回合） */}
                {canJumpIn && !isMyTurn && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full animate-pulse shadow-lg shadow-yellow-500/50 border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">抢</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 操作按钮 - 只有UNO按钮 */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <button
            onClick={() => {
              onCallUno();

            }}
            disabled={currentPlayer?.cardCount !== 1}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
              currentPlayer?.cardCount === 1
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 animate-pulse border-2 border-yellow-400'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            UNO!
          </button>
          {/* 出牌按钮 */}
          <button
            onClick={handlePlayButton}
            disabled={!selectedCard || (isOutMode && selectedComboCards.length >= 2 && !matchedCombo)}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
              // 无效连打状态 - 红色警告
              isOutMode && selectedComboCards.length >= 2 && !matchedCombo
                ? 'bg-red-600/50 text-red-200 cursor-not-allowed border-2 border-red-500 animate-pulse'
                // 正常可出牌状态
                : selectedCard
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/25'
                  // 未选择卡牌状态
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isOutMode && selectedComboCards.length >= 2 && !matchedCombo
              ? '❌ 无法组成连打'
              : selectedComboCards.length >= 2 
                ? `出${selectedComboCards.length}张`
                : selectedCard 
                  ? '出牌' 
                  : '选择卡牌'}
          </button>
        </div>
      </div>

      {/* 颜色选择器 */}
      <AnimatePresence>
        {showColorPicker && (
          <ColorPicker
            onSelect={handleColorSelect}
            onCancel={() => {
              setShowColorPicker(false);
              setPendingCard(null);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* 彩虹目标选择弹窗 */}
      <AnimatePresence>
        {showTargetSelector && (
          <TargetSelector
            players={gameState.players || room.players}
            currentPlayerId={currentPlayerId}
            onSelect={handleTargetSelect}
            onCancel={() => setShowTargetSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

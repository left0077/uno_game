/**
 * GameV2 - V2 架构游戏页面
 * 
 * 简化版游戏界面，用于测试 V2 API
 */

import React, { useState, useEffect } from 'react';
import { useGameActions } from '../hooks/useGameActions';
import './Game.css';

interface GameProps {
  socket: {
    isConnected: boolean;
    error: string | null;
    clearError: () => void;
    gameState: any;
    myHand: any[];
    isMyTurn: boolean;
    startGame: (roomCode: string, mode: 'standard' | 'out') => void;
    getAvailableActions: (roomCode: string) => void;
  };
}

export default function Game({ socket }: GameProps) {
  const [roomCode, setRoomCode] = useState<string>('');
  const nickname = localStorage.getItem('uno-nickname') || '玩家';
  
  // 从 localStorage 获取房间代码
  useEffect(() => {
    const savedRoom = localStorage.getItem('uno-current-room');
    if (savedRoom) {
      const room = JSON.parse(savedRoom);
      setRoomCode(room.code);
    }
  }, []);
  
  // 使用从 App.tsx 传递的 socket
  const {
    isConnected,
    error,
    clearError,
    gameState,
    myHand,
    isMyTurn,
    startGame,
    getAvailableActions,
  } = socket;

  // 游戏动作
  const {
    playCard,
    playCombo,
    drawCard,
    callUno,
    canPlayCard,
    requiresColor,
    availableActions,
  } = useGameActions({ roomCode: roomCode || '' });

  // 本地状态
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedComboType, setSelectedComboType] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCardId, setPendingCardId] = useState<string>('');

  // 定期刷新可用动作
  useEffect(() => {
    if (!roomCode || !gameState) return;
    
    const interval = setInterval(() => {
      getAvailableActions(roomCode);
    }, 1000);

    return () => clearInterval(interval);
  }, [roomCode, gameState, getAvailableActions]);

  // 处理出牌
  const handlePlayCard = (cardId: string) => {
    if (requiresColor(cardId)) {
      setPendingCardId(cardId);
      setShowColorPicker(true);
      return;
    }
    
    playCard(cardId);
  };

  // 处理选色后出牌
  const handleColorSelect = (color: string) => {
    setShowColorPicker(false);
    if (pendingCardId) {
      playCard(pendingCardId, color);
      setPendingCardId('');
    }
  };

  // 处理连打选择
  const handleCardSelect = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(prev => prev.filter(id => id !== cardId));
    } else {
      setSelectedCards(prev => [...prev, cardId]);
    }
  };

  // 执行连打
  const handlePlayCombo = () => {
    if (selectedCards.length < 2 || !selectedComboType) return;
    
    playCombo(selectedCards, selectedComboType as any);
    setSelectedCards([]);
    setSelectedComboType('');
  };

  // 获取玩家状态颜色
  const getPlayerStatusColor = (player: any) => {
    if (player.eliminated) return '#ff4444';
    if (player.status === 'finished') return '#44ff44';
    if (gameState?.currentPlayerId === player.id) return '#ffff44';
    return '#ffffff';
  };

  if (!isConnected) {
    return (
      <div className="game-v2 loading">
        <div className="loading-spinner">连接中...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-v2 lobby">
        <h1>房间: {roomCode}</h1>
        <p>等待游戏开始...</p>
        <button 
          className="start-btn"
          onClick={() => roomCode && startGame(roomCode, 'out')}
        >
          开始 Out 模式 (V2)
        </button>
      </div>
    );
  }

  return (
    <div className="game-v2">
      {/* 顶部信息栏 */}
      <div className="top-bar">
        <div className="room-info">
          <span>房间: {roomCode}</span>
          <span className="version-badge">V2 Out模式</span>
          <span className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? '你的回合!' : '等待对手...'}
          </span>
        </div>
        
        {gameState.outState && (
          <div className="out-info">
            <span>阶段: {gameState.outState.phase}</span>
            <span>手牌上限: {gameState.outState.maxCards}</span>
          </div>
        )}
        
        <div className="deck-info">
          <span>牌堆: {gameState.deckCount}张</span>
          {gameState.pendingDraw > 0 && (
            <span className="pending-draw">
              待摸: +{gameState.pendingDraw}
            </span>
          )}
        </div>
      </div>

      {/* 游戏区域 */}
      <div className="game-area">
        {/* 玩家列表 */}
        <div className="players-list">
          {gameState.players.map((player, index) => (
            <div 
              key={player.id}
              className={`player-item ${player.id === gameState.currentPlayerId ? 'current' : ''}`}
              style={{ borderColor: getPlayerStatusColor(player) }}
            >
              <div className="player-name">
                {index + 1}. {player.nickname}
                {player.isAI && <span className="ai-badge">AI</span>}
              </div>
              <div className="player-cards">{player.cardCount}张</div>
              {player.hasCalledUno && <span className="uno-badge">UNO!</span>}
              {player.eliminated && <span className="eliminated">已淘汰</span>}
            </div>
          ))}
        </div>

        {/* 桌面 */}
        <div className="table-area">
          <div className="top-card">
            {gameState.topCard ? (
              <div 
                className="card"
                style={{ 
                  backgroundColor: gameState.currentColor,
                  color: ['yellow', 'white'].includes(gameState.currentColor) ? '#000' : '#fff'
                }}
              >
                <div className="card-value">{gameState.topCard.value}</div>
                <div className="card-type">{gameState.topCard.type}</div>
              </div>
            ) : (
              <div className="empty-pile">弃牌堆</div>
            )}
          </div>

          {/* 动作按钮 */}
          <div className="action-buttons">
            <button 
              className="action-btn draw-btn"
              onClick={drawCard}
              disabled={!isMyTurn}
            >
              摸牌
            </button>
            
            <button 
              className="action-btn uno-btn"
              onClick={callUno}
              disabled={!isMyTurn || myHand.length > 2}
            >
              UNO!
            </button>

            {selectedCards.length >= 2 && (
              <button 
                className="action-btn combo-btn"
                onClick={handlePlayCombo}
              >
                连打 ({selectedCards.length}张)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 连打类型选择 */}
      {selectedCards.length >= 2 && (
        <div className="combo-type-selector">
          <span>连打类型:</span>
          {['pair', 'three', 'rainbow', 'straight'].map(type => (
            <button
              key={type}
              className={selectedComboType === type ? 'active' : ''}
              onClick={() => setSelectedComboType(type)}
            >
              {type === 'pair' && '对子'}
              {type === 'three' && '三连'}
              {type === 'rainbow' && '彩虹'}
              {type === 'straight' && '顺子'}
            </button>
          ))}
        </div>
      )}

      {/* 手牌区域 */}
      <div className="hand-area">
        <h3>我的手牌 ({myHand.length}张)</h3>
        <div className="cards-container">
          {myHand.map(card => (
            <div
              key={card.id}
              className={`card hand-card ${
                selectedCards.includes(card.id) ? 'selected' : ''
              } ${canPlayCard(card.id) ? 'playable' : 'unplayable'}`}
              style={{
                backgroundColor: card.color === 'wild' ? '#333' : card.color,
                color: ['yellow', 'white'].includes(card.color) ? '#000' : '#fff'
              }}
              onClick={() => {
                if (selectedCards.length > 0) {
                  handleCardSelect(card.id);
                } else if (canPlayCard(card.id)) {
                  handlePlayCard(card.id);
                }
              }}
            >
              <div className="card-value">{card.value}</div>
              <div className="card-type">{card.type}</div>
              {selectedCards.includes(card.id) && (
                <div className="select-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
        <p className="hint">
          {selectedCards.length > 0 
            ? '选择更多牌组成连打，或点击已选牌取消' 
            : '点击牌出牌，或按住多选连打'}
        </p>
      </div>

      {/* 颜色选择器 */}
      {showColorPicker && (
        <div className="color-picker-modal">
          <div className="color-picker-content">
            <h3>选择颜色</h3>
            <div className="color-options">
              {['red', 'yellow', 'green', 'blue'].map(color => (
                <button
                  key={color}
                  className="color-option"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="error-toast" onClick={clearError}>
          {error}
        </div>
      )}

      {/* 游戏结束 */}
      {gameState.phase === 'finished' && gameState.rankings && (
        <div className="game-over-modal">
          <h2>游戏结束!</h2>
          <div className="final-rankings">
            {gameState.rankings.map((r: any, i: number) => (
              <div key={r.playerId} className={`rank-item rank-${i + 1}`}>
                <span className="rank">#{r.rank}</span>
                <span className="name">{r.nickname}</span>
                <span className="status">{r.status}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { localStorage.removeItem('uno-current-room'); window.location.reload(); }}>
            返回大厅
          </button>
        </div>
      )}
    </div>
  );
}

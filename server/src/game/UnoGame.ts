import { Room, Player, GameState, GameAction, Card } from '../shared/index.js';
import { GameMode, GameModeFactory } from './modes/GameMode.js';
import { AIPlayer } from './ai/index.js';
import { AvailableActions } from '../shared/actionApi.js';

// 注册游戏模式
import { BaseGameMode } from './modes/BaseGameMode.js';
import { OutMode } from './modes/OutMode.js';

GameModeFactory.register('standard', BaseGameMode);
GameModeFactory.register('out', OutMode);

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onGameEnd: (winner: Player) => void;
  onPlayerEliminated?: (playerId: string, rank: number) => void;
  onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void;
}

/**
 * UnoGame - 游戏流程控制器
 * 
 * 职责：
 * 1. 委托具体游戏逻辑给 GameMode
 * 2. 管理回合计时器
 * 3. 处理游戏生命周期（开始/结束/清理）
 * 4. 协调AI玩家
 */
export class UnoGame {
  private room: Room;
  private gameState: GameState;
  private mode: GameMode;
  private turnTimer: NodeJS.Timeout | null = null;
  private callbacks: GameCallbacks;
  
  constructor(
    room: Room, 
    callbacksOrStateChange: GameCallbacks | ((state: GameState) => void),
    onGameEnd?: (winner: Player) => void,
    onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void
  ) {
    this.room = room;
    
    // 支持两种构造函数签名
    if (typeof callbacksOrStateChange === 'function') {
      this.callbacks = {
        onStateChange: callbacksOrStateChange,
        onGameEnd: onGameEnd || (() => {}),
        onSendMessage
      };
    } else {
      this.callbacks = callbacksOrStateChange;
    }
    
    // 根据房间设置创建对应的游戏模式
    const modeName = room.settings?.mode || 'standard';
    this.mode = GameModeFactory.create(modeName);
    
    // 初始化游戏状态
    this.gameState = this.mode.initialize(room);
    
    // 设置房间状态
    room.status = 'playing';
    room.gameState = this.gameState;
    
    // 设置AI表情回调
    AIPlayer.onSendEmoji = (playerId, emoji, target) => {
      this.callbacks.onSendMessage?.(playerId, 'emoji', emoji);
    };
    
    // 启动回合计时器
    this.startTurnTimer();
    
    // 检查首回合是否是AI
    this.checkAndHandleAITurn();
    
    console.log(`[UnoGame] ${modeName}模式游戏已启动，${room.players.length}名玩家`);
  }
  
  /**
   * 处理玩家动作
   */
  handleAction(action: GameAction, playerId: string): boolean {
    // 验证玩家存在且未被淘汰
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.warn(`[UnoGame] 玩家不存在: ${playerId}`);
      return false;
    }
    
    if (player.eliminated) {
      console.warn(`[UnoGame] 玩家已被淘汰: ${playerId}`);
      return false;
    }
    
    // 验证动作合法性
    const validation = this.mode.validateAction(this.gameState, action, playerId);
    if (!validation.valid) {
      console.warn(`[UnoGame] 非法动作: ${validation.error}`);
      return false;
    }
    
    // 执行动作
    try {
      this.gameState = this.mode.executeAction(this.gameState, action, playerId);
      this.gameState.lastAction = { ...action, timestamp: Date.now() };
      
      // 检查胜利条件
      this.checkWinCondition();
      
      // 重置计时器
      this.resetTurnTimer();
      
      // 通知状态更新
      this.callbacks.onStateChange(this.gameState);
      
      return true;
    } catch (error) {
      console.error('[UnoGame] 执行动作失败:', error);
      return false;
    }
  }
  
  /**
   * 获取玩家可执行的动作列表 (v1.0 - 已弃用)
   * @deprecated 请使用 getAvailableActionsV2
   */
  getAvailableActions(playerId: string): GameAction[] {
    return this.mode.getAvailableActions(this.gameState, playerId);
  }

  /**
   * 获取玩家可用的所有动作 (v2.0)
   * 返回详细的动作信息，支持前端精准渲染
   * 
   * @param playerId - 玩家ID
   * @returns AvailableActions - 详细的可用动作信息
   */
  getAvailableActionsV2(playerId: string): AvailableActions {
    return this.mode.getAvailableActionsV2(this.gameState, playerId);
  }
  
  /**
   * 检查胜利条件
   */
  private checkWinCondition(): void {
    // 防止重复触发游戏结束
    if (this.gameState.isRoundEnded || this.gameState.winner) {
      return;
    }
    
    const winnerId = this.mode.checkWinCondition(this.gameState);
    
    if (winnerId) {
      const winner = this.room.players.find(p => p.id === winnerId);
      if (winner) {
        this.gameState.winner = winnerId;
        this.gameState.isRoundEnded = true;
        this.room.status = 'finished';
        this.callbacks.onGameEnd(winner);
        this.destroy();
      }
    }
  }
  
  /**
   * 回合超时处理
   * 
   * 重要：超时后自动进入托管模式，防止游戏卡住
   */
  private handleTurnTimeout(): void {
    const currentPlayer = this.gameState.players.find(
      p => p.id === this.gameState.currentPlayerId
    );
    
    if (!currentPlayer || currentPlayer.eliminated) {
      return;
    }
    
    // 如果已经是AI托管状态，由AI正常出牌
    if (currentPlayer.isAI) {
      this.checkAndHandleAITurn();
      return;
    }
    
    console.log(`[UnoGame] 玩家 ${currentPlayer.nickname} 回合超时，自动摸牌`);
    
    // 超时自动摸牌（不是转托管）
    const drawCount = this.gameState.pendingDraw && this.gameState.pendingDraw > 0 
      ? this.gameState.pendingDraw 
      : 1;
    
    // 标记为超时摸牌（禁止立即出牌）
    this.gameState.justDrewByTimeout = true;
    
    // 执行摸牌
    this.drawCards(currentPlayer.id, drawCount);
    
    // 清除pendingDraw
    this.gameState.pendingDraw = 0;
    this.gameState.pendingDrawType = undefined;
    
    // 清除超时摸牌标记（下一玩家回合开始前）
    this.gameState.justDrewByTimeout = false;
    
    // 切换到下一玩家
    this.gameState.currentPlayerId = this.getNextPlayerId(currentPlayer.id);
    this.gameState.turnStartTime = Date.now();
    
    // 通知状态更新
    this.callbacks.onStateChange(this.gameState);
    
    // 重置计时器
    this.resetTurnTimer();
    
    // 检查是否是AI回合
    setTimeout(() => {
      this.checkAndHandleAITurn();
    }, 500);
  }
  
  /**
   * 启动回合计时器
   */
  private startTurnTimer(): void {
    this.clearTurnTimer();
    
    const turnTime = this.gameState.turnTimer * 1000;
    this.turnTimer = setInterval(() => {
      const elapsed = Date.now() - this.gameState.turnStartTime;
      if (elapsed >= turnTime) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }
  
  /**
   * 重置回合计时器
   */
  private resetTurnTimer(): void {
    this.gameState.turnStartTime = Date.now();
    this.startTurnTimer();
    
    // 检查是否是AI回合
    this.checkAndHandleAITurn();
  }
  
  /**
   * 检查并处理AI回合
   * 
   * 公共方法，允许外部调用（如托管切换时）
   */
  public checkAndHandleAITurn(): void {
    const currentPlayer = this.gameState.players.find(
      p => p.id === this.gameState.currentPlayerId
    );
    
    console.log(`[checkAndHandleAITurn] 检查AI回合:`, {
      currentPlayerId: this.gameState.currentPlayerId,
      playerFound: !!currentPlayer,
      isAI: currentPlayer?.isAI,
      aiType: currentPlayer?.aiType,
      eliminated: currentPlayer?.eliminated
    });
    
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.eliminated) {
      console.log(`[checkAndHandleAITurn] 不满足AI出牌条件`);
      return;
    }
    
    // AI延迟后行动
    const delay = currentPlayer.aiType === 'host' ? 1500 : 1000;
    console.log(`[checkAndHandleAITurn] ${currentPlayer.nickname} 将在 ${delay}ms 后AI出牌`);
    
    setTimeout(() => {
      if (this.gameState.currentPlayerId !== currentPlayer.id) {
        console.log(`[checkAndHandleAITurn] 回合已切换，取消AI出牌`);
        return;
      }
      
      const action = AIPlayer.getAIAction(
        currentPlayer,
        this.gameState,
        this.gameState.players
      );
      
      console.log(`[checkAndHandleAITurn] AI决策:`, action?.type || '无动作');
      
      if (action) {
        const success = this.handleAction(action, currentPlayer.id);
        
        // 如果动作执行失败（如连打第一张牌不匹配），尝试摸牌
        if (!success) {
          console.log(`[checkAndHandleAITurn] AI动作执行失败，尝试摸牌`);
          this.handleAction({
            type: 'draw',
            playerId: currentPlayer.id,
            timestamp: Date.now()
          }, currentPlayer.id);
        }
      } else {
        // 没有可执行的动作，摸牌
        console.log(`[checkAndHandleAITurn] AI无可用动作，执行摸牌`);
        this.handleAction({
          type: 'draw',
          playerId: currentPlayer.id,
          timestamp: Date.now()
        }, currentPlayer.id);
      }
    }, delay);
  }
  
  /**
   * 获取下一位玩家ID
   */
  private getNextPlayerId(currentId: string): string {
    const state = this.gameState;
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    const isClockwise = state.direction === 'clockwise';
    const increment = isClockwise ? 1 : -1;
    
    let nextIndex = (currentIndex + increment + state.players.length) % state.players.length;
    
    // 跳过被淘汰的玩家
    while (state.players[nextIndex].eliminated) {
      nextIndex = (nextIndex + increment + state.players.length) % state.players.length;
    }
    
    return state.players[nextIndex].id;
  }
  
  /**
   * 清理回合计时器
   */
  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }
  
  /**
   * 获取当前游戏状态
   */
  getGameState(): GameState {
    return this.gameState;
  }
  
  /**
   * 获取当前游戏模式
   */
  getMode(): GameMode {
    return this.mode;
  }
  
  /**
   * 销毁游戏
   */
  destroy(): void {
    this.clearTurnTimer();
    this.mode.destroy?.();
    console.log('[UnoGame] 游戏已销毁');
  }
  
  // ============ 兼容层方法 ============
  
  playCard(playerId: string, cardId: string, chosenColor?: string): boolean {
    return this.handleAction({
      type: 'play',
      playerId,
      cardIds: [cardId],
      chosenColor,
      timestamp: Date.now()
    }, playerId);
  }
  
  drawCards(playerId: string, count?: number): Card[] {
    const success = this.handleAction({
      type: 'draw',
      playerId,
      timestamp: Date.now()
    }, playerId);
    
    if (success) {
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player) {
        const actualCount = count || 1;
        return player.cards.slice(-actualCount);
      }
    }
    
    return [];
  }
  
  callUno(playerId: string): boolean {
    return this.handleAction({
      type: 'uno',
      playerId,
      timestamp: Date.now()
    }, playerId);
  }
  
  challengeUno(playerId: string, targetId: string): { success: boolean; message?: string } {
    const success = this.handleAction({
      type: 'challenge',
      playerId,
      targetId,
      timestamp: Date.now()
    }, playerId);
    return { success };
  }
  
  jumpIn(playerId: string, cardId: string): boolean {
    return this.handleAction({
      type: 'jumpIn',
      playerId,
      cardIds: [cardId],
      timestamp: Date.now()
    }, playerId);
  }
  
  getCurrentPlayer(): Player | undefined {
    return this.gameState.players.find(p => p.id === this.gameState.currentPlayerId);
  }
  
  endGame(winner?: Player): void {
    if (winner) {
      if (!this.gameState.rankings) this.gameState.rankings = [];
      if (!this.gameState.rankings.includes(winner.id)) {
        this.gameState.rankings.push(winner.id);
      }
      this.gameState.winner = winner.id;
      this.callbacks.onGameEnd(winner);
    }
    this.destroy();
  }
}

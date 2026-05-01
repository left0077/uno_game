/**
 * BaseGameModeV2 - 重构后的基础游戏模式
 * 
 * 核心改进：
 * 1. 使用 PlayerManager 管理玩家状态
 * 2. 简化回合流转逻辑
 * 3. 清晰的抽象方法供子类扩展
 */

import { Card, Player } from '../../shared/index.js';
import {
  GameStateV2,
  GameActionV2,
  ValidationResult,
  ActionResult,
  GameConfig,
  calculateResult,
} from './types.js';
import { PlayerManager } from './PlayerManager.js';
import { GameClock } from './GameClock.js';
import { AIPlayer } from '../ai/AIPlayer.js';

export abstract class BaseGameModeV2 {
  readonly abstract name: string;
  readonly abstract description: string;
  
  protected config: GameConfig = {
    cardsPerPlayer: 7,
    turnTimer: 120,
    allowStacking: true,
    allowJumpIn: true
  };
  
  protected state!: GameStateV2;
  protected playerManager!: PlayerManager;
  
  constructor(config?: Partial<GameConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  // ============================================================================
  // 初始化
  // ============================================================================
  
  /**
   * 初始化游戏状态
   * 子类可以覆盖此方法添加特有状态
   */
  initialize(state: GameStateV2): void {
    this.state = state;
    this.playerManager = new PlayerManager(state);
    this.state.playerLastActions = new Map();

    // 子类扩展
    this.onInitialize();
  }
  
  /**
   * 子类扩展初始化
   */
  protected onInitialize(): void {
    // 子类覆盖
  }
  
  // ============================================================================
  // 动作处理入口
  // ============================================================================
  
  /**
   * 处理玩家动作
   */
  handleAction(action: GameActionV2): ActionResult {
    const validation = this.validateAction(action);
    if (!validation.valid) {
      console.warn(`[BaseGameModeV2] 非法动作: ${validation.error}`);
      return {
        success: false,
        error: { code: validation.code || 'INVALID_ACTION', message: validation.error || '非法动作' }
      };
    }

    try {
      this.executeAction(action);
      this.state.lastAction = { ...action, timestamp: Date.now() };
      this.recordPlayerActionSummary(action);
      return { success: true };
    } catch (error) {
      console.error('[BaseGameModeV2] 执行动作失败:', error);
      return {
        success: false,
        error: { code: 'EXECUTION_FAILED', message: '执行动作时发生错误' }
      };
    }
  }
  
  /**
   * 验证动作
   */
  validateAction(action: GameActionV2): ValidationResult {
    const { type, playerId } = action;
    
    // 检查游戏是否在进行中
    if (this.state.phase !== 'playing') {
      return { valid: false, error: 'Game is not in playing phase' };
    }
    
    // 检查玩家是否存在
    const player = this.state.players.get(playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    // 检查玩家是否在牌桌上
    if (!this.playerManager.isOnTable(playerId)) {
      return { valid: false, error: 'Player is not on table' };
    }
    
    // 分类型验证
    switch (type) {
      case 'play':
        return this.validatePlayCard(action);
      case 'combo':
        return this.validateCombo(action);
      case 'draw':
        return this.validateDraw(action);
      case 'skip':
        return this.validateSkip(action);
      case 'uno':
        return this.validateCallUno(action);
      case 'challenge':
        return this.validateChallenge(action);
      case 'jumpIn':
        return this.validateJumpIn(action);
      case 'reverse':
        return this.validateReverse(action);
      default:
        return { valid: false, error: `Unknown action type: ${type}` };
    }
  }
  
  // ============================================================================
  // 具体动作验证（子类可覆盖）
  // ============================================================================
  
  protected validatePlayCard(action: GameActionV2): ValidationResult {
    const { playerId, cardIds } = action;

    // Jump In 窗口期内：下家和其他人都可以出牌（竞速）
    const inJumpWindow = this.state.jumpInWindow &&
      this.state.jumpInDeadline && Date.now() < this.state.jumpInDeadline;

    // 正常回合检查
    if (!inJumpWindow && this.playerManager.getCurrentPlayerId() !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    // 必须有牌
    if (!cardIds || cardIds.length === 0) {
      return { valid: false, error: 'No card specified' };
    }
    
    const player = this.state.players.get(playerId)!;
    const cardId = cardIds[0];
    const card = player.cards.find(c => c.id === cardId);
    
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    // 检查是否可以出这张牌
    if (!this.canPlayCard(card)) {
      return { valid: false, error: 'Cannot play this card' };
    }
    
    return { valid: true };
  }
  
  protected abstract validateCombo(action: GameActionV2): ValidationResult;
  
  protected validateDraw(action: GameActionV2): ValidationResult {
    // 必须是当前玩家回合
    if (this.playerManager.getCurrentPlayerId() !== action.playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    return { valid: true };
  }
  
  protected validateSkip(action: GameActionV2): ValidationResult {
    if (this.playerManager.getCurrentPlayerId() !== action.playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    return { valid: true };
  }
  
  protected validateCallUno(action: GameActionV2): ValidationResult {
    const player = this.state.players.get(action.playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    // UNO 可随时喊，不限于自己的回合

    // 手牌必须 <= 2
    if (player.cards.length > 2) {
      return { valid: false, error: 'Can only call UNO when you have 1 or 2 cards' };
    }

    return { valid: true };
  }
  
  protected validateChallenge(action: GameActionV2): ValidationResult {
    const { targetId } = action;
    if (!targetId) {
      return { valid: false, error: 'No target specified' };
    }
    const target = this.state.players.get(targetId);
    if (!target) {
      return { valid: false, error: 'Target not found' };
    }
    // 目标必须只有 1 张牌且未喊 UNO
    if (target.cards.length !== 1) {
      return { valid: false, error: 'Target must have exactly 1 card' };
    }
    if (target.hasCalledUno) {
      return { valid: false, error: 'Target already called UNO' };
    }
    return { valid: true };
  }
  
  protected validateJumpIn(action: GameActionV2): ValidationResult {
    if (!this.config.allowJumpIn) {
      return { valid: false, error: 'Jump in is not allowed' };
    }
    if (this.playerManager.getCurrentPlayerId() === action.playerId) {
      return { valid: false, error: 'Cannot jump in on your turn' };
    }
    return { valid: true };
  }

  protected validateReverse(action: GameActionV2): ValidationResult {
    if (this.playerManager.getCurrentPlayerId() !== action.playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    if (!this.state.pendingDraw || this.state.pendingDraw <= 0) {
      return { valid: false, error: 'No pending penalty to reverse' };
    }
    if (!this.state.penaltySourceId) {
      return { valid: false, error: 'No penalty source to bounce to' };
    }
    return { valid: true };
  }
  
  // ============================================================================
  // 动作执行
  // ============================================================================
  
  protected executeAction(action: GameActionV2): void {
    switch (action.type) {
      case 'play':
        this.executePlayCard(action);
        break;
      case 'combo':
        this.executeCombo(action);
        break;
      case 'draw':
        this.executeDraw(action);
        break;
      case 'skip':
        this.executeSkip(action);
        break;
      case 'uno':
        this.executeCallUno(action);
        break;
      case 'challenge':
        this.executeChallenge(action);
        break;
      case 'jumpIn':
        this.executeJumpIn(action);
        break;
      case 'reverse':
        this.executeReverse(action);
        break;
    }
  }
  
  /**
   * 执行出牌
   */
  protected executePlayCard(action: GameActionV2): void {
    const { playerId, cardIds, chosenColor } = action;
    const player = this.state.players.get(playerId)!;
    const cardId = cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    // 移除手牌
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    // 添加到弃牌堆
    this.state.discardPile.push(card);
    
    // 设置颜色
    if (card.type === 'wild' || card.type === 'draw4' || card.type === 'draw8') {
      this.state.currentColor = chosenColor || 'red';
    } else {
      this.state.currentColor = card.color;
    }
    
    // 检查是否出完牌（胜利）
    if (player.cards.length === 0) {
      this.onPlayerFinished(playerId);
      return; // 游戏结束，不流转回合
    }
    
    // 应用牌效果
    this.applyCardEffect(card, playerId);

    // 关闭 Jump In 窗口（动作已执行）
    this.state.jumpInWindow = false;
    this.state.jumpInDeadline = undefined;

    // 流转回合
    this.playerManager.nextTurn();

    // 开启 Jump In 竞争窗口（3秒，下家和抢牌者同时竞争）
    if (this.config.allowJumpIn) {
      this.state.jumpInWindow = true;
      this.state.jumpInDeadline = Date.now() + 3000;
    }
  }
  
  /**
   * 执行摸牌
   */
  protected executeDraw(action: GameActionV2): void {
    const player = this.state.players.get(action.playerId)!;

    // 摸牌：有累积惩罚时摸满，否则摸 1 张
    const drawCount = this.state.pendingDraw || 1;
    this.drawCardsForPlayer(action.playerId, drawCount);
    if (drawCount > 1) {
      if (!this.state.penaltyStats) this.state.penaltyStats = {};
      this.state.penaltyStats[action.playerId] = (this.state.penaltyStats[action.playerId] || 0) + drawCount;
    }
    this.state.pendingDraw = 0;
    this.state.pendingDrawType = undefined;

    // 清除 UNO 状态
    player.hasCalledUno = false;

    // 流转回合
    this.playerManager.nextTurn();

    // 开启 Jump In 竞争窗口（3秒，下家和抢牌者同时竞争）
    if (this.config.allowJumpIn) {
      this.state.jumpInWindow = true;
      this.state.jumpInDeadline = Date.now() + 3000;
    }
  }
  
  /**
   * 执行跳过
   */
  protected executeSkip(_action: GameActionV2): void {
    this.playerManager.nextTurn();
  }
  
  /**
   * 执行喊UNO
   */
  protected executeCallUno(action: GameActionV2): void {
    const player = this.state.players.get(action.playerId)!;
    player.hasCalledUno = true;
  }
  
  /**
   * 执行挑战
   */
  protected executeChallenge(action: GameActionV2): void {
    const { targetId } = action;
    if (!targetId) return;
    
    const target = this.state.players.get(targetId);
    if (!target) return;
    
    // 如果目标剩1张牌且没喊UNO，罚2张
    if (target.cards.length === 1 && !target.hasCalledUno) {
      this.drawCardsForPlayer(targetId, 2);
    }
  }
  
  /**
   * 执行反转弹回惩罚
   */
  protected executeReverse(action: GameActionV2): void {
    const { playerId, cardIds } = action;
    const player = this.state.players.get(playerId)!;
    const cardId = cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);

    // 移除反转牌
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    this.state.discardPile.push(player.cards[cardIndex] || this.state.discardPile[this.state.discardPile.length - 1]);

    // 弹回惩罚到来源玩家
    const sourceId = this.state.penaltySourceId!;
    const pendingAmount = this.state.pendingDraw || 0;

    // 清空当前惩罚
    this.state.pendingDraw = 0;
    this.state.pendingDrawType = undefined;
    this.state.penaltySourceId = undefined;

    // 将惩罚转移到来源玩家
    const sourcePlayer = this.state.players.get(sourceId);
    if (sourcePlayer) {
      // 设置来源玩家为当前惩罚目标
      this.state.pendingDraw = pendingAmount;
      this.state.penaltySourceId = playerId; // 现在轮到原玩家来反制

      // 找到来源玩家的索引并设置为当前
      const sourceIdx = this.state.tablePlayerIds.indexOf(sourceId);
      if (sourceIdx !== -1) {
        this.state.currentPlayerIndex = sourceIdx;
      }
    }

    // 反转方向
    this.playerManager.reverseDirection();

    console.log(`[BaseGameModeV2] ${player.nickname} 反转弹回 +${pendingAmount} 给 ${sourcePlayer?.nickname}`);
  }

  /**
   * 执行抢牌
   */
  protected executeJumpIn(action: GameActionV2): void {
    const { playerId, cardIds } = action;
    const player = this.state.players.get(playerId)!;
    const cardId = cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    // 移除手牌
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    // 添加到弃牌堆
    this.state.discardPile.push(card);
    
    // 设置颜色
    this.state.currentColor = card.color;
    
    // 抢牌后成为当前玩家
    const index = this.state.tablePlayerIds.indexOf(playerId);
    if (index !== -1) {
      this.state.currentPlayerIndex = index;
    }
    
    // 检查是否出完
    if (player.cards.length === 0) {
      this.onPlayerFinished(playerId);
    }
  }
  
  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================
  
  /**
   * 执行连打（子类实现）
   */
  protected abstract executeCombo(action: GameActionV2): void;
  
  /**
   * 玩家完成游戏（子类可覆盖）
   */
  protected onPlayerFinished(playerId: string): void {
    this.playerManager.playerFinished(playerId);
  }
  
  /**
   * 检查卡牌是否可以出
   */
  protected canPlayCard(card: Card): boolean {
    // 有累积惩罚时
    if (this.state.pendingDraw && this.state.pendingDraw > 0) {
      return this.canStackCard(card);
    }
    
    // 万能牌可以出（wild / +4 / +8）
    if (card.type === 'wild' || card.type === 'draw4' || card.type === 'draw8') return true;
    
    // 颜色匹配
    if (card.color === this.state.currentColor) return true;
    
    // 数值匹配
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (card.value === topCard.value) return true;
    
    return false;
  }
  
  /**
   * 检查是否可以叠加惩罚
   */
  protected canStackCard(card: Card): boolean {
    if (!this.config.allowStacking) return false;
    if (!this.state.pendingDrawType) return false;
    // 任意 + 类型牌都可以叠（跨类型叠加）
    return card.type === 'draw2' || card.type === 'draw3' ||
           card.type === 'draw4' || card.type === 'draw5' ||
           card.type === 'draw8';
  }
  
  /**
   * 应用卡牌效果
   */
  protected applyCardEffect(card: Card, playerId: string): void {
    switch (card.type) {
      case 'skip':
        this.applySkipEffect(playerId);
        break;
      case 'reverse':
        this.applyReverseEffect();
        break;
      case 'draw2':
      case 'draw4':
      case 'draw3':
      case 'draw5':
      case 'draw8':
        this.applyDrawEffect(card.type);
        break;
    }
  }
  
  protected applySkipEffect(_playerId: string): void {
    const nextId = this.playerManager.getNextPlayerId();
    if (nextId) {
      this.state.skippedPlayerId = nextId;
    }
  }
  
  protected applyReverseEffect(): void {
    this.playerManager.reverseDirection();
    
    // 2人游戏中，反转等于跳过对方
    if (this.playerManager.getOnTableCount() === 2) {
      const nextId = this.playerManager.getNextPlayerId();
      if (nextId) {
        this.state.skippedPlayerId = nextId;
      }
    }
  }
  
  protected applyDrawEffect(type: 'draw2' | 'draw4' | 'draw3' | 'draw5' | 'draw8'): void {
    const amount = parseInt(type.replace('draw', ''), 10);
    // 记录惩罚来源（第一个出+的人）
    if (!this.state.pendingDraw) {
      this.state.penaltySourceId = this.playerManager.getPreviousPlayerId();
    }
    this.state.pendingDraw = (this.state.pendingDraw || 0) + amount;
    this.state.pendingDrawType = type;
  }
  
  // ============================================================================
  // 工具方法
  // ============================================================================
  
  /**
   * 给玩家发牌
   */
  protected drawCardsForPlayer(playerId: string, count: number): void {
    const player = this.state.players.get(playerId);
    if (!player) return;
    
    for (let i = 0; i < count; i++) {
      if (this.state.deck.length === 0) {
        this.reshuffleDeck();
      }
      
      const card = this.state.deck.pop();
      if (card) {
        player.cards.push(card);
      }
    }
    
    player.cardCount = player.cards.length;
  }
  
  /**
   * 重新洗牌
   */
  protected reshuffleDeck(): void {
    if (this.state.discardPile.length <= 1) return;
    
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    const cardsToShuffle = this.state.discardPile.slice(0, -1);
    
    // 简单洗牌
    for (let i = cardsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
    }
    
    this.state.deck = cardsToShuffle;
    this.state.discardPile = [topCard];
    
    console.log(`[BaseGameModeV2] 重新洗牌: ${this.state.deck.length}张`);
  }
  
  // ============================================================================
  // 可用动作计算（供 SocketHandler 调用）
  // ============================================================================

  /**
   * 计算玩家当前可用动作
   * canPlayCard 是卡牌可出性的唯一真相源
   */
  getAvailableActions(playerId: string): any[] {
    const actions: any[] = [];
    const player = this.state.players.get(playerId);

    if (!player || !this.playerManager.isOnTable(playerId)) return actions;

    const isCurrentTurn = this.playerManager.getCurrentPlayerId() === playerId;

    if (isCurrentTurn) {
      const topCard = this.state.discardPile[this.state.discardPile.length - 1];
      const hasPending = (this.state.pendingDraw || 0) > 0;

      // 单张出牌：统一调用 canPlayCard
      for (const card of player.cards) {
        if (this.canPlayCard(card)) {
          let reason = '';
          if (hasPending) {
            reason = '累加跟牌';
          } else if (card.type === 'wild' || card.type === 'draw4' || card.type === 'draw8') {
            reason = '万能牌';
          } else if (card.color === this.state.currentColor) {
            reason = '颜色匹配';
          } else if (topCard && card.value === topCard.value) {
            reason = '数字匹配';
          }
          actions.push({
            type: 'play',
            cardId: card.id,
            requiresColor: card.type === 'wild' || card.type === 'draw4' || card.type === 'draw8',
            reason,
          });
        }

        // 惩罚时可出反转弹回（独立于 canPlayCard，走 validateReverse 路径）
        if (hasPending && card.type === 'reverse' && this.state.penaltySourceId) {
          actions.push({
            type: 'reverse',
            cardId: card.id,
            requiresColor: false,
            reason: '弹回反转',
          });
        }
      }

      // 子类扩展（如连打检测）
      this.getModeSpecificActions(player, isCurrentTurn, hasPending, actions);

      // 惩罚信息
      if (hasPending) {
        actions.push({
          type: 'penalty_info',
          pendingDraw: this.state.pendingDraw,
          penaltySourceId: (this.state as any).penaltySourceId,
        });
      }

      actions.push({ type: 'draw' });
    }

    // UNO 可随时喊（不限于自己的回合）
    if (player.cards.length <= 2) {
      actions.push({ type: 'uno' });
    }

    // Challenge 可随时质疑（任何人手牌=1且未喊UNO）
    for (const [pid, p] of this.state.players) {
      if (pid !== playerId && p.cards.length === 1 && !p.hasCalledUno) {
        actions.push({ type: 'challenge', targetId: pid });
      }
    }

    // 非当前回合：检测 Jump In（完全相同牌可抢出）
    if (!isCurrentTurn && this.state.discardPile.length > 0) {
      const topCard = this.state.discardPile[this.state.discardPile.length - 1];
      for (const card of player.cards) {
        if (card.color === topCard.color && card.value === topCard.value) {
          actions.push({ type: 'jumpIn', cardId: card.id });
        }
      }
    }

    return actions;
  }

  protected getModeSpecificActions(
    _player: Player,
    _isCurrentTurn: boolean,
    _hasPending: boolean,
    _actions: any[]
  ): void {
    // 子类覆盖
  }

  // ============================================================================
  // 生命周期（SocketHandler 通过这两个回调接入）
  // ============================================================================

  private onStateChange?: () => void;
  protected clock?: GameClock;
  private lastScheduledAI: string | null = null;

  /**
   * 启动游戏循环
   */
  start(onStateChange: () => void): void {
    this.onStateChange = onStateChange;
    this.clock = new GameClock(() => this.onTick());
    this.clock.start();
  }

  isFinished(): boolean {
    return this.state.phase === 'finished';
  }

  /**
   * 每秒钟由 GameClock 调用
   */
  private onTick(): void {
    if (this.state.phase !== 'playing') return;

    const elapsed = (Date.now() - (this.state.gameStartTime || Date.now())) / 1000;

    // 阶段推进（子类覆盖钩子）
    this.checkPhaseAdvance(elapsed);

    // 全局超时
    const globalTimeout = this.getGlobalTimeout();
    if (globalTimeout > 0 && elapsed >= globalTimeout) {
      this.onGlobalTimeout();
      return;
    }

    // Jump In 窗口超时
    if (this.state.jumpInWindow && this.state.jumpInDeadline && Date.now() > this.state.jumpInDeadline) {
      this.state.jumpInWindow = false;
      this.state.jumpInDeadline = undefined;
    }

    // 回合超时
    this.checkTurnTimeout();
  }

  // ============================================================================
  // 子类可覆盖的钩子
  // ============================================================================

  protected getPhaseSeconds(): number[] { return []; }
  protected getGlobalTimeout(): number { return 0; }

  protected onPhaseAdvance(_phase: number): void { /* 子类覆盖 */ }

  protected onGlobalTimeout(): void {
    this.endGame(undefined);
  }

  // ============================================================================
  // 内部：回合超时 / AI 调度 / 阶段推进
  // ============================================================================

  private checkPhaseAdvance(elapsed: number): void {
    const phases = this.getPhaseSeconds();
    for (let i = 0; i < phases.length; i++) {
      if (elapsed >= phases[i] && (!this.state.outState || (this.state.outState as any).phase < i)) {
        this.onPhaseAdvance(i);
      }
    }
  }

  private checkTurnTimeout(): void {
    const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
    if (!currentId) return;

    const player = this.state.players.get(currentId);
    if (!player) return;

    const turnElapsed = (Date.now() - this.state.turnStartTime) / 1000;
    if (turnElapsed >= this.config.turnTimer) {
      console.log(`[BaseGameModeV2] 超时: ${player.nickname}，自动摸牌`);
      this.handleAction({ type: 'draw', playerId: currentId, timestamp: Date.now() });
      this.onStateChange?.();
      return;
    }

    // AI 回合调度
    if (player.isAI && this.lastScheduledAI !== currentId) {
      this.lastScheduledAI = currentId;
      this.handleAITurn(currentId);
    }

    // 非 AI 回合清除标记
    if (!player.isAI) {
      this.lastScheduledAI = null;
    }
  }

  /**
   * 处理 AI 完整回合（决策 → 延迟 → 执行 → 兜底）
   */
  private handleAITurn(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player || !player.isAI) return;

    console.log(`[AI] ${player.nickname} 回合开始，手牌${player.cards.length}张`);

    const aiAction = AIPlayer.getAIAction(
      player,
      this.state as any,
      [...this.state.players.values()]
    );

    const delay = AIPlayer.getDecisionDelay(player.aiDifficulty || 'normal');

    setTimeout(() => {
      if (aiAction) {
        const action: GameActionV2 = {
          type: aiAction.type as any,
          playerId,
          cardIds: aiAction.cardIds,
          chosenColor: (aiAction as any).chosenColor,
          comboType: (aiAction as any).comboType,
          targetId: aiAction.targetId,
          timestamp: Date.now(),
        };

        console.log(`[AI] ${player.nickname} 执行: ${action.type}` +
          (action.cardIds ? ` ${action.cardIds.length}张` : ''));

        const result = this.handleAction(action);
        if (!result.success) {
          console.log(`[AI] ${player.nickname} 动作被拒: ${result.error?.message}`);
          this.aiFallbackDraw(playerId);
        }
      } else {
        this.aiFallbackDraw(playerId);
      }
      this.onStateChange?.();
    }, delay);
  }

  /**
   * AI 兜底：摸牌 + 推进回合
   */
  private aiFallbackDraw(playerId: string): void {
    this.executeDraw({ type: 'draw', playerId, timestamp: Date.now() });
    this.playerManager.nextTurn();
  }

  // ============================================================================
  // 状态序列化
  // ============================================================================

  /**
   * 序列化公有游戏状态（广播给房间所有人）
   */
  serializePublicState(): any {
    const s = this.state;
    const pm = this.playerManager;

    return {
      version: 'v2',
      phase: s.phase,
      currentPlayerId: pm.getCurrentPlayerId(),
      currentPlayerIndex: s.currentPlayerIndex,
      direction: s.direction,

      deckCount: s.deck.length,
      discardPile: s.discardPile,
      topCard: s.discardPile[s.discardPile.length - 1] || null,
      currentColor: s.currentColor,

      pendingDraw: s.pendingDraw || 0,
      pendingDrawType: s.pendingDrawType,
      penaltySourceId: s.penaltySourceId,
      skippedPlayerId: s.skippedPlayerId,

      players: pm.getAllPlayersInOrder().map(p => ({
        id: p.id,
        nickname: p.nickname,
        cardCount: p.cards.length,
        status: pm.isOnTable(p.id) ? 'ontable' : 'finished',
        eliminated: p.eliminated,
        hasCalledUno: p.hasCalledUno,
        isAI: p.isAI,
      })),

      rankings: s.phase === 'finished' ? calculateResult(s).rankings : null,

      penaltyStats: s.penaltyStats || {},
      playerLastPlays: s.playerLastActions ? Object.fromEntries(s.playerLastActions) : {},
      turnLog: s.turnLog || [],
      outState: s.outState,
      gameStartTime: s.gameStartTime,
      phaseTimes: this.getPhaseSeconds(),

      jumpInWindow: s.jumpInWindow || false,
      jumpInDeadline: s.jumpInDeadline || 0,

      lastPlay: s.lastAction ? {
        playerId: s.lastAction.playerId,
        type: s.lastAction.type,
        cardCount: (s.lastAction.cardIds || []).length,
        cards: this.resolveLastPlayCards(s.lastAction),
      } : null,

      turnStartTime: s.turnStartTime,
      lastAction: s.lastAction,
      onTableCount: pm.getOnTableCount(),
    };
  }

  private resolveLastPlayCards(lastAction: GameActionV2): any[] {
    return (lastAction.cardIds || []).map(cid => {
      for (const p of this.state.players.values()) {
        const found = p.cards.find(c => c.id === cid);
        if (found) return found;
      }
      for (let i = this.state.discardPile.length - 1; i >= 0; i--) {
        if (this.state.discardPile[i].id === cid) return this.state.discardPile[i];
      }
      return null;
    }).filter(Boolean);
  }

  endGame(winnerId?: string): void {
    this.state.phase = 'finished';
    this.state.winnerId = winnerId;
    this.clock?.stop();
  }

  /**
   * 记录玩家动作的效果摘要（用于客户端每个玩家头像下的展示）
   */
  private recordPlayerActionSummary(action: GameActionV2): void {
    if (!this.state.playerLastActions) {
      this.state.playerLastActions = new Map();
    }

    const { type, playerId, cardIds, comboType } = action;
    const player = this.state.players.get(playerId);
    const cards = (cardIds || []).map(cid => {
      // 从弃牌堆顶部查找已打出的牌
      for (let i = this.state.discardPile.length - 1; i >= 0; i--) {
        if (this.state.discardPile[i].id === cid) return this.state.discardPile[i];
      }
      return player?.cards.find(c => c.id === cid) || null;
    }).filter(Boolean);

    let label = '';
    let effect = '';
    const pending = this.state.pendingDraw || 0;
    const skipped = this.state.skippedPlayerId;

    if (type === 'combo' && comboType) {
      const n = cardIds?.length || 0;
      if (comboType === 'pair') label = `对子×${n}`;
      else if (comboType === 'three') label = n >= 5 ? `核弹${n}张` : n >= 4 ? `炸弹${n}张` : `三条`;
      else if (comboType === 'rainbow') label = `彩虹`;
      else if (comboType === 'straight') label = `顺子`;
      // 连打效果
      effect = this.getComboEffectSummary(comboType, n);
    } else if (type === 'play' || type === 'jumpIn') {
      if (pending > 0) effect = `+${pending}累加`;
      else if (skipped) effect = `跳过`;
      else {
        const card = cards[0];
        if (card?.type === 'skip') effect = `跳过`;
        else if (card?.type === 'reverse') effect = `反转`;
        else if (card?.type === 'draw2') effect = `+2`;
        else if (card?.type === 'draw4') effect = `+4万能`;
        else if (card?.type === 'draw8') effect = `+8万能`;
        else if (card?.type === 'wild') effect = `变色`;
        else effect = '';
      }
    } else if (type === 'draw') {
      if (pending > 0) effect = `硬吃+${pending}`;
      else effect = `摸牌`;
    } else if (type === 'uno') {
      effect = `UNO!`;
    } else if (type === 'challenge') {
      effect = `质疑!`;
    } else if (type === 'reverse') {
      effect = `弹回!`;
    }

    this.state.playerLastActions.set(playerId, {
      type, label, cardCount: cards.length, cards: cards.slice(0, 5), effect, timestamp: Date.now(),
    });

    // 追加到回合日志
    if (!this.state.turnLog) this.state.turnLog = [];
    this.state.turnLog.push({
      playerId,
      nickname: player?.nickname || '?',
      type,
      label,
      cards: cards.slice(0, 5),
      effect,
      timestamp: Date.now(),
    });
    // 保留最近30条
    if (this.state.turnLog.length > 30) this.state.turnLog.shift();
  }

  private getComboEffectSummary(comboType: string, cardCount: number): string {
    switch (comboType) {
      case 'pair': return '连出2张(无惩罚)';
      case 'three':
        if (cardCount >= 5) return '核弹:全员摸3张';
        if (cardCount >= 4) return '炸弹:下家摸2张';
        return '三条:连出3张(无惩罚)';
      case 'rainbow': return '彩虹:指定目标摸3张';
      case 'straight': return `顺子:下家摸${cardCount - 2}张`;
      default: return '';
    }
  }

  // ============================================================================
  // 获取状态
  // ============================================================================

  getState(): GameStateV2 {
    return this.state;
  }

  getPlayerManager(): PlayerManager {
    return this.playerManager;
  }
}

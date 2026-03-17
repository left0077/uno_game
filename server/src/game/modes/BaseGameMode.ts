import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { GameMode } from './GameMode.js';
import { CardManager } from '../Card.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  AvailableActions, 
  ValidationResult, 
  PlayableCard, 
  PenaltyOption, 
  GameStateInfo,
  PlayerActions,
  createEmptyActions,
  createValidationError,
  createValidationSuccess,
  createStateChange,
  ACTION_API_VERSION,
  ActionErrorCodes
} from '../../shared/actionApi.js';

/**
 * 基础游戏模式
 * 实现标准UNO规则，可被其他模式继承扩展
 */
export class BaseGameMode implements GameMode {
  readonly name: string = 'standard';
  readonly description: string = '经典UNO规则';
  
  // 游戏配置
  protected config = {
    cardsPerPlayer: 7,
    turnTimer: 120,
    allowStacking: true,
    allowJumpIn: true
  };
  
  constructor(config?: Partial<typeof this.config>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  /**
   * 初始化游戏状态
   */
  initialize(room: Room): GameState {
    // 根据玩家人数决定牌库数量：2-4人=1副，5-8人=2副，9-12人=3副
    const playerCount = room.players.length;
    const deckMultiplier = Math.ceil(playerCount / 4);
    
    let deck: Card[] = [];
    for (let i = 0; i < deckMultiplier; i++) {
      deck.push(...CardManager.createDeck());
    }
    deck = CardManager.shuffleDeck(deck);
    
    const discardPile: Card[] = [];
    
    // 翻开首张牌
    let firstCard = this.drawFirstCard(deck);
    discardPile.push(firstCard);
    
    // 检查牌堆是否足够
    const totalNeeded = room.players.length * this.config.cardsPerPlayer + 1;
    if (deck.length < totalNeeded) {
      throw new Error(`Not enough cards. Need ${totalNeeded}, have ${deck.length}`);
    }
    
    // 发牌 - 深拷贝玩家数据到 gameState
    const gamePlayers: Player[] = room.players.map(player => {
      const cards = deck.splice(-this.config.cardsPerPlayer, this.config.cardsPerPlayer);
      return {
        ...player,
        cards,
        cardCount: cards.length,
        hasCalledUno: false,
        eliminated: false
      };
    });
    
    const now = Date.now();
    
    const state: GameState = {
      currentPlayerId: gamePlayers[0].id,
      direction: 'clockwise',
      deck,
      discardPile,
      currentColor: firstCard.color,
      turnTimer: this.config.turnTimer,
      turnStartTime: now,
      players: gamePlayers,
      rankings: [],
      isRoundEnded: false
    };
    
    // 子类扩展初始化
    this.onInitialize(state, room);
    
    return state;
  }
  
  /**
   * 子类可覆盖的初始化逻辑
   */
  protected onInitialize(state: GameState, room: Room): void {
    // 子类覆盖
  }
  
  /**
   * 抽取首张牌
   */
  protected drawFirstCard(deck: Card[]): Card {
    let firstCard = deck.pop();
    if (!firstCard) {
      throw new Error('Failed to draw first card');
    }
    
    let reshuffleCount = 0;
    while ((firstCard.type === 'wild' || firstCard.type === 'draw4') && reshuffleCount < 3) {
      deck.unshift(firstCard);
      firstCard = deck.pop();
      if (!firstCard) {
        throw new Error('Failed to draw card during reshuffle');
      }
      reshuffleCount++;
    }
    
    if (firstCard.type === 'wild' || firstCard.type === 'draw4') {
      firstCard = {
        id: uuidv4(),
        type: 'number',
        color: 'red',
        value: 0
      };
    }
    
    return firstCard;
  }
  
  /**
   * 验证动作
   */
  validateAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    switch (action.type) {
      case 'play':
        return this.validatePlayCard(state, action, playerId);
      case 'draw':
        return this.validateDrawCard(state, playerId);
      case 'skip':
        return { valid: state.currentPlayerId === playerId };
      case 'uno':
        return this.validateCallUno(state, playerId);
      case 'challenge':
        return { valid: true };
      case 'jumpIn':
        return this.validateJumpIn(state, action, playerId);
      case 'combo':
        return this.validateCombo(state, action, playerId);
      default:
        return { valid: false, error: `Unknown action type: ${action.type}` };
    }
  }
  
  protected validatePlayCard(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    const cardId = action.cardIds?.[0];
    if (!cardId) {
      return { valid: false, error: 'No card specified' };
    }
    
    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    if (!this.canPlayCard(state, card, player)) {
      return { valid: false, error: 'Cannot play this card' };
    }
    
    return { valid: true };
  }
  
  protected validateDrawCard(state: GameState, playerId: string): { valid: boolean; error?: string } {
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    return { valid: true };
  }
  
  protected validateCallUno(state: GameState, playerId: string): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    if (player.cards.length > 2) {
      return { valid: false, error: 'Can only call UNO when you have 1 or 2 cards' };
    }
    
    return { valid: true };
  }
  
  protected validateJumpIn(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    if (!this.config.allowJumpIn) {
      return { valid: false, error: 'Jump in is not allowed' };
    }
    
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    const cardId = action.cardIds?.[0];
    if (!cardId) {
      return { valid: false, error: 'No card specified' };
    }
    
    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (card.color !== topCard.color && card.value !== topCard.value) {
      return { valid: false, error: 'Card must match color and value exactly' };
    }
    
    return { valid: true };
  }
  
  protected validateCombo(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    return { valid: false, error: 'Combo is not supported in this mode' };
  }
  
  /**
   * 执行动作
   */
  executeAction(state: GameState, action: GameAction, playerId: string): GameState {
    switch (action.type) {
      case 'play':
        return this.executePlayCard(state, action, playerId);
      case 'draw':
        return this.executeDrawCard(state, playerId);
      case 'skip':
        return this.executeSkip(state, playerId);
      case 'uno':
        return this.executeCallUno(state, playerId);
      case 'challenge':
        return this.executeChallenge(state, action, playerId);
      case 'jumpIn':
        return this.executeJumpIn(state, action, playerId);
      case 'combo':
        return this.executeCombo(state, action, playerId);
      default:
        return state;
    }
  }
  
  protected executePlayCard(state: GameState, action: GameAction, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const cardId = action.cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    state.discardPile.push(card);
    
    if (card.type === 'wild' || card.type === 'draw4') {
      state.currentColor = action.chosenColor || action.color || 'red';
    } else {
      state.currentColor = card.color;
    }
    
    // ✅ 修复：检查是否出完牌，如果是则立即结束游戏
    if (player.cards.length === 0) {
      console.log(`[BaseGameMode] 玩家 ${player.nickname} 出完所有牌，游戏结束`);
      
      // 设置排名
      if (!state.rankings) state.rankings = [];
      if (!state.rankings.includes(player.id)) {
        state.rankings.push(player.id);
      }
      
      state.winner = player.id;
      state.isRoundEnded = true;
      state.turnStartTime = Date.now();
      
      // 跳过所有后续效果（pendingDraw、applyCardEffect等）
      return state;
    }
    
    // 先处理已有的pendingDraw（如果被叠加）
    this.handlePendingDraw(state, card, playerId);
    
    // 如果打出的是+2/+4且当前没有pendingDraw，设置新的pendingDraw
    if ((card.type === 'draw2' || card.type === 'draw4') && !state.pendingDraw) {
      state.pendingDraw = card.type === 'draw2' ? 2 : 4;
      state.pendingDrawType = card.type as 'draw2' | 'draw4';
    }
    
    this.applyCardEffect(state, card, playerId);
    
    state.turnStartTime = Date.now();
    return state;
  }
  
  protected handlePendingDraw(state: GameState, card: Card, playerId: string): void {
    if (!state.pendingDraw) return;
    
    const canStack = this.canStackCard(card, state.pendingDrawType);
    
    if (canStack && this.config.allowStacking) {
      const drawCount = this.getDrawCount(card.type);
      state.pendingDraw += drawCount;
      state.pendingDrawType = card.type as 'draw2' | 'draw4';
    } else if (state.pendingDraw > 0) {
      const nextPlayer = this.getNextPlayer(state, playerId);
      this.drawCardsForPlayer(state, nextPlayer, state.pendingDraw);
      state.pendingDraw = 0;
      state.pendingDrawType = undefined;
    }
  }
  
  protected canStackCard(card: Card, pendingType?: string): boolean {
    if (!pendingType) return false;
    return card.type === pendingType;
  }
  
  protected getDrawCount(cardType: string): number {
    switch (cardType) {
      case 'draw2': return 2;
      case 'draw4': return 4;
      case 'draw3': return 3;
      case 'draw5': return 5;
      case 'draw8': return 8;
      default: return 0;
    }
  }
  
  protected applyCardEffect(state: GameState, card: Card, playerId: string): void {
    switch (card.type) {
      case 'skip':
        const skipTarget = this.getNextPlayer(state, playerId);
        state.skippedPlayerId = skipTarget;
        state.currentPlayerId = this.getNextPlayer(state, skipTarget);
        break;
        
      case 'reverse':
        state.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
        if (state.players.length === 2) {
          state.currentPlayerId = playerId;
        } else {
          state.currentPlayerId = this.getNextPlayer(state, playerId);
        }
        // 清除跳过标记
        state.skippedPlayerId = undefined;
        break;
        
      default:
        state.currentPlayerId = this.getNextPlayer(state, playerId);
        // 清除跳过标记
        state.skippedPlayerId = undefined;
    }
  }
  
  protected executeDrawCard(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    
    const drawCount = state.pendingDraw && state.pendingDraw > 0 ? state.pendingDraw : 1;
    
    this.drawCardsForPlayer(state, playerId, drawCount);
    
    state.pendingDraw = 0;
    state.pendingDrawType = undefined;
    
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    
    // 清除跳过标记
    state.skippedPlayerId = undefined;
    
    return state;
  }
  
  protected executeSkip(state: GameState, playerId: string): GameState {
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    
    // 清除跳过标记
    state.skippedPlayerId = undefined;
    
    return state;
  }
  
  protected executeCallUno(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    player.hasCalledUno = true;
    return state;
  }
  
  protected executeChallenge(state: GameState, action: GameAction, playerId: string): GameState {
    const targetId = action.targetId;
    if (!targetId) return state;
    
    const targetPlayer = state.players.find(p => p.id === targetId);
    if (!targetPlayer) return state;
    
    if (targetPlayer.cards.length === 1 && !targetPlayer.hasCalledUno) {
      this.drawCardsForPlayer(state, targetId, 2);
    }
    
    return state;
  }
  
  protected executeJumpIn(state: GameState, action: GameAction, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const cardId = action.cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    state.discardPile.push(card);
    state.currentColor = card.color;
    
    state.currentPlayerId = playerId;
    state.turnStartTime = Date.now();
    
    return state;
  }
  
  protected executeCombo(state: GameState, action: GameAction, playerId: string): GameState {
    return state;
  }
  
  protected getNextPlayer(state: GameState, currentId: string): string {
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    const direction = state.direction === 'clockwise' ? 1 : -1;
    
    let nextIndex = (currentIndex + direction + state.players.length) % state.players.length;
    
    while (state.players[nextIndex]?.eliminated) {
      nextIndex = (nextIndex + direction + state.players.length) % state.players.length;
    }
    
    return state.players[nextIndex].id;
  }
  
  protected drawCardsForPlayer(state: GameState, playerId: string, count: number): void {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;
    
    // ✅ 修复：检查玩家是否已完成或已淘汰
    if (player.cards.length === 0) {
      console.log(`[BaseGameMode] 玩家 ${player.nickname} 已出完牌，不再发牌`);
      return;
    }
    
    if (player.eliminated) {
      console.log(`[BaseGameMode] 玩家 ${player.nickname} 已被淘汰，不再发牌`);
      return;
    }
    
    if (state.rankings?.includes(player.id)) {
      console.log(`[BaseGameMode] 玩家 ${player.nickname} 已排名，不再发牌`);
      return;
    }
    
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        this.reshuffleDeck(state);
      }
      const card = state.deck.pop();
      if (card) {
        player.cards.push(card);
      }
    }
    
    player.cardCount = player.cards.length;
  }
  
  protected reshuffleDeck(state: GameState): void {
    if (state.discardPile.length <= 1) return;
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    const cardsToShuffle = state.discardPile.slice(0, -1);
    
    for (let i = cardsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
    }
    
    state.deck = [...cardsToShuffle, ...state.deck];
    state.discardPile = [topCard];
  }
  
  protected canPlayCard(state: GameState, card: Card, player: Player): boolean {
    if (state.pendingDraw && state.pendingDraw > 0) {
      return this.canStackCard(card, state.pendingDrawType);
    }
    
    if (card.type === 'wild' || card.type === 'draw4') return true;
    if (card.color === state.currentColor) return true;
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (card.value === topCard.value) return true;
    
    return false;
  }
  
  /**
   * 获取玩家当前可执行的动作列表 (v1.0 - 已弃用)
   * @deprecated 请使用 getAvailableActionsV2
   */
  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    let actions: GameAction[] = [];
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || player.eliminated) {
      return actions;
    }
    
    if (state.currentPlayerId === playerId) {
      for (const card of player.cards) {
        if (this.canPlayCard(state, card, player)) {
          actions.push({
            type: 'play',
            playerId: player.id,
            timestamp: Date.now(),
            cardIds: [card.id],
            chosenColor: card.type === 'wild' || card.type === 'draw4' ? undefined : card.color
          });
        }
      }
      
      actions.push({ type: 'draw', playerId: player.id, timestamp: Date.now() });
    }
    
    if (this.config.allowJumpIn) {
      const topCard = state.discardPile[state.discardPile.length - 1];
      for (const card of player.cards) {
        if (card.color === topCard.color && card.value === topCard.value) {
          actions.push({
            type: 'jumpIn',
            playerId: player.id,
            timestamp: Date.now(),
            cardIds: [card.id]
          });
        }
      }
    }
    
    return actions;
  }

  /**
   * 获取玩家可用的所有动作 (v2.0)
   * 这是新架构的核心接口，返回详细的动作信息
   * 
   * @param state - 当前游戏状态
   * @param playerId - 玩家ID
   * @returns AvailableActions - 详细的可用动作信息
   */
  getAvailableActionsV2(state: GameState, playerId: string): AvailableActions {
    const startTime = Date.now();
    const gameId = `game-${state.gameStartTime || startTime}`;
    
    console.log(`[ActionAPI] 开始计算可用动作: playerId=${playerId}`);
    
    const actions = createEmptyActions(playerId, gameId);
    const player = state.players.find(p => p.id === playerId);
    
    // 检查玩家是否存在且未被淘汰
    if (!player) {
      console.log(`[ActionAPI] 玩家不存在: playerId=${playerId}`);
      actions.state.type = 'eliminated';
      actions.state.message = '玩家不存在';
      return this.finalizeActions(actions, startTime, ['player_not_found']);
    }
    
    if (player.eliminated) {
      console.log(`[ActionAPI] 玩家已被淘汰: playerId=${playerId}`);
      actions.state.type = 'eliminated';
      actions.state.message = '你已被淘汰';
      return this.finalizeActions(actions, startTime, ['player_eliminated']);
    }
    
    // 检查是否是当前玩家回合
    const isCurrentPlayer = state.currentPlayerId === playerId;
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // 设置倒计时信息
    if (state.turnTimer > 0 && state.turnStartTime > 0) {
      const elapsed = Math.floor((Date.now() - state.turnStartTime) / 1000);
      const remaining = Math.max(0, state.turnTimer - elapsed);
      actions.state.countdown = {
        total: state.turnTimer,
        remaining,
        warning: remaining <= 10
      };
    }
    
    // 场景1: 有待处理的惩罚（被+2/+4等）
    if (state.pendingDraw && state.pendingDraw > 0) {
      console.log(`[ActionAPI] 处理惩罚场景: pendingDraw=${state.pendingDraw}, type=${state.pendingDrawType}`);
      return this.handlePendingDrawScenario(state, player, actions, startTime);
    }
    
    // 场景2: 正常回合
    if (isCurrentPlayer) {
      console.log(`[ActionAPI] 处理正常回合场景`);
      return this.handleNormalTurnScenario(state, player, actions, startTime);
    }
    
    // 场景3: 非当前玩家（只可能有抢牌）
    if (this.config.allowJumpIn) {
      const jumpInCards = this.getJumpInCards(player.cards, topCard);
      if (jumpInCards.length > 0) {
        actions.actions.special.jumpIn = {
          enabled: true,
          reason: `可以抢牌: ${jumpInCards.length}张牌匹配`,
          cardIds: jumpInCards.map(c => c.id)
        };
      }
    }
    
    actions.state.type = 'normal';
    actions.state.message = '等待你的回合...';
    
    console.log(`[ActionAPI] 非当前玩家回合，仅返回抢牌选项`);
    return this.finalizeActions(actions, startTime, ['not_your_turn']);
  }

  /**
   * 处理有待摸惩罚的场景
   */
  protected handlePendingDrawScenario(
    state: GameState, 
    player: Player, 
    actions: AvailableActions,
    startTime: number
  ): AvailableActions {
    const pendingDraw = state.pendingDraw || 0;
    const pendingType = state.pendingDrawType;
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // 设置状态信息
    actions.state.type = 'pending_draw';
    actions.state.message = `累积 +${pendingDraw}`;
    actions.state.subMessage = '选择一种方式响应惩罚';
    actions.state.pendingDraw = {
      count: pendingDraw,
      type: pendingType || 'draw2',
      canStack: this.config.allowStacking,
      canCombo: false, // 基础模式不支持连打响应
      canReverse: false, // 基础模式不支持反转
      canRainbow: false // 基础模式不支持彩虹
    };
    
    const rulesChecked: string[] = ['pending_draw_scenario'];
    
    // 1. 可以跟+（相同类型的牌）
    if (this.config.allowStacking) {
      const stackableCards = player.cards.filter(c => c.type === pendingType);
      if (stackableCards.length > 0) {
        console.log(`[ActionAPI] 找到可跟+的牌: ${stackableCards.length}张`);
        for (const card of stackableCards) {
          const playableCard: PlayableCard = {
            cardId: card.id,
            card,
            reasons: [{
              type: 'stack',
              description: `可以跟+${this.getDrawCount(card.type)}`,
              priority: 100
            }],
            effects: [{
              type: 'stack',
              description: `累积惩罚+${this.getDrawCount(card.type)}`,
              value: this.getDrawCount(card.type)
            }],
            uiHints: {
              highlight: 'green',
              animation: 'pulse',
              tooltip: '跟+来累积惩罚'
            }
          };
          actions.actions.play.cards.push(playableCard);
        }
        actions.actions.play.enabled = true;
        rulesChecked.push(`stackable_cards_${stackableCards.length}`);
      }
    }
    
    // 2. 接受惩罚（摸牌）
    actions.actions.draw = {
      enabled: true,
      count: pendingDraw,
      reason: 'penalty',
      autoDraw: false
    };
    
    // 3. 惩罚响应选项
    const penaltyOptions: PenaltyOption[] = [];
    
    // 接受惩罚选项
    penaltyOptions.push({
      type: 'accept',
      priority: 0,
      name: '接受惩罚',
      description: `摸${pendingDraw}张牌`,
      detailedEffect: `接受累积的惩罚，摸${pendingDraw}张牌`,
      outcome: {
        type: 'accept',
        value: pendingDraw,
        description: `摸${pendingDraw}张牌，回合结束`
      },
      ui: {
        icon: '📥',
        color: '#ff6b6b'
      }
    });
    
    actions.actions.penaltyResponse = {
      enabled: penaltyOptions.length > 1, // 基础模式只有接受惩罚
      options: penaltyOptions
    };
    
    console.log(`[ActionAPI] 惩罚场景处理完成: ${actions.actions.play.cards.length}张可跟+, ${penaltyOptions.length}个响应选项`);
    return this.finalizeActions(actions, startTime, rulesChecked);
  }

  /**
   * 处理正常回合场景
   */
  protected handleNormalTurnScenario(
    state: GameState,
    player: Player,
    actions: AvailableActions,
    startTime: number
  ): AvailableActions {
    const topCard = state.discardPile[state.discardPile.length - 1];
    const rulesChecked: string[] = ['normal_turn_scenario'];
    
    actions.state.type = 'normal';
    actions.state.message = '你的回合';
    
    // 1. 检测可出的牌
    const playableCards: PlayableCard[] = [];
    for (const card of player.cards) {
      const reasons = this.getPlayReasons(card, state, topCard);
      if (reasons.length > 0) {
        const effects = this.getCardEffects(card);
        const requiresInput = this.getRequiredInput(card);
        
        playableCards.push({
          cardId: card.id,
          card,
          reasons,
          effects,
          requiresInput,
          uiHints: {
            highlight: 'green',
            tooltip: reasons.map(r => r.description).join(', ')
          }
        });
      }
    }
    
    actions.actions.play = {
      enabled: playableCards.length > 0,
      cards: playableCards
    };
    
    console.log(`[ActionAPI] 可出牌数量: ${playableCards.length}`);
    rulesChecked.push(`playable_cards_${playableCards.length}`);
    
    // 2. 检测是否可以摸牌
    const canDraw = true; // 总是可以摸牌
    const drawReason = playableCards.length === 0 ? 'no_options' : 'optional';
    actions.actions.draw = {
      enabled: canDraw,
      count: 1,
      reason: drawReason,
      autoDraw: false
    };
    rulesChecked.push(`can_draw_${drawReason}`);
    
    // 3. 检测喊UNO
    if (player.cards.length <= 2) {
      actions.actions.special.callUno = {
        enabled: !player.hasCalledUno,
        reason: player.hasCalledUno ? '已喊过UNO' : '只剩' + player.cards.length + '张牌，可以喊UNO'
      };
      rulesChecked.push('can_call_uno');
    }
    
    // 4. 检测抢牌
    if (this.config.allowJumpIn) {
      const jumpInCards = this.getJumpInCards(player.cards, topCard);
      actions.actions.special.jumpIn = {
        enabled: jumpInCards.length > 0,
        reason: jumpInCards.length > 0 ? `可以抢牌: ${jumpInCards.length}张` : '没有可抢的牌',
        cardIds: jumpInCards.length > 0 ? jumpInCards.map(c => c.id) : undefined
      };
      if (jumpInCards.length > 0) {
        rulesChecked.push(`can_jump_in_${jumpInCards.length}`);
      }
    }
    
    console.log(`[ActionAPI] 正常回合处理完成: ${playableCards.length}张可出牌`);
    return this.finalizeActions(actions, startTime, rulesChecked);
  }

  /**
   * 获取出牌原因
   */
  protected getPlayReasons(
    card: Card, 
    state: GameState, 
    topCard: Card
  ): PlayableCard['reasons'] {
    const reasons: PlayableCard['reasons'] = [];
    
    if (card.type === 'wild' || card.type === 'draw4') {
      reasons.push({
        type: card.type === 'wild' ? 'wild' : 'draw4',
        description: card.type === 'wild' ? '万能牌可以出' : '+4万能牌可以出',
        priority: 90
      });
    } else if (card.color === state.currentColor) {
      reasons.push({
        type: 'color_match',
        description: `颜色匹配: ${card.color}`,
        priority: 100
      });
    } else if (card.value !== undefined && card.value === topCard.value) {
      reasons.push({
        type: 'value_match',
        description: `数字匹配: ${card.value}`,
        priority: 80
      });
    }
    
    return reasons;
  }

  /**
   * 获取卡牌效果
   */
  protected getCardEffects(card: Card): PlayableCard['effects'] {
    const effects: PlayableCard['effects'] = [];
    
    switch (card.type) {
      case 'skip':
        effects.push({ type: 'skip', description: '跳过下家', target: 'next' });
        break;
      case 'reverse':
        effects.push({ type: 'reverse', description: '反转方向', target: 'all' });
        break;
      case 'draw2':
        effects.push({ type: 'draw', description: '下家摸2张', target: 'next', value: 2 });
        break;
      case 'draw4':
        effects.push({ type: 'draw', description: '下家摸4张', target: 'next', value: 4 });
        effects.push({ type: 'change_color', description: '改变颜色' });
        break;
      case 'wild':
        effects.push({ type: 'change_color', description: '改变颜色' });
        break;
    }
    
    return effects;
  }

  /**
   * 获取需要额外输入的项
   */
  protected getRequiredInput(card: Card): PlayableCard['requiresInput'] {
    if (card.type === 'wild' || card.type === 'draw4') {
      return { color: true };
    }
    return undefined;
  }

  /**
   * 获取可抢牌的卡牌
   */
  protected getJumpInCards(cards: Card[], topCard: Card): Card[] {
    return cards.filter(c => 
      c.color === topCard.color && c.value === topCard.value
    );
  }

  /**
   * 最终化动作数据
   */
  protected finalizeActions(
    actions: AvailableActions,
    startTime: number,
    rulesChecked: string[]
  ): AvailableActions {
    const calculationTime = Date.now() - startTime;
    
    actions.metadata.debug = {
      calculationTime,
      rulesChecked,
      source: 'BaseGameMode'
    };
    
    console.log(`[ActionAPI] 计算完成: 耗时=${calculationTime}ms, 规则检查=${rulesChecked.join(',')}`);
    
    return actions;
  }

  /**
   * 验证动作是否合法 (v2.0)
   * 提供更详细的验证结果和错误信息
   * 
   * @param state - 当前游戏状态
   * @param action - 要验证的动作
   * @param playerId - 玩家ID
   * @returns ValidationResult - 验证结果
   */
  validateActionV2(state: GameState, action: GameAction, playerId: string): ValidationResult {
    const result = this.validateAction(state, action, playerId);
    
    if (!result.valid) {
      // 根据错误消息映射到标准错误码
      let errorCode: string = ActionErrorCodes.SERVER_ERROR;
      
      if (result.error?.includes('Not your turn')) {
        errorCode = ActionErrorCodes.NOT_YOUR_TURN;
      } else if (result.error?.includes('Player not found')) {
        errorCode = ActionErrorCodes.PLAYER_ELIMINATED;
      } else if (result.error?.includes('Card not found')) {
        errorCode = ActionErrorCodes.CARD_NOT_IN_HAND;
      } else if (result.error?.includes('Cannot play')) {
        errorCode = ActionErrorCodes.CARD_NOT_PLAYABLE;
      } else if (result.error?.includes('Unknown action')) {
        errorCode = ActionErrorCodes.SERVER_ERROR;
      }
      
      return createValidationError(errorCode, result.error || '未知错误');
    }
    
    // 创建状态变更预览
    const stateChanges: ReturnType<typeof createStateChange>[] = [];
    const notifications: string[] = [];
    
    switch (action.type) {
      case 'play':
        stateChanges.push(createStateChange('card_move', '打出卡牌', 'in_hand', 'discard_pile'));
        break;
      case 'draw':
        stateChanges.push(createStateChange('card_move', '摸牌', 'deck', 'in_hand'));
        break;
      case 'skip':
        stateChanges.push(createStateChange('turn_change', '跳过回合', playerId, 'next_player'));
        break;
    }
    
    return createValidationSuccess(stateChanges, notifications);
  }
  
  checkWinCondition(state: GameState): string | null {
    for (const player of state.players) {
      if (player.cards.length === 0 && !player.eliminated) {
        if (!state.rankings) state.rankings = [];
        if (!state.rankings.includes(player.id)) {
          state.rankings.push(player.id);
        }
        return player.id;
      }
    }
    
    return null;
  }
  
  onTurnEnd(state: GameState, playerId: string): GameState {
    return state;
  }
  
  destroy(): void {
    // 清理资源
  }
}

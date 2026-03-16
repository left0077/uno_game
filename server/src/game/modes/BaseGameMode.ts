import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { GameMode } from './GameMode.js';
import { CardManager } from '../Card.js';
import { v4 as uuidv4 } from 'uuid';

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
    
    // 发牌
    room.players.forEach(player => {
      const cards = deck.splice(-this.config.cardsPerPlayer, this.config.cardsPerPlayer);
      player.cards = cards;
      player.cardCount = cards.length;
      player.hasCalledUno = false;
      player.eliminated = false;
    });
    
    const now = Date.now();
    
    const state: GameState = {
      currentPlayerId: room.players[0].id,
      direction: 'clockwise',
      deck,
      discardPile,
      currentColor: firstCard.color,
      turnTimer: this.config.turnTimer,
      turnStartTime: now,
      players: room.players,
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

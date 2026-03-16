import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { BaseGameMode } from './BaseGameMode.js';
import { ComboType, ComboDefinition, ComboEffect } from './GameMode.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Out模式（大逃杀模式）
 * 继承标准模式，添加：
 * 1. 固定20张手牌上限，超出淘汰
 * 2. 连打系统（对子/三条/彩虹/顺子）
 * 3. 阶段推进（注入惩罚卡）
 * 4. 反转反击机制
 */
export class OutMode extends BaseGameMode {
  readonly name = 'out';
  readonly description = '大逃杀模式：手牌上限20，支持连打和彩虹转移';
  
  readonly MAX_HAND_SIZE = 20;
  private outTimer: NodeJS.Timeout | null = null;
  private comboDefinitions: Map<ComboType, ComboDefinition> = new Map();
  
  constructor() {
    super({ allowStacking: true, allowJumpIn: true });
    this.registerComboDefinitions();
  }
  
  /**
   * 注册连打定义
   */
  private registerComboDefinitions(): void {
    // 对子：2张同数字
    this.comboDefinitions.set('pair', {
      type: 'pair',
      name: '对子',
      minCards: 2,
      maxCards: 2,
      validate: (cards) => {
        if (cards.length !== 2) return false;
        return cards[0].type === 'number' && 
               cards[1].type === 'number' && 
               cards[0].value === cards[1].value;
      },
      getEffect: () => ({ type: 'none', target: 'next', value: 0 })
    });
    
    // 三条：3张同数字
    this.comboDefinitions.set('three', {
      type: 'three',
      name: '三条',
      minCards: 3,
      maxCards: 3,
      validate: (cards) => {
        if (cards.length !== 3) return false;
        const value = cards[0].value;
        return cards.every(c => c.type === 'number' && c.value === value);
      },
      getEffect: () => ({ type: 'skip', target: 'next', value: 1 })
    });
    
    // 彩虹：4张同数字不同颜色
    this.comboDefinitions.set('rainbow', {
      type: 'rainbow',
      name: '彩虹',
      minCards: 4,
      maxCards: 4,
      validate: (cards) => {
        if (cards.length !== 4) return false;
        const value = cards[0].value;
        const colors = new Set(cards.map(c => c.color));
        return cards.every(c => 
          c.type === 'number' && 
          c.value === value &&
          c.color !== undefined
        ) && colors.size === 4;
      },
      getEffect: (state) => ({
        type: 'transfer',
        target: 'chooser',
        value: 3,
        extra: {
          transferAccumulated: !!(state.pendingDraw && state.pendingDraw > 0),
          accumulatedValue: state.pendingDraw || 0
        }
      })
    });
    
    // 顺子：同色连续数字
    this.comboDefinitions.set('straight', {
      type: 'straight',
      name: '顺子',
      minCards: 3,
      validate: (cards) => {
        if (cards.length < 3) return false;
        const color = cards[0].color;
        if (!cards.every(c => c.color === color && c.type === 'number')) {
          return false;
        }
        const sorted = [...cards].sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
        for (let i = 1; i < sorted.length; i++) {
          if (Number(sorted[i].value || 0) !== Number(sorted[i-1].value || 0) + 1) {
            return false;
          }
        }
        return true;
      },
      getEffect: (_, cards) => ({
        type: 'draw',
        target: 'next',
        value: Math.max(1, cards.length - 2)
      })
    });
  }
  
  /**
   * 初始化Out模式特有状态
   */
  protected onInitialize(state: GameState, room: Room): void {
    const now = Date.now();
    
    state.maxHandSize = this.MAX_HAND_SIZE;
    state.gameStartTime = now;
    state.humanPlayerCount = room.players.filter(p => !p.isAI).length;
    state.outState = {
      phase: 0,
      maxCards: this.MAX_HAND_SIZE,
      nextOutAt: Math.floor(now + (3 + Math.random()) * 60 * 1000)
    };
    
    // 启动阶段计时器
    this.startOutTimer(state);
    
    console.log(`[OutMode] 初始化完成，${this.MAX_HAND_SIZE}张手牌上限`);
  }
  
  /**
   * 启动阶段计时器
   */
  private startOutTimer(state: GameState): void {
    this.outTimer = setInterval(() => {
      this.checkOutPhase(state);
    }, 1000);
  }
  
  /**
   * 检查阶段推进
   */
  private checkOutPhase(state: GameState): void {
    if (!state.outState || state.outState.phase >= 3) return;
    
    const now = Date.now();
    if (now >= state.outState.nextOutAt) {
      state.outState.phase++;
      
      if (state.outState.phase === 1) {
        state.outState.nextOutAt = Math.floor(now + (2 + Math.random()) * 60 * 1000);
        this.injectPenaltyCards(state, 'draw3', 4);
      } else if (state.outState.phase === 2) {
        state.outState.nextOutAt = Math.floor(now + (1 + Math.random() * 2) * 60 * 1000);
        this.injectPenaltyCards(state, 'draw5', 4);
      } else if (state.outState.phase === 3) {
        this.injectPenaltyCards(state, 'draw8', 6);
      }
    }
  }
  
  /**
   * 注入惩罚卡
   */
  private injectPenaltyCards(state: GameState, type: 'draw3' | 'draw5' | 'draw8', count: number): void {
    const colors = ['red', 'yellow', 'green', 'blue'] as const;
    
    for (let i = 0; i < count; i++) {
      const card: Card = {
        id: uuidv4(),
        type,
        color: type === 'draw8' ? 'wild' : colors[i % 4],
        value: type === 'draw3' ? 3 : type === 'draw5' ? 5 : 8
      };
      const insertIndex = Math.floor(Math.random() * (state.deck.length + 1));
      state.deck.splice(insertIndex, 0, card);
    }
    
    console.log(`[OutMode] Phase ${state.outState?.phase}: 注入${count}张${type}牌`);
  }
  
  /**
   * 验证连打
   * 
   * 规则：第一张牌必须与弃牌堆顶部的牌匹配（颜色或数字）
   */
  protected validateCombo(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    const comboType = action.comboType as ComboType;
    const comboDef = this.comboDefinitions.get(comboType);
    
    if (!comboDef) {
      return { valid: false, error: `Unknown combo type: ${comboType}` };
    }
    
    const selectedCards = action.cardIds
      ?.map(id => player.cards.find(c => c.id === id))
      .filter(Boolean) as Card[];
    
    if (!selectedCards || selectedCards.length < comboDef.minCards) {
      return { valid: false, error: `Need at least ${comboDef.minCards} cards` };
    }
    
    if (!comboDef.validate(selectedCards)) {
      return { valid: false, error: `Invalid ${comboDef.name}` };
    }
    
    // ✅ 关键：验证第一张牌是否可以合法打出（与弃牌堆顶部匹配）
    const firstCard = selectedCards[0];
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // 检查第一张牌是否与弃牌堆顶部匹配（颜色或数字）
    const isMatch = 
      firstCard.color === state.currentColor || 
      firstCard.value === topCard.value ||
      firstCard.type === 'wild' || 
      firstCard.type === 'draw4';
    
    if (!isMatch) {
      return { valid: false, error: 'First card must match the top card (color or value)' };
    }
    
    if (comboType === 'rainbow' && !action.targetId) {
      return { valid: false, error: 'Rainbow requires target player' };
    }
    
    return { valid: true };
  }
  
  /**
   * 执行连打
   */
  protected executeCombo(state: GameState, action: GameAction, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const comboType = action.comboType as ComboType;
    const comboDef = this.comboDefinitions.get(comboType)!;
    
    const cardIds = action.cardIds as string[];
    const playedCards: Card[] = [];
    
    for (const cardId of cardIds) {
      const cardIndex = player.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        playedCards.push(player.cards[cardIndex]);
        player.cards.splice(cardIndex, 1);
      }
    }
    
    state.discardPile.push(...playedCards);
    
    const lastCard = playedCards[playedCards.length - 1];
    state.currentColor = lastCard.color;
    
    const effect = comboDef.getEffect(state, playedCards, playerId);
    this.applyComboEffect(state, effect, playerId, action.targetId);
    
    player.cardCount = player.cards.length;
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    
    // 清除之前的跳过标记（如果有）
    if (comboType !== 'three') {
      state.skippedPlayerId = undefined;
    }
    // 注意：三条的跳过效果由 applyComboEffect 设置，会在下回合自动清除
    
    return state;
  }
  
  /**
   * 应用连打效果
   */
  private applyComboEffect(
    state: GameState, 
    effect: ComboEffect, 
    playerId: string,
    targetId?: string
  ): void {
    switch (effect.type) {
      case 'skip':
        if (effect.target === 'next') {
          const nextId = this.getNextPlayer(state, playerId);
          state.skippedPlayerId = nextId;
          state.currentPlayerId = this.getNextPlayer(state, nextId);
        }
        break;
        
      case 'draw':
        if (effect.target === 'next') {
          const nextPlayer = state.players.find(
            p => p.id === this.getNextPlayer(state, playerId)
          );
          if (nextPlayer) {
            this.drawCardsForPlayer(state, nextPlayer.id, effect.value);
          }
        }
        break;
        
      case 'transfer':
        const actualTargetId = targetId || this.getNextPlayer(state, playerId);
        const targetPlayer = state.players.find(p => p.id === actualTargetId);
        
        if (targetPlayer) {
          let totalDraw = effect.value;
          
          if (effect.extra?.transferAccumulated && effect.extra.accumulatedValue) {
            totalDraw += effect.extra.accumulatedValue as number;
            state.pendingDraw = 0;
            state.pendingDrawType = undefined;
          }
          
          this.drawCardsForPlayer(state, actualTargetId, totalDraw);
        }
        break;
    }
  }
  
  /**
   * 重写执行出牌 - 添加反转反击和淘汰检查
   */
  protected executePlayCard(state: GameState, action: GameAction, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const cardId = action.cardIds![0];
    const card = player.cards.find(c => c.id === cardId)!;
    
    // 反转反击：当有待摸惩罚时，反转牌可以弹回给上家
    if (card.type === 'reverse' && state.pendingDraw && state.pendingDraw > 0) {
      return this.executeReversePenaltyResponse(state, playerId, card);
    }
    
    // 标准出牌逻辑
    state = super.executePlayCard(state, action, playerId);
    
    // 检查手牌上限
    state = this.checkHandLimit(state);
    
    return state;
  }
  
  /**
   * 执行反转反击
   */
  private executeReversePenaltyResponse(
    state: GameState,
    playerId: string,
    reverseCard: Card
  ): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const pendingDraw = state.pendingDraw || 0;
    
    // 移除反转牌
    const cardIndex = player.cards.findIndex(c => c.id === reverseCard.id);
    player.cards.splice(cardIndex, 1);
    
    state.discardPile.push(reverseCard);
    state.currentColor = reverseCard.color;
    
    // 反转方向
    state.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
    
    // 找到上家（攻击者）
    const attackerId = this.getPreviousPlayer(state, playerId);
    const attacker = state.players.find(p => p.id === attackerId);
    
    // 清除累积惩罚
    state.pendingDraw = 0;
    state.pendingDrawType = undefined;
    
    // 攻击者摸牌
    if (attacker) {
      this.drawCardsForPlayer(state, attackerId, pendingDraw);
    }
    
    player.cardCount = player.cards.length;
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    
    return state;
  }
  
  /**
   * 获取上一位玩家
   */
  private getPreviousPlayer(state: GameState, currentId: string): string {
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    const direction = state.direction === 'clockwise' ? -1 : 1;
    let prevIndex = (currentIndex + direction + state.players.length) % state.players.length;
    
    while (state.players[prevIndex]?.eliminated) {
      prevIndex = (prevIndex + direction + state.players.length) % state.players.length;
    }
    
    return state.players[prevIndex].id;
  }
  
  /**
   * 检查手牌上限
   */
  private checkHandLimit(state: GameState): GameState {
    for (const player of state.players) {
      if (!player.eliminated && player.cards.length > this.MAX_HAND_SIZE) {
        player.eliminated = true;
        
        if (!state.rankings) state.rankings = [];
        state.rankings.unshift(player.id);
        
        state.discardPile.push(...player.cards);
        player.cards = [];
        player.cardCount = 0;
        
        console.log(`[OutMode] ${player.nickname} 被淘汰（手牌${player.cards.length}张）`);
      }
    }
    
    return state;
  }
  
  /**
   * 重写可用动作 - 添加连打选项
   */
  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    let actions = super.getAvailableActions(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || state.currentPlayerId !== playerId) {
      return actions;
    }
    
    // 惩罚响应场景 - 反转反击
    if (state.pendingDraw && state.pendingDraw > 0) {
      const reverseCard = player.cards.find(c => c.type === 'reverse');
      if (reverseCard) {
        actions.push({
          type: 'play',
          playerId: player.id,
          timestamp: Date.now(),
          cardIds: [reverseCard.id]
        });
      }
    }
    
    // 连打动作
    const combos = this.detectAvailableCombos(player.cards);
    for (const combo of combos) {
      actions.push({
        type: 'combo',
        playerId: player.id,
        comboType: combo.type,
        cardIds: combo.cardIds,
        timestamp: Date.now()
      });
    }
    
    return actions;
  }
  
  /**
   * 检测可用的连打组合
   */
  private detectAvailableCombos(cards: Card[]): Array<{type: ComboType; cardIds: string[]}> {
    const combos: Array<{type: ComboType; cardIds: string[]}> = [];
    
    const numberCards = cards.filter(c => 
      c.type === 'number' && typeof c.value === 'number'
    );
    
    // 按数字分组
    const byNumber = new Map<number, Card[]>();
    const byColor = new Map<string, Card[]>();
    
    for (const card of numberCards) {
      const value = card.value as number;
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value)!.push(card);
      
      if (card.color) {
        if (!byColor.has(card.color)) byColor.set(card.color, []);
        byColor.get(card.color)!.push(card);
      }
    }
    
    // 检测对子、三条、彩虹
    for (const [, cardList] of byNumber) {
      if (cardList.length >= 4) {
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = cardList.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          combos.push({ type: 'rainbow', cardIds: rainbowCards.map(c => c.id) });
        }
      }
      
      if (cardList.length >= 3) {
        combos.push({ type: 'three', cardIds: cardList.slice(0, 3).map(c => c.id) });
      }
      
      if (cardList.length >= 2) {
        combos.push({ type: 'pair', cardIds: cardList.slice(0, 2).map(c => c.id) });
      }
    }
    
    // 检测顺子
    for (const [, cardList] of byColor) {
      const sorted = [...cardList].sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
      let sequence: Card[] = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        if (Number(sorted[i].value || 0) === Number(sorted[i-1].value || 0) + 1) {
          sequence.push(sorted[i]);
        } else {
          if (sequence.length >= 3) {
            combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
          }
          sequence = [sorted[i]];
        }
      }
      
      if (sequence.length >= 3) {
        combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
      }
    }
    
    return combos;
  }
  
  /**
   * 重写胜利条件 - 支持淘汰机制
   * 
   * 胜利条件（按优先级）：
   * 1. 最后生存：只剩1人未被淘汰，此人获胜
   * 2. 超时结算：游戏超过20分钟未结束，手牌最少者获胜
   * 3. 排名制：记录出完手牌的玩家顺序，但游戏继续直到只剩1人或超时
   */
  checkWinCondition(state: GameState): string | null {
    const alivePlayers = state.players.filter(p => !p.eliminated);
    
    // 1. 只剩1人存活 - 最后生存者获胜
    if (alivePlayers.length === 1) {
      state.isRoundEnded = true;
      return alivePlayers[0].id;
    }
    
    // 记录出完手牌的玩家到rankings（游戏不立即结束）
    for (const player of alivePlayers) {
      if (player.cards.length === 0) {
        if (!state.rankings) state.rankings = [];
        if (!state.rankings.includes(player.id)) {
          state.rankings.push(player.id);
        }
        // 出完手牌不结束游戏，继续直到只剩1人或超时
      }
    }
    
    // 2. 超时结算：游戏超过20分钟未结束，手牌最少者获胜
    if (state.gameStartTime) {
      const TWENTY_MINUTES = 20 * 60 * 1000; // 20分钟毫秒数
      const elapsed = Date.now() - state.gameStartTime;
      
      if (elapsed > TWENTY_MINUTES) {
        // 找出存活玩家中手牌最少的玩家
        let minCards = Infinity;
        let winner: Player | null = null;
        
        for (const player of alivePlayers) {
          if (player.cards.length < minCards) {
            minCards = player.cards.length;
            winner = player;
          }
        }
        
        if (winner) {
          state.isRoundEnded = true;
          return winner.id;
        }
      }
    }
    
    // 游戏继续
    return null;
  }
  
  destroy(): void {
    if (this.outTimer) {
      clearInterval(this.outTimer);
      this.outTimer = null;
    }
    super.destroy();
  }
}

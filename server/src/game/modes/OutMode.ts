import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { BaseGameMode } from './BaseGameMode.js';
import { ComboType, ComboDefinition, ComboEffect } from './GameMode.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  AvailableActions, 
  PlayableCard, 
  PenaltyOption,
  ComboStarter,
  createEmptyActions,
  createValidationError,
  createValidationSuccess,
  createStateChange,
  ACTION_API_VERSION,
  ValidationResult
} from '../../shared/actionApi.js';

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
      getEffect: (state: GameState) => ({
        type: 'transfer',
        target: 'chooser',
        value: 3,
        extra: {
          transferAccumulated: !!((state as GameState).pendingDraw && (state as GameState).pendingDraw > 0),
          accumulatedValue: (state as GameState).pendingDraw || 0
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
    
    // 三条效果已经在 applyComboEffect 中设置了 currentPlayerId
    // 其他连打类型需要在这里设置
    if (comboType !== 'three') {
      state.currentPlayerId = this.getNextPlayer(state, playerId);
      // 清除之前的跳过标记
      state.skippedPlayerId = undefined;
    }
    
    state.turnStartTime = Date.now();
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
        const cardCount = player.cards.length; // 先保存手牌数
        
        player.eliminated = true;
        
        if (!state.rankings) state.rankings = [];
        state.rankings.unshift(player.id);
        
        state.discardPile.push(...player.cards);
        player.cards = [];
        player.cardCount = 0;
        
        console.log(`[OutMode] ${player.nickname} 被淘汰（手牌${cardCount}张 > 上限${this.MAX_HAND_SIZE}张）`);
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
    
    // 连打动作 - 只添加第一张牌可合法打出的连打
    const topCard = state.discardPile[state.discardPile.length - 1];
    const combos = this.detectAvailableCombos(player.cards, state.currentColor, topCard);
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
   * @param cards 玩家手牌
   * @param currentColor 当前颜色
   * @param topCard 弃牌堆顶牌
   * @returns 可用的连打组合（第一张牌可合法打出）
   */
  private detectAvailableCombos(
    cards: Card[], 
    currentColor: string, 
    topCard: Card
  ): Array<{type: ComboType; cardIds: string[]}> {
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
          // 验证第一张牌可出
          if (this.canPlayCardForCombo(rainbowCards[0], currentColor, topCard)) {
            combos.push({ type: 'rainbow', cardIds: rainbowCards.map(c => c.id) });
          }
        }
      }
      
      if (cardList.length >= 3) {
        // 验证第一张牌可出
        if (this.canPlayCardForCombo(cardList[0], currentColor, topCard)) {
          combos.push({ type: 'three', cardIds: cardList.slice(0, 3).map(c => c.id) });
        }
      }
      
      if (cardList.length >= 2) {
        // 验证第一张牌可出
        if (this.canPlayCardForCombo(cardList[0], currentColor, topCard)) {
          combos.push({ type: 'pair', cardIds: cardList.slice(0, 2).map(c => c.id) });
        }
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
            // 验证第一张牌可出
            if (this.canPlayCardForCombo(sequence[0], currentColor, topCard)) {
              combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
            }
          }
          sequence = [sorted[i]];
        }
      }
      
      if (sequence.length >= 3) {
        // 验证第一张牌可出
        if (this.canPlayCardForCombo(sequence[0], currentColor, topCard)) {
          combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
        }
      }
    }
    
    return combos;
  }
  
  /**
   * 检查卡牌是否可以作为连打的第一张牌打出
   */
  private canPlayCardForCombo(card: Card, currentColor: string, topCard: Card): boolean {
    return (
      card.color === currentColor || 
      card.value === topCard.value ||
      card.type === 'wild' || 
      card.type === 'draw4'
    );
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
  
  /**
   * 重写摸牌方法 - 摸牌后检查手牌上限
   */
  protected drawCardsForPlayer(state: GameState, playerId: string, count: number): void {
    super.drawCardsForPlayer(state, playerId, count);
    
    // 摸牌后检查手牌上限
    this.checkHandLimit(state);
  }

  /**
   * 获取玩家可用的所有动作 (v2.0) - Out模式特有实现
   * 支持连打响应惩罚、彩虹转移、反转反击等新规则
   * 
   * @param state - 当前游戏状态
   * @param playerId - 玩家ID
   * @returns AvailableActions - 详细的可用动作信息
   */
  getAvailableActionsV2(state: GameState, playerId: string): AvailableActions {
    const startTime = Date.now();
    const gameId = `out-game-${state.gameStartTime || startTime}`;
    
    console.log(`[ActionAPI] [OutMode] 开始计算可用动作: playerId=${playerId}`);
    
    const actions = createEmptyActions(playerId, gameId);
    const player = state.players.find(p => p.id === playerId);
    
    // 检查玩家是否存在且未被淘汰
    if (!player) {
      console.log(`[ActionAPI] [OutMode] 玩家不存在: playerId=${playerId}`);
      actions.state.type = 'eliminated';
      actions.state.message = '玩家不存在';
      return this.finalizeActions(actions, startTime, ['player_not_found']);
    }
    
    if (player.eliminated) {
      console.log(`[ActionAPI] [OutMode] 玩家已被淘汰: playerId=${playerId}`);
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
    
    // 场景1: 有待处理的惩罚（被+2/+4等）- Out模式特有响应
    if (state.pendingDraw && state.pendingDraw > 0) {
      console.log(`[ActionAPI] [OutMode] 处理惩罚场景(带连打响应): pendingDraw=${state.pendingDraw}`);
      return this.handleOutModePendingDrawScenario(state, player, actions, startTime);
    }
    
    // 场景2: 正常回合 - Out模式支持连打
    if (isCurrentPlayer) {
      console.log(`[ActionAPI] [OutMode] 处理正常回合场景(带连打)`);
      return this.handleOutModeNormalTurnScenario(state, player, actions, startTime);
    }
    
    // 场景3: 非当前玩家（只可能有抢牌）
    if (this.config.allowJumpIn) {
      const jumpInCards = this.getJumpInCards(player.cards, topCard);
      if (jumpInCards.length > 0) {
        actions.actions.special.jumpIn = {
          enabled: true,
          reason: `可以抢牌: ${jumpInCards.length}张牌匹配`
        };
      }
    }
    
    actions.state.type = 'normal';
    actions.state.message = '等待你的回合...';
    
    console.log(`[ActionAPI] [OutMode] 非当前玩家回合`);
    return this.finalizeActions(actions, startTime, ['not_your_turn']);
  }

  /**
   * 处理 Out 模式特有的惩罚场景
   * 支持：跟+、反转反击、连打响应、彩虹转移、接受惩罚
   */
  private handleOutModePendingDrawScenario(
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
    actions.state.subMessage = '选择一种方式响应惩罚（Out模式支持连打/反转/彩虹）';
    actions.state.pendingDraw = {
      count: pendingDraw,
      type: pendingType || 'draw2',
      canStack: this.config.allowStacking,
      canCombo: true, // Out模式支持连打响应
      canReverse: true, // Out模式支持反转
      canRainbow: true // Out模式支持彩虹
    };
    
    const rulesChecked: string[] = ['out_mode_pending_draw'];
    
    // 1. 可以跟+（相同类型的牌）
    if (this.config.allowStacking) {
      const stackableCards = player.cards.filter(c => c.type === pendingType);
      if (stackableCards.length > 0) {
        console.log(`[ActionAPI] [OutMode] 找到可跟+的牌: ${stackableCards.length}张`);
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
    
    // 2. 反转反击（Out模式特有）
    const reverseCards = player.cards.filter(c => c.type === 'reverse');
    if (reverseCards.length > 0) {
      console.log(`[ActionAPI] [OutMode] 找到反转牌: ${reverseCards.length}张`);
      for (const card of reverseCards) {
        const playableCard: PlayableCard = {
          cardId: card.id,
          card,
          reasons: [{
            type: 'combo_first',
            description: '反转牌可以弹回惩罚',
            priority: 110
          }],
          effects: [{
            type: 'reverse',
            description: `反转方向，上家摸${pendingDraw}张`,
            value: pendingDraw
          }],
          uiHints: {
            highlight: 'yellow',
            animation: 'glow',
            tooltip: '反转反击！惩罚弹回给上家'
          }
        };
        actions.actions.play.cards.push(playableCard);
      }
      actions.actions.play.enabled = true;
      rulesChecked.push(`reverse_cards_${reverseCards.length}`);
    }
    
    // 3. 连打响应惩罚（新规则）
    const comboStarters = this.detectComboStartersForPenalty(player.cards, state.currentColor, topCard);
    if (comboStarters.length > 0) {
      console.log(`[ActionAPI] [OutMode] 找到连打响应选项: ${comboStarters.length}个启动牌`);
      actions.actions.combo = {
        enabled: true,
        starters: comboStarters
      };
      rulesChecked.push(`combo_starters_${comboStarters.length}`);
    }
    
    // 4. 彩虹转移（Out模式特有）
    const rainbowOption = this.detectRainbowTransferOption(player.cards, state, pendingDraw);
    if (rainbowOption) {
      console.log(`[ActionAPI] [OutMode] 发现彩虹转移选项`);
      actions.actions.penaltyResponse.options.push(rainbowOption);
      actions.actions.penaltyResponse.enabled = true;
      rulesChecked.push('rainbow_transfer');
    }
    
    // 5. 接受惩罚（摸牌）
    actions.actions.draw = {
      enabled: true,
      count: pendingDraw,
      reason: 'penalty',
      autoDraw: false
    };
    
    // 添加接受惩罚选项
    actions.actions.penaltyResponse.options.push({
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
    
    if (actions.actions.penaltyResponse.options.length > 0) {
      actions.actions.penaltyResponse.enabled = true;
    }
    
    console.log(`[ActionAPI] [OutMode] 惩罚场景处理完成: ${actions.actions.play.cards.length}张可出牌, ${actions.actions.penaltyResponse.options.length}个响应选项`);
    return this.finalizeActions(actions, startTime, rulesChecked);
  }

  /**
   * 处理 Out 模式正常回合场景
   * 支持连打检测
   */
  private handleOutModeNormalTurnScenario(
    state: GameState,
    player: Player,
    actions: AvailableActions,
    startTime: number
  ): AvailableActions {
    const topCard = state.discardPile[state.discardPile.length - 1];
    const rulesChecked: string[] = ['out_mode_normal_turn'];
    
    actions.state.type = 'normal';
    actions.state.message = '你的回合（Out模式支持连打）';
    
    // 1. 检测可出的单牌
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
    
    console.log(`[ActionAPI] [OutMode] 可出牌数量: ${playableCards.length}`);
    rulesChecked.push(`playable_cards_${playableCards.length}`);
    
    // 2. 检测连打启动牌
    const comboStarters = this.detectComboStarters(player.cards, state.currentColor, topCard);
    if (comboStarters.length > 0) {
      console.log(`[ActionAPI] [OutMode] 找到连打启动牌: ${comboStarters.length}个`);
      actions.actions.combo = {
        enabled: true,
        starters: comboStarters
      };
      rulesChecked.push(`combo_starters_${comboStarters.length}`);
    }
    
    // 3. 检测是否可以摸牌
    const canDraw = true;
    const drawReason = playableCards.length === 0 ? 'no_options' : 'optional';
    actions.actions.draw = {
      enabled: canDraw,
      count: 1,
      reason: drawReason,
      autoDraw: false
    };
    rulesChecked.push(`can_draw_${drawReason}`);
    
    // 4. 检测喊UNO
    if (player.cards.length <= 2) {
      actions.actions.special.callUno = {
        enabled: !player.hasCalledUno,
        reason: player.hasCalledUno ? '已喊过UNO' : '只剩' + player.cards.length + '张牌，可以喊UNO'
      };
      rulesChecked.push('can_call_uno');
    }
    
    // 5. 检测抢牌
    if (this.config.allowJumpIn) {
      const jumpInCards = this.getJumpInCards(player.cards, topCard);
      actions.actions.special.jumpIn = {
        enabled: jumpInCards.length > 0,
        reason: jumpInCards.length > 0 ? `可以抢牌: ${jumpInCards.length}张` : '没有可抢的牌'
      };
      if (jumpInCards.length > 0) {
        rulesChecked.push(`can_jump_in_${jumpInCards.length}`);
      }
    }
    
    console.log(`[ActionAPI] [OutMode] 正常回合处理完成: ${playableCards.length}张可出牌, ${comboStarters.length}个连打启动`);
    return this.finalizeActions(actions, startTime, rulesChecked);
  }

  /**
   * 检测可用于惩罚响应的连打启动牌
   */
  private detectComboStartersForPenalty(
    cards: Card[],
    currentColor: string,
    topCard: Card
  ): ComboStarter[] {
    const starters: ComboStarter[] = [];
    const numberCards = cards.filter(c => 
      c.type === 'number' && typeof c.value === 'number'
    );
    
    // 按数字分组
    const byNumber = new Map<number, Card[]>();
    for (const card of numberCards) {
      const value = card.value as number;
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value)!.push(card);
    }
    
    // 检测可以作为连打第一张的牌
    for (const card of numberCards) {
      if (!this.canPlayCardForCombo(card, currentColor, topCard)) {
        continue;
      }
      
      const value = card.value as number;
      const sameNumberCards = byNumber.get(value) || [];
      const combos: ComboStarter['combos'] = [];
      
      // 对子响应惩罚
      if (sameNumberCards.length >= 2) {
        const pairCards = sameNumberCards.slice(0, 2);
        combos.push({
          type: 'pair',
          name: '对子响应',
          requiredCards: pairCards.map(c => ({
            cardId: c.id,
            card: c,
            inHand: true
          })),
          missingCards: [],
          effect: {
            description: '对子响应惩罚，下家摸牌',
            value: 2
          },
          risk: {
            level: 'low',
            factors: ['使用2张牌响应惩罚']
          },
          recommended: true,
          score: 80
        });
      }
      
      // 三条响应惩罚
      if (sameNumberCards.length >= 3) {
        const threeCards = sameNumberCards.slice(0, 3);
        combos.push({
          type: 'three',
          name: '三条响应',
          requiredCards: threeCards.map(c => ({
            cardId: c.id,
            card: c,
            inHand: true
          })),
          missingCards: [],
          effect: {
            description: '三条响应惩罚，跳过下家回合',
            value: 3
          },
          risk: {
            level: 'medium',
            factors: ['使用3张牌，手牌减少较多']
          },
          recommended: sameNumberCards.length >= 4,
          score: 70
        });
      }
      
      if (combos.length > 0) {
        starters.push({
          cardId: card.id,
          card,
          combos
        });
      }
    }
    
    return starters;
  }

  /**
   * 检测彩虹转移选项
   */
  private detectRainbowTransferOption(
    cards: Card[],
    state: GameState,
    pendingDraw: number
  ): PenaltyOption | null {
    // 按数字分组
    const byNumber = new Map<number, Card[]>();
    const numberCards = cards.filter(c => 
      c.type === 'number' && typeof c.value === 'number'
    );
    
    for (const card of numberCards) {
      const value = card.value as number;
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value)!.push(card);
    }
    
    // 查找是否有彩虹（4张同数字不同颜色）
    for (const [value, cardList] of byNumber) {
      if (cardList.length >= 4) {
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = cardList.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          
          // 生成目标候选列表
          const candidates = state.players
            .filter(p => !p.eliminated && p.id !== state.currentPlayerId)
            .map(p => ({
              playerId: p.id,
              nickname: p.nickname,
              cardCount: p.cardCount,
              risk: (p.cardCount > 15 ? 'safe' : p.cardCount > 10 ? 'risky' : 'dangerous') as 'safe' | 'risky' | 'dangerous'
            }));
          
          return {
            type: 'rainbow',
            priority: 100,
            name: '彩虹转移',
            description: '用彩虹将惩罚转移给其他玩家',
            detailedEffect: `打出4张${value}的彩虹，将+${pendingDraw}惩罚转移给指定玩家，并额外+3张`,
            requiresCards: rainbowCards.map(c => c.id),
            requiresTarget: {
              type: 'player',
              candidates,
              recommended: candidates.find(c => c.risk === 'safe')?.playerId
            },
            outcome: {
              type: 'transfer',
              value: pendingDraw + 3,
              description: `目标玩家摸${pendingDraw + 3}张牌`
            },
            ui: {
              icon: '🌈',
              color: '#ff6bff',
              animation: 'rainbow'
            }
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 检测连打启动牌（正常回合）
   */
  private detectComboStarters(
    cards: Card[],
    currentColor: string,
    topCard: Card
  ): ComboStarter[] {
    const starters: ComboStarter[] = [];
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
    
    // 检测可以作为连打第一张的牌
    for (const card of numberCards) {
      if (!this.canPlayCardForCombo(card, currentColor, topCard)) {
        continue;
      }
      
      const value = card.value as number;
      const sameNumberCards = byNumber.get(value) || [];
      const combos: ComboStarter['combos'] = [];
      
      // 对子
      if (sameNumberCards.length >= 2) {
        const pairCards = sameNumberCards.slice(0, 2);
        combos.push({
          type: 'pair',
          name: '对子',
          requiredCards: pairCards.map(c => ({
            cardId: c.id,
            card: c,
            inHand: true
          })),
          missingCards: [],
          effect: {
            description: '出对子，无特殊效果',
            value: 0
          },
          risk: {
            level: 'low',
            factors: ['消耗2张牌']
          },
          recommended: sameNumberCards.length === 2,
          score: 60
        });
      }
      
      // 三条
      if (sameNumberCards.length >= 3) {
        const threeCards = sameNumberCards.slice(0, 3);
        combos.push({
          type: 'three',
          name: '三条',
          requiredCards: threeCards.map(c => ({
            cardId: c.id,
            card: c,
            inHand: true
          })),
          missingCards: [],
          effect: {
            description: '出三条，跳过下家回合',
            value: 1
          },
          risk: {
            level: 'medium',
            factors: ['消耗3张牌']
          },
          recommended: false,
          score: 50
        });
      }
      
      // 彩虹
      if (sameNumberCards.length >= 4) {
        const colors = new Set(sameNumberCards.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = sameNumberCards.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          combos.push({
            type: 'rainbow',
            name: '彩虹',
            requiredCards: rainbowCards.map(c => ({
              cardId: c.id,
              card: c,
              inHand: true
            })),
            missingCards: [],
            effect: {
              description: '彩虹转移，指定玩家摸3张（或被+）',
              value: 3
            },
            risk: {
              level: 'high',
              factors: ['消耗4张牌', '需要选择目标']
            },
            recommended: false,
            score: 40
          });
        }
      }
      
      if (combos.length > 0) {
        starters.push({
          cardId: card.id,
          card,
          combos
        });
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
            if (this.canPlayCardForCombo(sequence[0], currentColor, topCard)) {
              starters.push({
                cardId: sequence[0].id,
                card: sequence[0],
                combos: [{
                  type: 'straight',
                  name: '顺子',
                  requiredCards: sequence.map(c => ({
                    cardId: c.id,
                    card: c,
                    inHand: true
                  })),
                  missingCards: [],
                  effect: {
                    description: `出顺子，下家摸${Math.max(1, sequence.length - 2)}张`,
                    value: Math.max(1, sequence.length - 2)
                  },
                  risk: {
                    level: sequence.length > 4 ? 'high' : 'medium',
                    factors: [`消耗${sequence.length}张牌`]
                  },
                  recommended: sequence.length >= 5,
                  score: 30 + sequence.length * 5
                }]
              });
            }
          }
          sequence = [sorted[i]];
        }
      }
      
      if (sequence.length >= 3) {
        if (this.canPlayCardForCombo(sequence[0], currentColor, topCard)) {
          starters.push({
            cardId: sequence[0].id,
            card: sequence[0],
            combos: [{
              type: 'straight',
              name: '顺子',
              requiredCards: sequence.map(c => ({
                cardId: c.id,
                card: c,
                inHand: true
              })),
              missingCards: [],
              effect: {
                description: `出顺子，下家摸${Math.max(1, sequence.length - 2)}张`,
                value: Math.max(1, sequence.length - 2)
              },
              risk: {
                level: sequence.length > 4 ? 'high' : 'medium',
                factors: [`消耗${sequence.length}张牌`]
              },
              recommended: sequence.length >= 5,
              score: 30 + sequence.length * 5
            }]
          });
        }
      }
    }
    
    return starters;
  }

  /**
   * 验证动作是否合法 (v2.0) - Out模式特有
   */
  validateActionV2(state: GameState, action: GameAction, playerId: string): ValidationResult {
    const result = this.validateAction(state, action, playerId);
    
    if (!result.valid) {
      // 映射错误码
      let errorCode = 'E5003';
      if (result.error?.includes('Not your turn')) errorCode = 'E1001';
      else if (result.error?.includes('Player not found')) errorCode = 'E1002';
      else if (result.error?.includes('Card not found')) errorCode = 'E2003';
      else if (result.error?.includes('Cannot play')) errorCode = 'E2002';
      else if (result.error?.includes('Invalid')) errorCode = 'E3001';
      
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
      case 'combo':
        stateChanges.push(createStateChange('card_move', '连打出牌', 'in_hand', 'discard_pile'));
        notifications.push(`执行${action.comboType}连打！`);
        break;
      case 'skip':
        stateChanges.push(createStateChange('turn_change', '跳过回合', playerId, 'next_player'));
        break;
    }
    
    return createValidationSuccess(stateChanges, notifications);
  }

  /**
   * 最终化动作数据 - Out模式
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
      source: 'OutMode'
    };
    
    console.log(`[ActionAPI] [OutMode] 计算完成: 耗时=${calculationTime}ms, 规则检查=${rulesChecked.join(',')}`);
    
    return actions;
  }
  
  destroy(): void {
    if (this.outTimer) {
      clearInterval(this.outTimer);
      this.outTimer = null;
    }
    super.destroy();
  }
}

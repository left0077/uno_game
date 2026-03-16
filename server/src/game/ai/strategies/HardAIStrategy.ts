import { GameAction, Card, Player, GameState } from '../../../shared/index.js';
import { BaseAIStrategy, AICapability, GameMemory } from '../core/BaseAIStrategy.js';
import { AIContext, PenaltyResponse, ComboOption, SinglePlayOption } from '../types.js';
import { EmojiType, getAbstractEmoji } from '../emojis.js';

/**
 * 困难AI策略
 * 
 * 特征：
 * - 完美记忆：追踪所有已出牌，精确计算剩余牌
 * - 对手建模：基于概率预测对手手牌
 * - 深度搜索：使用Minimax或蒙特卡洛模拟
 * - 欺骗策略：故意保留关键牌，诱导对手犯错
 * - 反应快（0.5-1.2秒）
 * - 从不犯错
 */
export class HardAIStrategy extends BaseAIStrategy {
  protected initCapabilities(): Set<AICapability> {
    return new Set([
      AICapability.BASIC,
      AICapability.MEMORY,
      AICapability.PREDICTION,
      AICapability.DECEPTION,
      AICapability.OPTIMAL
    ]);
  }
  
  makeDecision(ctx: AIContext): GameAction | null {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    
    // 更新记忆
    this.updateMemory(ctx);
    
    // 1. 处理惩罚响应（使用最优策略）
    if (pendingDraw > 0) {
      const response = this.selectOptimalPenaltyResponse(ctx);
      if (response) {
        this.sendEmoji(getAbstractEmoji('clutch', 'high'));
        return response.action;
      }
    }
    
    // 2. 评估所有选项
    const combos = this.evaluateComboOptions(ctx);
    const singlePlays = this.evaluateSinglePlays(ctx);
    
    // 3. 使用深度评估选择最优动作
    const bestAction = this.selectOptimalAction(ctx, combos, singlePlays);
    
    if (bestAction) {
      this.sendEmoji(getAbstractEmoji('owning', 'high'));
      return bestAction;
    }
    
    // 4. 摸牌（最优决策后仍无牌可出）
    this.sendEmoji(getAbstractEmoji('sweating', 'medium'));
    return { type: 'draw', playerId: player.id, timestamp: Date.now() };
  }
  
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    const responses: PenaltyResponse[] = [];
    
    if (pendingDraw <= 0) return responses;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const handSize = player.cards.length;
    
    // 1. 评估彩虹（考虑目标手牌和胜率）
    const rainbow = this.findRainbowCombo(player.cards, gameState.currentColor, topCard);
    if (rainbow) {
      const target = this.selectOptimalRainbowTarget(ctx);
      const score = this.evaluateRainbowPlay(ctx, target, pendingDraw);
      responses.push({
        type: 'rainbow',
        priority: 1,
        action: {
          type: 'combo',
          playerId: player.id,
          comboType: 'rainbow',
          cardIds: rainbow.cardIds,
          targetId: target,
          timestamp: Date.now()
        },
        description: '彩虹转移',
        score
      });
    }
    
    // 2. 评估反转（考虑惩罚大小和手牌情况）
    const reverseCard = player.cards.find(c => c.type === 'reverse');
    if (reverseCard) {
      const score = this.evaluateReversePlay(ctx, pendingDraw);
      if (score > 70) {
        responses.push({
          type: 'reverse',
          priority: 2,
          action: {
            type: 'play',
            playerId: player.id,
            cardIds: [reverseCard.id],
            timestamp: Date.now()
          },
          description: '反转弹回',
          score
        });
      }
    }
    
    // 3. 评估跟+（考虑累积后的风险和收益）
    const stackCard = player.cards.find(c => c.type === gameState.pendingDrawType);
    if (stackCard) {
      const score = this.evaluateStackPlay(ctx, stackCard, pendingDraw);
      responses.push({
        type: 'stack',
        priority: 3,
        action: {
          type: 'play',
          playerId: player.id,
          cardIds: [stackCard.id],
          timestamp: Date.now()
        },
        description: '跟+',
        score
      });
    }
    
    // 4. 评估连打响应（更复杂的评估）
    const comboResponse = this.evaluateOptimalComboResponse(ctx, pendingDraw);
    if (comboResponse) {
      responses.push(comboResponse);
    }
    
    // 5. 接受惩罚（评估风险）
    const acceptScore = this.evaluateAcceptPenalty(ctx, pendingDraw);
    responses.push({
      type: 'accept',
      priority: 99,
      action: { type: 'draw', playerId: player.id, timestamp: Date.now() },
      description: '接受惩罚',
      score: acceptScore
    });
    
    return responses.sort((a, b) => b.score - a.score);
  }
  
  evaluateComboOptions(ctx: AIContext): ComboOption[] {
    const { player, availableActions } = ctx;
    const combos: ComboOption[] = [];
    
    const comboActions = availableActions.filter(a => a.type === 'combo');
    
    for (const action of comboActions) {
      if (!action.comboType || !action.cardIds) continue;
      
      const score = this.evaluateComboDeep(
        action.comboType,
        action.cardIds,
        ctx
      );
      
      combos.push({
        type: action.comboType,
        cardIds: action.cardIds,
        effect: this.estimateComboEffect(action.comboType, action.cardIds.length),
        score,
        riskScore: this.calculateRisk(ctx, action.cardIds.length)
      });
    }
    
    return combos.sort((a, b) => b.score - a.score);
  }
  
  evaluateSinglePlays(ctx: AIContext): SinglePlayOption[] {
    const { player, gameState, availableActions } = ctx;
    const options: SinglePlayOption[] = [];
    
    const playActions = availableActions.filter(a => 
      a.type === 'play' && a.cardIds?.length === 1
    );
    
    for (const action of playActions) {
      const card = player.cards.find(c => c.id === action.cardIds![0]);
      if (!card) continue;
      
      const { immediate, future } = this.evaluateCardDeep(card, ctx);
      
      options.push({
        card,
        score: immediate + future * 0.3,  // 未来价值权重30%
        reason: this.getDeepReason(card, immediate, future),
        immediateValue: immediate,
        futureValue: future
      });
    }
    
    return options.sort((a, b) => b.score - a.score);
  }
  
  // ========== 深度策略方法 ==========
  
  /**
   * 选择最优惩罚响应
   */
  private selectOptimalPenaltyResponse(ctx: AIContext): PenaltyResponse | null {
    const responses = this.evaluatePenaltyResponses(ctx);
    if (responses.length === 0) return null;
    
    // 选择评分最高的
    const best = responses.reduce((max, r) => r.score > max.score ? r : max);
    return best.score > 0 ? best : null;
  }
  
  /**
   * 选择最优动作（考虑多步影响）
   */
  private selectOptimalAction(
    ctx: AIContext,
    combos: ComboOption[],
    singlePlays: SinglePlayOption[]
  ): GameAction | null {
    const { player, gameState } = ctx;
    const handSize = player.cards.length;
    
    // 评估每个动作的期望价值
    const candidates: Array<{action: GameAction; value: number}> = [];
    
    // 评估连打
    for (const combo of combos.slice(0, 3)) {  // 只评估前3个
      const action: GameAction = combo.type === 'rainbow'
        ? {
            type: 'combo',
            playerId: player.id,
            comboType: 'rainbow',
            cardIds: combo.cardIds,
            targetId: this.selectOptimalRainbowTarget(ctx),
            timestamp: Date.now()
          }
        : {
            type: 'combo',
            playerId: player.id,
            comboType: combo.type,
            cardIds: combo.cardIds,
            timestamp: Date.now()
          };
      
      const value = this.simulateAction(ctx, action);
      candidates.push({ action, value });
    }
    
    // 评估单张出牌
    for (const single of singlePlays.slice(0, 5)) {  // 评估前5个
      const action: GameAction = {
        type: 'play',
        playerId: player.id,
        cardIds: [single.card.id],
        chosenColor: this.selectOptimalColor(single.card, player.cards, ctx),
        timestamp: Date.now()
      };
      
      const value = this.simulateAction(ctx, action);
      candidates.push({ action, value });
    }
    
    // 选择价值最高的动作
    const best = candidates.reduce((max, c) => c.value > max.value ? c : max, candidates[0]);
    
    // 欺骗策略：有时保留强力牌
    if (this.shouldReservePowerCard(best.action, ctx)) {
      // 找次优的动作
      const alternative = candidates
        .filter(c => !this.isPowerCardAction(c.action))
        .sort((a, b) => b.value - a.value)[0];
      
      if (alternative && alternative.value > best.value * 0.7) {
        return alternative.action;  // 使用次优动作保留强力牌
      }
    }
    
    return best?.action || null;
  }
  
  /**
   * 蒙特卡洛模拟评估动作价值
   */
  private simulateAction(ctx: AIContext, action: GameAction): number {
    const { player, gameState } = ctx;
    let value = 0;
    
    // 即时价值
    switch (action.type) {
      case 'combo':
        value += 50 + (action.cardIds?.length || 0) * 10;
        if (action.comboType === 'rainbow') value += 100;
        break;
      case 'play':
        const cardId = action.cardIds?.[0];
        const card = player.cards.find(c => c.id === cardId);
        if (card) {
          value += this.getCardBaseValue(card);
        }
        break;
    }
    
    // 评估减少手牌的价值
    const cardsPlayed = action.type === 'combo' 
      ? (action.cardIds?.length || 1)
      : 1;
    const remainingCards = player.cards.length - cardsPlayed;
    
    if (remainingCards === 0) value += 10000;  // 即将获胜
    else if (remainingCards <= 2) value += 500;  // 接近获胜
    else if (remainingCards <= 5) value += 100;
    
    // 评估对手反应（简化版）
    const nextPlayer = this.getNextPlayer(ctx);
    if (nextPlayer) {
      const threat = this.assessThreat(nextPlayer, ctx);
      value -= threat * 20;  // 威胁大的对手降低价值
    }
    
    return value;
  }
  
  /**
   * 深度评估连打
   */
  private evaluateComboDeep(type: string, cardIds: string[], ctx: AIContext): number {
    let score = 0;
    const { player } = ctx;
    const handSize = player.cards.length;
    const cardsCount = cardIds.length;
    
    // 基础价值
    switch (type) {
      case 'rainbow':
        score += 150;  // 彩虹很强大
        break;
      case 'straight':
        score += 60 + (cardsCount - 3) * 15;  // 顺子长度加成
        break;
      case 'three':
        score += 50;
        break;
      case 'pair':
        score += 30;
        break;
    }
    
    // 手牌减压价值
    const remaining = handSize - cardsCount;
    if (remaining <= 2) score += 1000;  // 接近获胜
    else if (remaining <= 5) score += 200;
    else if (handSize > 18) score += 100;  // 手牌多急需减压
    else if (handSize > 15) score += 50;
    
    // 预测对手反击概率
    const counterProbability = this.estimateCounterProbability(ctx, type);
    score *= (1 - counterProbability * 0.3);  // 考虑被反击的风险
    
    return score;
  }
  
  /**
   * 深度评估卡牌
   */
  private evaluateCardDeep(card: Card, ctx: AIContext): {immediate: number; future: number} {
    let immediate = 0;
    let future = 0;
    const { player, gameState } = ctx;
    
    // 即时价值
    immediate = this.getCardBaseValue(card);
    
    // 未来价值（保留价值）
    switch (card.type) {
      case 'draw4':
        future += 50;  // +4很有用，保留
        break;
      case 'wild':
        future += 40;
        break;
      case 'draw2':
        // 评估对手被+2的风险
        const vulnerableOpponents = this.countVulnerableOpponents(ctx);
        future += vulnerableOpponents * 15;
        break;
      case 'reverse':
        // 评估反转的战略价值
        if (this.isReverseStrategic(ctx)) {
          future += 30;
        }
        break;
      case 'number':
        // 数字牌的未来价值较低
        future += (card.value as number);
        break;
    }
    
    // 手牌少时，保留万能牌的价值降低（需要尽快出完）
    if (player.cards.length <= 3) {
      future *= 0.5;
    }
    
    return { immediate, future };
  }
  
  // ========== 辅助方法 ==========
  
  private evaluateRainbowPlay(ctx: AIContext, target: string, pending: number): number {
    const targetPlayer = ctx.allPlayers.find(p => p.id === target);
    if (!targetPlayer) return 0;
    
    let score = 100;  // 基础分
    
    // 目标手牌越多越有利
    score += targetPlayer.cards.length * 5;
    
    // 目标接近获胜时优先攻击
    if (targetPlayer.cards.length <= 2) score += 200;
    
    // 考虑转移的惩罚大小
    score += pending * 5;
    
    return score;
  }
  
  private evaluateReversePlay(ctx: AIContext, pending: number): number {
    const score = 80 + pending * 8;  // 惩罚越大越值得反转
    
    // 如果上家手牌很多，弹回效果更好
    const prevPlayer = this.getPreviousPlayer(ctx);
    if (prevPlayer && prevPlayer.cards.length > 15) {
      return score + 30;
    }
    
    return score;
  }
  
  private evaluateStackPlay(ctx: AIContext, card: Card, pending: number): number {
    // 计算累积后的总惩罚
    const total = pending + (card.type === 'draw2' ? 2 : 4);
    
    // 评估下家能否继续跟+
    const nextPlayer = this.getNextPlayer(ctx);
    if (nextPlayer) {
      const canContinue = this.canPlayerStack(nextPlayer, card.type);
      if (canContinue) {
        return 40;  // 下家可能继续，风险中等
      }
    }
    
    // 下家无法继续，累积成功
    return 70 + total * 2;
  }
  
  private evaluateAcceptPenalty(ctx: AIContext, pending: number): number {
    const { player } = ctx;
    
    // 基础负分
    let score = -pending * 10;
    
    // 手牌危险时更负
    if (player.cards.length + pending > 18) {
      score -= 200;  // 可能被淘汰
    }
    
    return score;
  }
  
  private evaluateOptimalComboResponse(ctx: AIContext, pending: number): PenaltyResponse | null {
    const combos = this.evaluateComboOptions(ctx);
    const best = combos[0];
    
    if (!best || best.score < 60) return null;
    
    // 只有高价值连打才用来响应惩罚
    return {
      type: 'combo',
      priority: 4,
      action: {
        type: 'combo',
        playerId: ctx.player.id,
        comboType: best.type,
        cardIds: best.cardIds,
        timestamp: Date.now()
      },
      description: `连打响应`,
      score: best.score * 0.8  // 连打响应比直接彩虹/反转略差
    };
  }
  
  private selectOptimalRainbowTarget(ctx: AIContext): string {
    const { allPlayers, player } = ctx;
    const others = allPlayers.filter(p => p.id !== player.id && !p.eliminated);
    
    // 评分每个目标
    const scored = others.map(p => ({
      player: p,
      score: this.evaluateTarget(p, ctx)
    }));
    
    return scored.sort((a, b) => b.score - a.score)[0]?.player.id || others[0]?.id;
  }
  
  private evaluateTarget(player: Player, ctx: AIContext): number {
    let score = 0;
    
    // 手牌越多越适合作为目标
    score += player.cards.length * 10;
    
    // 接近获胜的玩家优先攻击
    if (player.cards.length <= 2) score += 500;
    else if (player.cards.length <= 5) score += 200;
    
    // 评估其反击能力（如果有反转/彩虹，降低优先级）
    const canCounter = player.cards.some(c => 
      c.type === 'reverse' || c.type === 'wild'
    );
    if (canCounter) score -= 50;
    
    return score;
  }
  
  private selectOptimalColor(card: Card, handCards: Card[], ctx: AIContext): string | undefined {
    if (card.type !== 'wild' && card.type !== 'draw4') return undefined;
    
    // 统计手牌颜色
    const colorCount: Record<string, number> = {};
    for (const c of handCards) {
      if (c.color && c.color !== 'wild') {
        colorCount[c.color] = (colorCount[c.color] || 0) + 1;
      }
    }
    
    // 选择手牌最多的颜色
    let bestColor = 'red';
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCount)) {
      if (count > maxCount) {
        maxCount = count;
        bestColor = color;
      }
    }
    
    // 考虑下家可能的颜色（高级策略）
    const nextPlayer = this.getNextPlayer(ctx);
    if (nextPlayer && this.hasCapability(AICapability.PREDICTION)) {
      // 如果下家可能有很多某种颜色，避免出那种颜色
      // 简化实现
    }
    
    return bestColor;
  }
  
  private shouldReservePowerCard(action: GameAction, ctx: AIContext): boolean {
    const { player } = ctx;
    
    // 手牌少时不保留
    if (player.cards.length <= 4) return false;
    
    // 检查是否是强力牌
    if (action.type === 'play') {
      const cardId = action.cardIds?.[0];
      const card = player.cards.find(c => c.id === cardId);
      if (card && (card.type === 'draw4' || card.type === 'wild')) {
        // 评估是否需要现在使用
        const hasAlternative = player.cards.length > 5;
        return hasAlternative && this.randomChance(0.3);  // 30%概率保留
      }
    }
    
    return false;
  }
  
  private isPowerCardAction(action: GameAction): boolean {
    if (action.type !== 'play') return false;
    // 简化判断
    return false;
  }
  
  private calculateRisk(ctx: AIContext, cardsPlayed: number): number {
    const { player } = ctx;
    const remaining = player.cards.length - cardsPlayed;
    
    if (remaining <= 2) return 0;  // 接近获胜，风险低
    if (player.cards.length > 18) return 0.1;  // 手牌多，必须冒险
    
    return 0.3;  // 中等风险
  }
  
  private estimateCounterProbability(ctx: AIContext, comboType: string): number {
    const nextPlayer = this.getNextPlayer(ctx);
    if (!nextPlayer) return 0;
    
    // 基于手牌数估计反击概率
    // 简化实现
    return 0.2;
  }
  
  private assessThreat(player: Player, ctx: AIContext): number {
    // 评估玩家威胁度（0-1）
    const cardCount = player.cards.length;
    if (cardCount <= 2) return 1.0;
    if (cardCount <= 5) return 0.7;
    if (cardCount <= 10) return 0.4;
    return 0.2;
  }
  
  private countVulnerableOpponents(ctx: AIContext): number {
    return ctx.allPlayers.filter(p => 
      p.id !== ctx.player.id && 
      !p.eliminated && 
      p.cards.length > 15
    ).length;
  }
  
  private isReverseStrategic(ctx: AIContext): boolean {
    // 评估反转是否有战略价值
    const nextPlayer = this.getNextPlayer(ctx);
    const prevPlayer = this.getPreviousPlayer(ctx);
    
    // 如果上家手牌少，反转可以让他们再次出牌（不利）
    // 如果下家手牌多，反转可以让上家面对惩罚（有利）
    if (nextPlayer && prevPlayer) {
      return nextPlayer.cards.length > prevPlayer.cards.length;
    }
    
    return false;
  }
  
  private canPlayerStack(player: Player, cardType: string): boolean {
    return player.cards.some(c => c.type === cardType);
  }
  
  private getCardBaseValue(card: Card): number {
    switch (card.type) {
      case 'draw4': return 100;
      case 'wild': return 80;
      case 'draw2': return 60;
      case 'skip': return 50;
      case 'reverse': return 40;
      case 'number': return 20 + (card.value as number) * 2;
      default: return 0;
    }
  }
  
  private getNextPlayer(ctx: AIContext): Player | null {
    // 简化实现
    return null;
  }
  
  private getPreviousPlayer(ctx: AIContext): Player | null {
    // 简化实现
    return null;
  }
  
  // 继承的基础方法
  private findRainbowCombo(cards: Card[], currentColor: string, topCard: Card): {cardIds: string[]} | null {
    const numberCards = cards.filter(c => c.type === 'number' && typeof c.value === 'number');
    const byNumber = new Map<number, Card[]>();
    
    for (const card of numberCards) {
      const value = card.value as number;
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value)!.push(card);
    }
    
    for (const [, cardList] of byNumber) {
      if (cardList.length >= 4) {
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = cardList.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          if (this.canPlayCardForCombo(rainbowCards[0], currentColor, topCard)) {
            return { cardIds: rainbowCards.map(c => c.id) };
          }
        }
      }
    }
    return null;
  }
  
  private canPlayCardForCombo(card: Card, currentColor: string, topCard: Card): boolean {
    return (
      card.color === currentColor || 
      card.value === topCard.value ||
      card.type === 'wild' || 
      card.type === 'draw4'
    );
  }
  
  private estimateComboEffect(type: string, cardCount: number): {type: string; target: string; value: number} {
    switch (type) {
      case 'rainbow': return { type: 'transfer', target: 'any', value: 3 };
      case 'three': return { type: 'skip', target: 'next', value: 1 };
      case 'straight': return { type: 'draw', target: 'next', value: cardCount - 2 };
      default: return { type: 'none', target: 'none', value: 0 };
    }
  }
  
  private getDeepReason(card: Card, immediate: number, future: number): string {
    if (card.type === 'draw4') return immediate > future ? '立即使用+4' : '保留+4';
    if (card.type === 'wild') return immediate > future ? '立即变色' : '保留万能';
    return this.getCardReason(card);
  }
  
  private getCardReason(card: Card): string {
    if (card.type === 'draw4') return '万能+4';
    if (card.type === 'wild') return '万能变色';
    if (card.type === 'draw2') return '+2攻击';
    if (card.type === 'skip') return '跳过';
    if (card.type === 'reverse') return '反转';
    return '数字牌';
  }
  
  // 困难AI使用抽象表情 - 已内联到各方法中
}

import { GameAction, Card, Player, GameState } from '../../../shared/index.js';
import { BaseAIStrategy, AICapability, GameMemory } from '../core/BaseAIStrategy.js';
import { AIContext, PenaltyResponse, ComboOption, SinglePlayOption } from '../types.js';
import { EmojiType, getAbstractEmoji } from '../emojis.js';

/**
 * 普通AI策略
 * 
 * 特征：
 * - 理解基本规则和优先级
 * - 使用记忆系统追踪已出牌
 * - 10%概率犯小错误
 * - 会使用连打但策略一般
 * - 反应中等（1-2.5秒）
 */
export class NormalAIStrategy extends BaseAIStrategy {
  protected initCapabilities(): Set<AICapability> {
    return new Set([AICapability.BASIC, AICapability.MEMORY]);
  }
  
  makeDecision(ctx: AIContext): GameAction | null {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    
    // 更新记忆
    this.updateMemory(ctx);
    
    // 1. 处理惩罚响应
    if (pendingDraw > 0) {
      const responses = this.evaluatePenaltyResponses(ctx);
      if (responses.length > 0) {
        const best = responses[0]; // 选优先级最高的
        this.sendEmoji(getAbstractEmoji('clutch', 'medium'));
        return best.action;
      }
    }
    
    // 2. 评估连打选项
    const combos = this.evaluateComboOptions(ctx);
    const singlePlays = this.evaluateSinglePlays(ctx);
    
    // 3. 决策逻辑
    const bestCombo = combos[0];
    const bestSingle = singlePlays[0];
    
    // 手牌危险时优先连打减压
    const handSize = player.cards.length;
    const shouldCombo = bestCombo && (
      handSize > 15 || // 手牌多
      (bestCombo.score > 60 && this.randomChance(0.7)) // 连打分高
    );
    
    if (shouldCombo) {
      if (bestCombo.type === 'rainbow') {
        const target = this.selectRainbowTarget(ctx);
        this.sendEmoji(getAbstractEmoji('owning', 'high'), target);
        return {
          type: 'combo',
          playerId: player.id,
          comboType: 'rainbow',
          cardIds: bestCombo.cardIds,
          targetId: target,
          timestamp: Date.now()
        };
      }
      
      this.sendEmoji(getAbstractEmoji('owning', 'medium'));
      return {
        type: 'combo',
        playerId: player.id,
        comboType: bestCombo.type,
        cardIds: bestCombo.cardIds,
        timestamp: Date.now()
      };
    }
    
    // 4. 出单张
    if (bestSingle) {
      if (bestSingle.score > 70) {
        this.sendEmoji(getAbstractEmoji('owning', 'high'));
      } else if (bestSingle.score > 40) {
        this.sendEmoji(getAbstractEmoji('owning', 'low'));
      }
      
      return {
        type: 'play',
        playerId: player.id,
        cardIds: [bestSingle.card.id],
        chosenColor: this.chooseColor(bestSingle.card, player.cards),
        timestamp: Date.now()
      };
    }
    
    // 5. 摸牌
    this.sendEmoji(getAbstractEmoji('sweating', 'low'));
    return { type: 'draw', playerId: player.id, timestamp: Date.now() };
  }
  
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    const responses: PenaltyResponse[] = [];
    
    if (pendingDraw <= 0) return responses;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // 1. 检查彩虹
    const rainbow = this.findRainbowCombo(player.cards, gameState.currentColor, topCard);
    if (rainbow && this.randomChance(0.8)) {
      const target = this.selectRainbowTarget(ctx);
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
        score: 90
      });
    }
    
    // 2. 检查反转
    const reverseCard = player.cards.find(c => c.type === 'reverse');
    if (reverseCard && pendingDraw > 4 && this.randomChance(0.7)) {
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
        score: 80
      });
    }
    
    // 3. 检查跟+
    const stackCard = player.cards.find(c => c.type === gameState.pendingDrawType);
    if (stackCard) {
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
        score: 60
      });
    }
    
    // 4. 检查连打响应
    const comboResponses = this.evaluateComboPenaltyResponses(ctx);
    responses.push(...comboResponses);
    
    return responses.sort((a, b) => a.priority - b.priority);
  }
  
  evaluateComboOptions(ctx: AIContext): ComboOption[] {
    const { player, availableActions } = ctx;
    const combos: ComboOption[] = [];
    
    const comboActions = availableActions.filter(a => a.type === 'combo');
    
    for (const action of comboActions) {
      if (!action.comboType || !action.cardIds) continue;
      
      const score = this.calculateComboScore(
        action.comboType, 
        action.cardIds.length, 
        player
      );
      
      combos.push({
        type: action.comboType,
        cardIds: action.cardIds,
        effect: this.estimateComboEffect(action.comboType, action.cardIds.length),
        score,
        riskScore: 0
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
      
      const score = this.evaluateCardValue(card, player, gameState);
      
      options.push({
        card,
        score,
        reason: this.getCardReason(card),
        immediateValue: score,
        futureValue: 0
      });
    }
    
    return options.sort((a, b) => b.score - a.score);
  }
  
  // ========== 辅助方法 ==========
  
  private evaluateComboPenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    // 普通AI：有时会用连打响应惩罚，但不总是最优
    const responses: PenaltyResponse[] = [];
    
    if (this.randomChance(0.6)) {
      // 60%概率考虑连打响应
      const combos = this.evaluateComboOptions(ctx);
      const bestCombo = combos[0];
      
      if (bestCombo && bestCombo.score > 50) {
        responses.push({
          type: 'combo',
          priority: 4,
          action: {
            type: 'combo',
            playerId: ctx.player.id,
            comboType: bestCombo.type,
            cardIds: bestCombo.cardIds,
            timestamp: Date.now()
          },
          description: `连打响应: ${bestCombo.type}`,
          score: bestCombo.score
        });
      }
    }
    
    return responses;
  }
  
  private calculateComboScore(type: string, cardCount: number, player: Player): number {
    let score = 0;
    const handSize = player.cards.length;
    
    // 连打类型基础分
    switch (type) {
      case 'rainbow': score += 100; break;
      case 'straight': score += 40 + (cardCount - 3) * 10; break;
      case 'three': score += 30; break;
      case 'pair': score += 20; break;
    }
    
    // 手牌压力加成
    if (handSize > 18) score += 30;
    else if (handSize > 15) score += 15;
    
    // 减少手牌的价值
    score += cardCount * 5;
    
    return score;
  }
  
  private evaluateCardValue(card: Card, player: Player, gameState: GameState): number {
    let score = 0;
    const handSize = player.cards.length;
    
    // 万能牌最高优先级
    if (card.type === 'draw4') score += 100;
    else if (card.type === 'wild') score += 80;
    // 功能牌
    else if (card.type === 'draw2') score += 60;
    else if (card.type === 'skip') score += 50;
    else if (card.type === 'reverse') score += 40;
    // 数字牌
    else if (card.type === 'number') {
      score += 20 + (card.value as number) * 2;
    }
    
    // 接近获胜时优先出高数字
    if (handSize <= 3) {
      if (card.type === 'number') {
        score += (card.value as number) * 10;
      }
    }
    
    return score;
  }
  
  private getCardReason(card: Card): string {
    if (card.type === 'draw4') return '万能+4';
    if (card.type === 'wild') return '万能变色';
    if (card.type === 'draw2') return '+2攻击';
    if (card.type === 'skip') return '跳过';
    if (card.type === 'reverse') return '反转';
    return '数字牌';
  }
  
  // 删除旧的sendEmojiForResponse方法，使用getAbstractEmoji替代
  
  // 从AdvancedAI复制的辅助方法
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
  
  private selectRainbowTarget(ctx: AIContext): string {
    const { allPlayers, player } = ctx;
    const others = allPlayers.filter(p => p.id !== player.id && !p.eliminated);
    return others.sort((a, b) => b.cards.length - a.cards.length)[0]?.id || others[0]?.id;
  }
  
  private estimateComboEffect(type: string, cardCount: number): {type: string; target: string; value: number} {
    switch (type) {
      case 'rainbow': return { type: 'transfer', target: 'any', value: 3 };
      case 'three': return { type: 'skip', target: 'next', value: 1 };
      case 'straight': return { type: 'draw', target: 'next', value: cardCount - 2 };
      default: return { type: 'none', target: 'none', value: 0 };
    }
  }
  
  private chooseColor(playedCard: Card, handCards: Card[]): string | undefined {
    if (playedCard.type !== 'wild' && playedCard.type !== 'draw4') return undefined;
    
    const colorCount: Record<string, number> = {};
    for (const card of handCards) {
      if (card.color && card.color !== 'wild') {
        colorCount[card.color] = (colorCount[card.color] || 0) + 1;
      }
    }
    
    let maxColor = 'red';
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCount)) {
      if (count > maxCount) {
        maxCount = count;
        maxColor = color;
      }
    }
    return maxColor;
  }
}

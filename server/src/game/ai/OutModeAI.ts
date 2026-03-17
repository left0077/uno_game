import { Player, GameState, Card, GameAction } from '../../shared/index.js';
import { CardManager } from '../Card.js';
import { 
  AIStrategy, 
  AIContext, 
  PenaltyResponse, 
  ComboOption,
  AIDifficultyConfig 
} from './AIStrategy.js';
import { ComboType } from '../../shared/index.js';

/**
 * Out模式AI策略实现
 * 
 * 核心设计：
 * 1. 惩罚响应严格遵循规则书优先级：彩虹 > 反转 > 跟+ > 接受
 * 2. 连打决策考虑手牌风险（接近20张上限时更保守）
 * 3. 单张出牌考虑对手手牌数和游戏阶段
 */
export class OutModeAIStrategy implements AIStrategy {
  private config: AIDifficultyConfig;
  
  constructor(config: AIDifficultyConfig) {
    this.config = config;
  }
  
  /**
   * 评估惩罚响应选项
   * 按规则书优先级：彩虹(1) > 反转(2) > 跟+(3) > 接受(4)
   */
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    const { player, gameState, availableActions } = ctx;
    const responses: PenaltyResponse[] = [];
    
    const pendingDraw = gameState.pendingDraw || 0;
    const pendingType = gameState.pendingDrawType;
    
    if (pendingDraw <= 0 || !pendingType) {
      return responses;
    }
    
    // 1. 检查彩虹响应（最高优先级）
    const rainbowAction = this.findRainbowAction(availableActions);
    if (rainbowAction) {
      responses.push({
        type: 'rainbow',
        priority: 1,
        action: rainbowAction,
        description: `彩虹转移：将${pendingDraw}+3惩罚转移给指定玩家`
      });
    }
    
    // 2. 检查反转响应（第二优先级）
    const reverseAction = this.findReverseAction(player.cards, gameState);
    if (reverseAction) {
      responses.push({
        type: 'reverse',
        priority: 2,
        action: reverseAction,
        description: `反转反击：将${pendingDraw}张惩罚弹回给攻击者`
      });
    }
    
    // 3. 检查跟+响应（第三优先级）
    const stackAction = this.findStackAction(player.cards, pendingType);
    if (stackAction) {
      responses.push({
        type: 'stack',
        priority: 3,
        action: stackAction,
        description: `跟+：继续叠加惩罚至${pendingDraw + this.getStackValue(stackAction)}张`
      });
    }
    
    // 4. 接受惩罚（最后选择）
    responses.push({
      type: 'accept',
      priority: 4,
      action: { type: 'draw', playerId: player.id, timestamp: Date.now() },
      description: `接受惩罚：摸${pendingDraw}张牌`
    });
    
    return responses.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * 评估连打选项
   */
  evaluateComboOptions(ctx: AIContext): ComboOption[] {
    const { player, availableActions } = ctx;
    const combos: ComboOption[] = [];
    
    // 从availableActions中筛选连打动作
    const comboActions = availableActions.filter(a => a.type === 'combo');
    
    for (const action of comboActions) {
      if (!action.comboType || !action.cardIds) continue;
      
      const riskScore = this.calculateComboRisk(action.comboType, action.cardIds.length, player);
      
      combos.push({
        type: action.comboType as ComboType,
        cardIds: action.cardIds,
        effect: this.estimateComboEffect(action.comboType as ComboType, action.cardIds.length),
        riskScore
      });
    }
    
    return combos.sort((a, b) => a.riskScore - b.riskScore); // 低风险优先
  }
  
  /**
   * 评估单张出牌选项
   */
  evaluateSinglePlays(ctx: AIContext): Array<{card: Card; score: number; reason: string}> {
    const { player, gameState, allPlayers, availableActions } = ctx;
    const options: Array<{card: Card; score: number; reason: string}> = [];
    
    const playActions = availableActions.filter(a => 
      a.type === 'play' && a.cardIds && a.cardIds.length === 1
    );
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    for (const action of playActions) {
      const card = player.cards.find(c => c.id === action.cardIds![0]);
      if (!card) continue;
      
      const { score, reason } = this.evaluateSingleCard(
        card, 
        player, 
        gameState, 
        allPlayers,
        topCard
      );
      
      options.push({ card, score, reason });
    }
    
    return options.sort((a, b) => b.score - a.score);
  }
  
  /**
   * 做出最终决策
   */
  makeDecision(ctx: AIContext): GameAction | null {
    const { player, gameState } = ctx;
    
    // 1. 首先处理惩罚响应（如果有）
    const pendingDraw = gameState.pendingDraw || 0;
    if (pendingDraw > 0) {
      const penaltyResponse = this.selectPenaltyResponse(ctx);
      if (penaltyResponse) {
        return penaltyResponse.action;
      }
    }
    
    // 2. 评估连打选项
    const combos = this.evaluateComboOptions(ctx);
    const bestCombo = this.selectBestCombo(combos, player);
    
    // 3. 评估单张出牌
    const singlePlays = this.evaluateSinglePlays(ctx);
    const bestSingle = singlePlays[0];
    
    // 4. 决策：连打 vs 单张
    if (bestCombo && this.shouldUseCombo(bestCombo, bestSingle, player)) {
      return this.createComboAction(bestCombo, ctx);
    }
    
    // 5. 出单张
    if (bestSingle) {
      return {
        type: 'play',
        playerId: player.id,
        cardIds: [bestSingle.card.id],
        chosenColor: this.chooseColor(bestSingle.card, player.cards),
        timestamp: Date.now()
      };
    }
    
    // 6. 无法出牌，摸牌
    return { type: 'draw', playerId: player.id, timestamp: Date.now() };
  }
  
  // ============ 私有辅助方法 ============
  
  private findRainbowAction(availableActions: GameAction[]): GameAction | null {
    const rainbow = availableActions.find(a => 
      a.type === 'combo' && a.comboType === 'rainbow'
    );
    return rainbow || null;
  }
  
  private findReverseAction(cards: Card[], gameState: GameState): GameAction | null {
    const reverse = cards.find(c => c.type === 'reverse');
    if (!reverse) return null;
    
    // 检查是否可以在惩罚响应时出反转
    // 规则书：反转可以弹回累积惩罚
    return {
      type: 'play',
      playerId: gameState.currentPlayerId,
      cardIds: [reverse.id],
      timestamp: Date.now()
    };
  }
  
  private findStackAction(cards: Card[], pendingType: string): GameAction | null {
    // 可叠加的牌：同类型+牌 或 +8万能牌
    const stackable = cards.find(c => 
      c.type === pendingType || c.type === 'draw8'
    );
    
    if (!stackable) return null;
    
    return {
      type: 'play',
      playerId: cards[0]?.id || '', // 这里需要修正
      cardIds: [stackable.id],
      timestamp: Date.now()
    };
  }
  
  private getStackValue(action: GameAction): number {
    // 根据牌类型返回叠加值
    // 简化处理，实际需要看牌的具体类型
    return 2; // 默认+2
  }
  
  private selectPenaltyResponse(ctx: AIContext): PenaltyResponse | null {
    const responses = this.evaluatePenaltyResponses(ctx);
    if (responses.length === 0) return null;
    
    // 按难度选择
    const bias = this.config.penaltyResponseBias;
    
    // 计算每个选项的权重
    const weights = responses.map(r => {
      switch (r.type) {
        case 'rainbow': return { response: r, weight: bias.rainbow / r.priority };
        case 'reverse': return { response: r, weight: bias.reverse / r.priority };
        case 'stack': return { response: r, weight: bias.stack / r.priority };
        case 'accept': return { response: r, weight: bias.accept / r.priority };
      }
    });
    
    // 加权随机选择
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { response, weight } of weights) {
      random -= weight;
      if (random <= 0) return response;
    }
    
    return responses[responses.length - 1]; // 默认接受惩罚
  }
  
  private calculateComboRisk(comboType: ComboType, cardCount: number, player: Player): number {
    const handSize = player.cards.length;
    const remainingCards = handSize - cardCount;
    
    // 风险评分：出完后剩余手牌越少风险越高（接近20张上限）
    let baseRisk = 0;
    
    // 手牌健康度评分
    if (remainingCards > 15) baseRisk = 0.9; // 危险区
    else if (remainingCards > 10) baseRisk = 0.5; // 警告区
    else baseRisk = 0.2; // 安全区
    
    // 连打类型的风险调整
    switch (comboType) {
      case 'rainbow':
        // 彩虹有转移效果，风险较低
        baseRisk *= 0.7;
        break;
      case 'straight':
        // 顺子可能让下家摸牌，风险中等
        baseRisk *= 0.9;
        break;
      case 'three':
        // 三条跳过效果，风险低
        baseRisk *= 0.8;
        break;
      case 'pair':
        // 对子无特殊效果，标准风险
        break;
    }
    
    return baseRisk;
  }
  
  private estimateComboEffect(type: ComboType, cardCount: number): {type: string; target: string; value: number} {
    switch (type) {
      case 'pair':
        return { type: 'none', target: 'next', value: 0 };
      case 'three':
        return { type: 'skip', target: 'next', value: 1 };
      case 'rainbow':
        return { type: 'draw', target: 'chooser', value: 3 };
      case 'straight':
        return { type: 'draw', target: 'next', value: Math.max(1, cardCount - 2) };
      default:
        return { type: 'none', target: 'next', value: 0 };
    }
  }
  
  private selectBestCombo(combos: ComboOption[], player: Player): ComboOption | null {
    if (combos.length === 0) return null;
    
    const handSize = player.cards.length;
    const isRisky = handSize > 15;
    
    // 根据手牌状况选择
    const bias = isRisky ? this.config.comboBias.whenRisky : this.config.comboBias.whenHealthy;
    
    // 如果风险意识强且手牌危险，选择风险最低的
    if (this.config.riskAwareness > 0.7 && isRisky) {
      return combos[0]; // 已按风险排序，第一个风险最低
    }
    
    // 加权选择
    const suitableCombos = combos.filter(c => c.riskScore < bias);
    return suitableCombos[0] || combos[0];
  }
  
  private shouldUseCombo(combo: ComboOption, bestSingle: {card: Card; score: number} | undefined, player: Player): boolean {
    if (!bestSingle) return true;
    
    const handSize = player.cards.length;
    const isRisky = handSize > 15;
    
    // 手牌危险时，优先减压（连打出更多牌）
    if (isRisky && combo.cardIds.length >= 3) {
      return true;
    }
    
    // 连打效果评分
    let comboScore = combo.cardIds.length * 10; // 每多一张牌+10分
    if (combo.type === 'rainbow') comboScore += 50; // 彩虹额外加分
    if (combo.type === 'straight') comboScore += combo.cardIds.length * 5;
    
    // 风险扣分
    comboScore -= combo.riskScore * 30;
    
    return comboScore > bestSingle.score;
  }
  
  private createComboAction(combo: ComboOption, ctx: AIContext): GameAction {
    const { player, allPlayers, gameState } = ctx;
    
    const action: GameAction = {
      type: 'combo',
      playerId: player.id,
      comboType: combo.type,
      cardIds: combo.cardIds,
      timestamp: Date.now()
    };
    
    // 彩虹需要指定目标
    if (combo.type === 'rainbow') {
      // 选择手牌最多的玩家（最健康的目标）
      const target = this.selectRainbowTarget(allPlayers, player.id, gameState);
      if (target) {
        action.targetId = target;
      }
    }
    
    return action;
  }
  
  private selectRainbowTarget(allPlayers: Player[], selfId: string, gameState: GameState): string | null {
    // 优先选择手牌最多的对手（最不容易被淘汰）
    const opponents = allPlayers.filter(p => 
      p.id !== selfId && !p.eliminated
    );
    
    if (opponents.length === 0) return null;
    
    // 考虑上家（如果上家出了+牌，转移给他）
    // 简单策略：选手牌最多的
    const target = opponents.reduce((max, p) => 
      p.cards.length > max.cards.length ? p : max
    );
    
    return target.id;
  }
  
  private evaluateSingleCard(
    card: Card, 
    player: Player, 
    gameState: GameState, 
    allPlayers: Player[],
    topCard: Card
  ): {score: number; reason: string} {
    let score = 50; // 基础分
    let reasons: string[] = [];
    
    const handSize = player.cards.length;
    const isRisky = handSize > 15;
    
    // 1. 牌型评分
    switch (card.type) {
      case 'draw8':
        score += 40;
        reasons.push('+8万能牌');
        break;
      case 'draw5':
      case 'draw3':
        score += 30;
        reasons.push('惩罚卡');
        break;
      case 'draw2':
      case 'draw4':
        score += 25;
        reasons.push('加牌');
        break;
      case 'skip':
        score += 20;
        reasons.push('跳过');
        break;
      case 'reverse':
        score += 15;
        reasons.push('反转');
        break;
      case 'wild':
        score += 10;
        reasons.push('万能');
        break;
      case 'number':
        // 数字牌基础分，手牌危险时优先出
        score += isRisky ? 15 : 5;
        reasons.push(isRisky ? '减压（手牌多）' : '数字牌');
        break;
    }
    
    // 2. 对手威胁评估
    const minOpponentCards = Math.min(...allPlayers
      .filter(p => p.id !== player.id && !p.eliminated)
      .map(p => p.cardCount)
    );
    
    if (minOpponentCards <= 2) {
      // 有对手快赢了，优先使用功能牌
      if (['draw2', 'draw4', 'draw8', 'skip', 'reverse'].includes(card.type)) {
        score += 30;
        reasons.push('阻止对手获胜');
      }
    }
    
    // 3. 手牌健康度
    if (isRisky) {
      // 手牌危险时，优先减少手牌数量
      score += 20;
      reasons.push('急需减压');
    }
    
    // 4. 颜色匹配（保留手牌中数量最多的颜色）
    const colorCounts = new Map<string, number>();
    player.cards.forEach(c => {
      if (c.color && c.color !== 'wild') {
        colorCounts.set(c.color, (colorCounts.get(c.color) || 0) + 1);
      }
    });
    
    const maxColorCount = Math.max(...colorCounts.values(), 0);
    if (card.color && colorCounts.get(card.color) === maxColorCount && maxColorCount > 1) {
      // 如果这张牌的颜色是手牌中最多的，保留它（减分）
      score -= 10;
      reasons.push('保留主色');
    }
    
    return { score, reason: reasons.join(', ') };
  }
  
  private chooseColor(card: Card, handCards: Card[]): string | undefined {
    if (!['wild', 'draw4', 'draw8'].includes(card.type)) {
      return card.color;
    }
    
    // 选择手牌中最多的颜色
    const colorCount = new Map<string, number>();
    handCards.forEach(c => {
      if (c.color && c.color !== 'wild') {
        colorCount.set(c.color, (colorCount.get(c.color) || 0) + 1);
      }
    });
    
    let maxCount = 0;
    let bestColor = 'red';
    colorCount.forEach((count, color) => {
      if (count > maxCount) {
        maxCount = count;
        bestColor = color;
      }
    });
    
    return bestColor;
  }
}

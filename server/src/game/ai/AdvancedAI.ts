import { Player, GameState, Card, GameAction } from '../../shared/index.js';
import { ComboType } from '../../shared/index.js';
import { AIStrategy, AIContext, PenaltyResponse, ComboOption, AIDifficultyConfig, DEFAULT_DIFFICULTY_CONFIGS } from './AIStrategy.js';

/**
 * 表情类型
 */
export type EmojiType = 
  | 'thinking'      // 思考中
  | 'happy'         // 开心
  | 'sad'           // 难过
  | 'angry'         // 生气
  | 'surprised'     // 惊讶
  | 'taunt'         // 嘲讽
  | 'desperate'     // 绝望
  | 'victory';      // 胜利

/**
 * 表情消息
 */
export interface EmojiMessage {
  type: 'emoji';
  emoji: EmojiType;
  target?: string;  // 针对特定玩家
}

/**
 * 高级AI策略
 * 
 * 基于最新规则设计：
 * 1. 连打可以响应惩罚（对子/三条/彩虹/顺子）
 * 2. 彩虹可以指定任意玩家作为"下家"
 * 3. 反转在被+时弹回给上家，被彩虹指定时弹回给彩虹打出者
 * 4. 惩罚卡可以保留使用
 * 
 * 表情系统：
 * - 思考时发送thinking
 * - 打出好牌时发送happy/taunt
 * - 被惩罚时发送sad/angry
 * - 使用彩虹反转时发送surprised
 * - 即将获胜时发送victory
 * - 手牌过多时发送desperate
 */
export class AdvancedAIStrategy implements AIStrategy {
  protected config: AIDifficultyConfig;
  protected playerId: string;
  protected lastEmojiTime: number = 0;
  protected emojiCooldown: number = 3000; // 表情冷却时间3秒
  
  // 表情回调
  public onSendEmoji?: (emoji: EmojiType, target?: string) => void;
  
  constructor(difficulty: 'easy' | 'normal' | 'hard' = 'normal', playerId: string) {
    this.config = DEFAULT_DIFFICULTY_CONFIGS[difficulty];
    this.playerId = playerId;
  }
  
  /**
   * 发送表情（带冷却）
   */
  protected sendEmoji(emoji: EmojiType, target?: string): void {
    const now = Date.now();
    if (now - this.lastEmojiTime < this.emojiCooldown) return;
    
    this.lastEmojiTime = now;
    this.onSendEmoji?.(emoji, target);
  }
  
  /**
   * 评估惩罚响应选项（按新规则）
   * 
   * 优先级：
   * 1. 彩虹 - 转移惩罚+3给任意玩家
   * 2. 反转 - 弹回给攻击者
   * 3. 跟+ - 累积惩罚
   * 4. 连打 - 使用对子/三条/彩虹/顺子响应
   * 5. 接受 - 摸牌
   */
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    const responses: PenaltyResponse[] = [];
    
    if (pendingDraw <= 0) return responses;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // 1. 检查彩虹（优先级1）- 可以转移惩罚+3给任意玩家
    const rainbowCombo = this.findRainbowCombo(player.cards, gameState.currentColor, topCard);
    if (rainbowCombo) {
      // 选择目标：手牌最多的玩家（高难度）或随机（低难度）
      const target = this.selectRainbowTarget(ctx);
      responses.push({
        type: 'rainbow',
        priority: 1,
        action: {
          type: 'combo',
          playerId: player.id,
          comboType: 'rainbow',
          cardIds: rainbowCombo.cardIds,
          targetId: target,
          timestamp: Date.now()
        },
        description: `彩虹转移 +${pendingDraw + 3} 给 ${target}`
      });
    }
    
    // 2. 检查反转（优先级2）- 弹回给攻击者
    const reverseCard = player.cards.find(c => c.type === 'reverse');
    if (reverseCard) {
      responses.push({
        type: 'reverse',
        priority: 2,
        action: {
          type: 'play',
          playerId: player.id,
          cardIds: [reverseCard.id],
          timestamp: Date.now()
        },
        description: `反转弹回 +${pendingDraw}`
      });
    }
    
    // 3. 检查跟+（优先级3）- 累积惩罚
    const stackCard = this.findStackCard(player.cards, gameState.pendingDrawType);
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
        description: `跟+ 累积到 +${pendingDraw + this.getDrawCount(stackCard.type)}`
      });
    }
    
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
    
    return combos.sort((a, b) => a.riskScore - b.riskScore);
  }
  
  /**
   * 评估单张出牌选项
   */
  evaluateSinglePlays(ctx: AIContext): Array<{card: Card; score: number; reason: string}> {
    const { player, gameState, availableActions } = ctx;
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
        ctx.allPlayers,
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
    const pendingDraw = gameState.pendingDraw || 0;
    const handSize = player.cards.length;
    const isHealthy = handSize < 15;
    
    // 检查手牌危险程度
    if (handSize > 18) {
      this.sendEmoji('desperate');
    }
    
    // 1. 首先处理惩罚响应（如果有）
    if (pendingDraw > 0) {
      this.sendEmoji('thinking');
      const penaltyResponse = this.selectPenaltyResponse(ctx);
      if (penaltyResponse) {
        // 根据响应类型发送表情
        if (penaltyResponse.type === 'rainbow') {
          this.sendEmoji('surprised', penaltyResponse.action.targetId);
        } else if (penaltyResponse.type === 'reverse') {
          this.sendEmoji('taunt');
        } else if (penaltyResponse.type === 'accept') {
          this.sendEmoji('sad');
        }
        return penaltyResponse.action;
      }
    }
    
    // 2. 评估连打选项
    const combos = this.evaluateComboOptions(ctx);
    const bestCombo = this.selectBestCombo(combos, player);
    
    // 3. 评估单张出牌
    const singlePlays = this.evaluateSinglePlays(ctx);
    const bestSingle = singlePlays[0];
    
    // 4. 决策逻辑
    const shouldCombo = this.shouldUseCombo(bestCombo, bestSingle, player);
    
    if (shouldCombo && bestCombo) {
      // 使用连打
      if (bestCombo.type === 'rainbow') {
        const target = this.selectRainbowTarget(ctx);
        this.sendEmoji('surprised', target);
        return {
          type: 'combo',
          playerId: player.id,
          comboType: 'rainbow',
          cardIds: bestCombo.cardIds,
          targetId: target,
          timestamp: Date.now()
        };
      }
      
      this.sendEmoji('happy');
      return {
        type: 'combo',
        playerId: player.id,
        comboType: bestCombo.type,
        cardIds: bestCombo.cardIds,
        timestamp: Date.now()
      };
    }
    
    // 5. 出单张
    if (bestSingle) {
      // 打出好牌时发送表情
      if (bestSingle.score > 80) {
        this.sendEmoji('taunt');
      } else if (bestSingle.score > 50) {
        this.sendEmoji('happy');
      }
      
      return {
        type: 'play',
        playerId: player.id,
        cardIds: [bestSingle.card.id],
        chosenColor: this.chooseColor(bestSingle.card, player.cards),
        timestamp: Date.now()
      };
    }
    
    // 6. 无法出牌，摸牌
    this.sendEmoji('thinking');
    return { type: 'draw', playerId: player.id, timestamp: Date.now() };
  }
  
  // ============ 辅助方法 ============
  
  /**
   * 选择彩虹转移目标
   * 高难度：手牌最多的玩家
   * 低难度：随机选择
   */
  private selectRainbowTarget(ctx: AIContext): string {
    const { allPlayers, player } = ctx;
    const otherPlayers = allPlayers.filter(p => p.id !== player.id && !p.eliminated);
    
    if (this.config.difficulty === 'hard') {
      // 选择手牌最多的玩家
      const target = otherPlayers.sort((a, b) => b.cards.length - a.cards.length)[0];
      return target?.id || otherPlayers[0]?.id || player.id;
    } else if (this.config.difficulty === 'normal') {
      // 选择手牌较多的玩家（前50%）
      const sorted = otherPlayers.sort((a, b) => b.cards.length - a.cards.length);
      const halfIndex = Math.floor(sorted.length / 2);
      const candidates = sorted.slice(0, Math.max(1, halfIndex));
      return candidates[Math.floor(Math.random() * candidates.length)]?.id || otherPlayers[0]?.id;
    } else {
      // 随机选择
      return otherPlayers[Math.floor(Math.random() * otherPlayers.length)]?.id || player.id;
    }
  }
  
  /**
   * 选择惩罚响应
   */
  private selectPenaltyResponse(ctx: AIContext): PenaltyResponse | null {
    const responses = this.evaluatePenaltyResponses(ctx);
    if (responses.length === 0) return null;
    
    const { player } = ctx;
    const handSize = player.cards.length;
    const isRisky = handSize > 15;
    
    // 根据难度和手牌情况选择
    const bias = this.config.penaltyResponseBias;
    
    for (const response of responses) {
      const random = Math.random();
      switch (response.type) {
        case 'rainbow':
          if (random < bias.rainbow) return response;
          break;
        case 'reverse':
          if (random < bias.reverse) return response;
          break;
        case 'stack':
          if (random < bias.stack) return response;
          break;
      }
    }
    
    // 默认接受惩罚
    const pendingDraw = ctx.gameState.pendingDraw || 0;
    return {
      type: 'accept',
      priority: 99,
      action: { type: 'draw', playerId: player.id, timestamp: Date.now() },
      description: `接受惩罚 +${pendingDraw}`
    };
  }
  
  /**
   * 查找彩虹组合
   */
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
          // 验证第一张牌可出
          if (this.canPlayCardForCombo(rainbowCards[0], currentColor, topCard)) {
            return { cardIds: rainbowCards.map(c => c.id) };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 查找可跟+的牌
   */
  private findStackCard(cards: Card[], pendingType?: string): Card | null {
    if (!pendingType) return null;
    return cards.find(c => c.type === pendingType) || null;
  }
  
  /**
   * 检查卡牌是否可以作为连打的第一张牌
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
   * 获取摸牌数量
   */
  private getDrawCount(cardType: string): number {
    switch (cardType) {
      case 'draw2': return 2;
      case 'draw4': return 4;
      case 'draw3': return 3;
      case 'draw5': return 5;
      case 'draw8': return 8;
      default: return 0;
    }
  }
  
  /**
   * 计算连打风险
   */
  private calculateComboRisk(comboType: ComboType, cardCount: number, player: Player): number {
    const handSize = player.cards.length;
    const afterSize = handSize - cardCount;
    
    // 基础风险
    let risk = 0;
    
    // 手牌越少风险越低（连打可以快速减少手牌）
    if (afterSize < 5) risk -= 20;  // 接近获胜
    else if (afterSize < 10) risk -= 10;
    
    // 连打类型风险
    switch (comboType) {
      case 'rainbow':
        risk -= 15; // 彩虹很强大
        break;
      case 'straight':
        risk -= 10; // 顺子也不错
        break;
      case 'three':
        risk -= 5;
        break;
      case 'pair':
        risk += 5; // 对子效果一般
        break;
    }
    
    // 手牌危险程度
    if (handSize > 15) risk -= 15; // 手牌多时要积极减压
    if (handSize > 18) risk -= 25; // 很危险了
    
    return Math.max(0, risk);
  }
  
  /**
   * 估计连打效果
   */
  private estimateComboEffect(comboType: ComboType, cardCount: number): {
    type: string;
    target: string;
    value: number;
  } {
    switch (comboType) {
      case 'rainbow':
        return { type: 'transfer', target: 'any', value: 3 };
      case 'three':
        return { type: 'skip', target: 'next', value: 1 };
      case 'straight':
        return { type: 'draw', target: 'next', value: Math.max(1, cardCount - 2) };
      default:
        return { type: 'none', target: 'none', value: 0 };
    }
  }
  
  /**
   * 选择最佳连打
   */
  private selectBestCombo(combos: ComboOption[], player: Player): ComboOption | null {
    if (combos.length === 0) return null;
    
    const handSize = player.cards.length;
    const isRisky = handSize > 15;
    
    // 根据手牌情况选择
    if (isRisky) {
      // 手牌危险时，选择出牌最多的连打
      return combos.sort((a, b) => b.cardIds.length - a.cardIds.length)[0];
    }
    
    // 正常情况下选择风险最低的
    return combos[0];
  }
  
  /**
   * 判断是否使用连打
   */
  private shouldUseCombo(bestCombo: ComboOption | null, bestSingle: {card: Card; score: number} | undefined, player: Player): boolean {
    if (!bestCombo) return false;
    
    const handSize = player.cards.length;
    const bias = this.config.comboBias;
    const comboBias = handSize > 15 ? bias.whenRisky : bias.whenHealthy;
    
    // 如果单张评分很高，优先出单张
    if (bestSingle && bestSingle.score > 90) return false;
    
    // 根据倾向性判断
    return Math.random() < comboBias;
  }
  
  /**
   * 评估单张卡牌
   */
  private evaluateSingleCard(
    card: Card, 
    player: Player, 
    gameState: GameState, 
    allPlayers: Player[],
    topCard: Card
  ): {score: number; reason: string} {
    let score = 0;
    let reason = '';
    
    const handSize = player.cards.length;
    
    // 万能牌高优先级
    if (card.type === 'draw4') {
      score += 100;
      reason = '万能+4';
    } else if (card.type === 'wild') {
      score += 80;
      reason = '万能变色';
    }
    // 功能牌
    else if (card.type === 'draw2') {
      score += 60;
      reason = '+2攻击';
    } else if (card.type === 'skip') {
      score += 50;
      reason = '跳过';
    } else if (card.type === 'reverse') {
      score += 40;
      reason = '反转';
    }
    // 数字牌
    else if (card.type === 'number') {
      // 接近获胜时优先出高数字
      if (handSize <= 3) {
        score += (card.value as number) * 5;
        reason = '高数字';
      } else {
        score += 20;
        reason = '数字牌';
      }
    }
    
    return { score, reason };
  }
  
  /**
   * 选择颜色
   */
  private chooseColor(playedCard: Card, handCards: Card[]): string | undefined {
    if (playedCard.type !== 'wild' && playedCard.type !== 'draw4') {
      return undefined;
    }
    
    // 统计手牌颜色分布
    const colorCount: Record<string, number> = {};
    for (const card of handCards) {
      if (card.color && card.color !== 'wild') {
        colorCount[card.color] = (colorCount[card.color] || 0) + 1;
      }
    }
    
    // 选择手牌中最多的颜色
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

export default AdvancedAIStrategy;

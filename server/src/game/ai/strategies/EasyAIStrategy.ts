import { GameAction } from '../../../shared/index.js';
import { BaseAIStrategy, AICapability } from '../core/BaseAIStrategy.js';
import { AIContext, PenaltyResponse, ComboOption } from '../types.js';
import { EmojiType, getAbstractEmoji } from '../emojis.js';

/**
 * 简单AI策略
 * 
 * 特征：
 * - 基本不懂规则，经常随机出牌
 * - 30%概率犯明显错误（如不出能出的牌）
 * - 不使用连打、彩虹等高级技巧
 * - 反应慢（2-4秒）
 * - 偶尔摸牌后忘记立即打出（即使可以）
 */
export class EasyAIStrategy extends BaseAIStrategy {
  protected initCapabilities(): Set<AICapability> {
    return new Set([AICapability.BASIC]);
  }
  
  makeDecision(ctx: AIContext): GameAction | null {
    const { player, availableActions } = ctx;
    
    // 偶尔发呆（不出牌只摸牌）
    if (this.randomChance(0.15)) {
      this.sendEmoji(getAbstractEmoji('sweating', 'low'));
      return { type: 'draw', playerId: player.id, timestamp: Date.now() };
    }
    
    // 过滤出简单动作（只考虑单张出牌和摸牌）
    const simpleActions = availableActions.filter(a => 
      a.type === 'play' || a.type === 'draw'
    );
    
    // 30%概率随机选择（可能选到次优解）
    if (this.makeMistake()) {
      const randomAction = this.randomChoice(simpleActions);
      if (randomAction) {
        this.sendEmoji(getAbstractEmoji('owning', 'low'));
        return randomAction;
      }
    }
    
    // 正常情况：有牌就出，没牌就摸
    const playActions = simpleActions.filter(a => a.type === 'play');
    if (playActions.length > 0) {
      // 简单AI：随机选一张能出的牌
      const action = this.randomChoice(playActions)!;
      this.sendEmoji(getAbstractEmoji('owning', 'low'));
      return action;
    }
    
    // 摸牌（摆烂）
    this.sendEmoji('bailan');
    return { type: 'draw', playerId: player.id, timestamp: Date.now() };
  }
  
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[] {
    const { player, gameState } = ctx;
    const pendingDraw = gameState.pendingDraw || 0;
    
    if (pendingDraw <= 0) return [];
    
    // 简单AI：50%概率忘记可以跟+，直接摸牌
    if (this.randomChance(0.5)) {
      this.sendEmoji(getAbstractEmoji('getting_owned', 'medium'));
      return [{
        type: 'accept',
        priority: 99,
        action: { type: 'draw', playerId: player.id, timestamp: Date.now() },
        description: '接受惩罚',
        score: 0
      }];
    }
    
    // 偶尔知道可以跟+
    const stackCard = player.cards.find(c => 
      c.type === gameState.pendingDrawType
    );
    
    if (stackCard && this.randomChance(0.6)) {
      return [{
        type: 'stack',
        priority: 1,
        action: {
          type: 'play',
          playerId: player.id,
          cardIds: [stackCard.id],
          timestamp: Date.now()
        },
        description: '跟+',
        score: 50
      }];
    }
    
    // 默认接受
    this.sendEmoji(getAbstractEmoji('getting_owned', 'low'));
    return [{
      type: 'accept',
      priority: 99,
      action: { type: 'draw', playerId: player.id, timestamp: Date.now() },
      description: '接受惩罚',
      score: 0
    }];
  }
  
  evaluateComboOptions(ctx: AIContext): ComboOption[] {
    // 简单AI：不使用连打
    return [];
  }
}

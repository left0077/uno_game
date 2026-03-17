import { Player, GameState, GameAction } from '../../shared/index.js';
import { AIContext, AIDifficultyConfig, DEFAULT_DIFFICULTY_CONFIGS } from './types.js';
import { EmojiType } from './emojis.js';
import { BaseAIStrategy, AICapability } from './core/BaseAIStrategy.js';
import { EasyAIStrategy } from './strategies/EasyAIStrategy.js';
import { NormalAIStrategy } from './strategies/NormalAIStrategy.js';
import { HardAIStrategy } from './strategies/HardAIStrategy.js';

/**
 * AI玩家主类 - V2架构简化版
 */
export class AIPlayer {
  private static strategyCache = new Map<string, BaseAIStrategy>();
  static onSendEmoji?: (playerId: string, emoji: EmojiType, target?: string) => void;
  
  /**
   * 获取AI行动
   */
  static getAIAction(
    player: Player,
    gameState: GameState,
    allPlayers: Player[]
  ): GameAction | null {
    if (!player.isAI || !player.aiDifficulty) return null;
    
    // V2: 直接使用策略决策，不再依赖GameMode
    const availableActions = this.calculateAvailableActions(player, gameState);
    
    const context: AIContext = {
      player,
      gameState,
      allPlayers,
      availableActions
    };
    
    const strategy = this.getStrategy(player.id, player.aiDifficulty);
    return strategy.makeDecision(context);
  }
  
  /**
   * V2: 计算可用动作（简化版，直接在AIPlayer中实现）
   */
  private static calculateAvailableActions(
    player: Player,
    gameState: GameState
  ): GameAction[] {
    const actions: GameAction[] = [];
    
    // 简化的可用动作计算
    // 实际游戏中，这些应该由服务器推送或从v2:availableActions获取
    
    // 摸牌总是可用
    actions.push({
      type: 'draw',
      playerId: player.id,
      timestamp: Date.now()
    });
    
    // 如果有手牌，添加出牌动作
    for (const card of player.cards) {
      actions.push({
        type: 'play',
        playerId: player.id,
        cardIds: [card.id],
        timestamp: Date.now()
      });
    }
    
    // UNO按钮（剩2张或更少时）
    if (player.cards.length <= 2) {
      actions.push({
        type: 'uno',
        playerId: player.id,
        timestamp: Date.now()
      });
    }
    
    return actions;
  }
  
  /**
   * 获取/创建策略
   */
  private static getStrategy(
    playerId: string,
    difficulty: string
  ): BaseAIStrategy {
    const cacheKey = `${playerId}_${difficulty}`;
    
    if (this.strategyCache.has(cacheKey)) {
      return this.strategyCache.get(cacheKey)!;
    }
    
    let strategy: BaseAIStrategy;
    switch (difficulty) {
      case 'easy':
        strategy = new EasyAIStrategy(playerId, 'easy');
        break;
      case 'hard':
        strategy = new HardAIStrategy(playerId, 'hard');
        break;
      case 'normal':
      default:
        strategy = new NormalAIStrategy(playerId, 'normal');
        break;
    }
    
    strategy.onSendEmoji = (emoji, target) => {
      this.onSendEmoji?.(playerId, emoji, target);
    };
    
    this.strategyCache.set(cacheKey, strategy);
    return strategy;
  }
  
  /**
   * 获取决策延迟
   */
  static getDecisionDelay(difficulty: 'easy' | 'normal' | 'hard'): number {
    const config = DEFAULT_DIFFICULTY_CONFIGS[difficulty];
    const [min, max] = config.reactionDelay;
    return min + Math.random() * (max - min);
  }
  
  /**
   * 清除缓存
   */
  static clearStrategyCache(playerId?: string): void {
    if (playerId) {
      for (const key of this.strategyCache.keys()) {
        if (key.startsWith(`${playerId}_`)) {
          this.strategyCache.delete(key);
        }
      }
    } else {
      this.strategyCache.clear();
    }
  }
}

// 保持向后兼容的导出
export { EasyAIStrategy, NormalAIStrategy, HardAIStrategy };

import { Player, GameState, GameAction } from '../../shared/index.js';
import { GameModeFactory } from '../modes/GameMode.js';
import { AIContext, AIDifficultyConfig, DEFAULT_DIFFICULTY_CONFIGS } from './types.js';
import { EmojiType } from './emojis.js';
import { BaseAIStrategy, AICapability } from './core/BaseAIStrategy.js';
import { EasyAIStrategy } from './strategies/EasyAIStrategy.js';
import { NormalAIStrategy } from './strategies/NormalAIStrategy.js';
import { HardAIStrategy } from './strategies/HardAIStrategy.js';

/**
 * AI玩家主类
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
    
    const modeName = this.detectGameMode(gameState);
    const mode = GameModeFactory.create(modeName);
    const availableActions = mode.getAvailableActions(gameState, player.id);
    
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
   * 检测游戏模式
   */
  private static detectGameMode(gameState: GameState): string {
    if (gameState.outState || gameState.maxHandSize === 20) {
      return 'out';
    }
    return 'standard';
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

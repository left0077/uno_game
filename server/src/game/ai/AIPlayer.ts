import { Player, GameState, GameAction } from '../../shared/index.js';
import { GameModeFactory } from '../modes/GameMode.js';
import { 
  AIStrategy, 
  AIContext,
  DEFAULT_DIFFICULTY_CONFIGS 
} from './AIStrategy.js';
import { OutModeAIStrategy } from './OutModeAI.js';

/**
 * AI玩家主类
 * 
 * 重构后的架构：
 * 1. 使用策略模式，不同游戏模式使用不同的AI策略
 * 2. 策略通过GameMode.getAvailableActions获取可用动作
 * 3. 决策逻辑委托给具体的AIStrategy实现
 */
export class AIPlayer {
  private static strategyCache = new Map<string, AIStrategy>();
  
  /**
   * 获取AI行动
   * 
   * 重构要点：
   * - 不再自己判断可出牌，而是通过GameMode.getAvailableActions获取
   * - 使用对应游戏模式的AIStrategy进行决策
   */
  static getAIAction(
    player: Player,
    gameState: GameState,
    allPlayers: Player[]
  ): GameAction | null {
    if (!player.isAI || !player.aiDifficulty) return null;
    
    // 获取当前游戏模式
    const modeName = this.detectGameMode(gameState);
    const mode = GameModeFactory.create(modeName);
    
    // 获取可用动作（包括连打、单张等所有选项）
    const availableActions = mode.getAvailableActions(gameState, player.id);
    
    // 构建AI上下文
    const context: AIContext = {
      player,
      gameState,
      allPlayers,
      availableActions
    };
    
    // 获取对应策略
    const strategy = this.getStrategy(modeName, player.aiDifficulty);
    
    // 使用策略做出决策
    return strategy.makeDecision(context);
  }
  
  /**
   * 检测当前游戏模式
   */
  private static detectGameMode(gameState: GameState): string {
    // 通过gameState的特征判断模式
    if (gameState.outState || gameState.maxHandSize === 20) {
      return 'out';
    }
    return 'standard';
  }
  
  /**
   * 获取/创建AI策略
   */
  private static getStrategy(modeName: string, difficulty: string): AIStrategy {
    const cacheKey = `${modeName}_${difficulty}`;
    
    if (this.strategyCache.has(cacheKey)) {
      return this.strategyCache.get(cacheKey)!;
    }
    
    const config = DEFAULT_DIFFICULTY_CONFIGS[difficulty] || DEFAULT_DIFFICULTY_CONFIGS.normal;
    
    let strategy: AIStrategy;
    switch (modeName) {
      case 'out':
        strategy = new OutModeAIStrategy(config);
        break;
      default:
        // 标准模式使用Out模式策略（去掉Out特有逻辑）
        strategy = new OutModeAIStrategy(config);
        break;
    }
    
    this.strategyCache.set(cacheKey, strategy);
    return strategy;
  }
  
  /**
   * 获取AI决策延迟（毫秒）
   */
  static getDecisionDelay(difficulty: 'easy' | 'normal' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 2000 + Math.random() * 2000; // 2-4秒
      case 'normal':
        return 1000 + Math.random() * 2000; // 1-3秒
      case 'hard':
        return 500 + Math.random() * 500; // 0.5-1秒
      default:
        return 2000;
    }
  }
  
  // ============ 表情系统（保持不变） ============
  
  private static readonly EMOJIS = {
    taunt: ['😎', '😏', '🤭', '😂', '👻', '🎉'],
    provocation: ['😈', '🔥', '💀', '⚡', '🎯'],
    helpless: ['😭', '😫', '🤦', '😅', '🥺'],
    victory: ['🏆', '👑', '🥇', '✨', '🎊'],
    common: ['👍', '👎', '❤️', '🤮', '💩']
  };
  
  static getEmoji(
    situation: 'taunt' | 'provocation' | 'helpless' | 'victory' | 'common',
    playerCardCount: number
  ): string | null {
    if (Math.random() > 0.3) return null;
    
    if (playerCardCount <= 2) {
      situation = 'victory';
    }
    
    const emojis = this.EMOJIS[situation];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }
}

// 导出策略供外部使用
export { OutModeAIStrategy } from './OutModeAI.js';

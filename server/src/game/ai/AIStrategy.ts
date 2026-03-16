import { Player, GameState, Card, GameAction } from '../../shared/index.js';
import { ComboType } from '../modes/GameMode.js';

/**
 * AI决策上下文
 */
export interface AIContext {
  player: Player;
  gameState: GameState;
  allPlayers: Player[];
  availableActions: GameAction[];
}

/**
 * 惩罚响应选项
 */
export interface PenaltyResponse {
  type: 'rainbow' | 'reverse' | 'stack' | 'accept';
  priority: number; // 优先级：彩虹(1) > 反转(2) > 跟+(3) > 接受(4)
  action: GameAction;
  description: string;
}

/**
 * 连打选项
 */
export interface ComboOption {
  type: ComboType;
  cardIds: string[];
  effect: {
    type: string;
    target: string;
    value: number;
  };
  riskScore: number; // 风险评分（手牌接近上限时风险更高）
}

/**
 * AI策略接口
 * 
 * 架构设计：
 * 1. 将AI决策分解为独立的评估步骤
 * 2. 每个步骤返回可选动作列表和评分
 * 3. 最终决策器根据难度选择最优动作
 */
export interface AIStrategy {
  /**
   * 评估惩罚响应选项
   * 按规则书优先级：彩虹 > 反转 > 跟+ > 接受
   */
  evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[];
  
  /**
   * 评估连打选项
   */
  evaluateComboOptions(ctx: AIContext): ComboOption[];
  
  /**
   * 评估单张出牌选项
   */
  evaluateSinglePlays(ctx: AIContext): Array<{
    card: Card;
    score: number;
    reason: string;
  }>;
  
  /**
   * 做出最终决策
   */
  makeDecision(ctx: AIContext): GameAction | null;
}

/**
 * AI难度配置
 */
export interface AIDifficultyConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  
  // 惩罚响应倾向
  penaltyResponseBias: {
    rainbow: number;  // 使用彩虹的概率权重
    reverse: number;  // 使用反转的概率权重
    stack: number;    // 跟+的概率权重
    accept: number;   // 接受惩罚的概率权重
  };
  
  // 连打倾向（根据手牌数量调整）
  comboBias: {
    whenHealthy: number;  // 手牌健康时(<15张)的连打倾向
    whenRisky: number;    // 手牌危险时(>15张)的连打倾向
  };
  
  // 风险意识（手牌接近上限时的保守程度）
  riskAwareness: number; // 0-1，越高越保守
}

/**
 * 默认难度配置
 */
export const DEFAULT_DIFFICULTY_CONFIGS: Record<string, AIDifficultyConfig> = {
  easy: {
    difficulty: 'easy',
    penaltyResponseBias: { rainbow: 0.3, reverse: 0.3, stack: 0.5, accept: 0.7 },
    comboBias: { whenHealthy: 0.3, whenRisky: 0.1 },
    riskAwareness: 0.3
  },
  normal: {
    difficulty: 'normal',
    penaltyResponseBias: { rainbow: 0.7, reverse: 0.6, stack: 0.6, accept: 0.4 },
    comboBias: { whenHealthy: 0.6, whenRisky: 0.3 },
    riskAwareness: 0.6
  },
  hard: {
    difficulty: 'hard',
    penaltyResponseBias: { rainbow: 0.9, reverse: 0.8, stack: 0.8, accept: 0.2 },
    comboBias: { whenHealthy: 0.8, whenRisky: 0.5 },
    riskAwareness: 0.8
  }
};

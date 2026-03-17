import { Player, GameState, Card, GameAction } from '../../shared/index.js';
import { ComboType } from '../../shared/index.js';

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
  type: 'rainbow' | 'reverse' | 'stack' | 'accept' | 'combo';
  priority: number;
  action: GameAction;
  description: string;
  score: number;  // 评分（用于困难AI比较）
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
  score: number;      // 策略评分
  riskScore: number;  // 风险评分
}

/**
 * 单张出牌选项
 */
export interface SinglePlayOption {
  card: Card;
  score: number;
  reason: string;
  immediateValue: number;  // 即时价值
  futureValue: number;     // 未来价值（仅困难AI计算）
}

/**
 * AI难度配置
 */
export interface AIDifficultyConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  
  // 决策深度
  maxSearchDepth: number;      // 最大搜索深度
  simulationCount: number;     // 蒙特卡洛模拟次数
  
  // 能力开关
  useMemory: boolean;          // 使用记忆
  usePrediction: boolean;      // 预测对手
  useDeception: boolean;       // 欺骗策略
  
  // 行为特征
  mistakeRate: number;         // 犯错率（0-1）
  reactionDelay: [number, number]; // 反应延迟范围[min, max]
  emojiFrequency: number;      // 发送表情频率
}

/**
 * 默认难度配置
 */
export const DEFAULT_DIFFICULTY_CONFIGS: Record<string, AIDifficultyConfig> = {
  easy: {
    difficulty: 'easy',
    maxSearchDepth: 0,
    simulationCount: 0,
    useMemory: false,
    usePrediction: false,
    useDeception: false,
    mistakeRate: 0.3,           // 30%犯错率
    reactionDelay: [2000, 4000],
    emojiFrequency: 0.2
  },
  normal: {
    difficulty: 'normal',
    maxSearchDepth: 1,
    simulationCount: 10,
    useMemory: true,
    usePrediction: false,
    useDeception: false,
    mistakeRate: 0.1,           // 10%犯错率
    reactionDelay: [1000, 2500],
    emojiFrequency: 0.4
  },
  hard: {
    difficulty: 'hard',
    maxSearchDepth: 3,
    simulationCount: 100,
    useMemory: true,
    usePrediction: true,
    useDeception: true,
    mistakeRate: 0.0,           // 不犯错
    reactionDelay: [500, 1200],
    emojiFrequency: 0.6
  }
};

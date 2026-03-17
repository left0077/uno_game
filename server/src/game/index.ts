// 游戏核心模块统一导出

// V2架构核心
export * from './core/index.js';

// AI模块
export {
  AIPlayer,
  AIContext,
  BaseAIStrategy,
  AICapability,
  EasyAIStrategy,
  NormalAIStrategy,
  HardAIStrategy
} from './ai/index.js';

// 卡牌管理
export { CardManager } from './Card.js';

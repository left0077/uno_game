// 游戏核心模块统一导出

// 游戏模式
export {
  GameMode,
  ComboType,
  ComboEffect,
  ComboDefinition,
  GameModeFactory
} from './modes/GameMode.js';

export { BaseGameMode } from './modes/BaseGameMode.js';
export { OutMode } from './modes/OutMode.js';

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

// 游戏主控制器
export { UnoGame, GameCallbacks } from './UnoGame.js';

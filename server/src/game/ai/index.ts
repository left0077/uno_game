// AI核心类型和接口
export type { AIContext, PenaltyResponse, ComboOption, SinglePlayOption, AIDifficultyConfig } from './types.js';
export { DEFAULT_DIFFICULTY_CONFIGS } from './types.js';
export type { EmojiType } from './emojis.js';
export { EMOJI_DISPLAY, EMOJI_DESCRIPTION, getAbstractEmoji, getRandomSanjian } from './emojis.js';
export type { GameMemory, ActionHistory } from './core/BaseAIStrategy.js';
export { AICapability, BaseAIStrategy } from './core/BaseAIStrategy.js';

// 具体策略实现
export { EasyAIStrategy } from './strategies/EasyAIStrategy.js';
export { NormalAIStrategy } from './strategies/NormalAIStrategy.js';
export { HardAIStrategy } from './strategies/HardAIStrategy.js';

// AI玩家主类
export { AIPlayer } from './AIPlayer.js';

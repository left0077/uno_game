// AI核心类型和接口
export { AIContext, PenaltyResponse, ComboOption, SinglePlayOption, AIDifficultyConfig, DEFAULT_DIFFICULTY_CONFIGS } from './types.js';
export { EmojiType, EMOJI_DISPLAY, EMOJI_DESCRIPTION, getAbstractEmoji, getRandomSanjian } from './emojis.js';
export { AICapability, BaseAIStrategy, GameMemory, ActionHistory } from './core/BaseAIStrategy.js';

// 具体策略实现
export { EasyAIStrategy } from './strategies/EasyAIStrategy.js';
export { NormalAIStrategy } from './strategies/NormalAIStrategy.js';
export { HardAIStrategy } from './strategies/HardAIStrategy.js';

// AI玩家主类
export { AIPlayer } from './AIPlayer.js';

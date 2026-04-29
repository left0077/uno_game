// AI核心类型和接口
export type { AIContext, PenaltyResponse, ComboOption, SinglePlayOption, AIDifficultyConfig } from './types.ts';
export { DEFAULT_DIFFICULTY_CONFIGS } from './types.ts';
export type { EmojiType } from './emojis.ts';
export { EMOJI_DISPLAY, EMOJI_DESCRIPTION, getAbstractEmoji, getRandomSanjian } from './emojis.ts';
export type { GameMemory, ActionHistory } from './core/BaseAIStrategy.ts';
export { AICapability, BaseAIStrategy } from './core/BaseAIStrategy.ts';

// 具体策略实现
export { EasyAIStrategy } from './strategies/EasyAIStrategy.ts';
export { NormalAIStrategy } from './strategies/NormalAIStrategy.ts';
export { HardAIStrategy } from './strategies/HardAIStrategy.ts';

// AI玩家主类
export { AIPlayer } from './AIPlayer.ts';

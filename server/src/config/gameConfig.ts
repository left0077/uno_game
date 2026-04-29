/**
 * UNO Online — 游戏配置（单一数据源）
 *
 * 所有游戏参数在此定义，不再散落在各文件中硬编码。
 */

export interface ModeConfig {
  cardsPerPlayer: number;
  turnTimer: number;
  allowStacking: boolean;
  allowJumpIn: boolean;
}

export interface OutPhaseConfig {
  at: number; // 触发时间（秒）
  maxCards: number; // 手牌上限（固定 20）
  injectCards: Record<string, number>; // 注入的惩罚卡类型 → 每副数量
}

export interface OutModeConfig extends ModeConfig {
  maxHandSize: number;
  phases: OutPhaseConfig[];
  globalTimeout: number; // 全局超时（秒）
}

export interface GameModeConfigs {
  standard: ModeConfig;
  out: OutModeConfig;
}

export const GAME_MODES: GameModeConfigs = {
  standard: {
    cardsPerPlayer: 7,
    turnTimer: 120,
    allowStacking: true,
    allowJumpIn: false,
  },

  out: {
    cardsPerPlayer: 7,
    turnTimer: 120,
    allowStacking: true,
    allowJumpIn: true,
    maxHandSize: 20,
    globalTimeout: 1200, // 20 分钟
    phases: [
      { at: 0, maxCards: 20, injectCards: {} },
      { at: 180, maxCards: 20, injectCards: { draw3: 8 } }, // 3 分钟：+3 牌 8 张/副
      { at: 360, maxCards: 20, injectCards: { draw5: 4 } }, // 6 分钟：+5 牌 4 张/副
      { at: 540, maxCards: 20, injectCards: { draw8: 2 } }, // 9 分钟：+8 万能 2 张/副
    ],
  },
};

/** 惩罚卡牌面值 */
export const PENALTY_CARD_VALUES: Record<string, number> = {
  draw2: 2,
  draw3: 3,
  draw4: 4,
  draw5: 5,
  draw8: 8,
};

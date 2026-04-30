/**
 * 前端配置文件
 * 集中管理所有硬编码值
 */

// 游戏核心配置
export const GAME_CONFIG = {
  minPlayers: 2,
  maxPlayers: 8,
  initialCards: 7,
  maxNicknameLength: 12,
  roomCodeLength: 6,
  turnTimer: 120, // 回合倒计时(秒)
} as const;

// 动画/时间配置
export const ANIMATION_CONFIG = {
  emojiDisplayTime: 3000,    // emoji显示时间(ms)
  toastDuration: 3000,       // toast提示时间(ms)
  transitionDuration: 200,   // 过渡动画时间(ms)
  connectionTimeout: 10000,  // 连接超时(ms)
} as const;

// AI难度配置
export const AI_CONFIG = {
  difficulties: ['easy', 'normal', 'hard'] as const,
  defaultDifficulty: 'normal' as const,
} as const;

// 优先级阈值配置
export const PRIORITY_CONFIG = {
  excellent: 90,
  good: 70,
  normal: 50,
  low: 30,
} as const;

// Socket配置
export const SOCKET_CONFIG = {
  url: import.meta.env.VITE_SOCKET_URL || 'https://uno-server-jbbr.onrender.com',
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
} as const;

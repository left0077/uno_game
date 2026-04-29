/**
 * UNO Online v2.0 - 核心类型定义
 * 重构目标：简化玩家状态管理，支持更清晰的回合流转
 */

import { Card, Player, RoomSettings } from '../../shared/index.js';

// ============================================================================
// GameState V2 - 重构后的游戏状态
// ============================================================================

export interface GameStateV2 {
  // === 玩家管理 ===
  /** 全部玩家信息（ID -> Player） */
  players: Map<string, Player>;
  
  /** 牌桌上的玩家ID（还在游戏中，按座位顺序） */
  tablePlayerIds: string[];
  
  /** 已结束的玩家ID（按排名顺序，第1个=第1名） */
  finishedPlayerIds: string[];
  
  // === 回合管理 ===
  /** 当前玩家在 tablePlayerIds 中的索引 */
  currentPlayerIndex: number;
  
  /** 出牌方向：1=顺时针，-1=逆时针 */
  direction: 1 | -1;
  
  // === 游戏状态 ===
  /** 游戏阶段 */
  phase: 'waiting' | 'playing' | 'finished';
  
  /** 最终胜者ID（标准模式） */
  winnerId?: string;
  
  // === 牌局状态 ===
  /** 牌堆 */
  deck: Card[];
  
  /** 弃牌堆 */
  discardPile: Card[];
  
  /** 当前颜色 */
  currentColor: string;
  
  // === 特殊状态 ===
  /** 累积惩罚 */
  pendingDraw?: number;
  pendingDrawType?: 'draw2' | 'draw3' | 'draw4' | 'draw5' | 'draw8';
  
  /** 被跳过的玩家ID */
  skippedPlayerId?: string;
  
  /** 最后动作 */
  lastAction?: GameActionV2;
  
  /** 回合开始时间 */
  turnStartTime: number;
  
  // === 游戏时钟 ===
  /** 游戏开始时间戳（用于阶段推进和全局超时） */
  gameStartTime: number;

  /** 惩罚响应截止时间（被惩罚玩家必须在此前响应） */
  responseDeadline?: number;

  /** 惩罚来源玩家 ID（反转弹回用） */
  penaltySourceId?: string;

  // === Out模式特有 ===
  outState?: {
    phase: 0 | 1 | 2 | 3;
    maxCards: number;
    nextOutAt: number;
  };
}

// ============================================================================
// 动作类型 V2
// ============================================================================

export type GameActionTypeV2 = 
  | 'play'      // 打出单张牌
  | 'combo'     // 连打出牌
  | 'draw'      // 摸牌
  | 'skip'      // 跳过回合
  | 'uno'       // 喊UNO
  | 'challenge' // 挑战UNO
  | 'jumpIn';   // 抢牌

export interface GameActionV2 {
  type: GameActionTypeV2;
  playerId: string;
  timestamp: number;
  
  // play/combo/jumpIn 用
  cardIds?: string[];
  comboType?: 'pair' | 'three' | 'rainbow' | 'straight';
  
  // wild/draw4 用
  chosenColor?: 'red' | 'yellow' | 'green' | 'blue';
  
  // challenge 用
  targetId?: string;
}

// ============================================================================
// 验证结果
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/** 动作执行结果 */
export interface ActionResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// 游戏配置
// ============================================================================

export interface GameConfig {
  cardsPerPlayer: number;
  turnTimer: number;
  allowStacking: boolean;
  allowJumpIn: boolean;
}

// ============================================================================
// 玩家状态与结果
// ============================================================================

/** 玩家在游戏中的最终状态 */
export type PlayerResultStatus = 'winner' | 'finished' | 'eliminated';

/** 玩家结果信息（用于排名） */
export interface PlayerResult {
  playerId: string;
  nickname: string;
  status: PlayerResultStatus;
  rank: number;           // 排名：1, 2, 3...
  finishedAt?: number;    // 完成时间戳
  remainingCards?: number; // 剩余手牌数（用于同分比较）
}

/** 游戏结果 */
export interface GameResult {
  /** 最终排名列表（按rank排序） */
  rankings: PlayerResult[];
  /** 获胜者ID（标准模式） */
  winnerId?: string;
  /** 游戏时长（毫秒） */
  duration: number;
  /** 结束时间 */
  endedAt: number;
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 获取玩家当前状态 */
export function getPlayerStatus(state: GameStateV2, playerId: string): 'ontable' | 'finished' {
  if (state.finishedPlayerIds.includes(playerId)) return 'finished';
  if (state.tablePlayerIds.includes(playerId)) return 'ontable';
  return 'finished'; // 默认已完成
}

/** 
 * 计算游戏结果
 * 
 * finishedPlayerIds 已经是排名顺序（由 PlayerManager 预分配位置）：
 * - 索引 0 = 第1名
 * - 索引 1 = 第2名
 * ...
 */
export function calculateResult(state: GameStateV2): GameResult {
  const now = Date.now();
  
  const rankings: PlayerResult[] = state.finishedPlayerIds
    .filter(playerId => playerId !== null)
    .map((playerId, index) => {
      const player = state.players.get(playerId);
      return {
        playerId,
        nickname: player?.nickname || '',
        status: index === 0 ? 'winner' : (player?.eliminated ? 'eliminated' : 'finished'),
        rank: index + 1,
        finishedAt: state.turnStartTime,
        remainingCards: player?.cards.length || 0
      };
    });
  
  return {
    rankings,
    winnerId: rankings[0]?.status === 'winner' ? rankings[0].playerId : undefined,
    duration: now - state.turnStartTime,
    endedAt: now
  };
}

/** 检查游戏是否结束 */
export function isGameOver(state: GameStateV2): boolean {
  // 只剩1人，游戏结束
  if (state.tablePlayerIds.length <= 1) return true;
  
  // 或者已有明确胜者（标准模式）
  if (state.winnerId) return true;
  
  return false;
}

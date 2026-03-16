/**
 * 客户端 GameState 类型扩展
 * 
 * 为支持 Action API v2.0，扩展基础 GameState 类型
 */

import type { GameState as BaseGameState } from '../../../shared/types';
import type { AvailableActions } from '../../../shared/actionApi';

/**
 * 扩展的 GameState 类型
 * 
 * 包含 Action API v2.0 新增字段
 */
export interface ExtendedGameState extends BaseGameState {
  /**
   * Action API 版本
   * - '1.0': 旧版，使用客户端计算可出牌
   * - '2.0': 新版，服务端提供可用动作
   */
  actionApiVersion?: '1.0' | '2.0';
  
  /**
   * 各玩家的可用动作
   * Key: playerId, Value: AvailableActions
   */
  availableActions?: Record<string, AvailableActions>;
}

// 重新导出基础类型
export type { BaseGameState };

// 兼容性类型别名
export type GameState = ExtendedGameState;

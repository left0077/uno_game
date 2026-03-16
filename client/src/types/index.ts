/**
 * 客户端类型定义
 * 
 * 统一导出所有客户端类型
 */

// Action API v2.0 类型
export * from './actionApi';

// GameState 扩展类型
export * from './gameState';

// 重新导出共享类型（方便使用）
export type {
  Room,
  Player,
  Card,
  GameAction,
  ChatMessage,
  RoomSettings,
  GameMode,
  OutState,
  SocketEvents,
  UserSession,
  SocketError,
} from '../../../shared/types';

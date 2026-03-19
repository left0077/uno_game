/**
 * Core Layer - 核心层统一导出
 * 
 * 核心层职责：
 * - 纯业务逻辑，不依赖 UI
 * - 可独立测试
 * - 与 React 解耦
 */

// Socket
export { SocketClient, getSocketClient, resetSocketClient } from './socket/SocketClient';

// Game
export {
  GameEngine,
  getGameEngine,
  resetGameEngine,
  RoomService,
  getRoomService,
  resetRoomService,
  GameService,
  getGameService,
  resetGameService
} from './game';

// Types
export type {
  GameContext,
  GameAction,
  AvailableAction,
  GamePhase
} from './game/GameEngine';

export type {
  RoomCallbacks
} from './game/RoomService';

export type {
  GameCallbacks
} from './game/GameService';

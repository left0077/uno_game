/**
 * Hooks Layer - Hooks 层统一导出
 * 
 * Hooks 层职责：
 * - 封装核心层服务
 * - 连接 React 状态与核心状态
 * - 提供便捷的业务方法
 */

export { useSocket, type UseSocketReturn, type UseSocketOptions } from './useSocket';
export { useGameActions } from './useGameActions';
export { useRoomActions } from './useRoomActions';

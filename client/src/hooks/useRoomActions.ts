/**
 * useRoomActions - 房间动作 Hook
 * 
 * 职责：
 * 1. 封装房间相关操作
 * 2. 调用 RoomService 执行操作
 * 3. 提供状态查询
 */

import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getRoomService, getGameEngine } from '../core';
import type { RoomSettings } from '../../../shared/types';

export function useRoomActions() {
  const store = useGameStore();
  const roomService = getRoomService();
  const engine = getGameEngine();

  // 获取当前房间码
  const getRoomCode = useCallback((): string => {
    return store.room?.code || '';
  }, [store.room]);

  /**
   * 创建房间
   * @param nickname 玩家昵称
   */
  const createRoom = useCallback((nickname: string): void => {
    if (!nickname.trim()) {
      store.setError('请输入昵称');
      return;
    }
    
    roomService.createRoom(nickname.trim());
    store.setNickname(nickname.trim());
    store.setError('');
  }, [roomService, store]);

  /**
   * 加入房间
   * @param roomCode 房间码
   * @param nickname 玩家昵称
   */
  const joinRoom = useCallback((roomCode: string, nickname: string): void => {
    if (!roomCode.trim()) {
      store.setError('请输入房间码');
      return;
    }
    if (!nickname.trim()) {
      store.setError('请输入昵称');
      return;
    }

    roomService.joinRoom(roomCode.toUpperCase().trim(), nickname.trim());
    store.setNickname(nickname.trim());
    store.setError('');
  }, [roomService, store]);

  /**
   * 离开房间
   */
  const leaveRoom = useCallback((): void => {
    roomService.leaveRoom();
    store.resetRoomState();
  }, [roomService, store]);

  /**
   * 重新连接房间
   * @param roomCode 房间码
   * @param userId 用户ID
   */
  const reconnectRoom = useCallback((roomCode: string, userId: string): void => {
    roomService.reconnect(roomCode.toUpperCase().trim(), userId);
  }, [roomService]);

  /**
   * 添加 AI 玩家
   * @param difficulty AI 难度
   * @param type AI 类型
   */
  const addAI = useCallback((
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    type: 'bot' | 'host' = 'bot'
  ): void => {
    const roomCode = getRoomCode();
    if (!roomCode) {
      store.setError('不在房间中');
      return;
    }
    roomService.addAI(roomCode, difficulty, type);
  }, [getRoomCode, roomService, store]);

  /**
   * 移除 AI 玩家
   * @param aiId AI 玩家ID
   */
  const removeAI = useCallback((aiId: string): void => {
    const roomCode = getRoomCode();
    if (!roomCode) {
      store.setError('不在房间中');
      return;
    }
    roomService.removeAI(roomCode, aiId);
  }, [getRoomCode, roomService, store]);

  /**
   * 更新房间设置
   * @param settings 设置项
   */
  const updateSettings = useCallback((settings: Partial<RoomSettings>): void => {
    const roomCode = getRoomCode();
    if (!roomCode) {
      store.setError('不在房间中');
      return;
    }
    roomService.updateSettings(roomCode, settings);
  }, [getRoomCode, roomService, store]);

  /**
   * 开始游戏
   * @param mode 游戏模式
   */
  const startGame = useCallback((mode: 'standard' | 'out' = 'out'): void => {
    const roomCode = getRoomCode();
    if (!roomCode) {
      store.setError('不在房间中');
      return;
    }

    if (!engine.canStartGame()) {
      store.setError('需要至少2名玩家才能开始游戏');
      return;
    }

    roomService.startGame(roomCode, mode);
  }, [getRoomCode, engine, roomService, store]);

  return {
    // 动作方法
    createRoom,
    joinRoom,
    leaveRoom,
    reconnectRoom,
    addAI,
    removeAI,
    updateSettings,
    startGame,

    // 状态查询
    isHost: engine.isHost.bind(engine),
    canStartGame: engine.canStartGame.bind(engine),
    getPlayerCount: engine.getPlayerCount.bind(engine),
    room: store.room
  };
}
